import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { count, eq } from 'drizzle-orm';
import { messageLog } from '@harusi/db';
import { api, createTestContext, loginAs, type TestContext } from './testing/test-app';

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(() => ctx.close());

async function setup(phone: string) {
  const owner = await loginAs(ctx, phone);
  const ev = (
    await api(ctx, 'POST', '/v1/events', {
      token: owner.accessToken,
      body: {
        title: 'Harusi',
        coupleNames: 'Asha & Juma',
        dateStart: '2027-06-01T10:00:00+03:00',
        venueName: 'Ukumbi wa Mwanga',
      },
    })
  ).body!;
  return { ev, t: owner.accessToken };
}
const send = (evId: string, t: string, body: unknown, headers?: Record<string, string>) =>
  ctx.app.request(`/v1/events/${evId}/invitations/send`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${t}`, ...headers },
    body: JSON.stringify(body),
  });
const addGuest = (evId: string, t: string, body: Record<string, unknown>) =>
  api(ctx, 'POST', `/v1/events/${evId}/guests`, { token: t, body });

describe('invitation delivery (§7.2)', () => {
  it('sends by WhatsApp or SMS per guest, skips print-only, and writes a readable message', async () => {
    const { ev, t } = await setup('0766000001');
    const smart = (await addGuest(ev.id, t, { displayName: 'Bibi Pendo', phone: '0712100001' }))
      .body!;
    await addGuest(ev.id, t, {
      displayName: 'Babu Salim',
      phone: '0712100002',
      hasSmartphone: false,
    });
    await addGuest(ev.id, t, { displayName: 'Mama Zuhura', inviteChannelPref: 'print' });
    ctx.whatsapp.sent.length = 0;
    ctx.sms.sent.length = 0;

    const res = await send(ev.id, t, { target: 'remaining' });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      total: 3,
      sent: 2,
      skipped: 1,
      failed: 0,
      byChannel: { whatsapp: 1, sms: 1 },
    });
    const wa = ctx.whatsapp.sent[0]!;
    expect(wa.to).toBe('+255712100001');
    expect(wa.body).toMatch(/^Karibu kwenye harusi ya Asha & Juma, 1 Juni 2027\./);
    expect(wa.body).toContain('/s/');
    expect(wa.body).toContain(`Namba: ${smart.shortCode}`);
    expect(wa.body.length).toBeLessThanOrEqual(160 + 40); // URL base is longer in dev than on the short domain
    // the link works: it opens the same guest's card
    const token = /\/s\/(\S+)/.exec(wa.body)![1]!;
    const card = await api(ctx, 'GET', `/v1/c/${token}`);
    expect(card.body).toMatchObject({ state: 'ok', guest: { displayName: 'Bibi Pendo' } });

    const stats = await api(ctx, 'GET', `/v1/events/${ev.id}/invitations/stats`, { token: t });
    expect(stats.body).toMatchObject({ total: 3, byStatus: { sent: 1, opened: 1, created: 1 } }); // opening the card marked one as opened
    // sending again does nothing for guests already sent
    expect(await (await send(ev.id, t, { target: 'remaining' })).json()).toMatchObject({
      total: 1,
      sent: 0,
      skipped: 1,
    });
  });

  it('falls back from WhatsApp to SMS, retries, and reports guests nobody could reach', async () => {
    const { ev, t } = await setup('0766000002');
    await addGuest(ev.id, t, { displayName: 'Wa Down', phone: '0712200001' });
    const both = (await addGuest(ev.id, t, { displayName: 'Both Down', phone: '0712200002' }))
      .body!;
    ctx.fail.wa = (to) => to === '+255712200001' || to === '+255712200002';
    ctx.fail.sms = (to) => to === '+255712200002';
    ctx.sms.sent.length = 0;

    const res = await (await send(ev.id, t, { target: 'remaining' })).json();
    expect(res).toMatchObject({ total: 2, sent: 1, failed: 1, byChannel: { sms: 1, whatsapp: 0 } });
    expect(res.failures).toEqual([{ guestId: both.id, error: 'fake provider failure' }]);
    expect(ctx.sms.sent).toHaveLength(1);
    const logged = await ctx.db
      .select({ n: count() })
      .from(messageLog)
      .where(eq(messageLog.guestId, both.id));
    expect(logged[0]!.n).toBe(2); // one failed WhatsApp, one failed SMS
    const stats = await api(ctx, 'GET', `/v1/events/${ev.id}/invitations/stats`, { token: t });
    expect(stats.body).toMatchObject({ byStatus: { sent: 1, created: 1 }, failedMessages: 1 });

    // gateway recovers → "retry failed" delivers the rest and nothing is sent twice
    ctx.fail.wa = () => false;
    ctx.fail.sms = () => false;
    ctx.sms.sent.length = 0;
    ctx.whatsapp.sent.length = 0;
    const retry = await (await send(ev.id, t, { target: 'failed' })).json();
    expect(retry).toMatchObject({ total: 1, sent: 1, failed: 0 });
    expect(ctx.whatsapp.sent.length + ctx.sms.sent.length).toBe(1);
  });

  it('replays an idempotent send instead of sending twice, and gate agents cannot send', async () => {
    const { ev, t } = await setup('0766000003');
    await addGuest(ev.id, t, { displayName: 'Mgeni Mmoja', phone: '0712300001' });
    ctx.whatsapp.sent.length = 0;
    const key = { 'idempotency-key': 'send-once-0001' };
    const a = await send(ev.id, t, { target: 'remaining' }, key);
    const b = await send(ev.id, t, { target: 'remaining' }, key);
    expect(a.status).toBe(200);
    expect(b.headers.get('idempotent-replayed')).toBe('true');
    expect(ctx.whatsapp.sent).toHaveLength(1);

    await api(ctx, 'POST', `/v1/events/${ev.id}/members`, {
      token: t,
      body: { name: 'Lango', phone: '0766000009', role: 'gate' },
    });
    const gate = await loginAs(ctx, '0766000009');
    expect((await send(ev.id, gate.accessToken, { target: 'remaining' })).status).toBe(403);
  });

  it('a 500-guest send with simulated outages ends in consistent statuses', async () => {
    const { ev, t } = await setup('0766000004');
    const rows = Array.from(
      { length: 500 },
      (_, i) => `Mgeni ${i + 1},07${String(20_000_000 + i * 3).padStart(8, '0')}`,
    );
    const imp = await api(ctx, 'POST', `/v1/events/${ev.id}/guests/import`, {
      token: t,
      body: { csv: ['Jina,Simu', ...rows].join('\n') },
    });
    expect(imp.body).toMatchObject({ created: 500 });
    // WhatsApp is down for every 5th number; SMS is also down for every 25th number.
    const idx = (to: string) => Math.round((Number(to.slice(4)) - 20_000_000) / 3);
    ctx.fail.wa = (to) => idx(to) % 5 === 0;
    ctx.fail.sms = (to) => idx(to) % 25 === 0;
    ctx.whatsapp.sent.length = 0;
    ctx.sms.sent.length = 0;

    const res = await (await send(ev.id, t, { target: 'remaining' })).json();
    expect(res.total).toBe(500);
    expect(res.sent + res.failed + res.skipped).toBe(500);
    expect(res.failed).toBe(20); // every 25th of 500
    expect(res.byChannel.sms).toBe(100 - 20); // WhatsApp-down numbers that SMS could still reach
    expect(res.byChannel.whatsapp).toBe(400);
    expect(ctx.whatsapp.sent).toHaveLength(400);
    const stats = await api(ctx, 'GET', `/v1/events/${ev.id}/invitations/stats`, { token: t });
    expect(stats.body).toMatchObject({ total: 500, byStatus: { sent: 480, created: 20 } });
    expect(stats.body!.failedMessages).toBe(20);

    ctx.fail.wa = () => false;
    ctx.fail.sms = () => false;
    const retry = await (await send(ev.id, t, { target: 'failed' })).json();
    expect(retry).toMatchObject({ total: 20, sent: 20, failed: 0 });
    const done = await api(ctx, 'GET', `/v1/events/${ev.id}/invitations/stats`, { token: t });
    expect(done.body).toMatchObject({ byStatus: { sent: 500 }, failedMessages: 0 });
  }, 120_000);
});
