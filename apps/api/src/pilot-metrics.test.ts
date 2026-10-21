import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { guests, messageLog, newId, scanLog } from '@harusi/db';
import {
  api,
  createTestContext,
  loginAs,
  loginAsStaff,
  type TestContext,
} from './testing/test-app';

let ctx: TestContext;
let staff: string;
const guestIds: string[] = [];
const cardTokens: string[] = [];

beforeAll(async () => {
  ctx = await createTestContext({ env: { KENYA_ENABLED: '1' } });
  const owner = await loginAs(ctx, '0711600001');
  const admin = await loginAsStaff(ctx, '0711600002', 'support');
  staff = admin.accessToken;
  const t = owner.accessToken;
  const ev = (
    await api(ctx, 'POST', '/v1/events', {
      token: t,
      body: {
        title: 'Harusi',
        coupleNames: 'Neema',
        dateStart: '2027-06-01T10:00:00+03:00',
        country: 'KE',
      },
    })
  ).body!;
  for (const [name, phone] of [
    ['Wanjiru Kamau', '0712345671'],
    ['Otieno Odhiambo', '0722345672'],
    ['Akinyi Atieno', '0733345673'],
  ] as const) {
    const g = (
      await api(ctx, 'POST', `/v1/events/${ev.id}/guests`, {
        token: t,
        body: { displayName: name, phone, hasSmartphone: false },
      })
    ).body!;
    guestIds.push(g.id);
    cardTokens.push(g.cardToken);
  }
  // SMS to all three; delivery reports: Safaricom delivered, Airtel failed, the third still in flight.
  await api(ctx, 'POST', `/v1/events/${ev.id}/invitations/send`, {
    token: t,
    body: { target: 'remaining', channel: 'sms' },
  });
  const logs = await ctx.db.select().from(messageLog);
  const idOf = (guestId: string) => logs.find((l) => l.guestId === guestId)!.providerMsgId!;
  const dlr = (id: string, form: Record<string, string>) =>
    ctx.app.request('/v1/webhooks/sms/africastalking?secret=hook-secret-for-tests', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id, ...form }).toString(),
    });
  await dlr(idOf(guestIds[0]!), { status: 'Success', networkCode: '63902' });
  await dlr(idOf(guestIds[1]!), {
    status: 'Failed',
    networkCode: '63903',
    failureReason: 'AbsentSubscriber',
  });
  // Two mobile-money payments: one confirmed 30 s after the prompt, one still pending.
  // Paying is for contribution cards (an invitation never asks for money); switched in place so the
  // delivery numbers above stay as they are.
  await ctx.db.update(guests).set({ cardKind: 'contribution' }).where(inArray(guests.id, guestIds));
  const pay = async (token: string, key: string) => {
    ctx.clock.now += 61_000;
    await ctx.app.request(`/v1/c/${token}/pay`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': key },
      body: JSON.stringify({ amount: 500, phone: '0712 345 678', method: 'mpesa' }),
    });
    return ctx.paymentsKe.started.at(-1)!.reference;
  };
  const ref1 = await pay(cardTokens[0]!, 'pilot-pay-0001');
  await pay(cardTokens[1]!, 'pilot-pay-0002');
  ctx.clock.now += 30_000;
  await ctx.app.request('/v1/payments/webhook/fake-ke', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...ctx.paymentsKe.webhookBody({
        reference: ref1,
        status: 'success',
        amount: 500,
        currency: 'KES',
      }).headers,
    },
    body: ctx.paymentsKe.webhookBody({
      reference: ref1,
      status: 'success',
      amount: 500,
      currency: 'KES',
    }).raw,
  });
  // Gate scans written the way the sync endpoint would leave them.
  const t0 = ctx.clock.now;
  const scan = (
    result: 'ok' | 'duplicate' | 'invalid_sig' | 'manual_ok',
    guest: string | null,
    offsetS: number,
    extra: { device?: string; offline?: boolean; at?: number } = {},
  ) => ({
    id: newId(),
    eventId: ev.id,
    guestId: guest,
    deviceId: extra.device ?? 'device-A',
    result,
    scannedAt: new Date(extra.at ?? t0 + offsetS * 1000),
    syncedAt: extra.offline ? null : new Date(t0 + offsetS * 1000),
    offline: extra.offline ?? false,
  });
  await ctx.db.insert(scanLog).values([
    scan('ok', guestIds[0]!, 0),
    scan('ok', guestIds[1]!, 10),
    scan('ok', guestIds[2]!, 25),
    scan('invalid_sig', null, 26),
    scan('duplicate', guestIds[0]!, 27),
    scan('manual_ok', guestIds[0]!, 40),
    scan('duplicate', guestIds[2]!, 0, {
      device: 'device-B',
      offline: true,
      at: t0 - 2 * 3_600_000,
    }),
  ]);
});
afterAll(() => ctx.close());

const get = (path: string, token = staff) => api(ctx, 'GET', path, { token });

describe('pilot metrics (Phase 5)', () => {
  it('is for staff only', async () => {
    const plain = await loginAs(ctx, '0711600003');
    const r = await get('/v1/ops/pilot-metrics?country=KE', plain.accessToken);
    expect(r.status).toBe(403);
    expect((await ctx.app.request('/v1/ops/pilot-metrics', { method: 'GET' })).status).toBe(401);
  });

  it('reports reach, the SMS path and delivery per operator for Kenya', async () => {
    const m = (await get('/v1/ops/pilot-metrics?country=KE')).body!;
    expect(m).toMatchObject({ country: 'KE', windowDays: 30, events: 1 });
    expect(m.reach).toEqual({ guestsWithPhone: 3, reached: 1, rate: 0.333 });
    expect(m.smsPath).toEqual({ invited: 3, viaSms: 3, share: 1 });
    expect(m.messages.find((x: { channel: string }) => x.channel === 'sms')).toMatchObject({
      total: 3,
      delivered: 1,
      failed: 1,
      inFlight: 1,
    });
    const byNet = Object.fromEntries(m.smsByNetwork.map((n: { label: string }) => [n.label, n]));
    expect(byNet['Safaricom']).toMatchObject({ total: 1, delivered: 1, deliveryRate: 1 });
    expect(byNet['Airtel Kenya']).toMatchObject({ total: 1, failed: 1, deliveryRate: 0 });
    expect(byNet['unknown']).toMatchObject({ total: 1, inFlight: 1 });
    const [airtel] = await ctx.db.select().from(messageLog).where(eq(messageLog.network, '63903'));
    expect(airtel!.error).toBe('AbsentSubscriber');
  });

  it('reports payment success and time to confirm, but no contribution money (ADR 043)', async () => {
    const p = (await get('/v1/ops/pilot-metrics?country=KE')).body!.payments;
    expect(p).toMatchObject({
      started: 2,
      success: 1,
      pending: 1,
      failed: 0,
      successRate: 0.5,
      medianSecondsToConfirm: 91,
      timeouts: 0,
      lateSuccesses: 0,
      amountMismatches: 0,
    });
    expect(p.byMethod).toEqual([{ method: 'mpesa', started: 2, success: 1, successRate: 0.5 }]);
    // Contribution amounts are the host's and sealed: staff see counts, never money.
    expect(p.collected).toEqual([]);
  });

  it('reports the gate launch gates', async () => {
    const g = (await get('/v1/ops/pilot-metrics?country=KE')).body!.gate;
    expect(g).toMatchObject({
      scans: 7,
      admitted: 4,
      firstScanSuccessRate: 0.75,
      manualShare: 0.25,
      duplicateScans: 2,
      duplicateAdmissions: 1,
      offlineScans: 1,
      unsyncedOffline: 1,
      medianSecondsBetweenAdmissions: 15,
    });
  });

  it('keeps countries apart and validates the window', async () => {
    const tz = (await get('/v1/ops/pilot-metrics?country=TZ')).body!;
    expect(tz.events).toBe(0);
    expect(tz.reach.rate).toBeNull();
    expect(tz.gate.scans).toBe(0);
    const all = (await get('/v1/ops/pilot-metrics')).body!;
    expect(all.country).toBe('all');
    expect(all.events).toBeGreaterThanOrEqual(1);
    expect((await get('/v1/ops/pilot-metrics?days=0')).status).toBe(400);
    expect((await get('/v1/ops/pilot-metrics?country=UG')).status).toBe(400);
  });
});
