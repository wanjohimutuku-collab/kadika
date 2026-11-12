import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { guests, smsCampaigns } from '@harusi/db';
import { DEFAULT_PRICING, type PricingCatalog } from '@harusi/schemas/billing';
import { SmsCampaignService } from './services/sms-campaigns';
import { EventService } from './services/events';
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
  admin = (await loginAsStaff(ctx, '0711900001', 'billing', 'Bahati Billing')).accessToken;
  support = (await loginAsStaff(ctx, '0711900002', 'support', 'Saidi Support')).accessToken;
});
afterAll(() => ctx.close());

const setPricing = (c: PricingCatalog) =>
  api(ctx, 'PUT', '/v1/ops/pricing', { token: admin, body: c });

let seq = 0;
async function setup(product: 'sms' | 'cards' = 'sms') {
  const owner = await loginAs(ctx, `07891${String(++seq).padStart(5, '0')}`);
  const t = owner.accessToken;
  const ev = (
    await api(ctx, 'POST', '/v1/events', {
      token: t,
      body: {
        title: 'Kikao cha harusi',
        coupleNames: 'Kikao cha harusi',
        dateStart: '2027-06-01T10:00:00+03:00',
        product,
      },
    })
  ).body!;
  const add = (n: number, extra: object = {}) =>
    api(ctx, 'POST', `/v1/events/${ev.id}/guests`, {
      token: t,
      body: {
        displayName: `Ndugu ${n}`,
        phone: `0715${String(seq * 100 + n).padStart(6, '0')}`,
        ...extra,
      },
    });
  const send = (body: object) =>
    api(ctx, 'POST', `/v1/events/${ev.id}/sms/campaigns`, { token: t, body });
  const list = async () =>
    (await api(ctx, 'GET', `/v1/events/${ev.id}/sms/campaigns`, { token: t })).body!.items;
  const billing = async () =>
    (await api(ctx, 'GET', `/v1/events/${ev.id}/billing`, { token: t })).body!;
  return { t, ev, evId: ev.id as string, add, send, list, billing };
}

describe('SMS reminders only (ADR 055)', () => {
  it('creates an SMS-only event that card actions refuse', async () => {
    const s = await setup();
    expect(s.ev.product).toBe('sms');
    await s.add(1);
    const invite = await api(ctx, 'POST', `/v1/events/${s.evId}/invitations/send`, {
      token: s.t,
      body: { target: 'remaining', channel: 'sms' },
    });
    expect(invite.status).toBe(409);
    expect(invite.body!.error.details.reason).toBe('sms_only');
    // the owner cannot turn it into a card event by PATCH
    await api(ctx, 'PATCH', `/v1/events/${s.evId}`, { token: s.t, body: { product: 'cards' } });
    expect((await api(ctx, 'GET', `/v1/events/${s.evId}`, { token: s.t })).body!.product).toBe(
      'sms',
    );
  });

  it('sends the customer’s own text to every contact with a phone and logs it', async () => {
    const s = await setup();
    await s.add(1);
    await s.add(2, { groupLabel: 'Kamati' });
    await s.add(3, { phone: '' });
    const before = ctx.sms.sent.length;
    const preview = await api(ctx, 'POST', `/v1/events/${s.evId}/sms/preview`, {
      token: s.t,
      body: { body: 'Kikao ni Jumamosi saa 10 jioni.', target: 'all' },
    });
    expect(preview.body).toMatchObject({ recipients: 2, withoutPhone: 1, segments: 1, credits: 2 });
    const r = await s.send({ body: 'Kikao ni Jumamosi saa 10 jioni.', target: 'all' });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ status: 'done', sent: 2, failed: 0, skipped: 1, credits: 2 });
    const out = ctx.sms.sent.slice(before);
    expect(out.map((m) => m.body)).toEqual([
      'Kikao ni Jumamosi saa 10 jioni.',
      'Kikao ni Jumamosi saa 10 jioni.',
    ]);
    expect((await s.billing()).used.messages).toBe(2);
    // a group only
    const g = await s.send({ body: 'Kamati: tukutane kesho.', target: { group: 'Kamati' } });
    expect(g.body).toMatchObject({ sent: 1 });
    expect(await s.list()).toHaveLength(2);
  });

  it('spends one credit per SMS part and refuses texts over three parts', async () => {
    const s = await setup();
    await s.add(1);
    await s.add(2);
    const long = 'a'.repeat(200); // two parts
    const r = await s.send({ body: long, target: 'all' });
    expect(r.body).toMatchObject({ segments: 2, sent: 2, credits: 4 });
    expect((await s.billing()).used.messages).toBe(4);
    const tooLong = await s.send({ body: 'a'.repeat(500), target: 'all' });
    expect(tooLong.status).toBe(400);
  });

  it('refuses up front (402) when credits are short, and a pack lets it through', async () => {
    await setPricing({
      ...DEFAULT_PRICING,
      enforced: true,
      free: { cards: 0, messages: 2 },
      packs: [{ key: 'sms10', messages: 10, price: { TZS: 2_000, KES: 100 } }],
    });
    try {
      const s = await setup();
      for (let i = 1; i <= 3; i++) await s.add(i);
      const refused = await s.send({ body: 'Habari za kikao', target: 'all' });
      expect(refused.status).toBe(402);
      expect(refused.body!.error.details).toMatchObject({ resource: 'messages', needed: 3 });
      const grant = await api(ctx, 'POST', `/v1/ops/events/${s.evId}/grants`, {
        token: admin,
        body: { cards: 0, messages: 10, note: 'Kifurushi cha SMS kwa benki' },
      });
      expect(grant.status).toBe(201);
      expect((await s.send({ body: 'Habari za kikao', target: 'all' })).body).toMatchObject({
        sent: 3,
      });
      expect((await s.billing()).remaining.messages).toBe(9);
    } finally {
      await setPricing(DEFAULT_PRICING);
    }
  });

  it('does not charge failed messages', async () => {
    const s = await setup();
    const a = (await s.add(1)).body!;
    await s.add(2);
    const failing = a.phoneE164 as string;
    ctx.fail.sms = (to) => to === failing;
    try {
      const r = await s.send({ body: 'Habari', target: 'all' });
      expect(r.body).toMatchObject({ sent: 1, failed: 1 });
      expect((await s.billing()).used.messages).toBe(1);
    } finally {
      ctx.fail.sms = () => false;
    }
  });

  it('schedules a text, cancels one, and runs the rest when due', async () => {
    const s = await setup();
    await s.add(1);
    const at = (min: number) => new Date(ctx.clock.now + min * 60_000).toISOString();
    expect((await s.send({ body: 'Mapema mno', target: 'all', scheduleAt: at(0) })).status).toBe(
      400,
    );
    const later = (await s.send({ body: 'Kesho ni kikao', target: 'all', scheduleAt: at(30) }))
      .body!;
    const other = (await s.send({ body: 'Futa hii', target: 'all', scheduleAt: at(40) })).body!;
    expect(later.status).toBe('scheduled');
    const cancel = await api(ctx, 'DELETE', `/v1/events/${s.evId}/sms/campaigns/${other.id}`, {
      token: s.t,
    });
    expect(cancel.body!.status).toBe('cancelled');
    const svc = new SmsCampaignService(ctx.deps, new EventService(ctx.deps));
    const before = ctx.sms.sent.length;
    ctx.clock.now += 50 * 60_000;
    try {
      expect(await svc.runDue()).toMatchObject({ ran: 1 });
    } finally {
      ctx.clock.now -= 50 * 60_000;
    }
    expect(ctx.sms.sent.slice(before).map((m) => m.body)).toEqual(['Kesho ni kikao']);
    const [row] = await ctx.db.select().from(smsCampaigns).where(eq(smsCampaigns.id, later.id));
    expect(row).toMatchObject({ status: 'done', sentCount: 1 });
  });

  it('refuses a schedule more than a year ahead', async () => {
    const s = await setup();
    await s.add(1);
    const tooFar = new Date(ctx.clock.now + 400 * 24 * 3_600_000).toISOString();
    const r = await s.send({ body: 'Mbali mno', target: 'all', scheduleAt: tooFar });
    expect(r.status).toBe(400);
    expect(r.body!.error.details.field).toBe('scheduleAt');
  });

  it('skips contacts who opted out of reminders and refunds unused parts', async () => {
    const s = await setup();
    const keeps = (await s.add(1)).body!;
    const opts = (await s.add(2)).body!;
    await ctx.db.update(guests).set({ remindersOptOut: true }).where(eq(guests.id, opts.id));
    const preview = await api(ctx, 'POST', `/v1/events/${s.evId}/sms/preview`, {
      token: s.t,
      body: { body: 'Habari', target: 'all' },
    });
    expect(preview.body).toMatchObject({ recipients: 1, withoutPhone: 1 });
    const r = await s.send({ body: 'Habari', target: 'all' });
    expect(r.body).toMatchObject({ sent: 1, failed: 0, skipped: 1, credits: 1 });
    expect(ctx.sms.sent.at(-1)!.to).toBe(keeps.phoneE164);
  });

  it('is for SMS accounts only, and gate agents cannot send', async () => {
    const cards = await setup('cards');
    await cards.add(1);
    const r = await cards.send({ body: 'Habari', target: 'all' });
    expect(r.status).toBe(409);
    expect(r.body!.error.details.reason).toBe('not_sms_product');
  });

  it('lists SMS customers for every staff level, with credits and usage', async () => {
    const s = await setup();
    await s.add(1);
    await s.send({ body: 'Habari', target: 'all' });
    const r = await api(ctx, 'GET', '/v1/ops/sms-customers', { token: support });
    expect(r.status).toBe(200);
    const row = (r.body as unknown as Record<string, unknown>[]).find((x) => x.eventId === s.evId);
    expect(row).toMatchObject({ contacts: 1, campaigns: 1, smsSent: 1, used: 1 });
    expect(String(row!.ownerPhone)).toContain('•');
    const events = await api(ctx, 'GET', '/v1/ops/events', { token: support });
    expect(
      (events.body as unknown as { id: string; product: string }[]).find((e) => e.id === s.evId)
        ?.product,
    ).toBe('sms');
    const owner = await api(ctx, 'GET', '/v1/ops/sms-customers', { token: s.t });
    expect(owner.status).toBe(403);
  });

  it('personalises bulk SMS attributes per recipient and rejects unknown placeholders', async () => {
    const s = await setup();
    await api(ctx, 'PATCH', `/v1/events/${s.evId}`, {
      token: s.t,
      body: { venueName: 'Ukumbi wa Mwanga' },
    });
    await s.add(1, { displayName: 'Asha Juma', groupLabel: 'Kamati', language: 'sw' });
    await s.add(2, { displayName: 'Neema', language: 'en' });
    const bad = await s.send({ body: 'Habari {nope}', target: 'all' });
    expect(bad.status).toBe(400);

    const before = ctx.sms.sent.length;
    const r = await s.send({
      body: 'Habari {firstName} {lastName} ({group}), tukutane {venue} — {title}',
      target: 'all',
    });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ sent: 2, failed: 0 });
    const out = ctx.sms.sent
      .slice(before)
      .map((m) => m.body)
      .sort();
    expect(out).toEqual([
      'Habari Asha Juma (Kamati), tukutane Ukumbi wa Mwanga — Kikao cha harusi',
      'Habari Neema (), tukutane Ukumbi wa Mwanga — Kikao cha harusi',
    ]);
  });
});
