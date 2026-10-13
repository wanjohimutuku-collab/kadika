import { beforeEach, describe, expect, it } from 'vitest';
import { SHORT_CODE_PATTERN } from '@harusi/schemas';
import { MockControls } from './controls';
import { MockRepository } from './mock-repository';
import { createSeedState } from './state';

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
  it('has 2 events (one upcoming, one past), ≥ 320 guests and 3 team members', () => {
    expect(s.events).toHaveLength(2);
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

  it('records a manual payment once per idempotency key and updates the balance', async () => {
    const ev = (await repo.listEvents())[0]!;
    const g = (await repo.listGuests(ev.id)).find(
      (x) => x.pledge && x.pledge.balanceTzs >= 20_000,
    )!;
    const input = { guestId: g.id, amountTzs: 10_000, method: 'cash' as const };
    await repo.recordManualPayment(ev.id, input, 'p1');
    await repo.recordManualPayment(ev.id, input, 'p1');
    const after = await repo.getGuest(g.id);
    expect(after.pledge!.paidTzs).toBe(g.pledge!.paidTzs + 10_000);
    expect(after.pledge!.balanceTzs).toBe(g.pledge!.balanceTzs - 10_000);
  });

  it('applies a duplicate payment webhook once', async () => {
    const token = repo.sampleToken('confirmed');
    repo.controls.set({ payOutcome: 'duplicate_webhook' });
    const start = await repo.startPayment(
      token,
      { amountTzs: 5000, phoneE164: '+255712345678', method: 'mpesa' },
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
      { amountTzs: 5000, phoneE164: '+255712345678', method: 'airtel' },
      'pd',
    );
    clock += 5000;
    expect((await repo.getPaymentStatus(a.reference)).status).toBe('failed');
    repo.controls.set({ payOutcome: 'timeout' });
    const b = await repo.startPayment(
      token,
      { amountTzs: 5000, phoneE164: '+255712345678', method: 'airtel' },
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
