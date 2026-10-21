import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { inject } from 'vitest';
import { FakeMessagingProvider } from '@harusi/messaging';
import { FakePaymentProvider } from '@harusi/payments';
import * as schema from '@harusi/db/schema';
import { newId, type Db } from '@harusi/db';
import { createApp } from '../app';
import { parsePhone } from '../auth/service';
import { base32Decode, hotp, totpStep } from '../auth/totp';
import { loadConfig } from '../config';
import type { Deps } from '../context';

export const TEST_KEY = Buffer.alloc(32, 7).toString('base64');

/**
 * One migrated database per test file; each context gets a clone of it. Booting PGlite and running every
 * migration takes about 3 s, a clone about 0.5 s, and most files create a context per test. The global
 * setup migrates once per run and saves a snapshot; without it (a lone file run some other way) the
 * template is migrated here.
 */
let template: Promise<PGlite> | undefined;
function migratedTemplate() {
  template ??= (async () => {
    const snapshot = inject('pgliteSnapshot');
    if (snapshot) return new PGlite({ loadDataDir: new Blob([await readFile(snapshot)]) });
    const client = new PGlite();
    await migrate(drizzle(client, { schema }) as never, {
      migrationsFolder: fileURLToPath(new URL('../../../../packages/db/drizzle', import.meta.url)),
    });
    return client;
  })();
  return template;
}

/** Real SQL (PGlite, in-process Postgres) + migrations + fake SMS: no Docker needed in unit tests. */
export async function createTestContext(
  opts: { now?: () => Date; env?: Record<string, string> } = {},
) {
  const client = (await (await migratedTemplate()).clone()) as PGlite;
  const db = drizzle(client, { schema }) as unknown as Db;
  // Tests flip these to simulate gateway outages for chosen numbers (delivery retries, fallback).
  const fail = {
    wa: (_to: string) => false,
    sms: (_to: string) => false,
    pay: (_phone: string) => false,
  };
  const sms = new FakeMessagingProvider('sms', (to) => fail.sms(to));
  // The Kenyan SMS route (only used for +254 numbers, which need KENYA_ENABLED).
  const smsKe = new FakeMessagingProvider('sms', (to) => fail.sms(to), 'fake-ke');
  const whatsapp = new FakeMessagingProvider('whatsapp', (to) => fail.wa(to));
  const payments = new FakePaymentProvider('pay-secret-for-tests', (phone) => fail.pay(phone));
  // The Kenyan mobile-money route (used only by Kenyan events, which need KENYA_ENABLED).
  const paymentsKe = new FakePaymentProvider(
    'pay-secret-ke-for-tests',
    (phone) => fail.pay(phone),
    'fake-ke',
  );
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
    smsByCountry: { KE: smsKe },
    whatsapp,
    payments,
    paymentsByCountry: { KE: paymentsKe },
    sleep: async () => {},
    config: loadConfig({
      DATABASE_URL: 'pglite',
      JWT_SECRET: 'test-secret-at-least-16-chars',
      KEY_ENC_SECRET: TEST_KEY,
      WEBHOOK_SECRET: 'hook-secret-for-tests',
      PAYMENT_WEBHOOK_SECRET: 'pay-secret-for-tests',
      LOG_REQUESTS: '0',
      // The pay-from-card tests predate ADR 043; a test passes '0' to see the default (off).
      GUEST_PAYMENTS_ENABLED: '1',
      ...opts.env,
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
  return {
    app,
    deps,
    sms,
    smsKe,
    whatsapp,
    payments,
    paymentsKe,
    fail,
    clock,
    db,
    close: () => client.close(),
  };
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
  const route = e164.startsWith('+254') ? ctx.smsKe : ctx.sms;
  const code = /(\d{6})/.exec(route.lastTo(e164) ?? '')?.[1];
  if (!code) throw new Error('no code sent');
  const verified = await api(ctx, 'POST', '/v1/auth/otp/verify', { body: { phone, code } });
  if (verified.status !== 200) throw new Error(`verify failed: ${JSON.stringify(verified.body)}`);
  return verified.body as {
    accessToken: string;
    refreshToken: string;
    user: { id: string; phoneE164: string; name: string };
  };
}

/** The authenticator app's current code for a base32 secret, on the test clock. */
export function totpNow(ctx: TestContext, secret: string, stepOffset = 0) {
  return hotp(base32Decode(secret), totpStep(ctx.deps.now()) + stepOffset);
}

/**
 * Staff sign-in as /ops does it (ADR 040): the account is made staff first, then SMS code →
 * challenge → authenticator setup → code. Returns the full session and the authenticator secret.
 */
export async function loginAsStaff(
  ctx: TestContext,
  phone: string,
  staffRole: 'support' | 'billing' | 'admin',
  name = '',
) {
  const e164 = parsePhone(phone);
  await ctx.db
    .insert(schema.users)
    .values({ id: newId(), name, phoneE164: e164, roleGlobal: 'admin', staffRole })
    .onConflictDoUpdate({
      target: schema.users.phoneE164,
      set: { roleGlobal: 'admin', staffRole, ...(name ? { name } : {}) },
    });
  const first = (await loginAs(ctx, phone)) as unknown as {
    secondFactor: { challenge: string; enrolled: boolean };
  };
  if (!first.secondFactor) throw new Error('staff login did not ask for a second factor');
  const { challenge } = first.secondFactor;
  const enrol = await api(ctx, 'POST', '/v1/auth/staff/totp/enrol', { body: { challenge } });
  if (enrol.status !== 200) throw new Error(`enrol failed: ${JSON.stringify(enrol.body)}`);
  const secret = enrol.body!.secret as string;
  const verified = await api(ctx, 'POST', '/v1/auth/staff/totp/verify', {
    body: { challenge, code: totpNow(ctx, secret) },
  });
  if (verified.status !== 200) throw new Error(`2fa failed: ${JSON.stringify(verified.body)}`);
  return {
    ...(verified.body as {
      accessToken: string;
      refreshToken: string;
      user: { id: string; phoneE164: string; name: string };
    }),
    secret,
  };
}
