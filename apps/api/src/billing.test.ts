import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { events, guests } from '@harusi/db';
import { DEFAULT_PRICING, quote, unitPrice, type PricingCatalog } from '@harusi/schemas/billing';
import {
  api,
  createTestContext,
  loginAs,
  loginAsStaff,
  type TestContext,
} from './testing/test-app';

let ctx: TestContext;
let admin: string;
let support: string;
beforeAll(async () => {
  ctx = await createTestContext();
  admin = (await loginAsStaff(ctx, '0711800001', 'billing', 'Bahati Billing')).accessToken;
  support = (await loginAsStaff(ctx, '0711800002', 'support', 'Saidi Support')).accessToken;
});
afterAll(() => ctx.close());

/** Small numbers so a test reaches the limits with a handful of guests. */
const tiny: PricingCatalog = {
  ...DEFAULT_PRICING,
  enforced: true,
  free: { cards: 2, messages: 1 },
  packs: [{ key: 'credits10', messages: 10, price: { TZS: 2_000, KES: 100 } }],
};
const setPricing = (c: PricingCatalog) =>
  api(ctx, 'PUT', '/v1/ops/pricing', { token: admin, body: c });

let seq = 0;
async function setup() {
  const owner = await loginAs(ctx, `07881${String(++seq).padStart(5, '0')}`);
  const t = owner.accessToken;
  const ev = (
    await api(ctx, 'POST', '/v1/events', {
      token: t,
      body: { title: 'Harusi', coupleNames: 'Asha & Juma', dateStart: '2027-06-01T10:00:00+03:00' },
    })
  ).body!;
  const addGuest = (n: number, extra: object = {}) =>
    api(ctx, 'POST', `/v1/events/${ev.id}/guests`, {
      token: t,
      body: {
        displayName: `Mgeni ${n}`,
        phone: `0714${String(seq * 100 + n).padStart(6, '0')}`,
        ...extra,
      },
    });
  const billing = async () =>
    (await api(ctx, 'GET', `/v1/events/${ev.id}/billing`, { token: t })).body!;
  const order = (item: object, key: string, extra: object = { method: 'manual' }) =>
    ctx.app.request(`/v1/events/${ev.id}/billing/orders`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${t}`,
        'idempotency-key': key,
      },
      body: JSON.stringify({ ...item, ...extra }),
    });
  const send = (body: object = { target: 'remaining', channel: 'sms' }) =>
    api(ctx, 'POST', `/v1/events/${ev.id}/invitations/send`, { token: t, body });
  const remind = () => send({ target: 'unanswered', channel: 'sms', kind: 'reminder' });
  const print = (body: object) =>
    ctx.app.request(`/v1/events/${ev.id}/cards/pdf`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${t}` },
      body: JSON.stringify(body),
    });
  const markPaid = async (id: string) =>
    api(ctx, 'POST', `/v1/ops/purchases/${id}/paid`, {
      token: admin,
      body: { note: 'Benki CRDB' },
    });
  return { t, evId: ev.id as string, addGuest, billing, order, send, remind, print, markPaid };
}

describe('card prices (ADR 042)', () => {
  it('charges per card by order size, with 4 reminder credits per card', () => {
    expect(unitPrice(DEFAULT_PRICING, 1, 'TZS')).toBe(2_400);
    expect(unitPrice(DEFAULT_PRICING, 99, 'TZS')).toBe(2_400);
    expect(unitPrice(DEFAULT_PRICING, 100, 'TZS')).toBe(2_200);
    expect(unitPrice(DEFAULT_PRICING, 499, 'TZS')).toBe(2_200);
    expect(unitPrice(DEFAULT_PRICING, 500, 'TZS')).toBe(1_950);
    expect(quote(DEFAULT_PRICING, { cards: 250 }, 'TZS')).toMatchObject({
      kind: 'cards',
      adds: { cards: 250, messages: 1_000 },
      unitPrice: 2_200,
      amount: 550_000,
    });
    expect(quote(DEFAULT_PRICING, { cards: 0 }, 'TZS')).toBeNull();
  });

  it('starts on the defaults, not enforced, and only billing or admin staff may change it', async () => {
    const r = await api(ctx, 'GET', '/v1/ops/pricing', { token: support });
    expect(r.body).toMatchObject({ source: 'default', catalog: DEFAULT_PRICING });
    expect((await api(ctx, 'PUT', '/v1/ops/pricing', { token: support, body: tiny })).status).toBe(
      403,
    );
    const noOne = { ...tiny, cardTiers: [{ minCards: 5, price: { TZS: 1, KES: 1 } }] };
    expect((await setPricing(noOne)).status).toBe(400); // no tier for a single card
  });

  it('counts usage but refuses nothing while enforcement is off', async () => {
    await setPricing({ ...tiny, enforced: false });
    const s = await setup();
    for (let i = 0; i < 4; i++) expect((await s.addGuest(i)).status).toBe(201);
    expect((await s.send()).body).toMatchObject({ sent: 4 });
    expect(await s.billing()).toMatchObject({
      enforced: false,
      allowance: { cards: 2, messages: 1 },
      used: { cards: 4, messages: 0 }, // the card itself is not a reminder
      remaining: { cards: 0, messages: 1 },
      cardsToGenerate: 0,
    });
  });
});

describe('enforced allowances', () => {
  beforeAll(async () => {
    expect((await setPricing(tiny)).status).toBe(200);
  });

  it('adding guests is free; sending more new cards than are left is refused with 402', async () => {
    const s = await setup();
    for (let i = 0; i < 3; i++) expect((await s.addGuest(i)).status).toBe(201);
    expect((await s.billing()).cardsToGenerate).toBe(3);
    const r = await s.send();
    expect(r.status).toBe(402);
    expect(r.body!.error).toMatchObject({
      code: 'payment_required',
      details: { reason: 'quota_exceeded', resource: 'cards', remaining: 2, needed: 3 },
    });
    expect((await s.billing()).used.cards).toBe(0);
  });

  it('a card is generated once: resending it costs nothing', async () => {
    const s = await setup();
    await s.addGuest(1);
    await s.addGuest(2);
    expect((await s.send()).body).toMatchObject({ sent: 2 });
    expect((await s.billing()).used.cards).toBe(2);
    const ids = (await ctx.db.select().from(guests).where(eq(guests.eventId, s.evId))).map(
      (g) => g.id,
    );
    expect((await s.send({ target: { guestIds: ids }, channel: 'sms' })).body).toMatchObject({
      sent: 2,
    });
    expect((await s.billing()).used.cards).toBe(2);
  });

  it('reminders spend credits; a top-up pack adds more', async () => {
    const s = await setup();
    await s.addGuest(1);
    await s.addGuest(2);
    await s.send();
    const r = await s.remind();
    expect(r.status).toBe(402);
    expect(r.body!.error.details).toMatchObject({ resource: 'messages', remaining: 1, needed: 2 });

    const o = await s.order({ packKey: 'credits10' }, 'order-key-pack-1');
    expect(o.status).toBe(201);
    const pack = (await o.json()) as { id: string; status: string; amount: number };
    expect(pack).toMatchObject({ status: 'pending', amount: 2_000 });
    expect((await s.remind()).status).toBe(402); // pending adds nothing
    expect(
      (
        await api(ctx, 'POST', `/v1/ops/purchases/${pack.id}/paid`, {
          token: support,
          body: { note: 'Benki' },
        })
      ).status,
    ).toBe(403);
    expect((await s.markPaid(pack.id)).body).toMatchObject({ status: 'paid' });
    expect((await s.remind()).body).toMatchObject({ sent: 2 });
    expect((await s.billing()).used).toEqual({ cards: 2, messages: 2 });
  });

  it('a failed message is not charged', async () => {
    const s = await setup();
    await s.addGuest(1);
    ctx.fail.sms = () => true;
    const r = await s.send();
    ctx.fail.sms = () => false;
    expect(r.body).toMatchObject({ sent: 0, failed: 1 });
    expect((await s.billing()).used.cards).toBe(0);
  });

  it('cards bought by phone add cards and 4 credits each, once, however often the webhook comes', async () => {
    const s = await setup();
    const o = await s.order({ cards: 5 }, 'order-key-cards-1', {
      method: 'mobile',
      phone: '0712 345 678',
      mobileMethod: 'mpesa',
    });
    expect(o.status).toBe(201);
    const p = (await o.json()) as { reference: string; status: string; unitPrice: number };
    expect(p).toMatchObject({ status: 'pending', unitPrice: 2_400 });
    expect(ctx.payments.started.at(-1)).toMatchObject({ reference: p.reference, amount: 12_000 });

    const body = ctx.payments.webhookBody({
      reference: p.reference,
      status: 'success',
      amount: 12_000,
    });
    const hook = () =>
      ctx.app.request('/v1/payments/webhook/fake', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...body.headers },
        body: body.raw,
      });
    expect(await (await hook()).json()).toMatchObject({ applied: true });
    for (let i = 0; i < 4; i++)
      expect(await (await hook()).json()).toMatchObject({ applied: false, duplicate: true });
    expect(await s.billing()).toMatchObject({
      allowance: { cards: 7, messages: 21 },
      purchases: [{ status: 'paid', kind: 'cards' }],
    });
    const [e] = await ctx.db.select().from(events).where(eq(events.id, s.evId));
    expect(e!.plan).toBe('paid');
  });

  it('a short payment leaves the order for staff instead of paying it', async () => {
    const s = await setup();
    const p = (await (
      await s.order({ cards: 5 }, 'order-key-cards-short', {
        method: 'mobile',
        phone: '0712 345 678',
        mobileMethod: 'mpesa',
      })
    ).json()) as { reference: string };
    const body = ctx.payments.webhookBody({ reference: p.reference, status: 'success', amount: 1 });
    await ctx.app.request('/v1/payments/webhook/fake', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...body.headers },
      body: body.raw,
    });
    expect((await s.billing()).purchases[0]).toMatchObject({ status: 'pending' });
    expect((await s.billing()).allowance.cards).toBe(2);
  });

  it('a success that does not say how much arrived leaves the order for staff too', async () => {
    const s = await setup();
    const p = (await (
      await s.order({ cards: 5 }, 'order-key-cards-noamt', {
        method: 'mobile',
        phone: '0712 345 678',
        mobileMethod: 'mpesa',
      })
    ).json()) as { reference: string };
    const body = ctx.payments.webhookBody({ reference: p.reference, status: 'success' });
    await ctx.app.request('/v1/payments/webhook/fake', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...body.headers },
      body: body.raw,
    });
    expect((await s.billing()).purchases[0]).toMatchObject({ status: 'pending' });
    expect((await s.billing()).allowance.cards).toBe(2);
    const [e] = await ctx.db.select().from(events).where(eq(events.id, s.evId));
    expect(e!.plan).not.toBe('paid');
  });

  it('only real orders; staff can grant credit with a reason', async () => {
    const s = await setup();
    expect((await s.order({ packKey: 'nope' }, 'order-key-unknown')).status).toBe(400);
    expect((await s.order({ cards: 0 }, 'order-key-zero')).status).toBe(400);
    const g = await api(ctx, 'POST', `/v1/ops/events/${s.evId}/grants`, {
      token: admin,
      body: { cards: 10, messages: 0, note: '' },
    });
    expect(g.status).toBe(400);
    const ok = await api(ctx, 'POST', `/v1/ops/events/${s.evId}/grants`, {
      token: admin,
      body: { cards: 10, messages: 0, note: 'Harusi ya majaribio' },
    });
    expect(ok.status).toBe(201);
    expect((await s.billing()).allowance.cards).toBe(12);
    const list = await api(ctx, 'GET', '/v1/ops/purchases?status=paid', { token: support });
    expect(list.body!.some((p: { kind: string }) => p.kind === 'grant')).toBe(true);
  });
});

describe('printed cards (ADR 042)', () => {
  it('the host chooses who gets a printed card; bulk printing generates and charges new ones once', async () => {
    const s = await setup();
    const a = (await s.addGuest(1)).body!;
    const b = (await s.addGuest(2)).body!;
    await s.addGuest(3);
    const noPhone = (
      await api(ctx, 'POST', `/v1/events/${s.evId}/guests`, {
        token: s.t,
        body: { displayName: 'Bibi bila simu' },
      })
    ).body!;
    expect(noPhone.printCard).toBe(true); // without a phone, a printed card is the only way
    const chosen = await api(ctx, 'POST', `/v1/events/${s.evId}/guests/print-card`, {
      token: s.t,
      body: { guestIds: [a.id, b.id], printCard: true },
    });
    expect(chosen.body).toEqual({ updated: 2 });

    // three cards chosen for print, two left: refused whole
    const tooMany = await s.print({ format: 'a6', marked: true });
    expect(tooMany.status).toBe(402);
    expect((await s.billing()).used.cards).toBe(0);

    await api(ctx, 'POST', `/v1/events/${s.evId}/guests/print-card`, {
      token: s.t,
      body: { guestIds: [noPhone.id], printCard: false },
    });
    const pdf = await s.print({ format: 'a6', marked: true });
    expect(pdf.status).toBe(200);
    expect(pdf.headers.get('content-type')).toBe('application/pdf');
    expect((await s.billing()).used.cards).toBe(2);
    // printing the same cards again is free
    expect((await s.print({ format: 'a6', marked: true })).status).toBe(200);
    expect((await s.billing()).used.cards).toBe(2);
    // and sending a printed card digitally does not charge it again
    expect((await s.send({ target: { guestIds: [a.id] }, channel: 'sms' })).body).toMatchObject({
      sent: 1,
    });
    expect((await s.billing()).used.cards).toBe(2);
  });
});

describe('selling cards (ADR 042)', () => {
  it('publishes the prices without signing in', async () => {
    const r = await api(ctx, 'GET', '/v1/pricing');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ enforced: true, messagesPerCard: 4 });
    expect(r.body!.cardTiers).toHaveLength(3);
  });

  it('shows staff what customers paid, without grants, and the orders waiting for them', async () => {
    const s = await setup();
    await s.order({ packKey: 'credits10' }, 'order-key-revenue-pending');
    const o = (await api(ctx, 'GET', '/v1/ops/overview', { token: support })).body!;
    // Earlier in this file: a credit pack confirmed by staff (2,000) and 5 cards paid by phone (12,000).
    // (the legacy-name compatibility layer adds `amountTzs` beside `amount`, so match a subset)
    expect(o.revenue30d).toHaveLength(1);
    expect(o.revenue30d[0]).toMatchObject({ currency: 'TZS', amount: 14_000, orders: 2 });
    expect(o.pendingOrders).toBeGreaterThanOrEqual(1);
  });
});
