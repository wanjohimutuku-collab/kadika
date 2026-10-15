import { serve } from '@hono/node-server';
import { createDb } from '@harusi/db';
import {
  AfricasTalkingProvider,
  EvolutionWhatsAppProvider,
  WhatsAppCloudProvider,
  FakeMessagingProvider,
  NextSmsProvider,
  type MessagingProvider,
} from '@harusi/messaging';
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

const config = loadConfig();
const { db } = createDb(config.databaseUrl);

// Providers (ADR 017, ADR 018): Evolution API for WhatsApp, NextSMS for SMS; fakes otherwise.
let sms: MessagingProvider = new FakeMessagingProvider('sms');
let smsReport: Deps['smsReport'];
if (config.smsProvider === 'nextsms') {
  if (!config.nextSms)
    throw new Error(
      'SMS_PROVIDER=nextsms needs NEXTSMS_USERNAME, NEXTSMS_PASSWORD and SMS_SENDER_ID',
    );
  const next = new NextSmsProvider(config.nextSms);
  sms = next;
  smsReport = (id) => next.report(id);
}
// Kenyan numbers need their own SMS route (ADR 026); only built when Kenya is enabled.
const smsByCountry: Deps['smsByCountry'] = {};
if (config.kenyaEnabled) {
  if (config.smsProviderKe === 'africastalking') {
    if (!config.africasTalking)
      throw new Error('SMS_PROVIDER_KE=africastalking needs AT_USERNAME and AT_API_KEY');
    smsByCountry.KE = new AfricasTalkingProvider(config.africasTalking);
  } else if (config.smsProviderKe === 'fake') {
    smsByCountry.KE = new FakeMessagingProvider('sms', undefined, 'fake-ke');
  } else {
    throw new Error(`Unknown SMS_PROVIDER_KE "${config.smsProviderKe}" (fake | africastalking)`);
  }
}
let whatsapp: MessagingProvider = new FakeMessagingProvider('whatsapp');
if (config.whatsappProvider === 'evolution') {
  if (!config.evolution)
    throw new Error(
      'WHATSAPP_PROVIDER=evolution needs EVOLUTION_BASE_URL, EVOLUTION_INSTANCE and EVOLUTION_API_KEY',
    );
  whatsapp = new EvolutionWhatsAppProvider(config.evolution);
} else if (config.whatsappProvider === 'cloud') {
  if (!config.whatsappCloud)
    throw new Error('WHATSAPP_PROVIDER=cloud needs WHATSAPP_TOKEN and WHATSAPP_PHONE_ID');
  if (!config.whatsappCloud.templates.invite)
    console.log(
      JSON.stringify({
        level: 'warn',
        msg: 'WHATSAPP_TEMPLATE_INVITE not set: first-contact invitations will fail on WhatsApp and fall back to SMS',
      }),
    );
  whatsapp = new WhatsAppCloudProvider({
    token: config.whatsappCloud.token,
    phoneNumberId: config.whatsappCloud.phoneNumberId,
    apiVersion: config.whatsappCloud.apiVersion,
    templates: config.whatsappCloud.templates,
    templatesByCountry: config.whatsappCloud.templatesByCountry,
  });
} else if (config.whatsappProvider !== 'fake') {
  throw new Error(
    `Unknown WHATSAPP_PROVIDER "${config.whatsappProvider}" (fake | evolution | cloud)`,
  );
}
// §12: OTPs are never logged. For local development only, DEV_LOG_OTP=1 prints the SMS body.
if (process.env.DEV_LOG_OTP === '1' && process.env.NODE_ENV !== 'production') {
  const devLog = (inner: MessagingProvider): MessagingProvider => ({
    name: `${inner.name}-dev`,
    channel: 'sms',
    async send(to, body) {
      console.log(JSON.stringify({ level: 'dev', msg: 'sms (DEV_LOG_OTP)', to, body }));
      return inner.send(to, body);
    },
  });
  sms = devLog(sms);
  if (smsByCountry.KE) smsByCountry.KE = devLog(smsByCountry.KE);
}

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
  sms,
  smsByCountry,
  whatsapp,
  payments,
  paymentsByCountry,
  reportError,
  smsReport,
  config,
  now: () => new Date(),
  random: systemRandom,
};
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
