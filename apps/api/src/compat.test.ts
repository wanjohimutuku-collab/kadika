import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fromLegacyKeys, withLegacyAliases } from './compat';
import { api, createTestContext, loginAs, type TestContext } from './testing/test-app';

describe('legacy money names (Phase 1b compatibility window)', () => {
  it('adds the old name beside the new one, deeply, for numbers and null only', () => {
    expect(
      withLegacyAliases({
        pledge: { amount: 5000, paid: 0, balance: 5000, status: 'pledged' },
        items: [{ cost: null }, { cost: 12 }],
        target: 'remaining',
        amount: '5000',
      }),
    ).toEqual({
      pledge: {
        amount: 5000,
        amountTzs: 5000,
        paid: 0,
        paidTzs: 0,
        balance: 5000,
        balanceTzs: 5000,
        status: 'pledged',
      },
      items: [
        { cost: null, costTzs: null },
        { cost: 12, costTzs: 12 },
      ],
      target: 'remaining',
      amount: '5000',
    });
  });

  it('maps old request names to new ones and lets the new name win', () => {
    expect(fromLegacyKeys({ amountTzs: 100, contributionTargetTzs: 9, note: 'x' })).toEqual({
      amount: 100,
      contributionTarget: 9,
      note: 'x',
    });
    expect(fromLegacyKeys({ amountTzs: 1, amount: 2 })).toEqual({ amount: 2 });
  });
});

describe('over HTTP', () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await createTestContext();
  });
  afterAll(() => ctx.close());

  const event = {
    title: 'Harusi',
    coupleNames: 'Neema & Juma',
    dateStart: '2027-01-16T10:00:00+03:00',
    venueName: 'Ukumbi',
  };

  it('serves old and new names and accepts old names in requests', async () => {
    const s = await loginAs(ctx, '0711400001');
    const created = await api(ctx, 'POST', '/v1/events', {
      token: s.accessToken,
      body: { ...event, contributionTargetTzs: 1_000_000 },
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      contributionTarget: 1_000_000,
      contributionTargetTzs: 1_000_000,
    });

    const g = await api(ctx, 'POST', `/v1/events/${created.body!.id}/guests`, {
      token: s.accessToken,
      body: { displayName: 'Asha Mwinyi', phone: '0712000111' },
    });
    const old = await api(ctx, 'POST', '/v1/payments/manual', {
      token: s.accessToken,
      body: { guestId: g.body!.id, amountTzs: 7000, method: 'cash' },
    });
    expect(old.status).toBe(201);
    expect(old.body).toMatchObject({ amount: 7000, amountTzs: 7000 });

    const neu = await api(ctx, 'POST', '/v1/payments/manual', {
      token: s.accessToken,
      body: { guestId: g.body!.id, amount: 3000, method: 'cash' },
    });
    expect(neu.status).toBe(201);
    expect(neu.body).toMatchObject({ amount: 3000, amountTzs: 3000 });

    const detail = await api(ctx, 'GET', `/v1/guests/${g.body!.id}`, { token: s.accessToken });
    expect(detail.body?.pledge).toMatchObject({
      paid: 10000,
      paidTzs: 10000,
      balance: 0,
      balanceTzs: 0,
    });
  });
});
