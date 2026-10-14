/**
 * Local development without Docker: the real API on an in-memory PGlite database with fake
 * providers. Data is lost on restart. Prints OTP codes to the log. NEVER used in production.
 *   pnpm --filter @harusi/api exec tsx src/dev-pglite.ts
 */
import { serve } from '@hono/node-server';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { fileURLToPath } from 'node:url';
import { FakeMessagingProvider } from '@harusi/messaging';
import { FakePaymentProvider } from '@harusi/payments';
import * as schema from '@harusi/db/schema';
import type { Db } from '@harusi/db';
import { createApp } from './app';
import { loadConfig } from './config';
import { systemRandom } from './context';

if (process.env.NODE_ENV === 'production') throw new Error('dev-pglite must not run in production');
const client = new PGlite();
const db = drizzle(client, { schema }) as unknown as Db;
await migrate(db as never, {
  migrationsFolder: fileURLToPath(new URL('../../../packages/db/drizzle', import.meta.url)),
});
const log = (kind: string) => {
  const fake = new FakeMessagingProvider(kind === 'sms' ? 'sms' : 'whatsapp');
  return {
    name: `fake-${kind}`,
    channel: fake.channel,
    async send(to: string, body: string) {
      console.log(JSON.stringify({ level: 'dev', channel: kind, to, body }));
      return fake.send(to, body);
    },
  };
};
const config = loadConfig({
  DATABASE_URL: 'pglite',
  JWT_SECRET: 'dev-secret-dev-secret',
  KEY_ENC_SECRET: Buffer.alloc(32, 9).toString('base64'),
  CORS_ORIGINS: process.env.CORS_ORIGINS ?? 'http://localhost:8081,http://localhost:19006',
  API_PORT: process.env.API_PORT ?? '3001',
  LOG_REQUESTS: process.env.LOG_REQUESTS ?? '0',
  CARD_READ_LIMIT: process.env.CARD_READ_LIMIT ?? '120',
});
const app = createApp({
  db,
  sms: log('sms'),
  whatsapp: log('whatsapp'),
  payments: new FakePaymentProvider('dev-pay-secret'),
  config,
  now: () => new Date(),
  random: systemRandom,
});
serve({ fetch: app.fetch, port: config.port, hostname: '0.0.0.0' }, (i) =>
  console.log(JSON.stringify({ level: 'info', msg: 'dev api (PGlite) listening', port: i.port })),
);
