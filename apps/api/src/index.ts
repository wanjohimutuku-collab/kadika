import { serve } from '@hono/node-server';
import { createDb } from '@harusi/db';
import {
  EvolutionWhatsAppProvider,
  WhatsAppCloudProvider,
  FakeMessagingProvider,
  NextSmsProvider,
  type MessagingProvider,
} from '@harusi/messaging';
import { FakePaymentProvider, type PaymentProvider } from '@harusi/payments';
import { createApp } from './app';
import { loadConfig } from './config';
import { systemRandom, type Deps } from './context';
import { startWorker } from './worker';

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
  });
} else if (config.whatsappProvider !== 'fake') {
  throw new Error(
    `Unknown WHATSAPP_PROVIDER "${config.whatsappProvider}" (fake | evolution | cloud)`,
  );
}
// §12: OTPs are never logged. For local development only, DEV_LOG_OTP=1 prints the SMS body.
if (process.env.DEV_LOG_OTP === '1' && process.env.NODE_ENV !== 'production') {
  const inner = sms;
  sms = {
    name: `${inner.name}-dev`,
    channel: 'sms',
    async send(to, body) {
      console.log(JSON.stringify({ level: 'dev', msg: 'sms (DEV_LOG_OTP)', to, body }));
      return inner.send(to, body);
    },
  };
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

const deps: Deps = {
  db,
  sms,
  whatsapp,
  payments,
  smsReport,
  config,
  now: () => new Date(),
  random: systemRandom,
};
if (config.redisUrl) {
  deps.enqueueSend = startWorker(deps, config.redisUrl).enqueueSend;
} else {
  console.log(
    JSON.stringify({
      level: 'warn',
      msg: 'REDIS_URL not set: no queue worker, reminders and fallback will not run',
    }),
  );
}
const app = createApp(deps);

serve({ fetch: app.fetch, port: config.port, hostname: '0.0.0.0' }, (info) => {
  console.log(JSON.stringify({ level: 'info', msg: 'api listening', port: info.port }));
});
