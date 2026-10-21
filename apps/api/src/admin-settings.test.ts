import { ContributionRecords } from './services/contribution-records';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { auditLog, brandSettings, messagingSettings, paymentSettings, payments } from '@harusi/db';
import { signSnippeWebhook } from '@harusi/payments';
import {
  api,
  createTestContext,
  loginAs,
  loginAsStaff,
  type TestContext,
} from './testing/test-app';
import { PaymentSettingsService, paymentSettingsProblem } from './services/payment-settings';

let ctx: TestContext;
let admin: string;
let support: string;
let customer: string;

const API_URL = 'https://api.harusi.test';
const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="#0f5c4d"/></svg>';
// 1×1 transparent PNG
const PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

beforeAll(async () => {
  ctx = await createTestContext({ env: { API_PUBLIC_URL: API_URL } });
  const a = await loginAsStaff(ctx, '0711800001', 'admin');
  const s = await loginAsStaff(ctx, '0711800002', 'support');
  const c = await loginAs(ctx, '0711800003');
  admin = a.accessToken;
  support = s.accessToken;
  customer = c.accessToken;
});
afterAll(() => ctx.close());
afterEach(() => vi.unstubAllGlobals());

const brandBody = {
  businessName: 'Kadi Sasa',
  tagline: 'Mialiko ya harusi',
  primary: '#1F3A5F',
  accent: '#A0662A',
  fontBody: 'humanist',
  fontDisplay: 'classical',
};

describe('business branding (ADR 036)', () => {
  it('is readable by anyone, with defaults until staff save something', async () => {
    const r = await api(ctx, 'GET', '/v1/branding'); // no token
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({
      businessName: 'Kadi Sasa',
      primary: null,
      logoUrl: null,
      fontBody: 'system',
    });
  });

  it('changes only for admin staff', async () => {
    for (const [token, status] of [
      [undefined, 401],
      [customer, 403],
      [support, 403],
    ] as const) {
      expect((await api(ctx, 'GET', '/v1/ops/branding', { token })).status).toBe(status);
      expect((await api(ctx, 'PUT', '/v1/ops/branding', { token, body: brandBody })).status).toBe(
        status,
      );
      expect(
        (
          await api(ctx, 'PUT', '/v1/ops/branding/logo', {
            token,
            body: { mime: 'image/svg+xml', data: SVG },
          })
        ).status,
      ).toBe(status);
    }
    expect(
      (await api(ctx, 'PUT', '/v1/ops/branding', { token: support, body: brandBody })).body!.error
        .message,
    ).toBe('missing_permission');
  });

  it('saves name, colours and fonts, publishes them, and picks readable text for the primary', async () => {
    const r = await api(ctx, 'PUT', '/v1/ops/branding', { token: admin, body: brandBody });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({
      businessName: 'Kadi Sasa',
      source: 'database',
      onPrimary: '#FFFFFF',
    });
    const pub = await api(ctx, 'GET', '/v1/branding');
    expect(pub.body).toMatchObject({
      businessName: 'Kadi Sasa',
      tagline: 'Mialiko ya harusi',
      primary: '#1F3A5F',
      accent: '#A0662A',
      fontBody: 'humanist',
      fontDisplay: 'classical',
    });
    // a bare `#abc` style value is normalised, an empty value clears the colour
    const cleared = await api(ctx, 'PUT', '/v1/ops/branding', {
      token: admin,
      body: { ...brandBody, primary: '', accent: null },
    });
    expect(cleared.body).toMatchObject({ primary: null, accent: null, onPrimary: null });
    await api(ctx, 'PUT', '/v1/ops/branding', { token: admin, body: brandBody });
  });

  it('refuses colours that are hard to read, naming the pair and ratio', async () => {
    const r = await api(ctx, 'PUT', '/v1/ops/branding', {
      token: admin,
      body: { ...brandBody, primary: '#FFEB3B' },
    });
    expect(r.status).toBe(400);
    expect(r.body!.error.details.issues[0]).toMatchObject({ pair: expect.any(String) });
    expect(r.body!.error.details.issues[0].ratio).toBeLessThan(4.5);
    const light = await api(ctx, 'PUT', '/v1/ops/branding', {
      token: admin,
      body: { ...brandBody, accent: '#F0F0F0' },
    });
    expect(light.status).toBe(400);
    expect(light.body!.error.details.field).toBe('accent');
    expect((await api(ctx, 'GET', '/v1/branding')).body!.primary).toBe('#1F3A5F'); // unchanged
  });

  it('refuses a bad hex, an unknown font, an empty name and an over-long name', async () => {
    const put = (over: object) =>
      api(ctx, 'PUT', '/v1/ops/branding', { token: admin, body: { ...brandBody, ...over } });
    expect((await put({ primary: 'blue' })).status).toBe(400);
    expect((await put({ fontBody: 'comic-sans' })).status).toBe(400);
    expect((await put({ fontDisplay: 'rounded' })).status).toBe(400); // a body font, not a display one
    expect((await put({ businessName: '   ' })).status).toBe(400);
    expect((await put({ businessName: 'x'.repeat(81) })).status).toBe(400);
  });

  it('keeps names of changed fields in the audit trail, not their values', async () => {
    await api(ctx, 'PUT', '/v1/ops/branding', {
      token: admin,
      body: { ...brandBody, businessName: 'Audit Co' },
    });
    const rows = await ctx.db
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, 'ops.branding.update'));
    const last = rows.at(-1)!;
    expect(JSON.stringify(last.diff)).toContain('businessName');
    expect(JSON.stringify(last.diff)).not.toContain('Audit Co');
    await api(ctx, 'PUT', '/v1/ops/branding', { token: admin, body: brandBody });
  });

  describe('logo', () => {
    it('accepts an SVG and serves it as an image with a locked-down policy', async () => {
      const put = await api(ctx, 'PUT', '/v1/ops/branding/logo', {
        token: admin,
        body: { mime: 'image/svg+xml', data: SVG },
      });
      expect(put.status).toBe(200);
      expect(put.body).toMatchObject({ logoMime: 'image/svg+xml' });
      const url = put.body!.logoUrl as string;
      expect(url).toMatch(/^\/v1\/branding\/logo\?v=\d+$/);

      const res = await ctx.app.request(url); // public, no token
      expect(res.status).toBe(200);
      expect(await res.text()).toBe(SVG);
      expect(res.headers.get('content-type')).toBe('image/svg+xml');
      expect(res.headers.get('x-content-type-options')).toBe('nosniff');
      expect(res.headers.get('content-security-policy')).toContain('sandbox');
      expect(res.headers.get('content-security-policy')).toContain("default-src 'none'");
      expect(res.headers.get('cache-control')).toContain('immutable');
      expect(res.headers.get('cross-origin-resource-policy')).toBe('cross-origin');

      const etag = res.headers.get('etag')!;
      const again = await ctx.app.request(url, { headers: { 'if-none-match': etag } });
      expect(again.status).toBe(304);
      // an unversioned URL revalidates instead of caching for a year
      const bare = await ctx.app.request('/v1/branding/logo');
      expect(bare.headers.get('cache-control')).not.toContain('immutable');
    });

    it('rejects hostile SVGs and stores nothing', async () => {
      const before = (await ctx.db.select().from(brandSettings))[0]!.logoVersion;
      const evil = [
        [
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><script>alert(1)</script></svg>',
          'forbidden_element',
        ],
        [
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1" onload="alert(1)"></svg>',
          'event_handler',
        ],
        [
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><image href="https://evil.test/a.png"/></svg>',
          'external_reference',
        ],
        [
          '<!DOCTYPE svg [<!ENTITY x "y">]><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"/>',
          'doctype',
        ],
        ['<html></html>', 'not_svg'],
      ] as const;
      for (const [data, reason] of evil) {
        const r = await api(ctx, 'PUT', '/v1/ops/branding/logo', {
          token: admin,
          body: { mime: 'image/svg+xml', data },
        });
        expect(r.status).toBe(400);
        expect(r.body!.error.details.reason).toBe(reason);
      }
      expect((await ctx.db.select().from(brandSettings))[0]!.logoVersion).toBe(before);
    });

    it('accepts a real PNG, refuses one that is not what it claims, and each upload bumps the version', async () => {
      const v1 = (await ctx.db.select().from(brandSettings))[0]!.logoVersion;
      const png = await api(ctx, 'PUT', '/v1/ops/branding/logo', {
        token: admin,
        body: { mime: 'image/png', data: PNG_B64 },
      });
      expect(png.status).toBe(200);
      expect(png.body!.logoUrl).toContain(`v=${v1 + 1}`);
      const res = await ctx.app.request(png.body!.logoUrl as string);
      expect(res.headers.get('content-type')).toBe('image/png');
      expect(
        Buffer.from(await res.arrayBuffer())
          .subarray(0, 4)
          .toString('hex'),
      ).toBe('89504e47');

      // the same bytes labelled JPEG, and HTML labelled PNG, are refused
      for (const [mime, data] of [
        ['image/jpeg', PNG_B64],
        ['image/png', Buffer.from('<html><script>1</script></html>').toString('base64')],
      ] as const) {
        const r = await api(ctx, 'PUT', '/v1/ops/branding/logo', {
          token: admin,
          body: { mime, data },
        });
        expect(r.status).toBe(400);
        expect(r.body!.error.details.reason).toBe('type_mismatch');
      }
      expect(
        (
          await api(ctx, 'PUT', '/v1/ops/branding/logo', {
            token: admin,
            body: { mime: 'image/gif', data: 'R0lGOD' },
          })
        ).status,
      ).toBe(400);
    });

    it('refuses a file over 200 KB', async () => {
      const big = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><!--${'x'.repeat(210_000)}--></svg>`;
      const r = await api(ctx, 'PUT', '/v1/ops/branding/logo', {
        token: admin,
        body: { mime: 'image/svg+xml', data: big },
      });
      expect(r.status).toBe(400);
    });

    it('can be removed, after which the public route answers 404', async () => {
      const r = await api(ctx, 'DELETE', '/v1/ops/branding/logo', { token: admin });
      expect(r.status).toBe(200);
      expect(r.body!.logoUrl).toBeNull();
      expect((await ctx.app.request('/v1/branding/logo')).status).toBe(404);
      expect((await api(ctx, 'GET', '/v1/branding')).body!.logoUrl).toBeNull();
    });
  });
});

describe('payment gateway settings (ADR 036)', () => {
  const snippe = {
    provider: 'snippe',
    fields: {
      apiKey: 'snp_live_abcdwxyz',
      webhookSigningKey: 'whsec_super_secret_1234',
      environment: 'sandbox',
    },
  };

  it('is admin staff only', async () => {
    for (const [token, status] of [
      [customer, 403],
      [support, 403],
      [undefined, 401],
    ] as const)
      expect((await api(ctx, 'GET', '/v1/ops/payment-settings', { token })).status).toBe(status);
    expect(
      (await api(ctx, 'PUT', '/v1/ops/payment-settings/tz', { token: support, body: snippe }))
        .status,
    ).toBe(403);
  });

  it('starts on the environment (fake) and shows the webhook URL to give Snippe', async () => {
    const r = await api(ctx, 'GET', '/v1/ops/payment-settings', { token: admin });
    expect(r.body!.routes[0]).toMatchObject({
      route: 'tz',
      provider: 'fake',
      source: 'environment',
    });
    expect(r.body!.webhooks).toEqual([
      { route: 'tz', provider: 'snippe', url: `${API_URL}/v1/payments/webhook/snippe` },
    ]);
  });

  it('refuses incomplete or unknown settings and stores nothing', async () => {
    const miss = await api(ctx, 'PUT', '/v1/ops/payment-settings/tz', {
      token: admin,
      body: { provider: 'snippe', fields: { apiKey: 'snp_x' } },
    });
    expect(miss.status).toBe(400);
    expect(miss.body!.error.details.missing).toEqual(['webhookSigningKey']);
    const bad = await api(ctx, 'PUT', '/v1/ops/payment-settings/tz', {
      token: admin,
      body: { ...snippe, fields: { ...snippe.fields, environment: 'staging' } },
    });
    expect(bad.status).toBe(400);
    expect(
      (
        await api(ctx, 'PUT', '/v1/ops/payment-settings/tz', {
          token: admin,
          body: { provider: 'mpesa-direct', fields: {} },
        })
      ).status,
    ).toBe(400);
    expect(await ctx.db.select().from(paymentSettings)).toHaveLength(0);
    expect(ctx.deps.payments?.name).toBe('fake');
  });

  it('refuses Snippe when the API has no public URL to receive results on', () => {
    expect(paymentSettingsProblem('tz', snippe, { apiPublicUrl: null })).toContain(
      'API_PUBLIC_URL',
    );
    expect(paymentSettingsProblem('tz', snippe, { apiPublicUrl: API_URL })).toBeNull();
  });

  let reference = '';
  let providerRef = '';
  it('saves Snippe encrypted, masks the secrets, and swaps the live provider without a restart', async () => {
    const r = await api(ctx, 'PUT', '/v1/ops/payment-settings/tz', { token: admin, body: snippe });
    expect(r.status).toBe(200);
    expect(r.body!.routes[0]).toMatchObject({
      provider: 'snippe',
      source: 'database',
      active: 'snippe',
      fields: { environment: 'sandbox' },
      secrets: { apiKey: '…wxyz', webhookSigningKey: '…1234' },
    });
    expect(JSON.stringify(r.body)).not.toContain('snp_live_abcd');
    expect(JSON.stringify(r.body)).not.toContain('super_secret');
    expect(ctx.deps.payments?.name).toBe('snippe');
    const [row] = await ctx.db.select().from(paymentSettings);
    expect(row!.configEnc).not.toContain('snp_live'); // encrypted at rest
    const log = (
      await ctx.db.select().from(auditLog).where(eq(auditLog.action, 'ops.payments.update'))
    ).at(-1)!;
    expect(JSON.stringify(log.diff)).toContain('apiKey');
    expect(JSON.stringify(log.diff)).not.toContain('snp_live');
  });

  it('keeps a saved secret when the field is left empty', async () => {
    const r = await api(ctx, 'PUT', '/v1/ops/payment-settings/tz', {
      token: admin,
      body: {
        provider: 'snippe',
        fields: {
          apiKey: '',
          webhookSigningKey: '',
          environment: 'production',
          receiptEmail: 'pay@harusi.test',
        },
      },
    });
    expect(r.status).toBe(200);
    expect(r.body!.routes[0].secrets.apiKey).toBe('…wxyz');
    expect(r.body!.routes[0].fields).toMatchObject({
      environment: 'production',
      receiptEmail: 'pay@harusi.test',
    });
  });

  it('collects through Snippe and settles on a signed callback, once', async () => {
    // an organiser, an event and a guest who can pay
    const owner = await loginAs(ctx, '0711800010');
    const ev = (
      await api(ctx, 'POST', '/v1/events', {
        token: owner.accessToken,
        body: {
          title: 'Harusi',
          coupleNames: 'Neema na Juma',
          dateStart: '2027-06-01T10:00:00+03:00',
        },
      })
    ).body!;
    const g = (
      await api(ctx, 'POST', `/v1/events/${ev.id}/guests`, {
        token: owner.accessToken,
        body: { displayName: 'Asha Mwinyi', phone: '0713345678', cardKind: 'contribution' },
      })
    ).body!;

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      void url;
      void init;
      return new Response(
        JSON.stringify({ status: 'success', data: { reference: 'snp_pay_42' } }),
        { status: 201 },
      );
    });
    vi.stubGlobal('fetch', fetchMock);
    ctx.clock.now += 61_000;
    const start = await ctx.app.request(`/v1/c/${g.cardToken}/pay`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'snippe-key-0001' },
      body: JSON.stringify({ amount: 20_000, phone: '0713 345 678', method: 'mpesa' }),
    });
    expect(start.status).toBe(201);
    reference = ((await start.json()) as { reference: string }).reference;
    const call = fetchMock.mock.calls[0]!;
    expect(String(call[0])).toBe('https://api.snippe.sh/v1/payments');
    const sent = JSON.parse(String((call[1] as RequestInit).body));
    expect(sent).toMatchObject({
      payment_type: 'mobile',
      details: { amount: 20_000, currency: 'TZS' },
      phone_number: '255713345678',
      webhook_url: `${API_URL}/v1/payments/webhook/snippe`,
      metadata: { reference },
      customer: { email: 'pay@harusi.test' },
    });
    const [pending] = await ctx.db
      .select()
      .from(payments)
      .where(eq(payments.providerRef, reference));
    expect(await ContributionRecords.of(ctx.deps).openPayment(pending!)).toMatchObject({
      provider: 'snippe',
      status: 'pending',
      amount: 20_000,
    });
    providerRef = (pending!.raw as { providerRef: string }).providerRef;
    expect(providerRef).toBe('snp_pay_42');

    const event = JSON.stringify({
      id: 'evt_1',
      type: 'payment.completed',
      data: {
        reference: providerRef,
        status: 'completed',
        amount: { value: 20_000, currency: 'TZS' },
        metadata: { reference },
        completed_at: new Date(ctx.clock.now).toISOString(),
      },
    });
    const post = (raw: string, headers: Record<string, string>) =>
      ctx.app.request('/v1/payments/webhook/snippe', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: raw,
      });
    const key = 'whsec_super_secret_1234';
    const nowSec = Math.floor(Date.now() / 1000);

    // wrong key, tampered body and a replayed old callback never reach the ledger
    expect((await post(event, signSnippeWebhook(event, 'wrong-key', nowSec))).status).toBe(401);
    expect((await post(event + ' ', signSnippeWebhook(event, key, nowSec))).status).toBe(401);
    expect((await post(event, signSnippeWebhook(event, key, nowSec - 3600))).status).toBe(401);
    expect((await post(event, {})).status).toBe(401);
    expect(
      (await ctx.db.select().from(payments).where(eq(payments.providerRef, reference)))[0]!.status,
    ).toBe('pending');

    const ok = await post(event, signSnippeWebhook(event, key, nowSec));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ known: true, applied: true, duplicate: false });
    expect(
      await ContributionRecords.of(ctx.deps).openPayment(
        (await ctx.db.select().from(payments).where(eq(payments.providerRef, reference)))[0]!,
      ),
    ).toMatchObject({
      status: 'success',
      amount: 20_000,
    });
    const status = await ctx.app.request(`/v1/payments/${reference}/status`);
    expect(((await status.json()) as { status: string }).status).toBe('success');

    // Snippe delivers the same event twice: recorded once
    const replay = await post(event, signSnippeWebhook(event, key, nowSec));
    expect(await replay.json()).toMatchObject({ applied: false, duplicate: true });
  });

  it('tests the connection without moving money, and says when the key is rejected', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 200 })),
    );
    const ok = await api(ctx, 'POST', '/v1/ops/payment-settings/tz/test', { token: admin });
    expect(ok.body).toMatchObject({ ok: true, provider: 'snippe', status: 200, error: null });
    const url = String((vi.mocked(fetch).mock.calls[0] as unknown[])[0]);
    expect(url).toBe('https://api.snippe.sh/v1/payments/balance');

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 401 })),
    );
    const bad = await api(ctx, 'POST', '/v1/ops/payment-settings/tz/test', { token: admin });
    expect(bad.body).toMatchObject({ ok: false, status: 401, error: 'The API key was rejected' });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );
    expect(
      (await api(ctx, 'POST', '/v1/ops/payment-settings/tz/test', { token: admin })).body,
    ).toMatchObject({ ok: false, error: 'network down' });
    expect(
      (await api(ctx, 'POST', '/v1/ops/payment-settings/tz/test', { token: support })).status,
    ).toBe(403);
  });

  it('another API instance picks the saved settings up on its next refresh', async () => {
    const live = () => ctx.deps.payments?.name; // read afresh: TypeScript would narrow a repeated access
    ctx.deps.payments = undefined; // as if this instance had started from the environment
    expect(live()).toBeUndefined();
    await new PaymentSettingsService(ctx.deps).refresh(true);
    expect(live()).toBe('snippe');
  });

  it('goes back to the environment on reset', async () => {
    const r = await api(ctx, 'DELETE', '/v1/ops/payment-settings/tz', { token: admin });
    expect(r.status).toBe(200);
    expect(r.body!.routes[0]).toMatchObject({ provider: 'fake', source: 'environment' });
    expect(ctx.deps.payments?.name).toBe('fake');
    expect(await ctx.db.select().from(paymentSettings)).toHaveLength(0);
  });
});

describe('moving SMS and WhatsApp from the environment into settings (ADR 036)', () => {
  let env: TestContext;
  let tok: string;
  beforeAll(async () => {
    env = await createTestContext({
      env: {
        SMS_PROVIDER: 'nextsms',
        NEXTSMS_USERNAME: 'harusi-env',
        NEXTSMS_PASSWORD: 'env-password-9999',
        SMS_SENDER_ID: 'HARUSI',
        WHATSAPP_PROVIDER: 'cloud',
      },
    });
    const a = await loginAsStaff(env, '0711800020', 'admin');
    tok = a.accessToken;
  });
  afterAll(() => env.close());

  it('copies working environment settings into encrypted saved ones, once, without overwriting', async () => {
    const before = await api(env, 'GET', '/v1/ops/messaging', { token: tok });
    expect(before.body!.routes.map((r: { source: string }) => r.source)).toEqual([
      'environment',
      'environment',
    ]);

    const r = await api(env, 'POST', '/v1/ops/messaging/import-env', { token: tok });
    expect(r.status).toBe(200);
    // SMS (TZ) and WhatsApp cloud are both complete in this environment
    expect(r.body!.imported).toEqual(['sms_tz', 'whatsapp']);
    expect(JSON.stringify(r.body)).not.toContain('env-password-9999');
    const sms = r.body!.routes.find((x: { route: string }) => x.route === 'sms_tz');
    expect(sms).toMatchObject({
      provider: 'nextsms',
      source: 'database',
      secrets: { password: '…9999' },
    });
    const rows = await env.db.select().from(messagingSettings);
    expect(rows.map((x) => x.route).sort()).toEqual(['sms_tz', 'whatsapp']);
    expect(rows.every((x) => !x.configEnc.includes('env-password'))).toBe(true);

    // run again: nothing left to copy, nothing overwritten
    const again = await api(env, 'POST', '/v1/ops/messaging/import-env', { token: tok });
    expect(again.body!.imported).toEqual([]);
    const log = (
      await env.db.select().from(auditLog).where(eq(auditLog.action, 'ops.messaging.import_env'))
    ).at(-1)!;
    expect(JSON.stringify(log.diff)).not.toContain('env-password');
  });

  it('skips routes whose environment settings are fake, and is admin only', async () => {
    const plain = await createTestContext();
    const a = await loginAsStaff(plain, '0711800030', 'admin');
    const s = await loginAsStaff(plain, '0711800031', 'billing');
    expect(
      (await api(plain, 'POST', '/v1/ops/messaging/import-env', { token: a.accessToken })).body!
        .imported,
    ).toEqual([]);
    expect(
      (await api(plain, 'POST', '/v1/ops/messaging/import-env', { token: s.accessToken })).status,
    ).toBe(403);
    plain.close();
  });
});

describe('CORS for the staff panel', () => {
  it('lets the browser send PUT (settings are saved with PUT from another origin)', async () => {
    const res = await ctx.app.request('/v1/ops/branding', {
      method: 'OPTIONS',
      headers: {
        origin: 'http://localhost:3000',
        'access-control-request-method': 'PUT',
        'access-control-request-headers': 'authorization,content-type',
      },
    });
    expect(res.headers.get('access-control-allow-methods')).toContain('PUT');
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:3000');
  });
});
