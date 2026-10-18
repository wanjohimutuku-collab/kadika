import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { events, guests, messageLog } from '@harusi/db';
import { DeliveryService } from './services/delivery';
import { EventService } from './services/events';
import { runTick } from './worker';
import { api, createTestContext, loginAs, type TestContext } from './testing/test-app';

let ctx: TestContext;
let delivery: DeliveryService;
// A fresh database per test: the scheduled jobs look at every event, so tests must not share one.
beforeEach(async () => {
  ctx = await createTestContext();
  delivery = new DeliveryService(ctx.deps, new EventService(ctx.deps));
});
afterEach(() => ctx.close());

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

async function setup(phone: string, dateStart: Date) {
  const owner = await loginAs(ctx, phone);
  const ev = (
    await api(ctx, 'POST', '/v1/events', {
      token: owner.accessToken,
      body: { title: 'Harusi', coupleNames: 'Asha & Juma', dateStart: dateStart.toISOString() },
    })
  ).body!;
  await ctx.db.update(events).set({ status: 'active' }).where(eq(events.id, ev.id));
  return { ev, t: owner.accessToken };
}
const add = (evId: string, t: string, body: Record<string, unknown>) =>
  api(ctx, 'POST', `/v1/events/${evId}/guests`, { token: t, body: { language: 'sw', ...body } });
const sendAll = (evId: string, t: string) =>
  api(ctx, 'POST', `/v1/events/${evId}/invitations/send`, {
    token: t,
    body: { target: 'remaining' },
  });
const hook = (path: string, body: unknown, secret = 'hook-secret-for-tests') =>
  ctx.app.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-webhook-secret': secret },
    body: JSON.stringify(body),
  });
const stats = async (evId: string, t: string) =>
  (await api(ctx, 'GET', `/v1/events/${evId}/invitations/stats`, { token: t })).body!;

describe('delivery webhooks and fallback', () => {
  it('rejects webhooks without the shared secret', async () => {
    expect((await hook('/v1/webhooks/whatsapp', {}, 'wrong')).status).toBe(401);
    const none = await ctx.app.request('/v1/webhooks/sms', { method: 'POST', body: '{}' });
    expect(none.status).toBe(401);
  });

  it('moves an invitation to delivered from a WhatsApp ack, never backwards', async () => {
    const { ev, t } = await setup('0777000001', new Date(ctx.clock.now + 60 * DAY));
    await add(ev.id, t, { displayName: 'Bibi Pendo', phone: '0713000001' });
    ctx.whatsapp.sent.length = 0;
    await sendAll(ev.id, t);
    const [log] = await ctx.db.select().from(messageLog);
    const id = log!.providerMsgId!;
    expect((await stats(ev.id, t)).byStatus).toMatchObject({ sent: 1 });

    const res = await hook('/v1/webhooks/whatsapp', {
      event: 'messages.update',
      data: { keyId: id, status: 'DELIVERY_ACK' },
    });
    expect(await res.json()).toMatchObject({ ok: true, updates: 1 });
    expect((await stats(ev.id, t)).byStatus).toMatchObject({ delivered: 1 });
    // a late "pending" ack or an unknown id changes nothing
    await hook('/v1/webhooks/whatsapp', { data: { keyId: id, status: 'SERVER_ACK' } });
    await hook('/v1/webhooks/whatsapp', { data: { keyId: 'unknown', status: 'READ' } });
    expect((await stats(ev.id, t)).byStatus).toMatchObject({ delivered: 1 });
    expect(
      (await ctx.db.select().from(messageLog).where(eq(messageLog.providerMsgId, id)))[0]!.status,
    ).toBe('delivered');
  });

  it('hands the WhatsApp provider the template parameters for invitations and reminders', async () => {
    const { ev, t } = await setup('0777000020', new Date(ctx.clock.now + 14 * DAY));
    const g = (await add(ev.id, t, { displayName: 'Bibi Pendo', phone: '0713000020' })).body!;
    ctx.whatsapp.sent.length = 0;
    await sendAll(ev.id, t);
    const inv = ctx.whatsapp.sent[0]!;
    expect(inv.template).toMatchObject({ kind: 'invite', locale: 'sw' });
    expect(inv.template!.params.slice(0, 3)).toEqual([
      'Asha',
      'Juma',
      expect.stringMatching(/^\d+ \w+ \d{4}$/),
    ]);
    expect(inv.template!.params[3]).toMatch(/\/s\//);
    expect(inv.template!.params[4]).toBe(g.shortCode);
    ctx.whatsapp.sent.length = 0;
    await delivery.sendReminders();
    expect(ctx.whatsapp.sent[0]!.template).toMatchObject({ kind: 'reminder' });
    expect(ctx.whatsapp.sent[0]!.template!.params[2]).toBe('14');
  });

  it('accepts official WhatsApp Cloud webhooks: handshake, signature and delivery statuses', async () => {
    const { ev, t } = await setup('0777000021', new Date(ctx.clock.now + 60 * DAY));
    await add(ev.id, t, { displayName: 'Bibi Pendo', phone: '0713000021' });
    await sendAll(ev.id, t);
    const [log] = await ctx.db.select().from(messageLog);

    const ok = await ctx.app.request(
      '/v1/webhooks/whatsapp-cloud?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=777',
    );
    expect(await ok.text()).toBe('777');
    const bad = await ctx.app.request(
      '/v1/webhooks/whatsapp-cloud?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=777',
    );
    expect(bad.status).toBe(403);

    const raw = JSON.stringify({
      entry: [
        { changes: [{ value: { statuses: [{ id: log!.providerMsgId, status: 'delivered' }] } }] },
      ],
    });
    const post = (body: string, sig?: string) =>
      ctx.app.request('/v1/webhooks/whatsapp-cloud', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(sig ? { 'x-hub-signature-256': sig } : {}),
        },
        body,
      });
    expect((await post(raw)).status).toBe(401);
    expect((await post(raw, 'sha256=' + 'a'.repeat(64))).status).toBe(401);
    expect((await stats(ev.id, t)).byStatus).toMatchObject({ sent: 1 });
    const sig = 'sha256=' + createHmac('sha256', 'meta-app-secret').update(raw).digest('hex');
    const res = await post(raw, sig);
    expect(await res.json()).toMatchObject({ ok: true, updates: 1 });
    expect((await stats(ev.id, t)).byStatus).toMatchObject({ delivered: 1 });
  });

  it('sends one SMS when a WhatsApp invitation is still undelivered after N hours', async () => {
    const { ev, t } = await setup('0777000002', new Date(ctx.clock.now + 60 * DAY));
    await add(ev.id, t, { displayName: 'Undelivered', phone: '0713000002' });
    await add(ev.id, t, { displayName: 'Delivered', phone: '0713000003' });
    ctx.whatsapp.sent.length = 0;
    ctx.sms.sent.length = 0;
    await sendAll(ev.id, t);
    const logs = await ctx.db.select().from(messageLog);
    const ok = logs.find(
      (l) => l.providerMsgId === 'fake-' + Number(ctx.whatsapp.sent.length) || false,
    );
    void ok;
    // deliver the message to 'Delivered' (+255713000003) only
    const [delivered] = await ctx.db
      .select()
      .from(guests)
      .where(eq(guests.phoneE164, '+255713000003'));
    const second = logs.find((l) => l.guestId === delivered!.id)!;
    await hook('/v1/webhooks/whatsapp', {
      data: { keyId: second.providerMsgId, status: 'DELIVERY_ACK' },
    });

    ctx.clock.now += 3 * HOUR;
    expect(await delivery.fallbackUndelivered(6)).toEqual({ sent: 0, failed: 0 });
    ctx.clock.now += 4 * HOUR; // 7 h after sending
    expect(await delivery.fallbackUndelivered(6)).toEqual({ sent: 1, failed: 0 });
    expect(ctx.sms.sent).toHaveLength(1);
    expect(ctx.sms.sent[0]!.to).toBe('+255713000002');
    // running it again does not send a second fallback
    expect(await delivery.fallbackUndelivered(6)).toEqual({ sent: 0, failed: 0 });
    expect(ctx.sms.sent).toHaveLength(1);
  });

  it('polls SMS delivery reports and marks invitations delivered', async () => {
    const { ev, t } = await setup('0777000003', new Date(ctx.clock.now + 60 * DAY));
    await add(ev.id, t, { displayName: 'Sms Guest', phone: '0713000004', hasSmartphone: false });
    await sendAll(ev.id, t);
    const ids: string[] = [];
    ctx.deps.smsReport = async (id) => {
      ids.push(id);
      return 'delivered';
    };
    expect(await delivery.pollSmsReports()).toBe(1);
    expect(ids).toHaveLength(1);
    expect((await stats(ev.id, t)).byStatus).toMatchObject({ delivered: 1 });
    ctx.deps.smsReport = undefined;
  });
});

describe('reminders (T-14, T-7, T-1)', () => {
  it('reminds unanswered guests once per milestone, skips opt-outs and answered guests', async () => {
    // wedding in exactly 14 days (local noon so the day arithmetic is unambiguous)
    const start = new Date(ctx.clock.now + 14 * DAY); // same time of day as the (09:00Z) clock
    const { ev, t } = await setup('0777000010', start);
    const a = (await add(ev.id, t, { displayName: 'Anajibu', phone: '0714000001' })).body!;
    const b = (await add(ev.id, t, { displayName: 'Hajajibu', phone: '0714000002' })).body!;
    const c = (await add(ev.id, t, { displayName: 'Ameacha', phone: '0714000003' })).body!;
    await sendAll(ev.id, t);
    await api(ctx, 'POST', `/v1/c/${a.cardToken}/rsvp`, {
      body: { attending: true, partySize: 1 },
    });
    expect((await api(ctx, 'POST', `/v1/c/${c.cardToken}/reminders/opt-out`)).status).toBe(200);
    expect(b.id).toBeTruthy();
    ctx.whatsapp.sent.length = 0;
    ctx.sms.sent.length = 0;

    expect(await delivery.sendReminders()).toEqual({ sent: 1, failed: 0 });
    const all = [...ctx.whatsapp.sent, ...ctx.sms.sent];
    expect(all).toHaveLength(1);
    expect(all[0]!.to).toBe('+255714000002');
    expect(all[0]!.body).toMatch(/^Kumbukumbu: harusi ya Asha & Juma ni baada ya siku 14/);
    // the scheduler runs many times a day: nothing more goes out
    expect(await delivery.sendReminders()).toEqual({ sent: 0, failed: 0 });
    // not on the wrong day, and not at night (02:00 local)
    ctx.clock.now += 3 * DAY;
    expect(await delivery.sendReminders()).toEqual({ sent: 0, failed: 0 });
  });

  it('sends the T-7 and T-1 reminders on their days and not outside 08:00–20:00 local', async () => {
    const start = new Date(Date.UTC(2027, 5, 1, 7, 0, 0)); // 10:00 local
    const { ev, t } = await setup('0777000011', start);
    await add(ev.id, t, { displayName: 'Mgeni', phone: '0714000010', hasSmartphone: false });
    await sendAll(ev.id, t); // sent now (2026-10-14); later steps move the clock and call the service
    ctx.sms.sent.length = 0;

    ctx.clock.now = Date.UTC(2027, 4, 25, 22, 0, 0); // 7 days left, but 01:00 local the next day
    // 25 May 22:00Z = 26 May 01:00 local → 6 days left and night: nothing
    expect(await delivery.sendReminders()).toEqual({ sent: 0, failed: 0 });
    ctx.clock.now = Date.UTC(2027, 4, 25, 9, 0, 0); // 25 May 12:00 local → 7 days left
    expect(await delivery.sendReminders()).toEqual({ sent: 1, failed: 0 });
    ctx.clock.now = Date.UTC(2027, 4, 31, 9, 0, 0); // 31 May 12:00 local → 1 day left
    expect(await delivery.sendReminders()).toEqual({ sent: 1, failed: 0 });
    expect(ctx.sms.sent.map((m) => m.body.match(/siku (\d+)/)?.[1])).toEqual(['7', '1']);
    // the scheduled tick wires all three jobs together
    const tick = await runTick(ctx.deps, delivery);
    expect(tick.reminders).toEqual({ sent: 0, failed: 0 });
    const g = await ctx.db.select().from(guests).where(eq(guests.eventId, ev.id));
    expect(g).toHaveLength(1);
  });
});
