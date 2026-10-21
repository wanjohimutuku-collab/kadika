import { ContributionRecords } from './services/contribution-records';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { count, eq } from 'drizzle-orm';
import { payments } from '@harusi/db';
import { PledgeService } from './services/pledges';
import { EventService } from './services/events';
import { api, createTestContext, loginAs, type TestContext } from './testing/test-app';

let ctx: TestContext;
let svc: PledgeService;
beforeAll(async () => {
  ctx = await createTestContext({ env: { KENYA_ENABLED: '1' } });
  svc = new PledgeService(ctx.deps, new EventService(ctx.deps));
});
afterAll(() => ctx.close());

let seq = 0;
async function setup(country: 'TZ' | 'KE') {
  const owner = await loginAs(ctx, `07890${String(++seq).padStart(5, '0')}`);
  const t = owner.accessToken;
  const ev = (
    await api(ctx, 'POST', '/v1/events', {
      token: t,
      body: {
        title: 'Harusi',
        coupleNames: 'Neema',
        dateStart: '2027-06-01T10:00:00+03:00',
        country,
      },
    })
  ).body!;
  const phone = country === 'KE' ? '0712345678' : '0713345678';
  const g = (
    await api(ctx, 'POST', `/v1/events/${ev.id}/guests`, {
      token: t,
      body: { displayName: 'Wanjiru Kamau', phone, cardKind: 'contribution' },
    })
  ).body!;
  return { t, ev, g: g as { id: string; cardToken: string } };
}
const kePay = { amount: 500, phone: '0712 345 678', method: 'mpesa' };
// Pay starts are limited to 10 a minute per IP on the test clock, so each start moves it on a little.
const startPay = (token: string, key: string, body: object) => {
  ctx.clock.now += 61_000;
  return ctx.app.request(`/v1/c/${token}/pay`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'idempotency-key': key },
    body: JSON.stringify(body),
  });
};
const startOk = async (token: string, key: string, body: object = kePay) => {
  const res = await startPay(token, key, body);
  expect(res.status).toBe(201);
  return ctx.paymentsKe.started.at(-1)!.reference;
};
const hook = (provider: string, body: { raw: string; headers: Record<string, string> }) =>
  ctx.app.request(`/v1/payments/webhook/${provider}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...body.headers },
    body: body.raw,
  });

describe('Kenyan mobile money (ADR 027)', () => {
  it('starts a KES collection through the Kenyan provider, not the Tanzanian one', async () => {
    const { g } = await setup('KE');
    const before = ctx.payments.started.length;
    const r = await startPay(g.cardToken, 'ke-key-0001', kePay);
    expect(r.status).toBe(201);
    expect(ctx.payments.started.length).toBe(before);
    const sent = ctx.paymentsKe.started.at(-1)!;
    expect(sent).toMatchObject({
      amount: 500,
      currency: 'KES',
      phoneE164: '+254712345678',
      method: 'mpesa',
    });
    const [row] = await ctx.db
      .select()
      .from(payments)
      .where(eq(payments.providerRef, sent.reference));
    expect(row!.provider).toBe('fake-ke');
  });

  it('keeps Tanzania on its own provider with TZS', async () => {
    const { g } = await setup('TZ');
    const r = await startPay(g.cardToken, 'tz-key-0001', {
      amount: 20_000,
      phone: '0713 345 678',
      method: 'mpesa',
    });
    expect(r.status).toBe(201);
    expect(ctx.payments.started.at(-1)).toMatchObject({ currency: 'TZS', amount: 20_000 });
  });

  it('applies the Kenyan limits and method list', async () => {
    const { g } = await setup('KE');
    const low = await startPay(g.cardToken, 'ke-key-low1', { ...kePay, amount: 5 });
    expect(low.status).toBe(400);
    expect((await low.json()).error.details).toMatchObject({ min: 10, max: 250_000 });
    expect((await startPay(g.cardToken, 'ke-key-hi01', { ...kePay, amount: 250_001 })).status).toBe(
      400,
    );
    const mixx = await startPay(g.cardToken, 'ke-key-mixx', { ...kePay, method: 'mixx' });
    expect((await mixx.json()).error.details.reason).toBe('method.not_available');
    expect((await startPay(g.cardToken, 'ke-key-ok01', { ...kePay, amount: 10 })).status).toBe(201);
  });

  it('has no payments for a country without a provider', async () => {
    const { g } = await setup('KE');
    const saved = ctx.deps.paymentsByCountry!.KE;
    delete ctx.deps.paymentsByCountry!.KE;
    try {
      const r = await startPay(g.cardToken, 'ke-key-none', kePay);
      expect(r.status).toBe(403);
      expect((await r.json()).error.details.reason).toBe('payments_disabled');
    } finally {
      ctx.deps.paymentsByCountry!.KE = saved;
    }
  });

  it('records one payment when the same signed callback is replayed 5 times', async () => {
    const { g, ev } = await setup('KE');
    const ref = await startOk(g.cardToken, 'ke-key-rep1');
    const body = ctx.paymentsKe.webhookBody({
      reference: ref,
      status: 'success',
      amount: 500,
      currency: 'KES',
    });
    const results = [];
    for (let i = 0; i < 5; i++) results.push(await (await hook('fake-ke', body)).json());
    expect(results.filter((r) => r.applied)).toHaveLength(1);
    expect(results.filter((r) => r.duplicate)).toHaveLength(4);
    const [counted] = await ctx.db
      .select({ n: count() })
      .from(payments)
      .where(eq(payments.providerRef, ref));
    expect(counted!.n).toBe(1);
    const detail = await api(ctx, 'GET', `/v1/guests/${g.id}`, {
      token: (await loginAs(ctx, '0789099999')).accessToken,
    });
    void detail;
    void ev;
  });

  it('rejects a callback signed for the Tanzanian secret, and an unknown provider', async () => {
    const { g } = await setup('KE');
    const ref = await startOk(g.cardToken, 'ke-key-sig1');
    const wrong = ctx.payments.webhookBody({ reference: ref, status: 'success', amount: 500 });
    expect((await hook('fake-ke', wrong)).status).toBe(401);
    expect((await hook('no-such-provider', wrong)).status).toBe(404);
  });

  it('refuses money in another currency than the event’s and does not credit it', async () => {
    const { g } = await setup('KE');
    const ref = await startOk(g.cardToken, 'ke-key-cur1');
    const body = ctx.paymentsKe.webhookBody({
      reference: ref,
      status: 'success',
      amount: 500,
      currency: 'TZS',
    });
    const r = await hook('fake-ke', body);
    expect(r.status).toBe(400);
    expect((await r.json()).error.details.reason).toBe('currency_mismatch');
    const [row] = await ctx.db.select().from(payments).where(eq(payments.providerRef, ref));
    expect(row!.status).toBe('pending');
  });

  it('records the amount the provider actually took when it differs', async () => {
    const { g } = await setup('KE');
    const ref = await startOk(g.cardToken, 'ke-key-amt1');
    await hook(
      'fake-ke',
      ctx.paymentsKe.webhookBody({
        reference: ref,
        status: 'success',
        amount: 450,
        currency: 'KES',
      }),
    );
    const [row] = await ctx.db.select().from(payments).where(eq(payments.providerRef, ref));
    expect(row).toMatchObject({ status: 'success', amount: 0 }); // sealed (ADR 043)
    expect(await ContributionRecords.of(ctx.deps).openPayment(row!)).toMatchObject({ amount: 450 });
    expect((row!.raw as { amountMismatch?: unknown }).amountMismatch).toEqual({
      requested: 500,
      received: 450,
    });
  });
});

describe('reconciliation', () => {
  const minutes = (n: number) => n * 60_000;

  it('settles a payment whose callback never arrived by asking the provider', async () => {
    const { g } = await setup('KE');
    const ref = await startOk(g.cardToken, 'ke-rec-0001');
    // inside the prompt window nothing is checked yet
    expect(await svc.reconcilePending()).toMatchObject({ applied: 0 });
    ctx.clock.now += minutes(5);
    ctx.paymentsKe.queryResults.set(ref, {
      status: 'success',
      amount: 500,
      currency: 'KES',
      paidAt: new Date(ctx.clock.now - minutes(4)),
    });
    const r = await svc.reconcilePending();
    expect(r.applied).toBeGreaterThanOrEqual(1);
    const [row] = await ctx.db.select().from(payments).where(eq(payments.providerRef, ref));
    expect(row!.status).toBe('success');
    // a later callback for the same payment is a duplicate, not a second payment
    const dup = await (
      await hook(
        'fake-ke',
        ctx.paymentsKe.webhookBody({ reference: ref, status: 'success', amount: 500 }),
      )
    ).json();
    expect(dup).toMatchObject({ applied: false, duplicate: true });
  });

  it('gives up on a payment the provider never received, as a timeout', async () => {
    const { g } = await setup('KE');
    const ref = await startOk(g.cardToken, 'ke-rec-0002');
    ctx.clock.now += minutes(5); // unknown to the provider (no query result set)
    const r = await svc.reconcilePending();
    expect(r.timedOut).toBeGreaterThanOrEqual(1);
    const [row] = await ctx.db.select().from(payments).where(eq(payments.providerRef, ref));
    expect(row).toMatchObject({ status: 'failed' });
    expect((row!.raw as { failureReason?: string }).failureReason).toBe('timeout');
  });

  it('lets a late success win over a timeout, once', async () => {
    const { g } = await setup('KE');
    const ref = await startOk(g.cardToken, 'ke-rec-0003');
    ctx.clock.now += minutes(5);
    await svc.reconcilePending(); // timed out
    const late = ctx.paymentsKe.webhookBody({
      reference: ref,
      status: 'success',
      amount: 500,
      currency: 'KES',
    });
    expect(await (await hook('fake-ke', late)).json()).toMatchObject({ applied: true });
    const [row] = await ctx.db.select().from(payments).where(eq(payments.providerRef, ref));
    expect(row!.status).toBe('success');
    expect((row!.raw as Record<string, unknown>).failureReason).toBeUndefined();
    expect((row!.raw as Record<string, unknown>).lateSuccess).toBe(true);
    expect(await (await hook('fake-ke', late)).json()).toMatchObject({
      applied: false,
      duplicate: true,
    });
  });

  it('finds a late success on a timed-out payment through the query too', async () => {
    const { g } = await setup('KE');
    const ref = await startOk(g.cardToken, 'ke-rec-0004');
    ctx.clock.now += minutes(5);
    await svc.reconcilePending(); // timed out
    ctx.paymentsKe.queryResults.set(ref, { status: 'success', amount: 500, currency: 'KES' });
    await svc.reconcilePending();
    const [row] = await ctx.db.select().from(payments).where(eq(payments.providerRef, ref));
    expect(row!.status).toBe('success');
  });

  it('leaves a payment the provider is still processing, until 30 minutes have passed', async () => {
    const { g } = await setup('KE');
    const ref = await startOk(g.cardToken, 'ke-rec-0005');
    ctx.paymentsKe.queryResults.set(ref, { status: 'pending' });
    ctx.clock.now += minutes(10);
    await svc.reconcilePending();
    let [row] = await ctx.db.select().from(payments).where(eq(payments.providerRef, ref));
    expect(row!.status).toBe('pending');
    ctx.clock.now += minutes(25);
    await svc.reconcilePending();
    [row] = await ctx.db.select().from(payments).where(eq(payments.providerRef, ref));
    expect(row!.status).toBe('failed');
  });

  it('exports Kenyan statements in KES', async () => {
    const { t, ev } = await setup('KE');
    const res = await ctx.app.request(`/v1/events/${ev.id}/exports/payments`, {
      headers: { authorization: `Bearer ${t}` },
    });
    expect(await res.text()).toContain('Kiasi (KES)');
  });
});
