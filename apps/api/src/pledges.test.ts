import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, count, eq } from 'drizzle-orm';
import { payments } from '@harusi/db';
import { csvCell } from './services/pledges';
import { api, createTestContext, loginAs, type TestContext } from './testing/test-app';

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(() => ctx.close());

let seq = 0;
async function setup(opts: { target?: number } = {}) {
  const owner = await loginAs(ctx, `07880${String(++seq).padStart(5, '0')}`);
  const t = owner.accessToken;
  const ev = (
    await api(ctx, 'POST', '/v1/events', {
      token: t,
      body: {
        title: 'Harusi',
        coupleNames: 'Asha & Juma',
        dateStart: '2027-06-01T10:00:00+03:00',
        contributionTargetTzs: opts.target ?? 1_000_000,
      },
    })
  ).body!;
  const g = (
    await api(ctx, 'POST', `/v1/events/${ev.id}/guests`, {
      token: t,
      body: { displayName: 'Bibi Pendo', phone: `0713${String(500000 + seq)}` },
    })
  ).body!;
  return { t, ev, g: g as { id: string; cardToken: string }, evId: ev.id as string };
}
const pledge = (t: string, gid: string, amountTzs: number, extra: object = {}) =>
  api(ctx, 'POST', `/v1/guests/${gid}/pledges`, { token: t, body: { amountTzs, ...extra } });
const manual = (t: string, body: object) =>
  api(ctx, 'POST', '/v1/payments/manual', { token: t, body });
const summary = async (t: string, evId: string) =>
  (await api(ctx, 'GET', `/v1/events/${evId}/pledges`, { token: t })).body!;
const startPay = (
  token: string,
  key: string,
  body: object = { amountTzs: 20_000, phone: '0712 345 678', method: 'mpesa' },
) =>
  ctx.app.request(`/v1/c/${token}/pay`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'idempotency-key': key },
    body: JSON.stringify(body),
  });
const hook = async (body: { raw: string; headers: Record<string, string> }, provider = 'fake') =>
  ctx.app.request(`/v1/payments/webhook/${provider}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...body.headers },
    body: body.raw,
  });

describe('pledges and manual payments', () => {
  it('computes pledged → partial → paid and balances, and reconciles with the dashboard', async () => {
    const { t, g, evId } = await setup();
    expect((await pledge(t, g.id, 50_000, { note: 'ahadi ya kwanza' })).body).toMatchObject({
      amountTzs: 50_000,
      paidTzs: 0,
      balanceTzs: 50_000,
      status: 'pledged',
    });
    const p1 = await manual(t, {
      guestId: g.id,
      amountTzs: 20_000,
      method: 'cash',
      reference: 'RCPT-1',
    });
    expect(p1.status).toBe(201);
    expect((await summary(t, evId)).guests[0]).toMatchObject({
      amountTzs: 50_000,
      paidTzs: 20_000,
      balanceTzs: 30_000,
      status: 'partial',
    });
    await manual(t, { guestId: g.id, amountTzs: 30_000, method: 'mpesa' });
    const s = await summary(t, evId);
    expect(s.guests[0]).toMatchObject({ paidTzs: 50_000, balanceTzs: 0, status: 'paid' });
    expect(s.totals).toMatchObject({
      targetTzs: 1_000_000,
      pledgedTzs: 50_000,
      collectedTzs: 50_000,
      balanceTzs: 0,
      guestsWithBalance: 0,
    });
    const stats = (await api(ctx, 'GET', `/v1/events/${evId}/invitations/stats`, { token: t }))
      .body!;
    expect(stats).toMatchObject({ pledgedTzs: 50_000, collectedTzs: 50_000, guestsWithBalance: 0 });
    // raising the pledge reopens a balance; overpaying never makes a negative one; waiving clears it
    expect((await pledge(t, g.id, 80_000)).body).toMatchObject({
      balanceTzs: 30_000,
      status: 'partial',
    });
    expect((await pledge(t, g.id, 10_000)).body).toMatchObject({ balanceTzs: 0, status: 'paid' });
    expect((await pledge(t, g.id, 100_000, { waived: true })).body).toMatchObject({
      balanceTzs: 0,
      status: 'waived',
    });
    expect((await summary(t, evId)).totals.pledgedTzs).toBe(0); // waived pledges are not counted as expected money
  });

  it('rejects bad amounts and a reused reference, audits manual payments, and keeps money from gate agents', async () => {
    const { t, g, evId } = await setup();
    expect((await manual(t, { guestId: g.id, amountTzs: 0, method: 'cash' })).status).toBe(400);
    expect((await manual(t, { guestId: g.id, amountTzs: 1.5, method: 'cash' })).status).toBe(400);
    expect((await manual(t, { guestId: g.id, amountTzs: 1000, method: 'bitcoin' })).status).toBe(
      400,
    );
    expect((await pledge(t, g.id, -5)).status).toBe(400);
    expect(
      (await manual(t, { guestId: g.id, amountTzs: 1000, method: 'bank', reference: 'TX-9' }))
        .status,
    ).toBe(201);
    expect(
      (await manual(t, { guestId: g.id, amountTzs: 1000, method: 'bank', reference: 'TX-9' }))
        .status,
    ).toBe(409);
    expect((await summary(t, evId)).totals.collectedTzs).toBe(1000); // the duplicate was not counted

    await api(ctx, 'POST', `/v1/events/${evId}/members`, {
      token: t,
      body: { name: 'Lango', phone: '0788800099', role: 'gate' },
    });
    const gate = (await loginAs(ctx, '0788800099')).accessToken;
    for (const [m, path] of [
      ['GET', `/v1/events/${evId}/pledges`],
      ['GET', `/v1/events/${evId}/payments`],
      ['GET', `/v1/events/${evId}/exports/payments.csv`],
    ] as const)
      expect((await api(ctx, m, path, { token: gate })).status).toBe(403);
    expect((await pledge(gate, g.id, 1000)).status).toBe(403);
    expect((await manual(gate, { guestId: g.id, amountTzs: 1000, method: 'cash' })).status).toBe(
      403,
    );
    const gateStats = (
      await api(ctx, 'GET', `/v1/events/${evId}/invitations/stats`, { token: gate })
    ).body!;
    expect(gateStats).not.toHaveProperty('collectedTzs');
  });
});

describe('paying from the card', () => {
  it('starts a push request, is idempotent, and a signed success webhook settles it', async () => {
    const { t, g, evId } = await setup();
    await pledge(t, g.id, 20_000);
    ctx.payments.started.length = 0;
    const a = await startPay(g.cardToken, 'pay-key-0001');
    expect(a.status).toBe(201);
    const start = (await a.json()) as { reference: string; amountTzs: number; phoneE164: string };
    expect(start).toMatchObject({ amountTzs: 20_000, phoneE164: '+255712345678' });
    expect(start.reference).toMatch(/^HP[0-9A-Z]{10}$/);
    // the same request again returns the same payment and does not ask the phone twice
    const again = (await (await startPay(g.cardToken, 'pay-key-0001')).json()) as {
      reference: string;
    };
    expect(again.reference).toBe(start.reference);
    expect(ctx.payments.started).toHaveLength(1);
    expect(ctx.payments.started[0]).toMatchObject({ amountTzs: 20_000, method: 'mpesa' });

    const status = async () =>
      (await (await ctx.app.request(`/v1/payments/${start.reference}/status`)).json()) as Record<
        string,
        unknown
      >;
    expect(await status()).toMatchObject({ status: 'pending', newBalanceTzs: null });
    const res = await hook(
      ctx.payments.webhookBody({
        reference: start.reference,
        status: 'success',
        amountTzs: 20_000,
      }),
    );
    expect(await res.json()).toMatchObject({ applied: true, duplicate: false });
    expect(await status()).toMatchObject({
      status: 'success',
      amountTzs: 20_000,
      newBalanceTzs: 0,
      duplicateWebhook: false,
    });
    expect((await summary(t, evId)).guests[0]).toMatchObject({ paidTzs: 20_000, status: 'paid' });
    // the guest sees it on their card
    const card = (await api(ctx, 'GET', `/v1/c/${g.cardToken}`)).body!;
    expect(card.pledge).toMatchObject({
      amountTzs: 20_000,
      paidTzs: 20_000,
      balanceTzs: 0,
      status: 'paid',
    });
    expect(card.event.pledgesEnabled).toBe(true);
  });

  it('replaying one webhook 5 times records exactly one payment', async () => {
    const { t, g, evId } = await setup();
    await pledge(t, g.id, 20_000);
    const start = (await (await startPay(g.cardToken, 'pay-key-replay')).json()) as {
      reference: string;
    };
    const body = ctx.payments.webhookBody({
      reference: start.reference,
      status: 'success',
      amountTzs: 20_000,
    });
    const results = [];
    for (let i = 0; i < 5; i++) results.push(await (await hook(body)).json());
    expect(results.filter((r) => r.applied)).toHaveLength(1);
    expect(results.filter((r) => r.duplicate)).toHaveLength(4);
    const rows = await ctx.db
      .select({ n: count() })
      .from(payments)
      .where(and(eq(payments.guestId, g.id), eq(payments.status, 'success')));
    expect(rows[0]!.n).toBe(1);
    expect((await summary(t, evId)).totals.collectedTzs).toBe(20_000); // not 100,000
    expect(
      await (await ctx.app.request(`/v1/payments/${start.reference}/status`)).json(),
    ).toMatchObject({ duplicateWebhook: true });
    // and five at once
    const start2 = (await (await startPay(g.cardToken, 'pay-key-race')).json()) as {
      reference: string;
    };
    const body2 = ctx.payments.webhookBody({
      reference: start2.reference,
      status: 'success',
      amountTzs: 20_000,
    });
    const burst = await Promise.all(
      Array.from({ length: 5 }, () => hook(body2).then((r) => r.json())),
    );
    expect(burst.filter((r) => r.applied)).toHaveLength(1);
    expect((await summary(t, evId)).totals.collectedTzs).toBe(40_000);
  });

  it('refuses unsigned or forged webhooks, ignores unknown references, and records failures without money', async () => {
    const { t, g, evId } = await setup();
    const start = (await (await startPay(g.cardToken, 'pay-key-fail')).json()) as {
      reference: string;
    };
    const good = ctx.payments.webhookBody({
      reference: start.reference,
      status: 'success',
      amountTzs: 20_000,
    });
    expect((await hook({ raw: good.raw, headers: {} })).status).toBe(401);
    expect((await hook({ raw: good.raw, headers: { 'x-signature': 'a'.repeat(64) } })).status).toBe(
      401,
    );
    expect((await hook({ raw: good.raw + ' ', headers: good.headers })).status).toBe(401); // body changed after signing
    expect((await hook(good, 'selcom')).status).toBe(404);
    const unknown = ctx.payments.webhookBody({
      reference: 'HPUNKNOWN000',
      status: 'success',
      amountTzs: 5000,
    });
    expect(await (await hook(unknown)).json()).toMatchObject({ known: false, applied: false });
    expect((await summary(t, evId)).totals.collectedTzs).toBe(0);

    const failed = ctx.payments.webhookBody({
      reference: start.reference,
      status: 'failed',
      failureReason: 'insufficient_funds',
    });
    expect(await (await hook(failed)).json()).toMatchObject({ applied: true });
    expect(
      await (await ctx.app.request(`/v1/payments/${start.reference}/status`)).json(),
    ).toMatchObject({ status: 'failed', failureReason: 'insufficient_funds' });
    // a late "success" after a failure must not turn into money
    expect(await (await hook(good)).json()).toMatchObject({ applied: false, duplicate: true });
    expect((await summary(t, evId)).totals.collectedTzs).toBe(0);
  });

  it('counts what the aggregator says it took, expires unconfirmed requests, and validates input', async () => {
    const { t, g, evId } = await setup();
    const start = (await (await startPay(g.cardToken, 'pay-key-mismatch')).json()) as {
      reference: string;
    };
    await hook(
      ctx.payments.webhookBody({
        reference: start.reference,
        status: 'success',
        amountTzs: 15_000,
      }),
    );
    expect((await summary(t, evId)).totals.collectedTzs).toBe(15_000); // not the 20,000 the guest typed

    const pending = (await (await startPay(g.cardToken, 'pay-key-expire')).json()) as {
      reference: string;
    };
    ctx.clock.now += 61_000;
    expect(
      await (await ctx.app.request(`/v1/payments/${pending.reference}/status`)).json(),
    ).toMatchObject({ status: 'expired' });
    expect((await summary(t, evId)).totals.collectedTzs).toBe(15_000); // an expired request is not money

    expect(
      (
        await startPay(g.cardToken, 'pay-key-low', {
          amountTzs: 500,
          phone: '0712345678',
          method: 'mpesa',
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await startPay(g.cardToken, 'pay-key-phone', {
          amountTzs: 5000,
          phone: '12345',
          method: 'mpesa',
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await startPay(g.cardToken, 'pay-key-method', {
          amountTzs: 5000,
          phone: '0712345678',
          method: 'cash',
        })
      ).status,
    ).toBe(400);
    expect((await startPay(g.cardToken, 'short')).status).toBe(400);
    expect((await startPay('not-a-real-token-aaaaaa', 'pay-key-nope')).status).toBe(404);
    ctx.fail.pay = () => true;
    expect((await startPay(g.cardToken, 'pay-key-provider-down')).status).toBe(500);
    ctx.fail.pay = () => false;
  });

  it('is closed when the organizer turns pledges off', async () => {
    const { t, g, evId } = await setup();
    expect(
      (await api(ctx, 'PATCH', `/v1/events/${evId}`, { token: t, body: { pledgesEnabled: false } }))
        .status,
    ).toBe(200);
    const r = await startPay(g.cardToken, 'pay-key-closed');
    expect(r.status).toBe(403);
    expect(
      ((await r.json()) as { error: { details: { reason: string } } }).error.details.reason,
    ).toBe('payments_disabled');
    expect((await api(ctx, 'GET', `/v1/c/${g.cardToken}`)).body!.event.pledgesEnabled).toBe(false);
  });
});

describe('exports', () => {
  it('exports pledges and payments as CSV that matches the dashboard and cannot run as a formula', async () => {
    const { t, g, evId } = await setup();
    await pledge(t, g.id, 50_000);
    await manual(t, {
      guestId: g.id,
      amountTzs: 20_000,
      method: 'cash',
      note: '=HYPERLINK("http://evil","x")',
    });
    await manual(t, { guestId: g.id, amountTzs: 5_000, method: 'bank' });
    const p = await ctx.app.request(`/v1/events/${evId}/exports/pledges.csv`, {
      headers: { authorization: `Bearer ${t}` },
    });
    expect(p.headers.get('content-type')).toContain('text/csv');
    const bytes = new Uint8Array(await p.clone().arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); // BOM so Excel reads Swahili names right
    const text = await p.text();
    expect(text).toContain(
      '"Bibi Pendo","","' +
        (await summary(t, evId)).guests[0].shortCode +
        '","50000","25000","25000","partial"',
    );
    const pay = await (
      await ctx.app.request(`/v1/events/${evId}/exports/payments.csv`, {
        headers: { authorization: `Bearer ${t}` },
      })
    ).text();
    expect(pay.split('\r\n').filter(Boolean)).toHaveLength(3); // header + 2 payments
    expect(pay).toContain(`"'=HYPERLINK(""http://evil"",""x"")"`); // quoted, escaped and neutralised
    expect(pay).not.toMatch(/,"=HYPERLINK/);
    expect(
      (
        await ctx.app.request(`/v1/events/${evId}/exports/secrets.csv`, {
          headers: { authorization: `Bearer ${t}` },
        })
      ).status,
    ).toBe(404);
  });

  it('neutralises every formula starter', () => {
    for (const c of ['=1+1', '+1', '-1', '@SUM(A1)', '\tx', '\rx'])
      expect(csvCell(c).startsWith(`"'`)).toBe(true);
    expect(csvCell('plain "quoted"')).toBe('"plain ""quoted"""');
    expect(csvCell(null)).toBe('""');
  });
});
