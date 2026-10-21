import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { guests } from '@harusi/db';
import { DeliveryService } from './services/delivery';
import { EventService } from './services/events';
import { ScheduledSendService } from './services/scheduled';
import { api, createTestContext, loginAs, type TestContext } from './testing/test-app';

let ctx: TestContext;
let scheduled: ScheduledSendService;
// A fresh database per test: the scheduling test moves the clock forward.
beforeEach(async () => {
  ctx = await createTestContext();
  const events = new EventService(ctx.deps);
  scheduled = new ScheduledSendService(ctx.deps, events, new DeliveryService(ctx.deps, events));
});
afterEach(() => ctx.close());

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const at = (ms: number) => new Date(ctx.clock.now + ms).toISOString();

async function setup(extra: Record<string, unknown> = {}) {
  const owner = await loginAs(ctx, '0766400001');
  const t = owner.accessToken;
  const ev = (
    await api(ctx, 'POST', '/v1/events', {
      token: t,
      body: {
        title: 'Harusi',
        coupleNames: 'Asha & Juma',
        dateStart: at(60 * DAY),
        contributionTarget: 2_000_000,
        ...extra,
      },
    })
  ).body!;
  // the login code went through the fake SMS provider too; the tests count only what a send does
  ctx.sms.sent.length = 0;
  ctx.whatsapp.sent.length = 0;
  return { t, evId: ev.id as string };
}

let seq = 0;
const e164 = (local: string) => `+255${local.slice(1)}`;
/** A guest reached by SMS (unless `extra` says otherwise), so the fake provider records what they get. */
async function add(
  t: string,
  evId: string,
  name: string,
  cardKind: 'invitation' | 'contribution',
  extra: Record<string, unknown> = {},
) {
  const phone = `07124${String(10000 + ++seq)}`;
  const res = await api(ctx, 'POST', `/v1/events/${evId}/guests`, {
    token: t,
    body: {
      displayName: name,
      phone,
      hasSmartphone: false,
      inviteChannelPref: 'sms',
      // English is the default language now; these tests read the Swahili texts unless they say otherwise
      language: 'sw',
      cardKind,
      ...extra,
    },
  });
  return { id: res.body!.id as string, to: e164(phone) };
}
const post = (t: string, evId: string, path: string, body: Record<string, unknown>) =>
  api(ctx, 'POST', `/v1/events/${evId}/${path}`, { token: t, body });
const statuses = async (t: string, evId: string, cardKind: string) =>
  (
    (await api(ctx, 'GET', `/v1/events/${evId}/guests?cardKind=${cardKind}`, { token: t })).body!
      .items as { status: string }[]
  ).map((g) => g.status);

describe('sending by card type (ADR 041)', () => {
  it('sends contribution cards first, only to contribution guests, then invitations to the rest', async () => {
    const { t, evId } = await setup();
    const i1 = await add(t, evId, 'Mgeni Mmoja', 'invitation');
    const i2 = await add(t, evId, 'Mgeni Wawili', 'invitation');
    const c1 = await add(t, evId, 'Mchangiaji Mmoja', 'contribution');
    const c2 = await add(t, evId, 'Mchangiaji Wawili', 'contribution');

    const first = await post(t, evId, 'invitations/send', {
      target: 'remaining',
      channel: 'sms',
      cardKind: 'contribution',
    });
    expect(first.body).toMatchObject({ total: 2, sent: 2, failed: 0 });
    expect(ctx.sms.sent.map((m) => m.to).sort()).toEqual([c1.to, c2.to].sort());
    for (const m of ctx.sms.sent) expect(m.body).toMatch(/mchango/);
    // the invitation guests have not been touched
    expect(await statuses(t, evId, 'contribution')).toEqual(['sent', 'sent']);
    expect(await statuses(t, evId, 'invitation')).toEqual(['created', 'created']);

    ctx.sms.sent.length = 0;
    const second = await post(t, evId, 'invitations/send', {
      target: 'remaining',
      channel: 'sms',
      cardKind: 'invitation',
    });
    expect(second.body).toMatchObject({ total: 2, sent: 2, failed: 0 });
    expect(ctx.sms.sent.map((m) => m.to).sort()).toEqual([i1.to, i2.to].sort());
    for (const m of ctx.sms.sent) expect(m.body).toMatch(/^Karibu kwenye harusi ya Asha & Juma/);
    expect(await statuses(t, evId, 'invitation')).toEqual(['sent', 'sent']);

    // nobody is left, and nobody was texted twice
    ctx.sms.sent.length = 0;
    const third = await post(t, evId, 'invitations/send', { target: 'remaining', channel: 'sms' });
    expect(third.body).toMatchObject({ total: 0, sent: 0 });
    expect(ctx.sms.sent).toHaveLength(0);
  });

  it('still reaches both kinds in one send when no card type is given', async () => {
    const { t, evId } = await setup();
    await add(t, evId, 'Mgeni Mmoja', 'invitation');
    await add(t, evId, 'Mchangiaji Mmoja', 'contribution');
    const res = await post(t, evId, 'invitations/send', { target: 'remaining', channel: 'sms' });
    expect(res.body).toMatchObject({ total: 2, sent: 2 });
    expect(ctx.sms.sent.filter((m) => /mchango/.test(m.body))).toHaveLength(1);
    expect(ctx.sms.sent.filter((m) => /^Karibu kwenye/.test(m.body))).toHaveLength(1);
  });

  it('keeps a picked guest out when their card type does not match the send', async () => {
    const { t, evId } = await setup();
    const inv = await add(t, evId, 'Mgeni Mmoja', 'invitation');
    const con = await add(t, evId, 'Mchangiaji Mmoja', 'contribution');
    const res = await post(t, evId, 'invitations/send', {
      target: { guestIds: [inv.id, con.id] },
      channel: 'sms',
      cardKind: 'contribution',
    });
    expect(res.body).toMatchObject({ total: 1, sent: 1 });
    expect(ctx.sms.sent.map((m) => m.to)).toEqual([con.to]);
  });

  it('previews a send without sending: who is reached, and how', async () => {
    const { t, evId } = await setup();
    await add(t, evId, 'Mchangiaji WhatsApp', 'contribution', {
      hasSmartphone: true,
      inviteChannelPref: 'whatsapp',
    });
    await add(t, evId, 'Mchangiaji SMS', 'contribution');
    await api(ctx, 'POST', `/v1/events/${evId}/guests`, {
      token: t,
      body: { displayName: 'Mchangiaji Bila Simu', cardKind: 'contribution' },
    });
    await add(t, evId, 'Mgeni Mwalikwa', 'invitation');

    const preview = await post(t, evId, 'invitations/preview', {
      target: 'remaining',
      channel: 'auto',
      cardKind: 'contribution',
    });
    expect(preview.status).toBe(200);
    expect(preview.body).toEqual({
      total: 3,
      byChannel: { whatsapp: 1, sms: 1, print: 1 },
      withoutPhone: 1,
    });
    const invitations = await post(t, evId, 'invitations/preview', {
      target: 'remaining',
      cardKind: 'invitation',
    });
    expect(invitations.body).toMatchObject({ total: 1 });
    // nothing went out
    expect(ctx.sms.sent).toHaveLength(0);
    expect(ctx.whatsapp.sent).toHaveLength(0);
  });

  it('previews a reminder without the guests a send would skip', async () => {
    const { t, evId } = await setup();
    await add(t, evId, 'Mgeni Mmoja', 'invitation');
    const optedOut = await add(t, evId, 'Mgeni Wawili', 'invitation');
    await post(t, evId, 'invitations/send', { target: 'remaining', channel: 'sms' });
    await ctx.db.update(guests).set({ remindersOptOut: true }).where(eq(guests.id, optedOut.id));
    const preview = await post(t, evId, 'invitations/preview', {
      target: 'unanswered',
      kind: 'reminder',
      channel: 'sms',
    });
    expect(preview.body).toMatchObject({ total: 1, byChannel: { sms: 1 } });
  });

  it('refuses an invitation reminder for contribution cards', async () => {
    const { t, evId } = await setup();
    await add(t, evId, 'Mchangiaji Mmoja', 'contribution');
    const res = await post(t, evId, 'invitations/send', {
      target: 'unanswered',
      kind: 'reminder',
      cardKind: 'contribution',
    });
    expect(res.status).toBe(400);
    expect(res.body?.error.code).toBe('validation');
  });

  it('refuses contribution cards while contributions are switched off, but not invitations', async () => {
    const { t, evId } = await setup();
    await add(t, evId, 'Mgeni Mmoja', 'invitation');
    await add(t, evId, 'Mchangiaji Mmoja', 'contribution');
    const off = await api(ctx, 'PATCH', `/v1/events/${evId}`, {
      token: t,
      body: { pledgesEnabled: false },
    });
    expect(off.status).toBe(200);

    const send = await post(t, evId, 'invitations/send', {
      target: 'remaining',
      channel: 'sms',
      cardKind: 'contribution',
    });
    expect(send.status).toBe(409);
    expect(send.body?.error.details.reason).toBe('contributions_off');
    const schedule = await post(t, evId, 'scheduled-sends', {
      target: 'remaining',
      cardKind: 'contribution',
      scheduledFor: at(2 * DAY),
    });
    expect(schedule.status).toBe(409);
    expect(ctx.sms.sent).toHaveLength(0);

    // invitations are unaffected, and the preview still says how many contribution guests there are
    const preview = await post(t, evId, 'invitations/preview', {
      target: 'remaining',
      cardKind: 'contribution',
    });
    expect(preview.body).toMatchObject({ total: 1 });
    const invite = await post(t, evId, 'invitations/send', {
      target: 'remaining',
      channel: 'sms',
      cardKind: 'invitation',
    });
    expect(invite.body).toMatchObject({ total: 1, sent: 1 });
  });

  it('schedules contribution cards and sends only those when the time comes', async () => {
    const { t, evId } = await setup();
    await add(t, evId, 'Mgeni Mmoja', 'invitation');
    const c1 = await add(t, evId, 'Mchangiaji Mmoja', 'contribution');
    const c2 = await add(t, evId, 'Mchangiaji Wawili', 'contribution');

    const made = await post(t, evId, 'scheduled-sends', {
      target: 'remaining',
      channel: 'sms',
      cardKind: 'contribution',
      scheduledFor: at(2 * DAY),
    });
    expect(made.status).toBe(201);
    expect(made.body).toMatchObject({
      cardKind: 'contribution',
      kind: 'invite',
      recipientCount: 2,
      status: 'scheduled',
    });
    const list = await api(ctx, 'GET', `/v1/events/${evId}/scheduled-sends`, { token: t });
    expect(list.body?.items[0]).toMatchObject({ cardKind: 'contribution' });
    expect(ctx.sms.sent).toHaveLength(0);

    ctx.clock.now += 2 * DAY + HOUR;
    expect(await scheduled.runDue()).toEqual({ ran: 1, failed: 0, missed: 0 });
    expect(ctx.sms.sent.map((m) => m.to).sort()).toEqual([c1.to, c2.to].sort());
    for (const m of ctx.sms.sent) expect(m.body).toMatch(/mchango/);
    const token = (await loginAs(ctx, '0766400001')).accessToken;
    expect(await statuses(token, evId, 'invitation')).toEqual(['created']);
  });

  it('keeps older scheduled sends, which have no card type, going to both kinds', async () => {
    const { t, evId } = await setup();
    await add(t, evId, 'Mgeni Mmoja', 'invitation');
    await add(t, evId, 'Mchangiaji Mmoja', 'contribution');
    const made = await post(t, evId, 'scheduled-sends', {
      target: 'remaining',
      channel: 'sms',
      scheduledFor: at(2 * DAY),
    });
    expect(made.body).toMatchObject({ cardKind: null, recipientCount: 2 });
    ctx.clock.now += 2 * DAY + HOUR;
    expect(await scheduled.runDue()).toMatchObject({ ran: 1 });
    expect(ctx.sms.sent).toHaveLength(2);
  });

  it('puts a guest back in line when their card type changes, so the same people get both cards', async () => {
    const { t, evId } = await setup();
    const a = await add(t, evId, 'Mchangiaji Mmoja', 'contribution');
    await add(t, evId, 'Mchangiaji Wawili', 'contribution');
    await post(t, evId, 'invitations/send', {
      target: 'remaining',
      channel: 'sms',
      cardKind: 'contribution',
    });
    expect(await statuses(t, evId, 'contribution')).toEqual(['sent', 'sent']);

    // only the first is invited to the event itself
    const patched = await api(ctx, 'PATCH', `/v1/guests/${a.id}`, {
      token: t,
      body: { cardKind: 'invitation' },
    });
    expect(patched.body?.cardKind).toBe('invitation');
    expect(await statuses(t, evId, 'invitation')).toEqual(['created']);
    expect(await statuses(t, evId, 'contribution')).toEqual(['sent']);

    ctx.sms.sent.length = 0;
    const invite = await post(t, evId, 'invitations/send', {
      target: 'remaining',
      channel: 'sms',
      cardKind: 'invitation',
    });
    expect(invite.body).toMatchObject({ total: 1, sent: 1 });
    expect(ctx.sms.sent.map((m) => m.to)).toEqual([a.to]);
    expect(ctx.sms.sent[0]!.body).toMatch(/^Karibu kwenye harusi/);
  });
});

describe('an engagement, a send-off and a wedding (ADR 024, 041)', () => {
  const kinds = [
    // the little word agrees with the noun: "uchumba wa", but "harusi ya" and "send-off ya"
    { kind: 'Uchumba', sw: 'uchumba', of: 'wa', en: 'engagement' },
    { kind: 'Send-off', sw: 'send-off', of: 'ya', en: 'send-off' },
    { kind: 'Harusi', sw: 'harusi', of: 'ya', en: 'wedding' },
  ];

  it.each(kinds)(
    'sends contribution cards, then invitations, that say $sw $of in Swahili and $en in English',
    async ({ kind, sw, of, en }) => {
      const { t, evId } = await setup({ eventKind: kind });
      await add(t, evId, 'Mgeni Swahili', 'invitation');
      await add(t, evId, 'Guest English', 'invitation', { language: 'en' });
      await add(t, evId, 'Mchangiaji Swahili', 'contribution');
      await add(t, evId, 'Contributor English', 'contribution', { language: 'en' });

      await post(t, evId, 'invitations/send', {
        target: 'remaining',
        channel: 'sms',
        cardKind: 'contribution',
      });
      const asked = ctx.sms.sent.map((m) => m.body);
      expect(asked).toHaveLength(2);
      expect(asked.find((b) => /wanakuomba mchango/.test(b))).toContain(`${sw} ${of} Asha & Juma`);
      expect(asked.find((b) => /invite you to contribute/.test(b))).toContain(
        `the ${en} of Asha & Juma`,
      );

      ctx.sms.sent.length = 0;
      await post(t, evId, 'invitations/send', {
        target: 'remaining',
        channel: 'sms',
        cardKind: 'invitation',
      });
      const invited = ctx.sms.sent.map((m) => m.body);
      expect(invited).toHaveLength(2);
      expect(invited.find((b) => /^Karibu kwenye/.test(b))).toMatch(
        new RegExp(`^Karibu kwenye ${sw} ${of} Asha & Juma`),
      );
      expect(invited.find((b) => /^You're invited/.test(b))).toContain(`the ${en} of Asha & Juma`);
    },
  );
});
