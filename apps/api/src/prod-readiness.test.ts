import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { gateLinks, invitations } from '@harusi/db';
import { clientIp } from './rate-limit';
import { checkMessageVolume } from './spend-alert';
import { api, createTestContext, loginAs, type TestContext } from './testing/test-app';

// Regression tests for the production-readiness audit (docs/ops/production-readiness-audit.md).

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(() => ctx.close());

let seq = 0;
async function eventWithGuests(n: number) {
  const owner = await loginAs(ctx, `07881${String(++seq).padStart(5, '0')}`);
  const t = owner.accessToken;
  const ev = (
    await api(ctx, 'POST', '/v1/events', {
      token: t,
      body: { title: 'Harusi', coupleNames: 'Asha & Juma', dateStart: '2027-06-01T10:00:00+03:00' },
    })
  ).body!;
  const phones: string[] = [];
  for (let i = 0; i < n; i++) {
    const phone = `+2557135${String(seq).padStart(2, '0')}${String(i).padStart(3, '0')}`;
    phones.push(phone);
    await api(ctx, 'POST', `/v1/events/${ev.id}/guests`, {
      token: t,
      body: { displayName: `Mgeni ${i}`, phone, hasSmartphone: false, language: 'sw' },
    });
  }
  return { t, evId: ev.id as string, phones };
}
const send = (evId: string, t: string, body: unknown, headers: Record<string, string> = {}) =>
  ctx.app.request(`/v1/events/${evId}/invitations/send`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${t}`, ...headers },
    body: JSON.stringify(body),
  });
const textsTo = (phones: string[]) => ctx.sms.sent.filter((m) => phones.includes(m.to)).length;

describe('client IP for rate limits', () => {
  const headers = (h: Record<string, string>) => (name: string) => h[name];

  it('ignores the client-written start of X-Forwarded-For and uses the hop our proxy added', () => {
    expect(clientIp(headers({ 'x-forwarded-for': '6.6.6.6, 41.59.1.2' }), null)).toBe('41.59.1.2');
    expect(clientIp(headers({ 'x-forwarded-for': '41.59.1.2' }), null)).toBe('41.59.1.2');
    expect(clientIp(headers({}), null)).toBe('local');
  });

  it('prefers the edge header when one is configured, and falls back without it', () => {
    const h = { 'cf-connecting-ip': '41.59.9.9', 'x-forwarded-for': '6.6.6.6, 172.70.1.1' };
    expect(clientIp(headers(h), 'cf-connecting-ip')).toBe('41.59.9.9');
    expect(clientIp(headers({ 'x-forwarded-for': '172.70.1.1' }), 'cf-connecting-ip')).toBe(
      '172.70.1.1',
    );
  });
});

describe('login code limits (SMS pumping)', () => {
  const request = (c: TestContext, phone: string, ip: string) =>
    c.app.request('/v1/auth/otp/request', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify({ phone }),
    });

  it('caps codes per IP across different numbers, and spoofing the header does not reset it', async () => {
    const c = await createTestContext({ env: { OTP_IP_HOURLY_LIMIT: '3' } });
    try {
      for (let i = 0; i < 3; i++)
        expect((await request(c, `07120000${10 + i}`, `9.9.9.${i}, 41.0.0.1`)).status).toBe(200);
      expect((await request(c, '0712000020', '8.8.8.8, 41.0.0.1')).status).toBe(429);
      expect((await request(c, '0712000021', '41.0.0.2')).status).toBe(200); // another caller
    } finally {
      await c.close();
    }
  });

  it('stops all codes past the hourly total and reports it once', async () => {
    const c = await createTestContext({ env: { OTP_GLOBAL_HOURLY_LIMIT: '2' } });
    const reported: string[] = [];
    c.deps.reportError = (e) => void reported.push(e.message);
    try {
      expect((await request(c, '0712000031', '41.0.0.1')).status).toBe(200);
      expect((await request(c, '0712000032', '41.0.0.2')).status).toBe(200);
      expect((await request(c, '0712000033', '41.0.0.3')).status).toBe(429);
      expect((await request(c, '0712000034', '41.0.0.4')).status).toBe(429);
      expect(reported).toEqual(['OTP hourly limit reached: login codes are being refused']);
    } finally {
      await c.close();
    }
  });
});

describe('sends running at the same time', () => {
  it('an Idempotency-Key retry that arrives while the first send runs does not send again', async () => {
    const { t, evId, phones } = await eventWithGuests(4);
    const key = { 'idempotency-key': 'double-tap-0001' };
    const [a, b] = await Promise.all([
      send(evId, t, { target: 'remaining' }, key),
      send(evId, t, { target: 'remaining' }, key),
    ]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([200, 409]);
    const conflict = await (a.status === 409 ? a : b).json();
    expect(conflict.error.details.reason).toBe('in_progress');
    expect(textsTo(phones)).toBe(4); // one text per guest, not two

    // once finished, the same key replays the stored answer
    const replay = await send(evId, t, { target: 'remaining' }, key);
    expect(replay.status).toBe(200);
    expect(replay.headers.get('idempotent-replayed')).toBe('true');
    expect(textsTo(phones)).toBe(4);
  });

  it('a request that failed frees its key for the retry', async () => {
    const { t, evId } = await eventWithGuests(1);
    const key = { 'idempotency-key': 'retry-after-400' };
    expect((await send(evId, t, { target: 'unanswered' }, key)).status).toBe(400);
    expect((await send(evId, t, { target: 'remaining' }, key)).status).toBe(200);
  });

  it('two sends to the remaining guests at once reach each guest exactly once', async () => {
    const { t, evId, phones } = await eventWithGuests(6);
    const [a, b] = await Promise.all([
      send(evId, t, { target: 'remaining' }),
      send(evId, t, { target: 'remaining' }),
    ]);
    const [ra, rb] = [await a.json(), await b.json()];
    expect(ra.sent + rb.sent).toBe(6);
    expect(textsTo(phones)).toBe(6);
    for (const p of phones) expect(ctx.sms.sent.filter((m) => m.to === p)).toHaveLength(1);
  });

  it('a guest left `queued` by a send that died is picked up again later', async () => {
    const { t, evId, phones } = await eventWithGuests(2);
    const ids = (
      (await api(ctx, 'GET', `/v1/events/${evId}/guests`, { token: t })).body!.items as {
        id: string;
      }[]
    ).map((g) => g.id);
    const mine = (await ctx.db.select().from(invitations)).filter((r) => ids.includes(r.guestId));
    expect(mine).toHaveLength(2);
    // a claim from a crashed run, 20 minutes old, and one from a run still going (fresh)
    await ctx.db
      .update(invitations)
      .set({ status: 'queued', updatedAt: new Date(ctx.deps.now().getTime() - 20 * 60_000) })
      .where(eq(invitations.id, mine.at(-2)!.id));
    await ctx.db
      .update(invitations)
      .set({ status: 'queued', updatedAt: ctx.deps.now() })
      .where(eq(invitations.id, mine.at(-1)!.id));
    const res = await (await send(evId, t, { target: 'remaining' })).json();
    expect(res).toMatchObject({ total: 1, sent: 1 });
    expect(textsTo(phones)).toBe(1);
  });

  it('a send that fails gives the guest back, so the next send retries them', async () => {
    const { t, evId, phones } = await eventWithGuests(1);
    ctx.fail.sms = (to) => to === phones[0];
    try {
      expect(await (await send(evId, t, { target: 'remaining' })).json()).toMatchObject({
        failed: 1,
      });
    } finally {
      ctx.fail.sms = () => false;
    }
    expect(await (await send(evId, t, { target: 'remaining' })).json()).toMatchObject({ sent: 1 });
  });
});

describe('gate PIN lockout under parallel guesses', () => {
  it('a burst of wrong PINs locks the link, so the right PIN is refused afterwards', async () => {
    const { t, evId } = await eventWithGuests(0);
    const link = (await api(ctx, 'POST', `/v1/events/${evId}/gate-links`, { token: t })).body!;
    const join = (pin: string, i: number) =>
      ctx.app.request('/v1/gate/join', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': `41.1.1.${i}` },
        body: JSON.stringify({ code: link.code, pin, deviceId: `device-burst-${i}` }),
      });
    const wrong = link.pin === '000000' ? '000001' : '000000';
    const burst = await Promise.all(Array.from({ length: 10 }, (_, i) => join(wrong, i)));
    expect(burst.every((r) => r.status === 401 || r.status === 423)).toBe(true);
    expect((await join(link.pin, 99)).status).toBe(423);
    const [row] = await ctx.db.select().from(gateLinks).where(eq(gateLinks.code, link.code));
    expect(row!.lockedUntil).not.toBeNull();
  });
});

describe('gate sync from two devices at once', () => {
  it('admits the guest once; the later scan is a duplicate', async () => {
    const { t, evId } = await eventWithGuests(1);
    const [g] = (await api(ctx, 'GET', `/v1/events/${evId}/guests`, { token: t })).body!.items as {
      id: string;
    }[];
    const scan = (device: string, at: string) =>
      api(ctx, 'POST', `/v1/events/${evId}/gate/scans/sync`, {
        token: t,
        body: {
          deviceId: device,
          scans: [
            {
              clientId: `${device}-1`,
              guestId: g!.id,
              result: 'ok',
              partyAdmitted: 1,
              scannedAt: at,
              offline: true,
            },
          ],
        },
      });
    const [a, b] = await Promise.all([
      scan('device-a', '2027-06-01T14:00:05Z'),
      scan('device-b', '2027-06-01T14:00:01Z'),
    ]);
    expect([a.status, b.status]).toEqual([200, 200]);
    const rows = await ctx.db.execute(
      sql`select device_id, result from scan_log where guest_id = ${g!.id} order by scanned_at`,
    );
    const results = (rows as unknown as { rows: { device_id: string; result: string }[] }).rows;
    expect(results.map((r) => r.result)).toEqual(['ok', 'duplicate']);
    expect(results[0]!.device_id).toBe('device-b'); // the earlier scan wins
  });
});

describe('Firebase code go-ahead (finding 23)', () => {
  const start = (c: TestContext, phone: string, ip: string) =>
    c.app.request('/v1/auth/firebase/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify({ phone }),
    });

  it('normalises the number and refuses numbers outside the allowed countries', async () => {
    const ok = await start(ctx, '0712345601', '41.2.0.1');
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ phone: '+255712345601' });
    expect((await start(ctx, '+447700900123', '41.2.0.2')).status).toBe(400);
    expect((await start(ctx, 'not a phone', '41.2.0.3')).status).toBe(400);
  });

  it('caps codes per number', async () => {
    for (let i = 0; i < 5; i++)
      expect((await start(ctx, '0712345602', `41.2.1.${i}`)).status).toBe(200);
    expect((await start(ctx, '0712345602', '41.2.1.9')).status).toBe(429);
  });

  it('shares the per-IP and hourly budget with SMS codes', async () => {
    const c = await createTestContext({
      env: { OTP_IP_HOURLY_LIMIT: '2', OTP_GLOBAL_HOURLY_LIMIT: '3' },
    });
    const reported: string[] = [];
    c.deps.reportError = (e) => void reported.push(e.message);
    try {
      const sms = (phone: string, ip: string) =>
        c.app.request('/v1/auth/otp/request', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
          body: JSON.stringify({ phone }),
        });
      expect((await sms('0712345611', '41.3.0.1')).status).toBe(200);
      expect((await start(c, '0712345612', '41.3.0.1')).status).toBe(200);
      expect((await start(c, '0712345613', '41.3.0.1')).status).toBe(429); // same IP, budget spent
      expect((await start(c, '0712345614', '41.3.0.2')).status).toBe(200);
      expect((await start(c, '0712345615', '41.3.0.3')).status).toBe(429); // hourly total spent
      expect(reported).toEqual(['OTP hourly limit reached: login codes are being refused']);
    } finally {
      await c.close();
    }
  });
});

describe('message volume alert', () => {
  it('reports once the 24-hour count passes MESSAGE_DAILY_ALERT', async () => {
    const reported: string[] = [];
    const deps = {
      ...ctx.deps,
      config: { ...ctx.deps.config, messageDailyAlert: 1 },
      reportError: (e: Error) => void reported.push(e.message),
    };
    const r = await checkMessageVolume(deps);
    expect(r.last24h).toBeGreaterThan(1);
    expect(r.alerted).toBe(true);
    expect(reported[0]).toMatch(/Message volume alert/);
    const off = await checkMessageVolume({
      ...deps,
      config: { ...deps.config, messageDailyAlert: 0 },
    });
    expect(off.alerted).toBe(false);
  });
});
