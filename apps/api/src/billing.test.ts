import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { events } from '@harusi/db';
import { DEFAULT_PRICING, type PricingCatalog } from '@harusi/schemas/billing';
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
  enforced: true,
  free: { cards: 2, sms: 1, whatsapp: 0 },
  bundles: [
    {
      key: 'b5',
      name: 'Kadi 5',
      cards: 5,
      sms: 3,
      whatsapp: 2,
      price: { TZS: 10_000, KES: 500 },
    },
  ],
  packs: [{ key: 'sms10', channel: 'sms', messages: 10, price: { TZS: 2_000, KES: 100 } }],
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
  const addGuest = (n: number) =>
    api(ctx, 'POST', `/v1/events/${ev.id}/guests`, {
      token: t,
      body: { displayName: `Mgeni ${n}`, phone: `0714${String(seq * 100 + n).padStart(6, '0')}` },
    });
  const billing = async () =>
    (await api(ctx, 'GET', `/v1/events/${ev.id}/billing`, { token: t })).body!;
  const order = (itemKey: string, key: string, extra: object = { method: 'manual' }) =>
    ctx.app.request(`/v1/events/${ev.id}/billing/orders`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${t}`,
        'idempotency-key': key,
      },
      body: JSON.stringify({ itemKey, ...extra }),
    });
  const send = () =>
    api(ctx, 'POST', `/v1/events/${ev.id}/invitations/send`, {
      token: t,
      body: { target: 'remaining', channel: 'sms' },
    });
  return { t, evId: ev.id as string, addGuest, billing, order, send };
}

describe('pricing catalogue (ADR 042)', () => {
  it('starts on the defaults, not enforced, and only billing or admin staff may change it', async () => {
    const r = await api(ctx, 'GET', '/v1/ops/pricing', { token: support });
    expect(r.body).toMatchObject({ source: 'default', catalog: DEFAULT_PRICING });
    expect((await api(ctx, 'PUT', '/v1/ops/pricing', { token: support, body: tiny })).status).toBe(
      403,
    );
    const bad = { ...tiny, packs: [...tiny.packs, { ...tiny.packs[0]! }] };
    expect((await setPricing(bad)).status).toBe(400); // the same key twice
  });

  it('counts usage but refuses nothing while enforcement is off', async () => {
    await setPricing({ ...tiny, enforced: false });
    const s = await setup();
    for (let i = 0; i < 4; i++) expect((await s.addGuest(i)).status).toBe(201);
    expect((await s.send()).status).toBe(200);
    expect(await s.billing()).toMatchObject({
      enforced: false,
      allowance: { cards: 2, sms: 1, whatsapp: 0 },
      used: { cards: 4, sms: 4, whatsapp: 0 },
      remaining: { cards: 0, sms: 0, whatsapp: 0 },
    });
  });
});

describe('enforced allowances', () => {
  beforeAll(async () => {
    expect((await setPricing(tiny)).status).toBe(200);
  });

  it('refuses a card past the allowance with 402 and the details the console needs', async () => {
    const s = await setup();
    expect((await s.addGuest(1)).status).toBe(201);
    expect((await s.addGuest(2)).status).toBe(201);
    const r = await s.addGuest(3);
    expect(r.status).toBe(402);
    expect(r.body!.error).toMatchObject({
      code: 'payment_required',
      details: { reason: 'quota_exceeded', resource: 'cards', remaining: 0, needed: 1 },
    });
  });

  it('refuses an import that does not fit, saving none of it', async () => {
    const s = await setup();
    const csv = 'Jina,Simu\nAsha,0712345678\nBaraka,0754000111\nNeema,0754000112\n';
    const r = await api(ctx, 'POST', `/v1/events/${s.evId}/guests/import`, {
      token: s.t,
      body: { csv },
    });
    expect(r.status).toBe(402);
    expect((await s.billing()).used.cards).toBe(0);
  });

  it('refuses a send that needs more SMS than are left, and sends after a top-up is paid', async () => {
    const s = await setup();
    await s.addGuest(1);
    await s.addGuest(2);
    const r = await s.send();
    expect(r.status).toBe(402);
    expect(r.body!.error.details).toMatchObject({ resource: 'sms', remaining: 1, needed: 2 });

    // A manual order waits for staff; it adds nothing until then.
    const o = await s.order('sms10', 'order-key-sms-1');
    expect(o.status).toBe(201);
    const purchase = (await o.json()) as { id: string; status: string; amount: number };
    expect(purchase).toMatchObject({ status: 'pending', amount: 2_000 });
    expect((await s.send()).status).toBe(402);

    // The same key again is the same order.
    const again = (await (await s.order('sms10', 'order-key-sms-1')).json()) as { id: string };
    expect(again.id).toBe(purchase.id);

    expect(
      (
        await api(ctx, 'POST', `/v1/ops/purchases/${purchase.id}/paid`, {
          token: support,
          body: { note: 'Benki' },
        })
      ).status,
    ).toBe(403);
    const paid = await api(ctx, 'POST', `/v1/ops/purchases/${purchase.id}/paid`, {
      token: admin,
      body: { note: 'Benki CRDB' },
    });
    expect(paid.body).toMatchObject({ status: 'paid' });
    expect((await s.billing()).allowance.sms).toBe(11);
    expect((await s.send()).body).toMatchObject({ sent: 2, failed: 0 });
    expect((await s.billing()).used.sms).toBe(2);
  });

  it('a failed message is not charged', async () => {
    const s = await setup();
    await s.addGuest(1);
    ctx.fail.sms = () => true;
    const r = await s.send();
    ctx.fail.sms = () => false;
    expect(r.body).toMatchObject({ sent: 0, failed: 1 });
    expect((await s.billing()).remaining.sms).toBe(1);
  });

  it('a bundle paid by mobile money adds cards and messages once, however often the webhook comes', async () => {
    const s = await setup();
    const o = await s.order('b5', 'order-key-bundle-1', {
      method: 'mobile',
      phone: '0712 345 678',
      mobileMethod: 'mpesa',
    });
    expect(o.status).toBe(201);
    const p = (await o.json()) as { id: string; reference: string; status: string };
    expect(p.status).toBe('pending');
    expect(ctx.payments.started.at(-1)).toMatchObject({ reference: p.reference, amount: 10_000 });

    const body = ctx.payments.webhookBody({
      reference: p.reference,
      status: 'success',
      amount: 10_000,
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
      allowance: { cards: 7, sms: 4, whatsapp: 2 },
      purchases: [{ status: 'paid', kind: 'bundle' }],
    });
    const [e] = await ctx.db.select().from(events).where(eq(events.id, s.evId));
    expect(e!.plan).toBe('paid');
  });

  it('a short payment leaves the order for staff instead of paying it', async () => {
    const s = await setup();
    const p = (await (
      await s.order('b5', 'order-key-bundle-short', {
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

  it('only the owner orders; staff can grant credit with a reason', async () => {
    const s = await setup();
    expect((await s.order('nope', 'order-key-unknown')).status).toBe(400);
    const g = await api(ctx, 'POST', `/v1/ops/events/${s.evId}/grants`, {
      token: admin,
      body: { cards: 10, sms: 0, whatsapp: 0, note: '' },
    });
    expect(g.status).toBe(400);
    const ok = await api(ctx, 'POST', `/v1/ops/events/${s.evId}/grants`, {
      token: admin,
      body: { cards: 10, sms: 0, whatsapp: 0, note: 'Harusi ya majaribio' },
    });
    expect(ok.status).toBe(201);
    expect((await s.billing()).allowance.cards).toBe(12);
    const list = await api(ctx, 'GET', '/v1/ops/purchases?status=paid', { token: support });
    expect(list.body!.some((p: { kind: string }) => p.kind === 'grant')).toBe(true);
  });
});

describe('selling cards (ADR 042)', () => {
  it('publishes the prices without signing in', async () => {
    const r = await api(ctx, 'GET', '/v1/pricing');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ enforced: true, bundles: [{ key: 'b5', cards: 5 }] });
  });

  it('shows staff what customers paid, without grants, and the orders waiting for them', async () => {
    const s = await setup();
    await s.order('sms10', 'order-key-revenue-pending');
    const o = (await api(ctx, 'GET', '/v1/ops/overview', { token: support })).body!;
    // Earlier in this file: an SMS pack confirmed by staff (2,000) and a bundle paid by phone (10,000).
    // (the legacy-name compatibility layer adds `amountTzs` beside `amount`, so match a subset)
    expect(o.revenue30d).toHaveLength(1);
    expect(o.revenue30d[0]).toMatchObject({ currency: 'TZS', amount: 12_000, orders: 2 });
    expect(o.pendingOrders).toBeGreaterThanOrEqual(1);
  });
});
