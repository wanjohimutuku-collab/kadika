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
import { initObservability, safeErrorMessage } from './observability';
import { startWorker } from './worker';
import { startScheduler } from './scheduler';
import {
  applyMessaging,
  envSettings,
  MessagingSettingsService,
} from './services/messaging-settings';
import { PaymentSettingsService } from './services/payment-settings';
import { SignInSettingsService } from './services/signin-settings';
import { ContributionRecords } from './services/contribution-records';

const config = loadConfig();
const { db } = createDb(config.databaseUrl);
// Contribution records written before ADR 043 are sealed in the background; reads cope either way.
void ContributionRecords.of({ config })
  .sealLegacy(db)
  .then(
    (n) =>
      n && console.log(JSON.stringify({ level: 'info', msg: 'sealed contribution records', n })),
  )
  .catch((e: Error) =>
    console.error(
      JSON.stringify({
        level: 'error',
        msg: 'sealing contribution records failed',
        err: safeErrorMessage(e),
      }),
    ),
  );

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
// Errors outside a request (timers, background promises) reach the error tracker too; an uncaught
// exception still stops the process (Docker restarts it), after it has been reported.
process.on('unhandledRejection', (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  console.error(
    JSON.stringify({ level: 'error', msg: 'unhandled rejection', err: safeErrorMessage(err) }),
  );
  reportError?.(err);
});
process.on('uncaughtException', (err) => {
  console.error(
    JSON.stringify({ level: 'fatal', msg: 'uncaught exception', err: safeErrorMessage(err) }),
  );
  reportError?.(err);
  setTimeout(() => process.exit(1), 2_000).unref(); // give the report a moment to leave
});
if (!config.sentryDsn && process.env.NODE_ENV === 'production')
  console.log(JSON.stringify({ level: 'warn', msg: 'SENTRY_DSN not set: errors are only logged' }));

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
    log({ level: 'error', msg: 'messaging settings not loaded', error: safeErrorMessage(e) }),
  );
// Every API instance re-reads the saved settings each minute, so a save on one reaches the others.
setInterval(() => void deps.messagingSettings?.refresh().catch(() => undefined), 60_000).unref();
// Payment gateway settings (ADR 036) work the same way: saved in /ops, replacing the env-built provider.
deps.paymentSettings = new PaymentSettingsService(deps, { log });
await deps.paymentSettings
  .refresh(true)
  .catch((e: Error) =>
    log({ level: 'error', msg: 'payment settings not loaded', error: safeErrorMessage(e) }),
  );
setInterval(() => void deps.paymentSettings?.refresh().catch(() => undefined), 60_000).unref();
// Sign-in code settings (ADR 049): saved in /ops, the AUTH_OTP_PROVIDER / FIREBASE_* variables otherwise.
deps.signInSettings = new SignInSettingsService(deps, { log });
await deps.signInSettings
  .refresh(true)
  .catch((e: Error) =>
    log({ level: 'error', msg: 'sign-in settings not loaded', error: safeErrorMessage(e) }),
  );
setInterval(() => void deps.signInSettings?.refresh().catch(() => undefined), 60_000).unref();
let worker: ReturnType<typeof startWorker> | undefined;
if (config.redisUrl) {
  // Rate-limit counters in Redis so several API instances share one budget (§9).
  const limiterRedis = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });
  limiterRedis.on('error', () => undefined); // a Redis outage falls back to per-process counters
  deps.rateStore = new RedisRateStore(limiterRedis, deps.now);
  worker = startWorker(deps, config.redisUrl);
  deps.enqueueSend = worker.enqueueSend;
} else {
  console.log(
    JSON.stringify({
      level: 'warn',
      msg: 'REDIS_URL not set: no queue worker, reminders and fallback will not run',
    }),
  );
}
// Scheduled invitations and reminders (ADR 030) run with or without Redis.
const stopScheduler = startScheduler(deps);
const app = createApp(deps);

const server = serve({ fetch: app.fetch, port: config.port, hostname: '0.0.0.0' }, (info) => {
  console.log(JSON.stringify({ level: 'info', msg: 'api listening', port: info.port }));
});

// Graceful stop on a redeploy (Docker sends SIGTERM, then SIGKILL after 10 s): stop taking requests,
// let the BullMQ worker finish or hand back its job, then exit. Without it a send in progress is cut off
// mid-way and its job is only retried after the stalled-job timeout.
let stopping = false;
const shutdown = (signal: string) => {
  if (stopping) return;
  stopping = true;
  console.log(JSON.stringify({ level: 'info', msg: 'shutting down', signal }));
  stopScheduler();
  setTimeout(() => process.exit(0), 9_000).unref();
  server.close();
  void (worker?.close() ?? Promise.resolve()).catch(() => undefined).finally(() => process.exit(0));
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
