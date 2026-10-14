import { serve } from '@hono/node-server';
import { createDb } from '@harusi/db';
import { FakeMessagingProvider } from '@harusi/messaging';
import { createApp } from './app';
import { loadConfig } from './config';
import { systemRandom } from './context';

const config = loadConfig();
const { db } = createDb(config.databaseUrl);
// SMS gateway adapters (Beem / Africa's Talking / NextSMS) arrive in Phase 3; until then the fake
// provider is used in every environment and OTPs are logged only when SMS_PROVIDER=fake.
const fake = new FakeMessagingProvider('sms');
// §12: OTPs are never logged. For local development only, DEV_LOG_OTP=1 prints the SMS body.
const sms =
  process.env.DEV_LOG_OTP === '1' && process.env.NODE_ENV !== 'production'
    ? {
        name: 'fake-dev',
        channel: 'sms' as const,
        async send(to: string, body: string) {
          console.log(JSON.stringify({ level: 'dev', msg: 'sms (DEV_LOG_OTP)', to, body }));
          return fake.send(to, body);
        },
      }
    : fake;
// WhatsApp Cloud API adapter is not chosen yet (§15.2); the fake stands in (ADR 017).
const whatsapp = new FakeMessagingProvider('whatsapp');
const app = createApp({ db, sms, whatsapp, config, now: () => new Date(), random: systemRandom });

serve({ fetch: app.fetch, port: config.port, hostname: '0.0.0.0' }, (info) => {
  console.log(JSON.stringify({ level: 'info', msg: 'api listening', port: info.port }));
});
