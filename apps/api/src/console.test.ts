import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { api, createTestContext, loginAs, type TestContext } from './testing/test-app';

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(() => ctx.close());

let seq = 0;
const phone = () => `0715${String(400000 + ++seq)}`;

/** An owner, an event and `n` guests (party of 2 each), all through the real routes. */
async function setup(n = 2) {
  const owner = await loginAs(ctx, phone());
  const t = owner.accessToken;
  const ev = (
    await api(ctx, 'POST', '/v1/events', {
      token: t,
      body: { title: 'Harusi', coupleNames: 'Asha & Juma', dateStart: '2027-06-01T10:00:00+03:00' },
    })
  ).body! as { id: string };
  const rows = Array.from({ length: n }, (_, i) => `Mgeni ${i + 1},${phone()},,2`);
  await api(ctx, 'POST', `/v1/events/${ev.id}/guests/import`, {
    token: t,
    body: { csv: ['Jina,Simu,Kikundi,Idadi', ...rows].join('\n') },
  });
  const guests = (await api(ctx, 'GET', `/v1/events/${ev.id}/guests`, { token: t })).body!
    .items as { id: string; displayName: string }[];
  return { owner, t, ev, guests };
}

const checkIn = (t: string, evId: string, guestId: string, partySize = 2, reason?: string) =>
  api(ctx, 'POST', `/v1/events/${evId}/gate/manual-check-in`, {
    token: t,
    body: { guestId, partySize, reason },
  });

describe('gate monitor and manual check-in (§6.2, §7.6)', () => {
  it('admits a guest from the console once; a second admission is a duplicate', async () => {
    const s = await setup(2);
    const g = s.guests[0]!;
    const first = await checkIn(s.t, s.ev.id, g.id, 5, 'Kadi imepotea');
    expect(first.status, JSON.stringify(first.body)).toBe(201);
    // the party is capped at what the guest is allowed
    expect(first.body).toMatchObject({ guestId: g.id, result: 'manual_ok', partyAdmitted: 2 });
    expect(first.body!.reason).toBe('Kadi imepotea');
    expect(first.body!.gateName).toBe('Console');

    const again = await checkIn(s.t, s.ev.id, g.id);
    expect(again.body!.result).toBe('duplicate');

    const o = (await api(ctx, 'GET', `/v1/events/${s.ev.id}/gate/overview`, { token: s.t })).body!;
    expect(o).toMatchObject({ admittedGuests: 1, admittedPeople: 2, manual: 1, duplicates: 1 });
    expect(o.perGate).toEqual([
      { gateName: 'Console', ok: 0, duplicate: 1, invalid: 0, manual: 1 },
    ]);
    expect(o.arrivalsByHour.reduce((n: number, h: { count: number }) => n + h.count, 0)).toBe(2);

    const scans = (await api(ctx, 'GET', `/v1/events/${s.ev.id}/gate/scans`, { token: s.t })).body!
      .items;
    expect(scans).toHaveLength(2);
    expect(scans[0].guestName).toBe(g.displayName);

    const audit = (await api(ctx, 'GET', `/v1/guests/${g.id}/audit`, { token: s.t })).body!.items;
    expect(audit.some((a: { action: string }) => a.action === 'gate.manual_check_in')).toBe(true);
  });

  it('refuses a gate-link token on the console gate routes, and other events', async () => {
    const s = await setup(1);
    const link = (await api(ctx, 'POST', `/v1/events/${s.ev.id}/gate-links`, { token: s.t })).body!;
    const gate = (
      await api(ctx, 'POST', '/v1/gate/join', {
        body: { code: link.code, pin: link.pin, deviceId: 'device-cons-0001' },
      })
    ).body!.accessToken as string;
    expect((await checkIn(gate, s.ev.id, s.guests[0]!.id)).status).toBe(403);
    expect(
      (await api(ctx, 'GET', `/v1/events/${s.ev.id}/gate/overview`, { token: gate })).status,
    ).toBe(403);
    const stranger = await loginAs(ctx, phone());
    expect((await checkIn(stranger.accessToken, s.ev.id, s.guests[0]!.id)).status).toBe(404);
  });
});

describe('activity and report (§7.7)', () => {
  it('lists check-ins and payments, newest first', async () => {
    const s = await setup(2);
    await checkIn(s.t, s.ev.id, s.guests[0]!.id);
    const pay = await api(ctx, 'POST', '/v1/payments/manual', {
      token: s.t,
      body: { guestId: s.guests[1]!.id, amount: 50_000, method: 'cash' },
    });
    expect(pay.status, JSON.stringify(pay.body)).toBe(201);
    const items = (await api(ctx, 'GET', `/v1/events/${s.ev.id}/activity?limit=10`, { token: s.t }))
      .body!.items;
    expect(items.map((i: { kind: string }) => i.kind).sort()).toEqual(['checked_in', 'payment']);
    expect(items.find((i: { kind: string }) => i.kind === 'payment')).toMatchObject({
      amount: 50_000,
      guestId: s.guests[1]!.id,
    });
  });

  it('reports channels, arrivals, weekly collections and pledge reconciliation', async () => {
    const s = await setup(3);
    const [a, b] = s.guests;
    await api(ctx, 'POST', `/v1/guests/${a!.id}/pledges`, {
      token: s.t,
      body: { amount: 100_000 },
    });
    await api(ctx, 'POST', `/v1/guests/${b!.id}/pledges`, { token: s.t, body: { amount: 40_000 } });
    await api(ctx, 'POST', '/v1/payments/manual', {
      token: s.t,
      body: { guestId: a!.id, amount: 30_000, method: 'cash' },
    });
    await api(ctx, 'POST', '/v1/payments/manual', {
      token: s.t,
      body: { guestId: b!.id, amount: 50_000, method: 'cash' },
    });
    await checkIn(s.t, s.ev.id, a!.id, 2);
    const r = await api(ctx, 'GET', `/v1/events/${s.ev.id}/report`, { token: s.t });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body!.channels.map((c: { channel: string }) => c.channel)).toEqual([
      'whatsapp',
      'sms',
      'print',
    ]);
    expect(r.body!.headcountTarget).toBe(6);
    expect(
      r.body!.collectionsByWeek.reduce((n: number, w: { amount: number }) => n + w.amount, 0),
    ).toBe(80_000);
    expect(r.body!.pledgeReconciliation).toMatchObject({
      pledged: 140_000,
      collected: 80_000,
      outstanding: 70_000,
      overpaid: 10_000,
      guestsPaid: 1,
      guestsPartial: 1,
      guestsUnpaid: 0,
    });
  });
});

describe("a guest's history and undo", () => {
  it('stores notes, lists messages, and restores a deleted guest', async () => {
    const s = await setup(2);
    const g = s.guests[0]!;
    const note = await api(ctx, 'POST', `/v1/guests/${g.id}/notes`, {
      token: s.t,
      body: { note: '  Atakuja na mama yake  ' },
    });
    expect(note.status).toBe(201);
    expect(note.body).toMatchObject({ action: 'note', details: 'Atakuja na mama yake' });
    const audit = (await api(ctx, 'GET', `/v1/guests/${g.id}/audit`, { token: s.t })).body!.items;
    expect(audit[0]).toMatchObject({ action: 'note', details: 'Atakuja na mama yake' });

    await api(ctx, 'POST', `/v1/events/${s.ev.id}/invitations/send`, {
      token: s.t,
      body: { target: { guestIds: [g.id] }, channel: 'sms' },
    });
    const msgs = (await api(ctx, 'GET', `/v1/guests/${g.id}/messages`, { token: s.t })).body!.items;
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({
      guestId: g.id,
      channel: 'sms',
      kind: 'invite',
      status: 'sent',
    });

    expect((await api(ctx, 'DELETE', `/v1/guests/${g.id}`, { token: s.t })).status).toBe(204);
    expect((await api(ctx, 'POST', `/v1/guests/${g.id}/restore`, { token: s.t })).status).toBe(204);
    expect((await api(ctx, 'GET', `/v1/guests/${g.id}`, { token: s.t })).status).toBe(200);
    // only a deleted guest can be restored
    expect((await api(ctx, 'POST', `/v1/guests/${g.id}/restore`, { token: s.t })).status).toBe(404);
  });
});

describe('test message and deleting a wedding', () => {
  it('sends a sample invitation to the caller, through the SMS route', async () => {
    const s = await setup(1);
    const r = await api(ctx, 'POST', `/v1/events/${s.ev.id}/test-message`, {
      token: s.t,
      body: { channel: 'sms' },
    });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body!.to).toBe(s.owner.user.phoneE164);
    expect(ctx.sms.lastTo(s.owner.user.phoneE164)).toContain('/k');
  });

  it('deletes only for the owner, and never a wedding that holds payments', async () => {
    const s = await setup(1);
    // a team invitation is accepted when the invited number signs in
    const committeePhone = phone();
    const invited = await api(ctx, 'POST', `/v1/events/${s.ev.id}/members`, {
      token: s.t,
      body: { name: 'Kamati', phone: committeePhone, role: 'committee' },
    });
    expect(invited.status, JSON.stringify(invited.body)).toBeLessThan(300);
    const asCommittee = (await loginAs(ctx, committeePhone)).accessToken;
    expect((await api(ctx, 'DELETE', `/v1/events/${s.ev.id}`, { token: asCommittee })).status).toBe(
      403,
    );

    await api(ctx, 'POST', '/v1/payments/manual', {
      token: s.t,
      body: { guestId: s.guests[0]!.id, amount: 10_000, method: 'cash' },
    });
    const refused = await api(ctx, 'DELETE', `/v1/events/${s.ev.id}`, { token: s.t });
    expect(refused.status).toBe(409);
    expect(refused.body!.error.details.reason).toBe('has_payments');

    const other = await setup(1);
    expect((await api(ctx, 'DELETE', `/v1/events/${other.ev.id}`, { token: other.t })).status).toBe(
      204,
    );
    expect((await api(ctx, 'GET', `/v1/events/${other.ev.id}`, { token: other.t })).status).toBe(
      404,
    );
  });
});
