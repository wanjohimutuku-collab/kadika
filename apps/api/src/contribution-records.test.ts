import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { auditLog, payments, pledges } from '@harusi/db';
import { ContributionRecords } from './services/contribution-records';
import { api, createTestContext, loginAs, type TestContext } from './testing/test-app';

let ctx: TestContext;
beforeAll(async () => {
  // The default: guests pay the hosts directly, nothing is collected through us (ADR 043).
  ctx = await createTestContext({ env: { GUEST_PAYMENTS_ENABLED: '0' } });
});
afterAll(() => ctx.close());

let seq = 0;
async function setup() {
  const t = (await loginAs(ctx, `07882${String(++seq).padStart(5, '0')}`)).accessToken;
  const ev = (
    await api(ctx, 'POST', '/v1/events', {
      token: t,
      body: { title: 'Harusi', coupleNames: 'Asha & Juma', dateStart: '2027-06-01T10:00:00+03:00' },
    })
  ).body!;
  const g = (
    await api(ctx, 'POST', `/v1/events/${ev.id}/guests`, {
      token: t,
      body: { displayName: 'Bibi Pendo', phone: `0713${String(600000 + seq)}` },
    })
  ).body! as { id: string; cardToken: string };
  return { t, evId: ev.id as string, g };
}

describe('contribution records (ADR 043)', () => {
  it('does not collect guest money: the card has no pay link and the pay route refuses', async () => {
    const { t, evId, g } = await setup();
    await api(ctx, 'PATCH', `/v1/events/${evId}`, {
      token: t,
      body: {
        cardContent: {
          contribution: {
            payTo: [{ label: 'M-Pesa', account: '0754 111 222', name: 'Asha Juma' }],
          },
        },
      },
    });
    const card = (await api(ctx, 'GET', `/v1/c/${g.cardToken}`)).body!;
    expect(card.event).toMatchObject({ onlinePay: false });
    expect(card.event.cardContent.contribution.payTo[0]).toMatchObject({ account: '0754 111 222' });
    const r = await ctx.app.request(`/v1/c/${g.cardToken}/pay`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'guest-pay-off-1' },
      body: JSON.stringify({ amount: 20_000, phone: '0712 345 678', method: 'mpesa' }),
    });
    expect(r.status).toBe(403);
    expect(((await r.json()) as { error: { details: unknown } }).error.details).toMatchObject({
      reason: 'collected_by_host',
    });
    expect(ctx.payments.started).toHaveLength(0);
  });

  it('stores pledges and payments sealed, and shows them to the event team in clear', async () => {
    const { t, evId, g } = await setup();
    await api(ctx, 'POST', `/v1/guests/${g.id}/pledges`, {
      token: t,
      body: { amount: 50_000, note: 'Ahadi ya shangazi' },
    });
    await api(ctx, 'POST', '/v1/payments/manual', {
      token: t,
      body: { guestId: g.id, amount: 20_000, method: 'mpesa', note: 'Ametuma kwa M-Pesa' },
    });

    const [p] = await ctx.db.select().from(pledges).where(eq(pledges.guestId, g.id));
    expect(p).toMatchObject({ amount: 0, note: null });
    expect(p!.amountEnc).toBeTruthy();
    expect(p!.amountEnc).not.toContain('50000');
    const [pay] = await ctx.db.select().from(payments).where(eq(payments.guestId, g.id));
    expect(pay).toMatchObject({ amount: 0, note: null, phoneE164: null });
    // Nothing about the money lands in the (unsealed) audit log either.
    const audits = await ctx.db.select().from(auditLog).where(eq(auditLog.eventId, evId));
    expect(JSON.stringify(audits)).not.toMatch(/50000|20000|shangazi/);

    const summary = (await api(ctx, 'GET', `/v1/events/${evId}/pledges`, { token: t })).body!;
    expect(summary.guests[0]).toMatchObject({
      amount: 50_000,
      paid: 20_000,
      balance: 30_000,
      status: 'partial',
      note: 'Ahadi ya shangazi',
    });
    const list = (await api(ctx, 'GET', `/v1/events/${evId}/payments`, { token: t })).body!;
    expect(list.items[0]).toMatchObject({ amount: 20_000, note: 'Ametuma kwa M-Pesa' });
  });

  it('a sealed amount moved onto another row does not decrypt', async () => {
    const { t, g } = await setup();
    await api(ctx, 'POST', `/v1/guests/${g.id}/pledges`, { token: t, body: { amount: 10_000 } });
    const other = await setup();
    await api(ctx, 'POST', `/v1/guests/${other.g.id}/pledges`, {
      token: other.t,
      body: { amount: 1 },
    });
    const [a] = await ctx.db.select().from(pledges).where(eq(pledges.guestId, g.id));
    const [b] = await ctx.db.select().from(pledges).where(eq(pledges.guestId, other.g.id));
    const records = ContributionRecords.of(ctx.deps);
    await expect(records.openPledge({ ...b!, amountEnc: a!.amountEnc })).rejects.toThrow();
  });

  it('seals rows written before ADR 043, once', async () => {
    const { t, evId, g } = await setup();
    await api(ctx, 'POST', `/v1/guests/${g.id}/pledges`, { token: t, body: { amount: 7_000 } });
    // Simulate an old row: plain amount, nothing sealed.
    await ctx.db
      .update(pledges)
      .set({ amount: 7_000, amountEnc: null, note: 'zamani' })
      .where(eq(pledges.guestId, g.id));
    const records = ContributionRecords.of(ctx.deps);
    expect(await records.sealLegacy(ctx.db)).toBeGreaterThanOrEqual(1);
    expect(await records.sealLegacy(ctx.db)).toBe(0);
    const [p] = await ctx.db.select().from(pledges).where(eq(pledges.guestId, g.id));
    expect(p).toMatchObject({ amount: 0, note: null });
    const summary = (await api(ctx, 'GET', `/v1/events/${evId}/pledges`, { token: t })).body!;
    expect(summary.guests[0]).toMatchObject({ amount: 7_000, note: 'zamani' });
  });
});
