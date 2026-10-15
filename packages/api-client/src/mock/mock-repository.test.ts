import { beforeEach, describe, expect, it } from 'vitest';
import { SHORT_CODE_PATTERN } from '@harusi/schemas';
import { MockControls } from './controls';
import { MockRepository } from './mock-repository';
import { createSeedState, sampleCardToken } from './state';

const NOW = Date.parse('2026-10-13T09:00:00Z');

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, v),
  };
}

let clock = NOW;
let repo: MockRepository;

beforeEach(async () => {
  clock = NOW;
  const storage = memoryStorage();
  repo = new MockRepository({
    storage,
    controls: new MockControls(storage),
    now: () => clock,
    initialState: createSeedState({ now: NOW }),
  });
  await repo.requestOtp('+255712000001');
  await repo.verifyOtp('+255712000001', '123456');
});

describe('seed', () => {
  const s = createSeedState({ now: NOW });
  it('has the demo upcoming + past events, ≥ 320 guests and 3 team members', () => {
    expect(s.events).toHaveLength(6); // the two demo weddings + four other customers' (ops panel)
    expect(Date.parse(s.events[0]!.dateStart)).toBeGreaterThan(NOW);
    expect(Date.parse(s.events[1]!.dateStart)).toBeLessThan(NOW);
    expect(s.guests.filter((g) => g.eventId === s.events[0]!.id).length).toBeGreaterThanOrEqual(
      320,
    );
    expect(s.members[s.events[0]!.id]!.filter((m) => m.status === 'active')).toHaveLength(3);
  });
  it('is deterministic for the same day', () => {
    expect(JSON.stringify(createSeedState({ now: NOW + 3600_000 }))).toBe(JSON.stringify(s));
  });
  it('has valid, unique short codes per event and E.164 phones', () => {
    for (const ev of s.events) {
      const codes = s.guests.filter((g) => g.eventId === ev.id).map((g) => g.shortCode);
      expect(new Set(codes).size).toBe(codes.length);
      for (const c of codes) expect(c).toMatch(SHORT_CODE_PATTERN);
    }
    for (const g of s.guests) if (g.phoneE164) expect(g.phoneE164).toMatch(/^\+255[67]\d{8}$/);
  });
  it('mixes smartphone and feature-phone guests and every funnel status', () => {
    const up = s.guests.filter((g) => g.eventId === s.events[0]!.id);
    const featureShare = up.filter((g) => !g.hasSmartphone).length / up.length;
    expect(featureShare).toBeGreaterThan(0.15);
    expect(featureShare).toBeLessThan(0.5);
    expect(new Set(up.map((g) => g.status))).toEqual(
      new Set(['created', 'queued', 'sent', 'delivered', 'opened', 'confirmed', 'declined']),
    );
  });
});

describe('MockRepository', () => {
  it('locks OTP after 5 wrong codes', async () => {
    const phone = '+255700111222';
    for (let i = 0; i < 4; i++)
      await expect(repo.verifyOtp(phone, '000000')).rejects.toMatchObject({ code: 'validation' });
    await expect(repo.verifyOtp(phone, '000000')).rejects.toMatchObject({ code: 'locked' });
    await expect(repo.verifyOtp(phone, '123456')).rejects.toMatchObject({ code: 'locked' });
  });

  it('records RSVP idempotently and caps the party size', async () => {
    const token = repo.sampleToken('delivered');
    const first = await repo.rsvp(token, { attending: true, partySize: 99 }, 'k1');
    const again = await repo.rsvp(token, { attending: true, partySize: 99 }, 'k1');
    expect(first.rsvp.status).toBe('confirmed');
    expect(again).toEqual(first);
    expect(first.rsvp.partySize).toBeLessThanOrEqual(first.guest!.partySizeAllowed);
    const changed = await repo.rsvp(token, { attending: false, partySize: 0 }, 'k2');
    expect(changed.rsvp.status).toBe('declined');
  });

  it('marks a card opened on first view', async () => {
    const token = repo.sampleToken('delivered');
    await repo.getCard(token);
    const ev = (await repo.listEvents())[0]!;
    const guests = await repo.listGuests(ev.id, {
      search: (await repo.getCard(token)).guest!.shortCode,
    });
    expect(guests[0]!.status).toBe('opened');
  });

  it('reissue invalidates the old link and QR version', async () => {
    const token = repo.sampleToken('opened');
    const card = await repo.getCard(token);
    const ev = (await repo.listEvents())[0]!;
    const [guest] = await repo.listGuests(ev.id, { search: card.guest!.shortCode });
    const updated = await repo.reissueGuest(guest!.id);
    expect(updated.tokenVersion).toBe(guest!.tokenVersion + 1);
    expect((await repo.getCard(token)).state).toBe('reissued');
    const { url } = await repo.getGuestCardLink(guest!.id);
    const fresh = await repo.getCard(url.split('/c/')[1]!);
    expect(fresh.state).toBe('ok');
    expect(fresh.qrPayload).toContain(`.${updated.tokenVersion}.MOCKSIG`);
    expect((await repo.getCard('nope')).state).toBe('invalid');
  });

  it('queues writes offline and syncs later; card reads fail offline', async () => {
    const ev = (await repo.listEvents())[0]!;
    repo.controls.set({ network: 'offline' });
    await repo.createGuest(ev.id, {
      displayName: 'Offline Mgeni',
      phone: '',
      partySizeAllowed: 1,
      inviteChannelPref: 'print',
      hasSmartphone: false,
      language: 'sw',
    });
    expect(repo.controls.get().pending).toHaveLength(1);
    await expect(repo.getCard(repo.sampleToken())).rejects.toMatchObject({ code: 'offline' });
    await expect(repo.syncNow()).rejects.toMatchObject({ code: 'offline' });
    repo.controls.set({ network: 'online' });
    expect(await repo.syncNow()).toEqual({ synced: 1 });
    expect(repo.controls.get().pending).toHaveLength(0);
  });

  it('injects failures at the configured rate', async () => {
    repo.controls.set({ failureRate: 1 });
    await expect(repo.listEvents()).rejects.toMatchObject({ code: 'server' });
  });

  it('send job progresses to correct final counts and retry falls back to SMS', async () => {
    const ev = (await repo.listEvents())[0]!;
    repo.controls.set({ failureRate: 0 });
    const job = await repo.sendInvitations(ev.id, {
      audience: { kind: 'unsent' },
      channel: 'auto',
      whatsappFallbackToSms: true,
      scheduleAt: null,
      kind: 'invite',
      idempotencyKey: 's1',
    });
    expect(job.status).toBe('running');
    expect(
      await repo.sendInvitations(ev.id, {
        audience: { kind: 'unsent' },
        channel: 'auto',
        whatsappFallbackToSms: true,
        scheduleAt: null,
        kind: 'invite',
        idempotencyKey: 's1',
      }),
    ).toMatchObject({ id: job.id });
    clock += 60_000;
    const done = await repo.getSendJob(job.id);
    expect(done.status).toBe('done');
    expect(done.counts.delivered + done.counts.failed).toBe(done.total);
    expect(done.counts.queued + done.counts.sent).toBe(0);
    if (done.counts.failed) {
      const retry = await repo.retryFailed(job.id);
      expect(retry.total).toBe(done.counts.failed);
      clock += 60_000;
      expect((await repo.getSendJob(retry.id)).status).toBe('done');
    }
    const unsent = await repo.listGuests(ev.id, { filter: 'unsent' });
    const failedIds = new Set(done.failures.map((f) => f.guestId));
    expect(unsent.every((g) => failedIds.has(g.id) || !g.phoneE164)).toBe(true);
  });

  it('keeps a scheduled send waiting, lists it, starts it when its time comes and cannot cancel it then', async () => {
    const ev = (await repo.listEvents())[0]!;
    repo.controls.set({ failureRate: 0 });
    const at = new Date(clock + 3_600_000).toISOString();
    const req = {
      audience: { kind: 'unsent' as const },
      channel: 'auto' as const,
      whatsappFallbackToSms: true,
      kind: 'reminder' as const,
    };
    const job = await repo.sendInvitations(ev.id, {
      ...req,
      scheduleAt: at,
      idempotencyKey: 'sc1',
    });
    expect(job).toMatchObject({ status: 'scheduled', kind: 'reminder', scheduledFor: at });
    expect(job.total).toBeGreaterThan(0);
    expect(await repo.listScheduledSends(ev.id)).toEqual([expect.objectContaining({ id: job.id })]);

    // one that is cancelled while waiting is gone
    const other = await repo.sendInvitations(ev.id, {
      ...req,
      scheduleAt: new Date(clock + 7_200_000).toISOString(),
      idempotencyKey: 'sc2',
    });
    await repo.cancelScheduledSend(ev.id, other.id);
    expect((await repo.listScheduledSends(ev.id)).map((j) => j.id)).toEqual([job.id]);

    // when the time comes it starts like any send, leaves the waiting list and cannot be cancelled
    clock += 3_600_000 + 1000;
    expect(await repo.listScheduledSends(ev.id)).toEqual([]);
    await expect(repo.cancelScheduledSend(ev.id, job.id)).rejects.toMatchObject({
      code: 'conflict',
    });
    clock += 120_000;
    const done = await repo.getSendJob(job.id);
    expect(done).toMatchObject({ status: 'done', scheduledFor: null });
    expect(done.counts.delivered + done.counts.failed).toBe(done.total);
  });

  it('sends reminders only to invitation cards that went out and have no answer yet', async () => {
    const ev = (await repo.listEvents())[0]!;
    repo.controls.set({ failureRate: 0 });
    const job = await repo.sendInvitations(ev.id, {
      audience: { kind: 'unsent' },
      channel: 'auto',
      whatsappFallbackToSms: true,
      scheduleAt: null,
      kind: 'reminder',
      idempotencyKey: 'rm1',
    });
    const guests = await repo.listGuests(ev.id);
    const open = guests.filter((g) => ['sent', 'delivered', 'opened'].includes(g.status));
    expect(job.total).toBe(open.length);
    expect(guests.some((g) => g.status === 'confirmed')).toBe(true); // they are left alone
  });

  it('records a manual payment once per idempotency key and updates the balance', async () => {
    const ev = (await repo.listEvents())[0]!;
    const g = (await repo.listGuests(ev.id)).find((x) => x.pledge && x.pledge.balance >= 20_000)!;
    const input = { guestId: g.id, amount: 10_000, method: 'cash' as const };
    await repo.recordManualPayment(ev.id, input, 'p1');
    await repo.recordManualPayment(ev.id, input, 'p1');
    const after = await repo.getGuest(g.id);
    expect(after.pledge!.paid).toBe(g.pledge!.paid + 10_000);
    expect(after.pledge!.balance).toBe(g.pledge!.balance - 10_000);
  });

  it('applies a duplicate payment webhook once', async () => {
    const token = repo.sampleToken('confirmed');
    repo.controls.set({ payOutcome: 'duplicate_webhook' });
    const start = await repo.startPayment(
      token,
      { amount: 5000, phoneE164: '+255712345678', method: 'mpesa' },
      'pay1',
    );
    clock += 10_000;
    const s1 = await repo.getPaymentStatus(start.reference);
    const s2 = await repo.getPaymentStatus(start.reference);
    expect(s1).toMatchObject({ status: 'success', duplicateWebhook: true });
    expect(s2.status).toBe('success');
    const ev = (await repo.listEvents())[0]!;
    const payments = (await repo.listPayments(ev.id)).filter(
      (p) => p.reference === start.reference,
    );
    expect(payments).toHaveLength(1);
  });

  it('times out and declines payments as configured', async () => {
    const token = repo.sampleToken('confirmed');
    repo.controls.set({ payOutcome: 'declined' });
    const a = await repo.startPayment(
      token,
      { amount: 5000, phoneE164: '+255712345678', method: 'airtel' },
      'pd',
    );
    clock += 5000;
    expect((await repo.getPaymentStatus(a.reference)).status).toBe('failed');
    repo.controls.set({ payOutcome: 'timeout' });
    const b = await repo.startPayment(
      token,
      { amount: 5000, phoneE164: '+255712345678', method: 'airtel' },
      'pt',
    );
    clock += 30_000;
    expect((await repo.getPaymentStatus(b.reference)).status).toBe('pending');
    clock += 31_000;
    expect((await repo.getPaymentStatus(b.reference)).status).toBe('expired');
  });

  it('manual check-in admits once, then reports duplicate', async () => {
    const ev = (await repo.listEvents())[0]!;
    const g = (await repo.listGuests(ev.id, { filter: 'confirmed' }))[0]!;
    const first = await repo.manualCheckIn(ev.id, g.id, { partySize: 2 });
    const second = await repo.manualCheckIn(ev.id, g.id, { partySize: 2 });
    expect(first.result).toBe('manual_ok');
    expect(second.result).toBe('duplicate');
    expect((await repo.getGuest(g.id)).status).toBe('checked_in');
  });

  it('refuses the console to the gate role', async () => {
    repo.controls.set({ role: 'gate' });
    await expect(repo.listEvents()).rejects.toMatchObject({ code: 'forbidden' });
  });

  it('imports idempotently and skips invalid or duplicate rows', async () => {
    const ev = (await repo.listEvents())[0]!;
    const rows = [
      {
        displayName: 'Mpya Mmoja',
        phoneRaw: '0799 000 111',
        groupLabel: 'Marafiki',
        partySizeAllowed: 1,
        hasSmartphone: true,
        inviteChannelPref: 'whatsapp' as const,
      },
      {
        displayName: 'Mpya Wawili',
        phoneRaw: '0799000111',
        groupLabel: '',
        partySizeAllowed: 1,
        hasSmartphone: true,
        inviteChannelPref: 'whatsapp' as const,
      },
      {
        displayName: 'Mbaya',
        phoneRaw: '123',
        groupLabel: '',
        partySizeAllowed: 1,
        hasSmartphone: true,
        inviteChannelPref: 'whatsapp' as const,
      },
    ];
    expect(await repo.importGuests(ev.id, rows, 'imp1')).toEqual({ created: 1, skipped: 2 });
    expect(await repo.importGuests(ev.id, rows, 'imp1')).toEqual({ created: 1, skipped: 2 });
    expect((await repo.listGuests(ev.id, { search: 'Mpya' })).length).toBe(1);
  });
});

describe('staff (ops) panel and accounts', () => {
  async function loginAs(phone: string) {
    await repo.requestOtp(phone).catch(() => undefined);
    const session = await repo.verifyOtp(phone, '123456');
    return session.needsSecondFactor ? repo.verifyStaffSecondFactor('654321') : session;
  }

  it('refuses customers and lets staff in', async () => {
    await expect(repo.opsOverview()).rejects.toMatchObject({ code: 'forbidden' });
    await loginAs('+255700000999');
    const o = await repo.opsOverview();
    expect(o.organizers).toBeGreaterThanOrEqual(6);
    expect(o.events.total).toBe(6);
    expect(o.suspendedOrganizers).toBe(1);
    expect(o.openDataRequests).toBe(2);
  });

  it('masks phones in lookups and logs reveals with a reason', async () => {
    await loginAs('+255700000999');
    const res = await repo.opsLookup('0715330112');
    expect(res.organizers[0]?.name).toBe('Neema Lyimo');
    const g = (await repo.opsLookup('KH')).guests;
    for (const hit of g) if (hit.phoneMasked) expect(hit.phoneMasked).toMatch(/•••••/);
    await expect(
      repo.opsRevealPhone({ kind: 'organizer', id: 'user-c1' }, 'x'),
    ).rejects.toMatchObject({ code: 'validation' });
    const r = await repo.opsRevealPhone(
      { kind: 'organizer', id: 'user-c1' },
      'Mteja alipiga simu kuomba msaada',
    );
    expect(r.phoneE164).toBe('+255715330112');
    const audit = await repo.opsListAudit();
    expect(audit[0]).toMatchObject({ action: 'reveal_phone', target: 'Neema Lyimo' });
  });

  it('suspension blocks login; reactivation restores it', async () => {
    await loginAs('+255700000999');
    await expect(repo.opsSetUserStatus('user-c2', 'suspended', 'no')).rejects.toMatchObject({
      code: 'validation',
    });
    await repo.opsSetUserStatus('user-c2', 'suspended', 'Matumizi mabaya ya ujumbe');
    await repo.signOut();
    await expect(loginAs('+255762114508')).rejects.toMatchObject({ code: 'forbidden' });
    await loginAs('+255700000999');
    await repo.opsSetUserStatus('user-c2', 'active', 'Imerekebishwa');
    await repo.signOut();
    await expect(loginAs('+255762114508')).resolves.toMatchObject({
      user: { phoneE164: '+255762114508' },
    });
  });

  it('data requests from customers reach staff; deletion removes the account', async () => {
    await loginAs('+255715330112');
    await repo.requestAccountDeletion();
    await repo.signOut();
    await loginAs('+255700000999');
    const open = (await repo.opsListDataRequests()).filter((r) => r.status === 'open');
    expect(open.some((r) => r.userName === 'Neema Lyimo' && r.kind === 'deletion')).toBe(true);
    const req = open.find((r) => r.userName === 'Neema Lyimo')!;
    await repo.opsResolveDataRequest(req.id, 'done', 'Imefutwa');
    await expect(repo.opsResolveDataRequest(req.id, 'done', '')).rejects.toMatchObject({
      code: 'conflict',
    });
    expect((await repo.opsListOrganizers()).some((o) => o.name === 'Neema Lyimo')).toBe(false);
  });

  it('plan changes are audited', async () => {
    await loginAs('+255700000999');
    const ev = (await repo.opsListEvents()).find((e) => e.plan === 'free')!;
    const updated = await repo.opsSetEventPlan(ev.id, 'paid');
    expect(updated.plan).toBe('paid');
    expect((await repo.opsListAudit())[0]).toMatchObject({ action: 'set_plan' });
  });

  it('accepts a pending team invitation when the invitee logs in', async () => {
    const ev = (await repo.listEvents())[0]!;
    await repo.inviteMember(ev.id, {
      name: 'Mgeni Mpya',
      phoneE164: '+255799123456',
      role: 'committee',
    });
    await repo.signOut();
    await loginAs('+255799123456');
    expect((await repo.listEvents()).some((e) => e.id === ev.id)).toBe(true);
    await repo.signOut();
    await loginAs('+255712000001');
    expect(
      (await repo.listMembers(ev.id)).find((m) => m.phoneE164 === '+255799123456')?.status,
    ).toBe('active');
  });

  it('staff need a second factor before any data is available', async () => {
    await repo.signOut();
    await repo.requestOtp('+255700000999').catch(() => undefined);
    const first = await repo.verifyOtp('+255700000999', '123456');
    expect(first.needsSecondFactor).toBe(true);
    expect(await repo.getSession()).toBeNull();
    await expect(repo.opsOverview()).rejects.toMatchObject({ code: 'unauthorized' });
    await expect(repo.verifyStaffSecondFactor('000000')).rejects.toMatchObject({
      code: 'validation',
    });
    expect(await repo.verifyStaffSecondFactor('654321')).toMatchObject({
      user: { staffRole: 'admin' },
    });
    await expect(repo.opsOverview()).resolves.toBeTruthy();
    await repo.signOut();
    await expect(repo.opsOverview()).rejects.toBeTruthy();
  });

  it('support staff can look up and reveal but not suspend or change plans', async () => {
    await loginAs('+255700000998');
    await expect(repo.opsLookup('Neema')).resolves.toBeTruthy();
    await expect(
      repo.opsRevealPhone({ kind: 'organizer', id: 'user-c1' }, 'Mteja aliomba msaada'),
    ).resolves.toBeTruthy();
    await expect(
      repo.opsSetUserStatus('user-c1', 'suspended', 'Sababu ndefu ya kutosha'),
    ).rejects.toMatchObject({ code: 'forbidden' });
    const ev = (await repo.opsListEvents())[0]!;
    await expect(repo.opsSetEventPlan(ev.id, 'paid')).rejects.toMatchObject({ code: 'forbidden' });
  });

  it('billing staff can change plans but cannot look up or reveal customer data', async () => {
    await loginAs('+255700000997');
    const ev = (await repo.opsListEvents())[0]!;
    await expect(
      repo.opsSetEventPlan(ev.id, ev.plan === 'paid' ? 'free' : 'paid'),
    ).resolves.toBeTruthy();
    await expect(repo.opsLookup('Neema')).rejects.toMatchObject({ code: 'forbidden' });
    await expect(
      repo.opsRevealPhone({ kind: 'organizer', id: 'user-c1' }, 'Sababu ya majaribio'),
    ).rejects.toMatchObject({ code: 'forbidden' });
    await expect(repo.opsResolveDataRequest('dr-1', 'done', '')).rejects.toMatchObject({
      code: 'forbidden',
    });
  });

  it('stores a readable palette on the event and serves it on the guest card; refuses an unreadable one', async () => {
    const ev = (await repo.listEvents())[0]!;
    const dark = {
      bg: '#101820',
      surface: '#16222E',
      ink: '#F5F1E8',
      muted: '#C9CED6',
      primary: '#7FD1B9',
      onPrimary: '#08241D',
    };
    const saved = await repo.updateEvent(ev.id, { palette: dark });
    expect(saved.palette).toEqual(dark);
    const token = sampleCardToken(createSeedState({ now: NOW }));
    expect((await repo.getCard(token)).event?.palette).toEqual(dark);
    await expect(repo.updateEvent(ev.id, { palette: { ink: '#EEEEEE' } })).rejects.toMatchObject({
      code: 'validation',
      details: { pairs: ['ink/surface', 'ink/bg'] },
    });
    expect((await repo.getEvent(ev.id)).palette).toEqual(dark); // unchanged after the refusal
  });

  it('folds RSVPs saved by the light card before this state existed into the guest list', async () => {
    const storage = memoryStorage();
    const seed = createSeedState({ now: NOW });
    const g = seed.guests.find((x) => x.status === 'delivered')!;
    storage.setItem(
      `harusi.card.overlay.${g.token}`,
      JSON.stringify({ status: 'confirmed', rsvpPartySize: 2, at: '2026-10-13T09:05:00.000Z' }),
    );
    storage.setItem('harusi.mock.v1', JSON.stringify(seed));
    const r2 = new MockRepository({ storage, now: () => NOW });
    expect((await r2.peekCard(g.token)).rsvp).toMatchObject({ status: 'confirmed', partySize: 2 });
    expect(storage.getItem(`harusi.card.overlay.${g.token}`)).toBeNull();
  });
});

describe('saved demo state from before the money rename', () => {
  it('keeps old state usable by renaming *Tzs keys', async () => {
    const storage = memoryStorage();
    const seed = createSeedState({ now: NOW });
    const legacy = JSON.parse(
      JSON.stringify({ ...seed, version: 3 })
        .replace(/"collected"/g, '"collectedTzs"')
        .replace(/"amount"/g, '"amountTzs"'),
    );
    storage.setItem('harusi.mock.v1', JSON.stringify(legacy));
    const r2 = new MockRepository({ storage, now: () => NOW });
    await r2.requestOtp('+255712000001');
    await r2.verifyOtp('+255712000001', '123456');
    const events = await r2.listEvents();
    expect(events.length).toBeGreaterThan(0);
    for (const e of events) expect(Number.isFinite(e.stats.collected)).toBe(true);
    expect(JSON.parse(storage.getItem('harusi.mock.v1')!).version).toBe(5);
  });
});
