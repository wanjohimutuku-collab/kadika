import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { fileURLToPath } from 'node:url';
import { FakeMessagingProvider } from '@harusi/messaging';
import { FakePaymentProvider } from '@harusi/payments';
import * as schema from '@harusi/db/schema';
import type { Db } from '@harusi/db';
import { createApp } from '../app';
import { loadConfig } from '../config';
import type { Deps } from '../context';

export const TEST_KEY = Buffer.alloc(32, 7).toString('base64');

/** Real SQL (PGlite, in-process Postgres) + migrations + fake SMS: no Docker needed in unit tests. */
export async function createTestContext(opts: { now?: () => Date } = {}) {
  const client = new PGlite();
  const db = drizzle(client, { schema }) as unknown as Db;
  await migrate(db as never, {
    migrationsFolder: fileURLToPath(new URL('../../../../packages/db/drizzle', import.meta.url)),
  });
  // Tests flip these to simulate gateway outages for chosen numbers (delivery retries, fallback).
  const fail = {
    wa: (_to: string) => false,
    sms: (_to: string) => false,
    pay: (_phone: string) => false,
  };
  const sms = new FakeMessagingProvider('sms', (to) => fail.sms(to));
  const whatsapp = new FakeMessagingProvider('whatsapp', (to) => fail.wa(to));
  const payments = new FakePaymentProvider('pay-secret-for-tests', (phone) => fail.pay(phone));
  // mulberry32: a real PRNG (a Weyl sequence correlates badly with the short-code generator).
  let seed = 0x9e3779b9;
  const next = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };
  const clock = { now: new Date('2026-10-14T09:00:00Z').getTime() };
  const deps: Deps = {
    db,
    sms,
    whatsapp,
    payments,
    sleep: async () => {},
    config: loadConfig({
      DATABASE_URL: 'pglite',
      JWT_SECRET: 'test-secret-at-least-16-chars',
      KEY_ENC_SECRET: TEST_KEY,
      WEBHOOK_SECRET: 'hook-secret-for-tests',
      PAYMENT_WEBHOOK_SECRET: 'pay-secret-for-tests',
      LOG_REQUESTS: '0',
      WHATSAPP_TOKEN: 'cloud-token',
      WHATSAPP_PHONE_ID: '1234567890',
      WHATSAPP_VERIFY_TOKEN: 'verify-me',
      WHATSAPP_APP_SECRET: 'meta-app-secret',
    }),
    now: opts.now ?? (() => new Date(clock.now)),
    // Deterministic bytes: tests are reproducible but ids and tokens still differ between calls.
    random: (n) => Uint8Array.from({ length: n }, () => next() & 255),
  };
  const app = createApp(deps);
  return { app, deps, sms, whatsapp, payments, fail, clock, db, close: () => client.close() };
}

export type TestContext = Awaited<ReturnType<typeof createTestContext>>;

export async function api(
  ctx: TestContext,
  method: string,
  path: string,
  opts: { token?: string; body?: unknown } = {},
) {
  const res = await ctx.app.request(path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  return {
    status: res.status,
    // Test helper: bodies are asserted structurally, so they are typed loosely on purpose.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: (await res.json().catch(() => null)) as Record<string, any> | null,
  };
}

/** Full phone+OTP login through the real routes; returns tokens and the user. */
export async function loginAs(ctx: TestContext, phone: string) {
  const req = await api(ctx, 'POST', '/v1/auth/otp/request', { body: { phone } });
  if (req.status !== 200) throw new Error(`otp request failed: ${JSON.stringify(req.body)}`);
  const e164 = req.body!.phone as string;
  const code = /(\d{6})/.exec(ctx.sms.lastTo(e164) ?? '')?.[1];
  if (!code) throw new Error('no code sent');
  const verified = await api(ctx, 'POST', '/v1/auth/otp/verify', { body: { phone, code } });
  if (verified.status !== 200) throw new Error(`verify failed: ${JSON.stringify(verified.body)}`);
  return verified.body as {
    accessToken: string;
    refreshToken: string;
    user: { id: string; phoneE164: string; name: string };
  };
}
