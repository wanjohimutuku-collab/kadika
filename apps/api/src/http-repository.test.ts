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
      contributionTargetTzs: 0,
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
      contributionTargetTzs: 0,
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
      contributionTargetTzs: 0,
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
    await expect(r.listPayments('x')).rejects.toMatchObject({ code: 'not_implemented' });
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
      contributionTargetTzs: 0,
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
    await expect(
      r.sendInvitations(ev.id, { ...req, scheduleAt: '2027-01-01T08:00:00Z' }),
    ).rejects.toMatchObject({ code: 'not_implemented' });

    const pdf = await r.requestCardsPdf(ev.id, { format: 'A6', layout: 'single' });
    expect(pdf.type).toBe('application/pdf');
    expect(new TextDecoder().decode((await pdf.arrayBuffer()).slice(0, 5))).toBe('%PDF-');
  });
});
