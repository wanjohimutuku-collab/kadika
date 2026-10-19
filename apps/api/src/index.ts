import { serve } from '@hono/node-server';
import { createDb } from '@harusi/db';
import { FakeMessagingProvider, type MessagingProvider } from '@harusi/messaging';
import {
  AggregatorPaymentProvider,
  FakePaymentProvider,
  type PaymentProvider,
} from '@harusi/payments';
import { createApp } from './app';
import { loadConfig } from './config';
import { systemRandom, type Deps } from './context';
import { Redis } from 'ioredis';
import { RedisRateStore } from './rate-limit';
import { initObservability } from './observability';
import { startWorker } from './worker';
import { startScheduler } from './scheduler';
import {
  applyMessaging,
  envSettings,
  MessagingSettingsService,
} from './services/messaging-settings';
import { PaymentSettingsService } from './services/payment-settings';

const config = loadConfig();
const { db } = createDb(config.databaseUrl);

// Messaging providers (ADR 017, 018, 026, 031): built from the environment here, then replaced by
// whatever staff saved in /ops once the database is read (below). Incomplete env settings stop startup.
const log = (line: Record<string, unknown>) => console.log(JSON.stringify(line));
// §12: OTPs are never logged. For local development only, DEV_LOG_OTP=1 prints the SMS body.
const wrapSms =
  process.env.DEV_LOG_OTP === '1' && process.env.NODE_ENV !== 'production'
    ? (inner: MessagingProvider): MessagingProvider => ({
        name: `${inner.name}-dev`,
        channel: 'sms',
        async send(to, body) {
          console.log(JSON.stringify({ level: 'dev', msg: 'sms (DEV_LOG_OTP)', to, body }));
          return inner.send(to, body);
        },
      })
    : undefined;

// Mobile-money aggregator (ADR 023): none is chosen yet, so only the fake exists. It needs a webhook
// secret; without one, payments are simply off. Any other value stops the API at startup.
let payments: PaymentProvider | undefined;
if (config.paymentProvider === 'fake') {
  if (config.paymentWebhookSecret) payments = new FakePaymentProvider(config.paymentWebhookSecret);
} else {
  throw new Error(
    `Unknown PAYMENT_PROVIDER "${config.paymentProvider}" (fake only, until an aggregator is chosen)`,
  );
}

// Kenyan mobile money (ADR 027): only when Kenya is enabled. `fake` needs a webhook secret, the
// aggregator needs its URL, key, secret and public callback URL; anything else stops startup.
const paymentsByCountry: Deps['paymentsByCountry'] = {};
if (config.kenyaEnabled) {
  if (config.paymentProviderKe === 'aggregator') {
    if (!config.paymentKe)
      throw new Error(
        'PAYMENT_PROVIDER_KE=aggregator needs PAYMENT_API_URL_KE, PAYMENT_API_KEY_KE, PAYMENT_WEBHOOK_SECRET_KE and PAYMENT_CALLBACK_URL_KE',
      );
    paymentsByCountry.KE = new AggregatorPaymentProvider({
      name: 'aggregator-ke',
      ...config.paymentKe,
    });
  } else if (config.paymentProviderKe === 'fake') {
    const secret = config.paymentWebhookSecretKe ?? config.paymentWebhookSecret;
    if (secret) paymentsByCountry.KE = new FakePaymentProvider(secret, undefined, 'fake-ke');
  } else {
    throw new Error(
      `Unknown PAYMENT_PROVIDER_KE "${config.paymentProviderKe}" (fake | aggregator)`,
    );
  }
}

const reportError = initObservability(
  config.sentryDsn ?? undefined,
  process.env.NODE_ENV ?? 'development',
);

const deps: Deps = {
  db,
  sms: new FakeMessagingProvider('sms'),
  payments,
  paymentsByCountry,
  reportError,
  config,
  now: () => new Date(),
  random: systemRandom,
};
applyMessaging(deps, envSettings(config), { wrapSms, log });
deps.messagingSettings = new MessagingSettingsService(deps, { wrapSms, log });
await deps.messagingSettings
  .refresh(true)
  .catch((e: Error) =>
    log({ level: 'error', msg: 'messaging settings not loaded', error: e.message }),
  );
// Every API instance re-reads the saved settings each minute, so a save on one reaches the others.
setInterval(() => void deps.messagingSettings?.refresh().catch(() => undefined), 60_000).unref();
// Payment gateway settings (ADR 036) work the same way: saved in /ops, replacing the env-built provider.
deps.paymentSettings = new PaymentSettingsService(deps, { log });
await deps.paymentSettings
  .refresh(true)
  .catch((e: Error) =>
    log({ level: 'error', msg: 'payment settings not loaded', error: e.message }),
  );
setInterval(() => void deps.paymentSettings?.refresh().catch(() => undefined), 60_000).unref();
if (config.redisUrl) {
  // Rate-limit counters in Redis so several API instances share one budget (§9).
  const limiterRedis = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });
  limiterRedis.on('error', () => undefined); // a Redis outage falls back to per-process counters
  deps.rateStore = new RedisRateStore(limiterRedis, deps.now);
  deps.enqueueSend = startWorker(deps, config.redisUrl).enqueueSend;
} else {
  console.log(
    JSON.stringify({
      level: 'warn',
      msg: 'REDIS_URL not set: no queue worker, reminders and fallback will not run',
    }),
  );
}
// Scheduled invitations and reminders (ADR 030) run with or without Redis.
startScheduler(deps);
const app = createApp(deps);

serve({ fetch: app.fetch, port: config.port, hostname: '0.0.0.0' }, (info) => {
  console.log(JSON.stringify({ level: 'info', msg: 'api listening', port: info.port }));
});
