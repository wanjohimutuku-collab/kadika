import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { count, eq } from 'drizzle-orm';
import { scanLog } from '@harusi/db';
import {
  GateEngine,
  MemoryGateStore,
  type Bundle,
  type GateApi,
  type LocalScan,
  type SyncResponse,
} from '@harusi/gate';
import { api, createTestContext, loginAs, type TestContext } from './testing/test-app';

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(() => ctx.close());

interface Setup {
  phone: string;
  t: string;
  ev: { id: string };
  guests: { id: string; displayName: string; shortCode: string; qr: string }[];
}

let phoneSeq = 0;
async function setup(n: number, opts: { title?: string } = {}): Promise<Setup> {
  const phone = `07990${String(++phoneSeq).padStart(5, '0')}`;
  const owner = await loginAs(ctx, phone);
  const t = owner.accessToken;
  const ev = (
    await api(ctx, 'POST', '/v1/events', {
      token: t,
      body: {
        title: opts.title ?? 'Harusi',
        coupleNames: 'Asha & Juma',
        dateStart: '2027-06-01T10:00:00+03:00',
      },
    })
  ).body! as { id: string };
  const rows = Array.from(
    { length: n },
    (_, i) =>
      `Mgeni ${String(i + 1).padStart(3, '0')},07${String(30_000_000 + i * 11 + phoneSeq * 1000).padStart(8, '0')}`,
  );
  await api(ctx, 'POST', `/v1/events/${ev.id}/guests/import`, {
    token: t,
    body: { csv: ['Jina,Simu', ...rows].join('\n') },
  });
  const list = (await api(ctx, 'GET', `/v1/events/${ev.id}/guests?limit=200`, { token: t })).body!
    .items as {
    id: string;
    displayName: string;
    shortCode: string;
  }[];
  const guests = [];
  for (const g of list)
    guests.push({
      ...g,
      qr: (await api(ctx, 'GET', `/v1/guests/${g.id}/qr`, { token: t })).body!.token as string,
    });
  return { phone, t, ev, guests };
}

/** A gate device talking to the real routes in-process, optionally with the network down. */
function deviceApi(
  eventId: string,
  token: string,
  state: { online: boolean } = { online: true },
): GateApi {
  const call = async (
    method: string,
    path: string,
    body?: unknown,
    extra: Record<string, string> = {},
  ) => {
    if (!state.online) throw new Error('network down');
    const res = await ctx.app.request(`/v1/events/${eventId}${path}`, {
      method,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...extra },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return res;
  };
  return {
    async sync(deviceId, scans: LocalScan[]) {
      const res = await call('POST', '/gate/scans/sync', { deviceId, scans });
      if (!res.ok) throw new Error(`sync ${res.status}`);
      return (await res.json()) as SyncResponse;
    },
    async bundle(etag) {
      const res = await call(
        'GET',
        '/gate/bundle',
        undefined,
        etag ? { 'if-none-match': etag } : {},
      );
      if (res.status === 304) return { notModified: true as const };
      return { bundle: (await res.json()) as Bundle, etag: res.headers.get('etag') };
    },
    async admitted() {
      return (await (await call('GET', '/gate/admitted')).json()) as { admitted: [] };
    },
  };
}

async function device(
  s: Setup,
  id: string,
  role: 'owner' | 'committee' | 'gate',
  clock: { now: number },
  token = s.t,
) {
  const net = { online: true };
  const a = deviceApi(s.ev.id, token, net);
  const store = new MemoryGateStore();
  let n = 0;
  const engine = new GateEngine(store, {
    deviceId: id,
    role,
    now: () => new Date(clock.now),
    uuid: () => `${id}-scan-${String(++n).padStart(5, '0')}`,
  });
  const first = await a.bundle(null);
  if ('bundle' in first) await engine.installBundle(first.bundle, first.etag);
  const { admitted } = await a.admitted();
  await store.replaceAdmissions(admitted);
  await engine.load();
  return { engine, store, net, api: a };
}

async function countScans(eventId: string): Promise<number> {
  const rows = await ctx.db
    .select({ n: count() })
    .from(scanLog)
    .where(eq(scanLog.eventId, eventId));
  return rows[0]?.n ?? 0;
}

const forge = (qr: string) => {
  const parts = qr.split('.');
  const sig = parts[5]!;
  parts[5] = (sig[0] === 'A' ? 'B' : 'A') + sig.slice(1);
  return parts.join('.');
};

describe('gate link + PIN (§7.6, §9)', () => {
  it('only the owner can create a link; the PIN works, wrong PINs lock the link, revoking kills it', async () => {
    const s = await setup(1);
    const committee = await (async () => {
      await api(ctx, 'POST', `/v1/events/${s.ev.id}/members`, {
        token: s.t,
        body: { name: 'Kamati', phone: '0799900001', role: 'committee' },
      });
      return loginAs(ctx, '0799900001');
    })();
    expect(
      (await api(ctx, 'POST', `/v1/events/${s.ev.id}/gate-links`, { token: committee.accessToken }))
        .status,
    ).toBe(403);

    const link = (await api(ctx, 'POST', `/v1/events/${s.ev.id}/gate-links`, { token: s.t })).body!;
    expect(link.code).toMatch(/^[A-HJKMNP-Z2-9]{8}$/);
    expect(link.pin).toMatch(/^\d{6}$/);
    const join = (pin: string, code = link.code) =>
      api(ctx, 'POST', '/v1/gate/join', {
        body: { code, pin, deviceId: 'device-aaaa-0001', deviceName: 'Lango A' },
      });

    const wrong = await join('000000');
    expect(wrong.status).toBe(401);
    expect(wrong.body!.error.details.attemptsLeft).toBe(4);
    const ok = await join(link.pin);
    expect(ok.status).toBe(200);
    expect(ok.body!.event.coupleNames).toBe('Asha & Juma');
    // the PIN is never stored in clear
    expect(JSON.stringify(await ctx.db.query.gateLinks.findMany())).not.toContain(link.pin);

    for (let i = 0; i < 5; i++) await join('111111');
    expect((await join(link.pin)).status).toBe(423); // locked even for the right PIN
    ctx.clock.now += 16 * 60_000;
    expect((await join(link.pin)).status).toBe(200);

    expect((await join(link.pin, 'ZZZZZZZZ')).status).toBe(404);
    // the clock moved on, so sign in again (access tokens last 15 minutes)
    const fresh = (await loginAs(ctx, s.phone)).accessToken;
    const del = await api(ctx, 'DELETE', `/v1/events/${s.ev.id}/gate-links`, { token: fresh });
    expect(del.status, JSON.stringify(del.body)).toBe(200);
    expect((await join(link.pin)).status).toBe(404);
  });

  it('a gate token is scoped to its event and to the gate routes', async () => {
    const a = await setup(1);
    const b = await setup(1);
    const link = (await api(ctx, 'POST', `/v1/events/${a.ev.id}/gate-links`, { token: a.t })).body!;
    const tok = (
      await api(ctx, 'POST', '/v1/gate/join', {
        body: { code: link.code, pin: link.pin, deviceId: 'device-bbbb-0002' },
      })
    ).body!.accessToken;
    expect(
      (await api(ctx, 'GET', `/v1/events/${a.ev.id}/gate/bundle`, { token: tok })).status,
    ).toBe(200);
    expect(
      (await api(ctx, 'GET', `/v1/events/${b.ev.id}/gate/bundle`, { token: tok })).status,
    ).toBe(403);
    expect((await api(ctx, 'GET', `/v1/events/${a.ev.id}/guests`, { token: tok })).status).toBe(
      401,
    );
    expect(
      (await api(ctx, 'GET', `/v1/events/${a.ev.id}/invitations/stats`, { token: tok })).status,
    ).toBe(401);
    await api(ctx, 'DELETE', `/v1/events/${a.ev.id}/gate-links`, { token: a.t });
    expect(
      (await api(ctx, 'GET', `/v1/events/${a.ev.id}/gate/bundle`, { token: tok })).status,
    ).toBe(401);
  });
});

describe('gate bundle', () => {
  it('has no full phone numbers, supports ETag, and changes after a reissue', async () => {
    const s = await setup(3);
    const res = await ctx.app.request(`/v1/events/${s.ev.id}/gate/bundle`, {
      headers: { authorization: `Bearer ${s.t}` },
    });
    const text = await res.text();
    expect(text).not.toMatch(/\+255\d{9}/);
    expect(JSON.parse(text).guests[0]).toMatchObject({
      phoneLast4: expect.stringMatching(/^\d{4}$/),
    });
    const etag = res.headers.get('etag')!;
    const again = await ctx.app.request(`/v1/events/${s.ev.id}/gate/bundle`, {
      headers: { authorization: `Bearer ${s.t}`, 'if-none-match': etag },
    });
    expect(again.status).toBe(304);
    await api(ctx, 'POST', `/v1/guests/${s.guests[0]!.id}/reissue`, { token: s.t });
    const after = await ctx.app.request(`/v1/events/${s.ev.id}/gate/bundle`, {
      headers: { authorization: `Bearer ${s.t}`, 'if-none-match': etag },
    });
    expect(after.status).toBe(200);
  });
});

describe('gate engine, offline', () => {
  it('admits, flags duplicates, rejects forged, wrong-event and revoked cards, and finds guests by every fallback', async () => {
    const s = await setup(5);
    const other = await setup(1);
    const clock = { now: Date.parse('2027-06-01T08:00:00Z') };
    const d = await device(s, 'device-main-0001', 'gate', clock);
    d.net.online = false; // airplane mode from here on
    const [g1, g2, g3] = s.guests;

    const ok = await d.engine.scanQr(g1!.qr);
    expect(ok).toMatchObject({ kind: 'admit', via: 'qr', guest: { id: g1!.id } });
    clock.now += 5_000;
    const dup = await d.engine.scanQr(g1!.qr);
    expect(dup).toMatchObject({ kind: 'duplicate', first: { deviceId: 'device-main-0001' } });
    expect(await d.engine.scanQr(forge(g2!.qr))).toMatchObject({
      kind: 'deny',
      reason: 'tampered',
    });
    expect(await d.engine.scanQr(other.guests[0]!.qr)).toMatchObject({
      kind: 'deny',
      reason: 'wrong_event',
    });
    expect(await d.engine.scanQr('not-a-card')).toMatchObject({
      kind: 'deny',
      reason: 'malformed',
    });

    // a reissue after the bundle was downloaded is only known after the next bundle refresh
    await api(ctx, 'POST', `/v1/guests/${g3!.id}/reissue`, { token: s.t });
    d.net.online = true;
    expect(await d.engine.refreshBundle(d.api)).toBe(true);
    d.net.online = false;
    expect(await d.engine.scanQr(g3!.qr)).toMatchObject({ kind: 'deny', reason: 'revoked' });

    // fallbacks: card number, name, last four digits
    expect(await d.engine.scanCode('XX-0000')).toMatchObject({ kind: 'deny', reason: 'not_found' });
    expect(await d.engine.scanCode(g2!.shortCode.toLowerCase())).toMatchObject({
      kind: 'admit',
      via: 'code',
    });
    expect(d.engine.search('mgeni 004')[0]!.displayName).toBe('Mgeni 004');
    const last4 = (await d.store.loadBundle())!.bundle.guests.find(
      (g) => g.displayName === 'Mgeni 004',
    )!.phoneLast4!;
    expect(d.engine.search(last4).map((g) => g.displayName)).toContain('Mgeni 004');
    expect(d.engine.search(s.guests[4]!.shortCode)[0]!.displayName).toBe('Mgeni 005');
    expect(await d.engine.admitManual(s.guests[3]!.id)).toMatchObject({
      kind: 'admit',
      via: 'search',
    });
    expect(await d.engine.stats()).toMatchObject({ admitted: 3, total: 5 });
  });

  it('only committee or owner can override a duplicate, and the override is not undone by ordering', async () => {
    const s = await setup(2);
    const clock = { now: Date.parse('2027-06-01T08:00:00Z') };
    const gate = await device(s, 'device-gate-0001', 'gate', clock);
    const boss = await device(s, 'device-boss-0001', 'committee', clock);
    await gate.engine.scanQr(s.guests[0]!.qr);
    await expect(gate.engine.override(s.guests[0]!.id, 'mgeni ana wageni zaidi')).rejects.toThrow(
      /Only committee/,
    );
    await boss.engine.scanQr(s.guests[0]!.qr); // admit on the second device (offline both)
    await expect(boss.engine.override(s.guests[0]!.id, 'x')).rejects.toThrow(/reason/);
    expect(await boss.engine.override(s.guests[0]!.id, 'mgeni ana wageni zaidi')).toMatchObject({
      kind: 'admit',
    });

    await gate.engine.sync(gate.api);
    await boss.engine.sync(boss.api);
    const rows = await ctx.db.select().from(scanLog).where(eq(scanLog.eventId, s.ev.id));
    const forGuest = rows.filter((r) => r.guestId === s.guests[0]!.id);
    expect(forGuest.filter((r) => r.result === 'ok')).toHaveLength(1); // one admission
    expect(forGuest.filter((r) => r.result === 'duplicate')).toHaveLength(1);
    const override = forGuest.find((r) => r.override)!;
    expect(override).toMatchObject({ result: 'manual_ok', reason: 'mgeni ana wageni zaidi' });
  });

  it('gives the right result for 200 mixed scans in airplane mode and loses none after reconnect', async () => {
    const s = await setup(100);
    const other = await setup(1);
    const clock = { now: Date.parse('2027-06-01T08:00:00Z') };
    const d = await device(s, 'device-bulk-0001', 'gate', clock);
    d.net.online = false;

    const tally: Record<string, number> = {};
    const bump = (k: string) => (tally[k] = (tally[k] ?? 0) + 1);
    const outcomes = async (fn: () => Promise<{ kind: string; reason?: string }>) => {
      clock.now += 1_000;
      const r = await fn();
      bump(r.kind === 'deny' ? `deny:${r.reason}` : r.kind);
    };
    for (const g of s.guests.slice(0, 100)) await outcomes(() => d.engine.scanQr(g.qr)); //  100 valid
    for (const g of s.guests.slice(0, 50)) await outcomes(() => d.engine.scanQr(g.qr)); //   50 duplicates
    for (const g of s.guests.slice(0, 30)) await outcomes(() => d.engine.scanQr(forge(g.qr))); // 30 forged
    for (let i = 0; i < 10; i++) await outcomes(() => d.engine.scanQr(other.guests[0]!.qr)); // 10 wrong event
    for (let i = 0; i < 10; i++) await outcomes(() => d.engine.scanCode(`ZZ-${2000 + i}`)); // 10 unknown codes
    expect(tally).toEqual({
      admit: 100,
      duplicate: 50,
      'deny:tampered': 30,
      'deny:wrong_event': 10,
      'deny:not_found': 10,
    });
    expect(await d.engine.stats()).toMatchObject({ admitted: 100, pending: 200 });

    // still offline: sync fails, nothing is lost, and the retry waits (5 s, then 10 s, …)
    const failed = await d.engine.sync(d.api);
    expect(failed.error).toBeTruthy();
    expect(failed.pending).toBe(200);
    expect(await d.engine.syncIfDue(d.api)).toBeNull();
    clock.now += 6_000;
    expect((await d.engine.syncIfDue(d.api))?.error).toBeTruthy();
    expect(d.engine.backoffUntil - clock.now).toBeGreaterThanOrEqual(9_000); // doubled

    d.net.online = true;
    clock.now += 11_000;
    expect(await d.engine.syncIfDue(d.api)).toMatchObject({ sent: 200, pending: 0 });
    const n = await countScans(s.ev.id);
    expect(n).toBe(200); // the server log matches the device: zero lost scans
    const byResult = await ctx.db
      .select({ r: scanLog.result, n: count() })
      .from(scanLog)
      .where(eq(scanLog.eventId, s.ev.id))
      .groupBy(scanLog.result);
    expect(Object.fromEntries(byResult.map((x) => [x.r, x.n]))).toEqual({
      ok: 100,
      duplicate: 50,
      invalid_sig: 30,
      wrong_event: 10,
      not_found: 10,
    });
    // a second sync (e.g. a lost response) is harmless
    const resend = await d.api.sync(
      'device-bulk-0001',
      (await d.store.scans()).slice(0, 5).map((x) => ({ ...x, synced: false })),
    );
    expect(resend).toMatchObject({ accepted: 0, replayed: 5 });
    const after = await countScans(s.ev.id);
    expect(after).toBe(200);
  }, 120_000);

  it('two devices scanning the same guest offline give one admit and one duplicate; the earliest scan wins', async () => {
    const s = await setup(2);
    const clockA = { now: Date.parse('2027-06-01T08:00:10Z') }; // A scans later
    const clockB = { now: Date.parse('2027-06-01T08:00:05Z') }; // B scanned first
    const A = await device(s, 'device-aaaa-0001', 'gate', clockA);
    const B = await device(s, 'device-bbbb-0001', 'gate', clockB);
    A.net.online = false;
    B.net.online = false;
    const g = s.guests[0]!;
    expect(await A.engine.scanQr(g.qr)).toMatchObject({ kind: 'admit' }); // both think they are first
    expect(await B.engine.scanQr(g.qr)).toMatchObject({ kind: 'admit' });

    A.net.online = true;
    await A.engine.sync(A.api); // A syncs first, even though B scanned earlier
    B.net.online = true;
    await B.engine.sync(B.api);
    await A.engine.sync(A.api); // pulls the corrected admissions

    const rows = await ctx.db.select().from(scanLog).where(eq(scanLog.guestId, g.id));
    const ok = rows.filter((r) => r.result === 'ok');
    const dup = rows.filter((r) => r.result === 'duplicate');
    expect(ok).toHaveLength(1);
    expect(dup).toHaveLength(1);
    expect(ok[0]!.deviceId).toBe('device-bbbb-0001'); // earliest scanned_at wins
    expect(dup[0]!.deviceId).toBe('device-aaaa-0001');
    // the loser's own record is corrected after its next sync, and a new scan shows who was first
    expect((await A.store.scans()).find((x) => x.guestId === g.id)!.result).toBe('duplicate');
    const again = await A.engine.scanQr(g.qr);
    expect(again).toMatchObject({ kind: 'duplicate', first: { deviceId: 'device-bbbb-0001' } });
    // the invitation is now checked in
    const stats = (await api(ctx, 'GET', `/v1/events/${s.ev.id}/invitations/stats`, { token: s.t }))
      .body!;
    expect(stats.byStatus.checked_in).toBe(1);
  });

  it('does not let a gate agent write scans for another event or for unknown guests', async () => {
    const a = await setup(1);
    const b = await setup(1);
    const res = await api(ctx, 'POST', `/v1/events/${a.ev.id}/gate/scans/sync`, {
      token: a.t,
      body: {
        deviceId: 'device-xxxx-0001',
        scans: [
          {
            clientId: 'client-0000001',
            guestId: b.guests[0]!.id,
            result: 'ok',
            partyAdmitted: 1,
            scannedAt: '2027-06-01T08:00:00Z',
            offline: true,
          },
        ],
      },
    });
    expect(res.status).toBe(200);
    const rows = await ctx.db.select().from(scanLog).where(eq(scanLog.eventId, a.ev.id));
    expect(rows[0]!.guestId).toBeNull(); // a guest from another event is dropped, not linked
  });
});
