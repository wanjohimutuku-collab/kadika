import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHttpRepository, memoryTokenStore, type Repository } from '@harusi/api-client';
import { createTestContext, type TestContext } from './testing/test-app';

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(() => ctx.close());

/** The real HttpRepository talking to the real app code (routes → services → SQL) with no network. */
function repo(tokens = memoryTokenStore()): Repository {
  return createHttpRepository('http://api.test', {
    tokens,
    fetchImpl: ((url: string, init?: RequestInit) =>
      ctx.app.request(url.replace('http://api.test', ''), init)) as typeof fetch,
  });
}

async function login(r: Repository, phone: string) {
  await r.requestOtp(phone);
  const code = /(\d{6})/.exec(
    ctx.sms.lastTo(`+255${phone.replace(/^0/, '').replace(/\s/g, '')}`) ?? '',
  )![1]!;
  return r.verifyOtp(phone, code);
}

describe('HttpRepository against the real API', () => {
  it('logs in, keeps the session across instances (token store) and signs out', async () => {
    const tokens = memoryTokenStore();
    const a = repo(tokens);
    expect(await a.getSession()).toBeNull();
    const s = await login(a, '0712 100 100');
    expect(s.user.phoneE164).toBe('+255712100100');
    expect((await repo(tokens).getSession())?.user.id).toBe(s.user.id);
    await a.signOut();
    expect(await repo(tokens).getSession()).toBeNull();
  });

  it('refreshes an expired access token transparently', async () => {
    const tokens = memoryTokenStore();
    const r = repo(tokens);
    await login(r, '0712 100 101');
    ctx.clock.now += 16 * 60_000; // access token expired, refresh token still valid
    expect((await r.getSession())?.user.phoneE164).toBe('+255712100101');
    expect(tokens.get()?.refreshToken).toBeTruthy();
  });

  it('maps API errors to RepositoryError codes', async () => {
    const r = repo();
    await expect(r.requestOtp('0712')).rejects.toMatchObject({ code: 'validation' });
    await expect(r.verifyOtp('0712 100 102', '000000')).rejects.toMatchObject({
      code: 'validation',
    });
    await expect(r.listEvents()).rejects.toMatchObject({ code: 'unauthorized' });
  });

  it('runs the organizer journey: event → guests → import → edit → reissue → delete', async () => {
    const r = repo();
    await login(r, '0712 100 103');
    const ev = await r.createEvent({
      title: 'Harusi ya Neema & Daudi',
      partnerA: 'Neema',
      partnerB: 'Daudi',
      dateStart: '2027-03-20T15:00:00+03:00',
      venueName: 'Mlimani City Hall',
      venueMapUrl: '',
      dressCode: '',
      languageDefault: 'sw',
      themeId: 'navy-silver',
      coverGradient: '',
      rsvpDeadline: '',
      contributionTarget: 0,
    });
    expect(ev).toMatchObject({ partnerA: 'Neema', partnerB: 'Daudi', themeId: 'navy-silver' });
    expect((await r.listEvents()).map((e) => e.id)).toEqual([ev.id]);

    const g = await r.createGuest(ev.id, {
      displayName: 'Asha Mwinyi',
      phone: '0712 345 678',
      groupLabel: 'Marafiki',
      partySizeAllowed: 2,
      inviteChannelPref: 'whatsapp',
      hasSmartphone: true,
      language: 'sw',
      notes: '',
    });
    expect(g).toMatchObject({ phoneE164: '+255712345678', partySizeAllowed: 2, status: 'created' });
    await expect(
      r.createGuest(ev.id, {
        displayName: 'Mwingine',
        phone: '0712345678',
        partySizeAllowed: 1,
        inviteChannelPref: 'sms',
        hasSmartphone: true,
        language: 'sw',
        notes: '',
      }),
    ).rejects.toMatchObject({ code: 'conflict' });

    const imp = await r.importGuests(
      ev.id,
      [
        {
          displayName: 'Baraka Joseph',
          phoneRaw: '0754 000 111',
          groupLabel: 'Kazi',
          partySizeAllowed: 1,
          hasSmartphone: true,
          inviteChannelPref: 'whatsapp',
        },
        {
          displayName: 'Mbaya',
          phoneRaw: '123',
          groupLabel: '',
          partySizeAllowed: 1,
          hasSmartphone: true,
          inviteChannelPref: 'whatsapp',
        },
      ],
      'import-key-0001',
    );
    expect(imp).toEqual({ created: 1, skipped: 1 });

    const all = await r.listGuests(ev.id);
    expect(all.map((x) => x.displayName)).toEqual(['Asha Mwinyi', 'Baraka Joseph']);
    expect((await r.listGuests(ev.id, { search: 'baraka' })).length).toBe(1);
    expect(await r.listGroups(ev.id)).toEqual(['Kazi', 'Marafiki']);

    expect((await r.updateGuest(g.id, { displayName: 'Asha M. Mwinyi' })).displayName).toBe(
      'Asha M. Mwinyi',
    );
    expect((await r.reissueGuest(g.id)).tokenVersion).toBe(2);
    expect(await r.deleteGuests([g.id])).toEqual({ deleted: 1 });
    expect((await r.listGuests(ev.id)).length).toBe(1);
  });

  it('manages the team: invite → accept at first login → revoke', async () => {
    const owner = repo();
    await login(owner, '0712 100 104');
    const ev = await owner.createEvent({
      title: 'Harusi T',
      partnerA: 'Aa',
      partnerB: 'Bb',
      dateStart: '2027-01-01T10:00:00+03:00',
      venueName: 'Ukumbi',
      venueMapUrl: '',
      dressCode: '',
      languageDefault: 'sw',
      themeId: 'emerald-gold',
      coverGradient: '',
      rsvpDeadline: '',
      contributionTarget: 0,
    });
    const invited = await owner.inviteMember(ev.id, {
      name: 'Mjumbe Mpya',
      phoneE164: '+255712100105',
      role: 'committee',
    });
    expect(invited.status).toBe('invited');
    const invitee = repo();
    await login(invitee, '0712 100 105');
    expect((await invitee.listEvents()).map((e) => e.id)).toEqual([ev.id]);
    const members = await owner.listMembers(ev.id);
    expect(members.map((m) => [m.phoneE164, m.status])).toEqual(
      expect.arrayContaining([
        ['+255712100104', 'active'],
        ['+255712100105', 'active'],
      ]),
    );
    const mine = members.find((m) => m.phoneE164 === '+255712100105')!;
    await owner.revokeMember(ev.id, mine.id);
    expect(await invitee.listEvents().catch(() => [])).toEqual([]);
  });

  it('serves the public guest card and RSVP through the same client (no login)', async () => {
    const tokens = memoryTokenStore();
    const owner = repo(tokens);
    await login(owner, '0712 100 106');
    const ev = await owner.createEvent({
      title: 'Harusi K',
      partnerA: 'Asha',
      partnerB: 'Juma',
      dateStart: '2027-06-01T10:00:00+03:00',
      venueName: 'Ukumbi',
      venueMapUrl: '',
      dressCode: 'Kijani',
      languageDefault: 'sw',
      themeId: 'terracotta',
      coverGradient: '',
      rsvpDeadline: '',
      contributionTarget: 0,
    });
    // The client hides the one-time card token, so create the guest over raw HTTP to read it.
    const res = await ctx.app.request(`/v1/events/${ev.id}/guests`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${tokens.get()!.accessToken}`,
      },
      body: JSON.stringify({ displayName: 'Bibi Pendo', partySizeAllowed: 2 }),
    });
    const { cardToken } = (await res.json()) as { cardToken: string };
    const guestView = repo(); // a different client with no session
    const card = await guestView.getCard(cardToken);
    expect(card).toMatchObject({
      state: 'ok',
      isMock: false,
      event: { partnerA: 'Asha', partnerB: 'Juma', dressCode: 'Kijani', themeId: 'terracotta' },
      guest: { displayName: 'Bibi Pendo' },
      rsvpOpen: true,
    });
    expect(card.qrPayload).toMatch(/^v1\./);
    expect((await guestView.rsvp(cardToken, { attending: true, partySize: 5 }, 'k')).rsvp).toEqual({
      status: 'confirmed',
      partySize: 2,
    });
    expect((await guestView.getCard('nope')).state).toBe('invalid');
  });

  it('rejects not-yet-built features with not_implemented', async () => {
    const r = repo();
    await expect(r.getReport('x')).rejects.toMatchObject({ code: 'not_implemented' });
    await expect(r.listScans('x')).rejects.toMatchObject({ code: 'not_implemented' });
  });

  it('sends invitations, retries failures and downloads a print PDF through the repository', async () => {
    const r = repo();
    await login(r, '0712 100 110');
    const ev = await r.createEvent({
      title: 'Harusi',
      partnerA: 'Asha',
      partnerB: 'Juma',
      dateStart: '2027-03-20T15:00:00+03:00',
      venueName: 'Ukumbi',
      venueMapUrl: '',
      dressCode: '',
      languageDefault: 'sw',
      themeId: 'emerald-gold',
      coverGradient: '',
      rsvpDeadline: '',
      contributionTarget: 0,
    });
    const guest = (name: string, phone: string) =>
      r.createGuest(ev.id, {
        displayName: name,
        phone,
        partySizeAllowed: 1,
        inviteChannelPref: 'sms',
        hasSmartphone: false,
        language: 'sw',
        notes: '',
      });
    await guest('Mgeni Mmoja', '0712 100 111');
    await guest('Mgeni Wawili', '0712 100 112');
    ctx.fail.sms = (to) => to === '+255712100112';
    const req = {
      audience: { kind: 'unsent' as const },
      channel: 'auto' as const,
      whatsappFallbackToSms: true,
      scheduleAt: null,
      kind: 'invite' as const,
      idempotencyKey: 'send-key-0001',
    };
    const job = await r.sendInvitations(ev.id, req);
    expect(job).toMatchObject({ status: 'done', total: 2, counts: { sent: 1, failed: 1 } });
    expect(job.failures).toEqual([
      expect.objectContaining({ guestName: 'Mgeni Wawili', error: 'fake provider failure' }),
    ]);
    expect(await r.getSendJob(job.id)).toEqual(job);

    ctx.fail.sms = () => false;
    const retry = await r.retryFailed(job.id);
    expect(retry).toMatchObject({ total: 1, counts: { sent: 1, failed: 0 } });
    // the guest detail carries the invitation state, not just the guest row
    const one = (await r.listGuests(ev.id)).find((x) => x.displayName === 'Mgeni Mmoja')!;
    expect(await r.getGuest(one.id)).toMatchObject({ status: 'sent', channelLast: 'sms' });
    // the overview numbers come from the API's funnel stats
    expect((await r.getEvent(ev.id)).stats).toMatchObject({
      invited: 2,
      sent: 2,
      failedMessages: 0,
    });
    // a reminder goes to guests who were invited and have not answered
    const reminder = await r.sendInvitations(ev.id, {
      ...req,
      kind: 'reminder',
      idempotencyKey: 'send-key-0002',
    });
    expect(reminder).toMatchObject({
      kind: 'reminder',
      status: 'done',
      total: 2,
      counts: { sent: 2, failed: 0 },
    });
    // a send for later waits, can be listed, looked up again and cancelled
    const later = await r.sendInvitations(ev.id, {
      ...req,
      kind: 'reminder',
      scheduleAt: '2027-03-10T08:00:00Z',
      idempotencyKey: 'send-key-0003',
    });
    expect(later).toMatchObject({
      kind: 'reminder',
      status: 'scheduled',
      scheduledFor: '2027-03-10T08:00:00.000Z',
      total: 2,
    });
    expect((await r.getSendJob(later.id)).status).toBe('scheduled');
    expect(await r.listScheduledSends(ev.id)).toEqual([expect.objectContaining({ id: later.id })]);
    await r.cancelScheduledSend(ev.id, later.id);
    expect(await r.listScheduledSends(ev.id)).toEqual([]);
    await expect(r.cancelScheduledSend(ev.id, later.id)).rejects.toMatchObject({
      code: 'conflict',
    });

    const pdf = await r.requestCardsPdf(ev.id, { format: 'A6', layout: 'single' });
    expect(pdf.type).toBe('application/pdf');
    expect(new TextDecoder().decode((await pdf.arrayBuffer()).slice(0, 5))).toBe('%PDF-');
  });

  it('previews and sends contribution cards, then invitations, through the repository (ADR 031)', async () => {
    const r = repo();
    await login(r, '0712 100 150');
    const ev = await r.createEvent({
      title: 'Uchumba',
      partnerA: 'Asha',
      partnerB: 'Juma',
      dateStart: '2027-03-20T15:00:00+03:00',
      venueName: 'Ukumbi',
      venueMapUrl: '',
      dressCode: '',
      languageDefault: 'sw',
      themeId: 'emerald-gold',
      coverGradient: '',
      rsvpDeadline: '',
      contributionTarget: 1_000_000,
    });
    const guest = (name: string, phone: string, cardKind: 'invitation' | 'contribution') =>
      r.createGuest(ev.id, {
        displayName: name,
        phone,
        partySizeAllowed: 1,
        cardKind,
        inviteChannelPref: 'sms',
        hasSmartphone: false,
        language: 'sw',
        notes: '',
      });
    await guest('Mgeni Mmoja', '0712 100 151', 'invitation');
    await guest('Mchangiaji Mmoja', '0712 100 152', 'contribution');
    await guest('Mchangiaji Wawili', '0712 100 153', 'contribution');
    const ask = {
      audience: { kind: 'unsent' as const },
      channel: 'sms' as const,
      whatsappFallbackToSms: true,
      kind: 'invite' as const,
    };

    // the API applies the audience rules; the client prices the SMS from a sample text
    const preview = await r.previewSend(ev.id, { ...ask, cardKind: 'contribution' });
    expect(preview).toMatchObject({
      total: 2,
      byChannel: { sms: 2, whatsapp: 0, print: 0 },
      withoutPhone: 0,
    });
    expect(preview.smsSegments).toBeGreaterThan(0);
    expect(preview.estimatedSmsCost).toBe(preview.smsSegments * 2 * 25);
    expect((await r.previewSend(ev.id, { ...ask, cardKind: 'invitation' })).total).toBe(1);
    // print is chosen here, not by the API: everyone the audience matches is a printed card
    expect(
      await r.previewSend(ev.id, { ...ask, channel: 'print', cardKind: 'contribution' }),
    ).toMatchObject({ total: 2, byChannel: { print: 2, sms: 0 }, estimatedSmsCost: 0 });
    // and a contribution card has no reminder
    await expect(
      r.previewSend(ev.id, { ...ask, kind: 'reminder', cardKind: 'contribution' }),
    ).rejects.toMatchObject({ code: 'validation' });

    ctx.sms.sent.length = 0; // the login code
    const job = await r.sendInvitations(ev.id, {
      ...ask,
      cardKind: 'contribution',
      scheduleAt: null,
      idempotencyKey: 'card-type-key-1',
    });
    expect(job).toMatchObject({ status: 'done', cardKind: 'contribution', total: 2 });
    expect(job.counts).toMatchObject({ sent: 2, failed: 0 });
    expect(ctx.sms.sent.map((m) => m.to).sort()).toEqual(['+255712100152', '+255712100153']);
    // they are counted apart from the invitation funnel
    expect((await r.getEvent(ev.id)).stats).toMatchObject({ invited: 1, contributionGuests: 2 });

    const invitations = await r.sendInvitations(ev.id, {
      ...ask,
      cardKind: 'invitation',
      scheduleAt: null,
      idempotencyKey: 'card-type-key-2',
    });
    expect(invitations).toMatchObject({ cardKind: 'invitation', total: 1 });
    expect(invitations.counts).toMatchObject({ sent: 1, failed: 0 });

    // a list imported as contribution cards, and a send for later that keeps its card type
    const imported = await r.importGuests(
      ev.id,
      [
        {
          displayName: 'Ndugu Mmoja',
          phoneRaw: '0712 100 154',
          groupLabel: 'Ndugu',
          partySizeAllowed: 1,
          hasSmartphone: false,
          inviteChannelPref: 'sms',
        },
      ],
      'import-key-0001',
      { cardKind: 'contribution' },
    );
    expect(imported).toMatchObject({ created: 1 });
    expect((await r.listGuests(ev.id, { cardKind: 'contribution' })).length).toBe(3);
    const later = await r.sendInvitations(ev.id, {
      ...ask,
      cardKind: 'contribution',
      scheduleAt: '2027-03-10T08:00:00Z',
      idempotencyKey: 'card-type-key-3',
    });
    expect(later).toMatchObject({ status: 'scheduled', cardKind: 'contribution', total: 1 });
    expect(await r.listScheduledSends(ev.id)).toEqual([
      expect.objectContaining({ id: later.id, cardKind: 'contribution' }),
    ]);
    // contributions can be switched off: the API refuses to ask for money it cannot collect
    await r.updateEvent(ev.id, { pledgesEnabled: false });
    await expect(
      r.sendInvitations(ev.id, {
        ...ask,
        cardKind: 'contribution',
        scheduleAt: null,
        idempotencyKey: 'card-type-key-4',
      }),
    ).rejects.toMatchObject({ code: 'conflict' });
  });

  it('runs pledges and payments through the repository: pledge, cash, pay from the card, webhook, export', async () => {
    const tokens = memoryTokenStore();
    const r = repo(tokens);
    await login(r, '0712 100 120');
    const ev = await r.createEvent({
      title: 'Harusi',
      partnerA: 'Asha',
      partnerB: 'Juma',
      dateStart: '2027-03-20T15:00:00+03:00',
      venueName: 'Ukumbi',
      venueMapUrl: '',
      dressCode: '',
      languageDefault: 'sw',
      themeId: 'emerald-gold',
      coverGradient: '',
      rsvpDeadline: '',
      contributionTarget: 500_000,
    });
    const g = await r.createGuest(ev.id, {
      displayName: 'Bibi Pendo',
      phone: '0712 100 121',
      partySizeAllowed: 2,
      inviteChannelPref: 'sms',
      hasSmartphone: false,
      language: 'sw',
      notes: '',
    });
    const guest = await r.upsertPledge(g.id, 50_000, 'ahadi');
    expect(guest.pledge).toMatchObject({
      amount: 50_000,
      paid: 0,
      balance: 50_000,
      status: 'pledged',
    });

    const cash = await r.recordManualPayment(
      ev.id,
      { guestId: g.id, amount: 10_000, method: 'cash', reference: 'RCPT-77', note: '' },
      'manual-key-0001',
    );
    expect(cash).toMatchObject({
      amount: 10_000,
      method: 'cash',
      status: 'success',
      guestName: 'Bibi Pendo',
    });
    expect((await r.getGuest(g.id)).pledge).toMatchObject({
      paid: 10_000,
      balance: 40_000,
      status: 'partial',
    });

    // the guest pays from the card
    const reissue = await ctx.app.request(`/v1/guests/${g.id}/reissue`, {
      method: 'POST',
      headers: { authorization: `Bearer ${tokens.get()!.accessToken}` },
    });
    const token = ((await reissue.json()) as { cardToken: string }).cardToken;
    expect((await r.getCard(token)).pledge).toMatchObject({ balance: 40_000 });
    const start = await r.startPayment(
      token,
      { amount: 40_000, phoneE164: '+255712345678', method: 'mixx' },
      'card-pay-key-01',
    );
    expect(await r.getPaymentStatus(start.reference)).toMatchObject({ status: 'pending' });
    const wh = ctx.payments.webhookBody({
      reference: start.reference,
      status: 'success',
      amount: 40_000,
    });
    const res = await ctx.app.request('/v1/payments/webhook/fake', {
      method: 'POST',
      headers: wh.headers,
      body: wh.raw,
    });
    expect(res.status).toBe(200);
    expect(await r.getPaymentStatus(start.reference)).toMatchObject({
      status: 'success',
      newBalance: 0,
    });

    const summary = await r.getPledgeSummary(ev.id);
    expect(summary.totals).toMatchObject({
      targetAmount: 500_000,
      pledged: 50_000,
      collected: 50_000,
      balance: 0,
      guestsWithBalance: 0,
    });
    expect((await r.listPayments(ev.id)).map((p) => p.amount).sort((a, b) => a - b)).toEqual([
      10_000, 40_000,
    ]);
    expect((await r.getEvent(ev.id)).stats).toMatchObject({
      pledged: 50_000,
      collected: 50_000,
    });
    const csv = await (await r.exportCsv(ev.id, 'payments')).text();
    expect(csv).toContain('"Bibi Pendo"');
    await expect(r.exportCsv(ev.id, 'scans')).rejects.toMatchObject({ code: 'not_implemented' });
  });
});
