import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { eventMembers, eventPurchases, events, memories, newId } from '@harusi/db';
import {
  api,
  createTestContext,
  loginAs,
  loginAsStaff,
  type TestContext,
} from './testing/test-app';

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(() => ctx.close());

let seq = 0;
async function setup() {
  const phone = `07881${String(++seq).padStart(5, '0')}`;
  const owner = await loginAs(ctx, phone);
  const t = owner.accessToken;
  const ev = (
    await api(ctx, 'POST', '/v1/events', {
      token: t,
      body: { title: 'Harusi', coupleNames: 'Asha & Juma', dateStart: '2027-06-01T10:00:00+03:00' },
    })
  ).body!;
  const g = (
    await api(ctx, 'POST', `/v1/events/${ev.id}/guests`, {
      token: t,
      body: { displayName: 'Bibi Pendo', phone: `0714${String(500000 + seq)}`, language: 'sw' },
    })
  ).body! as { id: string; cardToken: string };
  return { t, owner, evId: ev.id as string, g };
}

describe('memories schema', () => {
  it('new events have the page on with a limit of 30, and no memories', async () => {
    const { evId } = await setup();
    const [e] = await ctx.db.select().from(events).where(eq(events.id, evId));
    expect(e).toMatchObject({ memoriesEnabled: true, memoriesLimit: 30 });
    expect(await ctx.db.select().from(memories).where(eq(memories.eventId, evId))).toEqual([]);
  });
});

async function photo(color = '#B8893B') {
  return new Uint8Array(
    await sharp({ create: { width: 64, height: 48, channels: 3, background: color } })
      .jpeg()
      .toBuffer(),
  );
}

async function pay(
  evId: string,
  kind: 'cards' | 'pack' | 'grant' = 'cards',
  status: 'paid' | 'pending' = 'paid',
) {
  await ctx.db.insert(eventPurchases).values({
    id: newId(),
    eventId: evId,
    kind,
    label: 'test',
    cards: kind === 'pack' ? 0 : 100,
    messages: 400,
    amount: 220_000,
    currency: 'TZS',
    status,
    method: kind === 'grant' ? 'grant' : 'manual',
  });
}

function upload(t: string, evId: string, bytes: Uint8Array, fields: Record<string, string> = {}) {
  const form = new FormData();
  form.set('photo', new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' }), 'p.jpg');
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  return ctx.app.request(`/v1/events/${evId}/memories`, {
    method: 'POST',
    headers: { authorization: `Bearer ${t}` },
    body: form,
  });
}

describe('unlocking', () => {
  it('only a paid card order unlocks; packs, grants and pending orders do not', async () => {
    const { t, evId } = await setup();
    const unlocked = async () =>
      (await api(ctx, 'GET', `/v1/events/${evId}/memories`, { token: t })).body!.unlocked;
    expect(await unlocked()).toBe(false);
    await pay(evId, 'pack');
    await pay(evId, 'grant');
    await pay(evId, 'cards', 'pending');
    expect(await unlocked()).toBe(false);
    const res = await upload(t, evId, await photo());
    expect(res.status).toBe(402);
    expect((await res.json()).error.details).toMatchObject({
      reason: 'feature_locked',
      feature: 'memories',
    });
    await pay(evId, 'cards');
    expect(await unlocked()).toBe(true);
  });
});

describe('adding and editing memories', () => {
  it('stores both sizes, returns the memory, and lists by date then order', async () => {
    const { t, evId } = await setup();
    await pay(evId);
    const a = await upload(t, evId, await photo(), {
      caption: 'Tulipokutana',
      takenOn: '2019-03-02',
    });
    expect(a.status).toBe(201);
    const m = await a.json();
    expect(m).toMatchObject({
      caption: 'Tulipokutana',
      takenOn: '2019-03-02',
      width: 64,
      height: 48,
    });
    expect(ctx.photos.files.has(`events/${evId}/${m.id}.webp`)).toBe(true);
    expect(ctx.photos.files.has(`events/${evId}/${m.id}.thumb.webp`)).toBe(true);
    await upload(t, evId, await photo(), { caption: 'Bila tarehe' });
    await upload(t, evId, await photo(), { caption: 'Mapema', takenOn: '2018-01-01' });
    const list = (await api(ctx, 'GET', `/v1/events/${evId}/memories`, { token: t })).body!;
    expect(list.memories.map((x: { caption: string }) => x.caption)).toEqual([
      'Mapema',
      'Tulipokutana',
      'Bila tarehe',
    ]);
    expect(list).toMatchObject({ unlocked: true, enabled: true, limit: 30, count: 3 });
    const thumb = await ctx.app.request(`/v1/events/${evId}/memories/${m.id}/thumb`, {
      headers: { authorization: `Bearer ${t}` },
    });
    expect(thumb.status).toBe(200);
    expect(thumb.headers.get('content-type')).toBe('image/webp');
  });

  it('refuses a photo past the limit, and allows it after the limit is raised', async () => {
    const { t, evId } = await setup();
    await pay(evId);
    await ctx.db.update(events).set({ memoriesLimit: 2 }).where(eq(events.id, evId));
    expect((await upload(t, evId, await photo())).status).toBe(201);
    expect((await upload(t, evId, await photo())).status).toBe(201);
    const third = await upload(t, evId, await photo());
    expect(third.status).toBe(402);
    expect((await third.json()).error.details).toMatchObject({
      reason: 'quota_exceeded',
      resource: 'memories',
      remaining: 0,
      needed: 1,
    });
    await ctx.db.update(events).set({ memoriesLimit: 3 }).where(eq(events.id, evId));
    expect((await upload(t, evId, await photo())).status).toBe(201);
  });

  it('validates caption length, date and the file, and stores nothing on error', async () => {
    const { t, evId } = await setup();
    await pay(evId);
    expect((await upload(t, evId, await photo(), { caption: 'x'.repeat(141) })).status).toBe(400);
    expect((await upload(t, evId, await photo(), { takenOn: '2019-13-40' })).status).toBe(400);
    const bad = await upload(t, evId, new TextEncoder().encode('hello'));
    expect(bad.status).toBe(400);
    expect((await bad.json()).error.details.reason).toBe('invalid_image');
    const list = (await api(ctx, 'GET', `/v1/events/${evId}/memories`, { token: t })).body!;
    expect(list.count).toBe(0);
    expect([...ctx.photos.files.keys()].some((k) => k.startsWith(`events/${evId}/`))).toBe(false);
  });

  it('edits and deletes; deleting removes both files', async () => {
    const { t, evId } = await setup();
    await pay(evId);
    const m = await (await upload(t, evId, await photo())).json();
    const edited = await api(ctx, 'PATCH', `/v1/memories/${m.id}`, {
      token: t,
      body: { caption: 'Harusi ya dada', takenOn: '2021-08-14', sortOrder: 5 },
    });
    expect(edited.body).toMatchObject({
      caption: 'Harusi ya dada',
      takenOn: '2021-08-14',
      sortOrder: 5,
    });
    expect((await api(ctx, 'DELETE', `/v1/memories/${m.id}`, { token: t })).status).toBe(204);
    expect(ctx.photos.files.has(`events/${evId}/${m.id}.webp`)).toBe(false);
    expect(ctx.photos.files.has(`events/${evId}/${m.id}.thumb.webp`)).toBe(false);
  });

  it('committee can upload; gate gets 403; strangers get 404', async () => {
    const { t, evId } = await setup();
    await pay(evId);
    const committee = await loginAs(ctx, `07882${String(++seq).padStart(5, '0')}`);
    const gate = await loginAs(ctx, `07882${String(++seq).padStart(5, '0')}`);
    const stranger = await loginAs(ctx, `07882${String(++seq).padStart(5, '0')}`);
    await ctx.db.insert(eventMembers).values([
      { eventId: evId, userId: committee.user.id, role: 'committee' },
      { eventId: evId, userId: gate.user.id, role: 'gate' },
    ]);
    expect((await upload(committee.accessToken, evId, await photo())).status).toBe(201);
    expect((await upload(gate.accessToken, evId, await photo())).status).toBe(403);
    expect((await upload(stranger.accessToken, evId, await photo())).status).toBe(404);
    expect(
      (await api(ctx, 'GET', `/v1/events/${evId}/memories`, { token: gate.accessToken })).status,
    ).toBe(403);
    const m = await (await upload(t, evId, await photo())).json();
    expect(
      (await api(ctx, 'DELETE', `/v1/memories/${m.id}`, { token: gate.accessToken })).status,
    ).toBe(403);
  });
});

describe('the guest page', () => {
  async function withMemory() {
    const s = await setup();
    await pay(s.evId);
    const m = await (await upload(s.t, s.evId, await photo(), { caption: 'Tulipokutana' })).json();
    return { ...s, m };
  }

  it('shows the memories to the guest by card token, and serves the photos', async () => {
    const { g, m } = await withMemory();
    const r = await api(ctx, 'GET', `/v1/c/${g.cardToken}/memories`);
    expect(r.status).toBe(200);
    expect(r.body!.memories).toEqual([
      expect.objectContaining({ id: m.id, caption: 'Tulipokutana' }),
    ]);
    expect(r.body!.card.event.coupleNames).toBe('Asha & Juma');
    expect(r.body!.card.pledge).toBeNull();
    expect(JSON.stringify(r.body)).not.toContain('.webp'); // no storage keys leak
    const img = await ctx.app.request(`/v1/c/${g.cardToken}/memories/${m.id}/thumb`);
    expect(img.status).toBe(200);
    expect(img.headers.get('content-type')).toBe('image/webp');
    expect(img.headers.get('cache-control')).toBe('private, max-age=86400');
    expect((await api(ctx, 'GET', `/v1/c/${g.cardToken}`)).body!.memoriesAvailable).toBe(true);
  });

  it("a guest of another event cannot fetch this event's photo", async () => {
    const { m } = await withMemory();
    const other = await withMemory();
    const img = await ctx.app.request(`/v1/c/${other.g.cardToken}/memories/${m.id}/full`);
    expect(img.status).toBe(404);
  });

  it('a reissued card is refused; a made-up token is not found', async () => {
    const { t, g } = await withMemory();
    expect((await api(ctx, 'POST', `/v1/guests/${g.id}/reissue`, { token: t })).status).toBe(200);
    const old = await api(ctx, 'GET', `/v1/c/${g.cardToken}/memories`);
    expect(old.status).toBe(409);
    expect(old.body!.error.details.reason).toBe('reissued');
    expect((await api(ctx, 'GET', '/v1/c/not-a-real-token-at-all/memories')).status).toBe(404);
  });

  it('is unavailable when switched off, locked, or empty', async () => {
    const { t, evId, g } = await withMemory();
    const off = await api(ctx, 'PATCH', `/v1/events/${evId}`, {
      token: t,
      body: { memoriesEnabled: false },
    });
    expect(off.body!.memoriesEnabled).toBe(false);
    const hidden = await api(ctx, 'GET', `/v1/c/${g.cardToken}/memories`);
    expect(hidden.status).toBe(404);
    expect(hidden.body!.error.details.reason).toBe('memories_unavailable');
    expect((await api(ctx, 'GET', `/v1/c/${g.cardToken}`)).body!.memoriesAvailable).toBe(false);

    const locked = await setup();
    const r = await api(ctx, 'GET', `/v1/c/${locked.g.cardToken}/memories`);
    expect(r.body!.error.details.reason).toBe('memories_unavailable');

    const empty = await setup();
    await pay(empty.evId);
    const e = await api(ctx, 'GET', `/v1/c/${empty.g.cardToken}/memories`);
    expect(e.body!.error.details.reason).toBe('memories_unavailable');
  });
});

describe('deletion and the staff limit', () => {
  it('deleting the event removes its memories and files', async () => {
    const { t, evId } = await setup();
    await pay(evId);
    const m = await (await upload(t, evId, await photo())).json();
    expect((await api(ctx, 'DELETE', `/v1/events/${evId}`, { token: t })).status).toBe(204);
    expect(await ctx.db.select().from(memories).where(eq(memories.eventId, evId))).toEqual([]);
    expect(ctx.photos.files.has(`events/${evId}/${m.id}.webp`)).toBe(false);
    expect(ctx.photos.files.has(`events/${evId}/${m.id}.thumb.webp`)).toBe(false);
  });

  it('staff with the plan permission change the limit, with a reason', async () => {
    const { evId } = await setup();
    const billing = await loginAsStaff(ctx, '0746100001', 'billing');
    const noReason = await api(ctx, 'PATCH', `/v1/ops/events/${evId}/memories-limit`, {
      token: billing.accessToken,
      body: { limit: 60, note: '' },
    });
    expect(noReason.status).toBe(400);
    const ok = await api(ctx, 'PATCH', `/v1/ops/events/${evId}/memories-limit`, {
      token: billing.accessToken,
      body: { limit: 60, note: 'Mteja aliomba' },
    });
    expect(ok.body).toEqual({ limit: 60 });
    const [e] = await ctx.db.select().from(events).where(eq(events.id, evId));
    expect(e!.memoriesLimit).toBe(60);
    const support = await loginAsStaff(ctx, '0746100002', 'support');
    const denied = await api(ctx, 'PATCH', `/v1/ops/events/${evId}/memories-limit`, {
      token: support.accessToken,
      body: { limit: 90, note: 'jaribio' },
    });
    expect(denied.status).toBe(403);
  });
});
