import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { guests, invitations, messageLog, scheduledSends } from '@harusi/db';
import { DeliveryService } from './services/delivery';
import { EventService } from './services/events';
import { ScheduledSendService } from './services/scheduled';
import { api, createTestContext, loginAs, type TestContext } from './testing/test-app';

let ctx: TestContext;
let scheduled: ScheduledSendService;
// A fresh database per test: the clock moves forward and the runner looks at every event.
beforeEach(async () => {
  ctx = await createTestContext();
  const events = new EventService(ctx.deps);
  scheduled = new ScheduledSendService(ctx.deps, events, new DeliveryService(ctx.deps, events));
});
afterEach(() => ctx.close());

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const at = (ms: number) => new Date(ctx.clock.now + ms).toISOString();

async function setup(phone: string, daysToEvent = 60) {
  const owner = await loginAs(ctx, phone);
  const ev = (
    await api(ctx, 'POST', '/v1/events', {
      token: owner.accessToken,
      body: {
        title: 'Harusi',
        coupleNames: 'Asha & Juma',
        dateStart: at(daysToEvent * DAY),
      },
    })
  ).body!;
  return { ev, t: owner.accessToken };
}
/** A fresh access token: they last 15 minutes, and these tests move the clock by days. */
const renew = async (phone: string) => (await loginAs(ctx, phone)).accessToken;
const add = async (evId: string, t: string, name: string, phone: string) =>
  (
    await api(ctx, 'POST', `/v1/events/${evId}/guests`, {
      token: t,
      body: { displayName: name, phone, hasSmartphone: false, inviteChannelPref: 'sms', language: 'sw' },
    })
  ).body!;
const send = (evId: string, t: string, body: Record<string, unknown>) =>
  api(ctx, 'POST', `/v1/events/${evId}/invitations/send`, { token: t, body });
const schedule = (evId: string, t: string, body: Record<string, unknown>) =>
  api(ctx, 'POST', `/v1/events/${evId}/scheduled-sends`, { token: t, body });
const setStatus = (guestId: string, status: 'confirmed' | 'declined' | 'created') =>
  ctx.db.update(invitations).set({ status }).where(eq(invitations.guestId, guestId));
const reminders = async (guestId: string) =>
  (await ctx.db.select().from(messageLog).where(eq(messageLog.guestId, guestId))).filter(
    (m) => m.kind === 'reminder',
  );

/** Five guests, all invited by SMS: one unanswered, one confirmed, one declined, one opted out. */
async function invitedFive(phone: string) {
  const { ev, t } = await setup(phone);
  const a = await add(ev.id, t, 'Bibi Pendo', '0712300001');
  const b = await add(ev.id, t, 'Babu Salim', '0712300002');
  const c = await add(ev.id, t, 'Mama Zuhura', '0712300003');
  const d = await add(ev.id, t, 'Baba Hamisi', '0712300004');
  await send(ev.id, t, { target: 'remaining', channel: 'sms' });
  await setStatus(b.id, 'confirmed');
  await setStatus(c.id, 'declined');
  await ctx.db.update(guests).set({ remindersOptOut: true }).where(eq(guests.id, d.id));
  ctx.sms.sent.length = 0;
  return { ev, t, a, b, c, d };
}

describe('reminders the organiser asks for (ADR 030)', () => {
  it('goes to guests who were invited and have not answered, and never to one who opted out', async () => {
    const { ev, t, a, d } = await invitedFive('0766300001');
    const res = await send(ev.id, t, { target: 'unanswered', kind: 'reminder', channel: 'sms' });
    expect(res.status).toBe(200);
    // Pendo (waiting) and Hamisi (opted out, so skipped); not the confirmed or declined guests
    expect(res.body).toMatchObject({ total: 2, sent: 1, skipped: 1, failed: 0 });
    expect(ctx.sms.sent).toHaveLength(1);
    expect(ctx.sms.sent[0]).toMatchObject({ to: '+255712300001' });
    expect(ctx.sms.sent[0]!.body).toMatch(/siku 60/);
    expect(await reminders(a.id)).toHaveLength(1);
    expect(await reminders(d.id)).toHaveLength(0);
  });

  it('can include guests who confirmed, but still not those who declined', async () => {
    const { ev, t, b, c } = await invitedFive('0766300002');
    const res = await send(ev.id, t, { target: 'all', kind: 'reminder', channel: 'sms' });
    expect(res.body).toMatchObject({ total: 3, sent: 2, skipped: 1 });
    expect(await reminders(b.id)).toHaveLength(1);
    expect(await reminders(c.id)).toHaveLength(0);
  });

  it('does not text the same guest twice within the cooldown, but may after it', async () => {
    const { ev, t } = await invitedFive('0766300003');
    const ask = () => send(ev.id, t, { target: 'unanswered', kind: 'reminder', channel: 'sms' });
    expect((await ask()).body).toMatchObject({ sent: 1 });
    expect((await ask()).body).toMatchObject({ sent: 0, skipped: 2 });
    // `created_at` comes from the database clock, so age the log rows instead of moving the fake clock
    await ctx.db
      .update(messageLog)
      .set({ createdAt: new Date(ctx.clock.now - 13 * HOUR) })
      .where(eq(messageLog.kind, 'reminder'));
    expect((await ask()).body).toMatchObject({ sent: 1 });
  });

  it('refuses an audience that does not fit, and a reminder for an event that is over', async () => {
    const { ev, t } = await invitedFive('0766300004');
    expect((await send(ev.id, t, { target: 'remaining', kind: 'reminder' })).status).toBe(400);
    expect((await send(ev.id, t, { target: 'unanswered' })).status).toBe(400);
    ctx.clock.now += 61 * DAY;
    const late = await send(ev.id, await renew('0766300004'), {
      target: 'unanswered',
      kind: 'reminder',
    });
    expect(late.status).toBe(409);
  });

  it('does not remind a guest who has only a contribution card or was never invited', async () => {
    const { ev, t } = await setup('0766300005');
    const contribution = (
      await api(ctx, 'POST', `/v1/events/${ev.id}/guests`, {
        token: t,
        body: { displayName: 'Shangazi Rehema', phone: '0712300010', cardKind: 'contribution', language: 'sw' },
      })
    ).body!;
    await add(ev.id, t, 'Mgeni Mpya', '0712300011');
    await send(ev.id, t, { target: 'remaining', channel: 'sms' });
    await setStatus(contribution.id, 'created');
    ctx.sms.sent.length = 0;
    const res = await send(ev.id, t, { target: 'all', kind: 'reminder', channel: 'sms' });
    expect(res.body).toMatchObject({ sent: 1 });
    expect(ctx.sms.sent.map((m) => m.to)).toEqual(['+255712300011']);
  });
});

describe('scheduled sends (ADR 030)', () => {
  it('stores a rule, sends when it comes due, and sends only once', async () => {
    const { ev, t } = await invitedFive('0766310001');
    const made = await schedule(ev.id, t, {
      kind: 'reminder',
      target: 'unanswered',
      channel: 'sms',
      scheduledFor: at(2 * DAY),
    });
    expect(made.status).toBe(201);
    expect(made.body).toMatchObject({ status: 'scheduled', kind: 'reminder', recipientCount: 2 });

    ctx.clock.now += DAY;
    expect(await scheduled.runDue()).toEqual({ ran: 0, failed: 0, missed: 0 });
    expect(ctx.sms.sent).toHaveLength(0);

    ctx.clock.now += DAY + HOUR;
    expect(await scheduled.runDue()).toEqual({ ran: 1, failed: 0, missed: 0 });
    expect(await scheduled.runDue()).toEqual({ ran: 0, failed: 0, missed: 0 });
    expect(ctx.sms.sent).toHaveLength(1);
    // (renewing the token sends a login code over the same fake SMS, so count messages first)
    const listed = await api(ctx, 'GET', `/v1/events/${ev.id}/scheduled-sends`, {
      token: await renew('0766310001'),
    });
    expect(listed.body!.items[0]).toMatchObject({
      status: 'done',
      summary: { total: 2, sent: 1, skipped: 1 },
    });
  });

  it('resolves the audience at send time: a guest added later is included, one who answered is not', async () => {
    const { ev, t, a } = await invitedFive('0766310002');
    await schedule(ev.id, t, {
      kind: 'invite',
      target: 'remaining',
      channel: 'sms',
      scheduledFor: at(HOUR),
    });
    await add(ev.id, t, 'Mgeni wa Baadaye', '0712300020');
    await setStatus(a.id, 'confirmed');
    ctx.clock.now += 2 * HOUR;
    await scheduled.runDue();
    expect(ctx.sms.sent.map((m) => m.to)).toEqual(['+255712300020']);
  });

  it('can be cancelled while waiting, and not afterwards', async () => {
    const { ev, t } = await invitedFive('0766310003');
    const made = await schedule(ev.id, t, {
      kind: 'reminder',
      target: 'unanswered',
      channel: 'sms',
      scheduledFor: at(HOUR),
    });
    const id = made.body!.id as string;
    const gone = await api(ctx, 'DELETE', `/v1/events/${ev.id}/scheduled-sends/${id}`, {
      token: t,
    });
    expect(gone.body).toMatchObject({ status: 'cancelled' });
    ctx.clock.now += 2 * HOUR;
    expect(await scheduled.runDue()).toEqual({ ran: 0, failed: 0, missed: 0 });
    expect(ctx.sms.sent).toHaveLength(0);
    const fresh = await renew('0766310003');
    const again = await api(ctx, 'DELETE', `/v1/events/${ev.id}/scheduled-sends/${id}`, {
      token: fresh,
    });
    expect(again.status).toBe(409);
    const unknown = await api(
      ctx,
      'DELETE',
      `/v1/events/${ev.id}/scheduled-sends/00000000-0000-4000-8000-000000000000`,
      { token: fresh },
    );
    expect(unknown.status).toBe(404);
  });

  it('rejects a time in the past, after the event, an audience that does not fit, and a stranger', async () => {
    const { ev, t } = await setup('0766310004', 10);
    const base = { kind: 'reminder', target: 'unanswered' };
    expect((await schedule(ev.id, t, { ...base, scheduledFor: at(-HOUR) })).status).toBe(400);
    expect((await schedule(ev.id, t, { ...base, scheduledFor: at(11 * DAY) })).status).toBe(400);
    expect(
      (await schedule(ev.id, t, { ...base, target: 'remaining', scheduledFor: at(DAY) })).status,
    ).toBe(400);
    expect((await schedule(ev.id, t, { ...base, scheduledFor: 'tomorrow' })).status).toBe(400);
    const stranger = await loginAs(ctx, '0766310005');
    const res = await schedule(ev.id, stranger.accessToken, { ...base, scheduledFor: at(DAY) });
    expect(res.status).toBe(404);
  });

  it('allows a limited number of waiting sends per event', async () => {
    const { ev, t } = await setup('0766310006');
    for (let i = 0; i < 20; i++)
      expect(
        (
          await schedule(ev.id, t, {
            kind: 'reminder',
            target: 'unanswered',
            scheduledFor: at((i + 1) * HOUR),
          })
        ).status,
      ).toBe(201);
    const over = await schedule(ev.id, t, {
      kind: 'reminder',
      target: 'unanswered',
      scheduledFor: at(30 * HOUR),
    });
    expect(over.status).toBe(409);
  });

  it('does not send one that is a day or more late, and records why', async () => {
    const { ev, t } = await invitedFive('0766310007');
    await schedule(ev.id, t, {
      kind: 'reminder',
      target: 'unanswered',
      channel: 'sms',
      scheduledFor: at(HOUR),
    });
    ctx.clock.now += 3 * DAY;
    expect(await scheduled.runDue()).toEqual({ ran: 0, failed: 0, missed: 1 });
    expect(ctx.sms.sent).toHaveLength(0);
    const [row] = await ctx.db.select().from(scheduledSends);
    expect(row).toMatchObject({ status: 'done', summary: { error: 'missed', sent: 0 } });
  });

  it('records a failed run instead of retrying it forever', async () => {
    const { ev, t } = await invitedFive('0766310008');
    await schedule(ev.id, t, {
      kind: 'reminder',
      target: 'unanswered',
      channel: 'sms',
      scheduledFor: at(HOUR),
    });
    // The event moved into the past before the reminder came due.
    await api(ctx, 'PATCH', `/v1/events/${ev.id}`, {
      token: t,
      body: { dateStart: at(HOUR / 2) },
    });
    ctx.clock.now += 2 * HOUR;
    const r = await scheduled.runDue();
    expect(r).toMatchObject({ ran: 0, failed: 1 });
    const [row] = await ctx.db.select().from(scheduledSends);
    expect(row).toMatchObject({
      status: 'done',
      summary: { error: 'The event has already happened' },
    });
    expect(await scheduled.runDue()).toEqual({ ran: 0, failed: 0, missed: 0 });
  });

  it('puts a run that stopped half way back in line without texting anyone twice', async () => {
    const { ev, t } = await invitedFive('0766310009');
    await schedule(ev.id, t, {
      kind: 'reminder',
      target: 'unanswered',
      channel: 'sms',
      scheduledFor: at(HOUR),
    });
    ctx.clock.now += 2 * HOUR;
    await scheduled.runDue();
    expect(ctx.sms.sent).toHaveLength(1);
    // Pretend the worker died after sending but before it wrote "done".
    await ctx.db
      .update(scheduledSends)
      .set({ status: 'running', startedAt: new Date(ctx.clock.now - HOUR) });
    expect(await scheduled.runDue()).toEqual({ ran: 1, failed: 0, missed: 0 });
    expect(ctx.sms.sent).toHaveLength(1); // the cooldown stopped a second text
  });
});
