import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { loadConfig } from './config';
import { api, createTestContext, loginAs, type TestContext } from './testing/test-app';

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(() => ctx.close());

let seq = 0;
async function setup() {
  const owner = await loginAs(ctx, `07770${String(++seq).padStart(5, '0')}`);
  const t = owner.accessToken;
  const ev = (
    await api(ctx, 'POST', '/v1/events', {
      token: t,
      body: { title: 'Harusi', coupleNames: 'Asha & Juma', dateStart: '2027-06-01T10:00:00+03:00' },
    })
  ).body!;
  const g = (
    await api(ctx, 'POST', `/v1/events/${ev.id}/guests`, {
      token: t,
      body: {
        displayName: 'Bibi Pendo',
        phone: `0714${String(600000 + seq)}`,
        notes: 'mzee, kiti cha mbele',
      },
    })
  ).body!;
  return { t, evId: ev.id as string, g: g as { id: string; cardToken: string } };
}

describe('headers, readiness and logging', () => {
  it('sends security headers on every response, including errors', async () => {
    for (const path of ['/health', '/v1/me', '/nope']) {
      const res = await ctx.app.request(path);
      expect(res.headers.get('strict-transport-security')).toContain('max-age=');
      expect(res.headers.get('x-content-type-options')).toBe('nosniff');
      expect(res.headers.get('x-frame-options')).toBe('DENY');
      expect(res.headers.get('content-security-policy')).toContain("default-src 'none'");
      expect(res.headers.get('referrer-policy')).toBe('no-referrer');
    }
  });

  it('answers /ready from the database', async () => {
    const res = await ctx.app.request('/ready');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: 'ready' });
  });

  it('logs the route pattern, never the card token, and one line per request', async () => {
    const logs: string[] = [];
    const spy = vi
      .spyOn(console, 'log')
      .mockImplementation((s: string) => void logs.push(String(s)));
    try {
      const { g } = await setup();
      const logging = createTestApp();
      await logging.request(`/v1/c/${g.cardToken}`);
      expect(logs.length).toBeGreaterThan(0);
      const line = JSON.parse(logs.at(-1)!);
      expect(line).toMatchObject({ msg: 'req', method: 'GET', route: '/v1/c/:token', status: 200 });
      expect(logs.join('\n')).not.toContain(g.cardToken);
      expect(typeof line.ms).toBe('number');
    } finally {
      spy.mockRestore();
    }
  });
});

// the same app with request logging on (the shared test app keeps it off to stay quiet)
function createTestApp() {
  const deps = { ...ctx.deps, config: { ...ctx.deps.config, logRequests: true } };
  return ctxApp(deps);
}
import { createApp } from './app';
function ctxApp(deps: typeof ctx.deps) {
  return createApp(deps);
}

describe('audit trail', () => {
  it('records sensitive actions for the owner to read, and nobody else can', async () => {
    const { t, evId, g } = await setup();
    await api(ctx, 'POST', `/v1/guests/${g.id}/reissue`, { token: t });
    await api(ctx, 'POST', `/v1/guests/${g.id}/pledges`, { token: t, body: { amount: 30_000 } });
    await api(ctx, 'POST', '/v1/payments/manual', {
      token: t,
      body: { guestId: g.id, amount: 10_000, method: 'cash' },
    });
    await api(ctx, 'POST', `/v1/events/${evId}/gate-links`, { token: t });
    await api(ctx, 'POST', `/v1/events/${evId}/members`, {
      token: t,
      body: { name: 'Kamati', phone: '0777000900', role: 'committee' },
    });
    await api(ctx, 'DELETE', `/v1/events/${evId}/gate-links`, { token: t });
    await api(ctx, 'DELETE', `/v1/guests/${g.id}`, { token: t });

    const res = await api(ctx, 'GET', `/v1/events/${evId}/audit`, { token: t });
    expect(res.status).toBe(200);
    const actions = (res.body!.items as { action: string; actor: string }[]).map((i) => i.action);
    for (const a of [
      'guest.reissue',
      'pledge.create',
      'payment.manual',
      'gatelink.create',
      'member.invite',
      'gatelink.revoke',
      'guest.delete',
    ])
      expect(actions).toContain(a);
    expect(res.body!.items[0].actor).toBeTruthy();
    // newest first, and a secret never lands in the trail
    const times = (res.body!.items as { at: string }[]).map((i) => i.at);
    expect([...times].sort().reverse()).toEqual(times);
    const text = JSON.stringify(res.body);
    expect(text).not.toContain(g.cardToken);
    expect(text).not.toMatch(/\+255\d{9}/);

    const other = await loginAs(ctx, '0777099999');
    expect(
      (await api(ctx, 'GET', `/v1/events/${evId}/audit`, { token: other.accessToken })).status,
    ).toBe(404);
    await api(ctx, 'POST', `/v1/events/${evId}/members`, {
      token: t,
      body: { name: 'Lango', phone: '0777099998', role: 'gate' },
    });
    const gate = await loginAs(ctx, '0777099998');
    expect(
      (await api(ctx, 'GET', `/v1/events/${evId}/audit`, { token: gate.accessToken })).status,
    ).toBe(403);
    expect((await ctx.app.request(`/v1/events/${evId}/audit`)).status).toBe(401);
  });
});

describe('personal data rights', () => {
  it('exports everything held about a guest, and erases it while keeping the accounting', async () => {
    const { t, evId, g } = await setup();
    await api(ctx, 'POST', `/v1/guests/${g.id}/pledges`, {
      token: t,
      body: { amount: 40_000, note: 'ahadi ya mzee' },
    });
    await api(ctx, 'POST', '/v1/payments/manual', {
      token: t,
      body: { guestId: g.id, amount: 15_000, method: 'cash', note: 'alilipa mwenyewe' },
    });

    const exp = await api(ctx, 'GET', `/v1/guests/${g.id}/export`, { token: t });
    expect(exp.status).toBe(200);
    expect(exp.body).toMatchObject({
      guest: { displayName: 'Bibi Pendo', notes: 'mzee, kiti cha mbele' },
      pledge: { amount: 40_000 },
    });
    expect(exp.body!.guest.phoneE164).toMatch(/^\+255/);
    expect(exp.body!.payments).toHaveLength(1);
    expect(JSON.stringify(exp.body)).not.toMatch(/tokenHash|privateKey|cardToken/);

    expect((await api(ctx, 'POST', `/v1/guests/${g.id}/erase`, { token: t })).status).toBe(204);
    const after = await api(ctx, 'GET', `/v1/guests/${g.id}/export`, { token: t });
    expect(after.body!.guest).toMatchObject({
      displayName: 'Mgeni aliyefutwa',
      phoneE164: null,
      notes: null,
    });
    expect(after.body!.payments[0]).toMatchObject({ amount: 15_000, phoneE164: null }); // the amount stays for the books
    expect((await api(ctx, 'GET', `/v1/c/${g.cardToken}`)).body).toMatchObject({
      state: 'invalid',
    });
    const list = await api(ctx, 'GET', `/v1/events/${evId}/guests`, { token: t });
    expect(list.body!.items).toHaveLength(0);
    const audit = await api(ctx, 'GET', `/v1/events/${evId}/audit`, { token: t });
    expect((audit.body!.items as { action: string }[]).map((i) => i.action)).toEqual(
      expect.arrayContaining(['guest.export', 'guest.erase']),
    );
  });

  it('is owner-only', async () => {
    const { t, evId, g } = await setup();
    await api(ctx, 'POST', `/v1/events/${evId}/members`, {
      token: t,
      body: { name: 'Kamati', phone: '0777088888', role: 'committee' },
    });
    const committee = await loginAs(ctx, '0777088888');
    expect(
      (await api(ctx, 'GET', `/v1/guests/${g.id}/export`, { token: committee.accessToken })).status,
    ).toBe(403);
    expect(
      (await api(ctx, 'POST', `/v1/guests/${g.id}/erase`, { token: committee.accessToken })).status,
    ).toBe(403);
    expect((await api(ctx, 'GET', `/v1/guests/${g.id}/export`)).status).toBe(401);
  });
});

describe('config', () => {
  it('logs requests unless switched off', () => {
    const base = { DATABASE_URL: 'x', JWT_SECRET: 'a-long-enough-secret', KEY_ENC_SECRET: 'k' };
    expect(loadConfig({ ...base }).logRequests).toBe(true);
    expect(loadConfig({ ...base, LOG_REQUESTS: '0' }).logRequests).toBe(false);
  });

  it('adds CORS_EXTRA_ORIGINS to the allowed origins', () => {
    const base = { DATABASE_URL: 'x', JWT_SECRET: 'a-long-enough-secret', KEY_ENC_SECRET: 'k' };
    const c = loadConfig({
      ...base,
      CORS_ORIGINS: 'https://kadisasa.com',
      CORS_EXTRA_ORIGINS: 'https://app.kadisasa.com, https://my.kadisasa.com',
    });
    expect(c.corsOrigins).toEqual([
      'https://kadisasa.com',
      'https://app.kadisasa.com',
      'https://my.kadisasa.com',
    ]);
    expect(loadConfig({ ...base, CORS_EXTRA_ORIGINS: '' }).corsOrigins).toEqual([
      'http://localhost:3000',
    ]);
  });

  it('treats empty variables as unset', () => {
    const base = { DATABASE_URL: 'x', JWT_SECRET: 'a-long-enough-secret', KEY_ENC_SECRET: 'k' };
    const c = loadConfig({
      ...base,
      WHATSAPP_PROVIDER: '',
      PAYMENT_PROVIDER: '',
      WEBHOOK_SECRET: '',
      WHATSAPP_FALLBACK_HOURS: '',
      REDIS_URL: '',
    });
    expect(c.whatsappProvider).toBe('fake');
    expect(c.paymentProvider).toBe('fake');
    expect(c.webhookSecret).toBeNull();
    expect(c.whatsappFallbackHours).toBe(6);
    expect(c.redisUrl).toBeNull();
  });
});
