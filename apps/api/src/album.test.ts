import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { eq } from 'drizzle-orm';
import { eventPhotos } from '@harusi/db';
import { AlbumService } from './services/album';
import { EventService } from './services/events';
import { api, createTestContext, loginAs, type TestContext } from './testing/test-app';

let ctx: TestContext;
let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'album-'));
  ctx = await createTestContext({ env: { APP_FILES_DIR: dir } });
});
afterAll(async () => {
  await ctx.close();
  await rm(dir, { recursive: true, force: true });
});

/** A phone-camera-like photo: big, noisy (so it does not compress to nothing), turned by EXIF. */
async function cameraJpeg(width = 4000, height = 3000, orientation = 6) {
  const noise = Buffer.alloc(width * height * 3);
  for (let i = 0; i < noise.length; i++) noise[i] = (i * 2654435761) >>> 24;
  return sharp(noise, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 95 })
    .withMetadata({ orientation })
    .toBuffer();
}

async function upload(path: string, bytes: Uint8Array, token?: string) {
  const res = await ctx.app.request(path, {
    method: 'POST',
    headers: {
      'content-type': 'application/octet-stream',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: new Blob([new Uint8Array(bytes)]),
  });
  // Test helper: bodies are asserted structurally, so they are typed loosely on purpose.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { status: res.status, body: (await res.json()) as Record<string, any> };
}

async function setup(phone: string, event: Record<string, unknown> = {}) {
  const owner = await loginAs(ctx, phone);
  const t = owner.accessToken;
  const ev = (
    await api(ctx, 'POST', '/v1/events', {
      token: t,
      body: {
        title: 'Harusi',
        coupleNames: 'Asha & Juma',
        dateStart: '2026-10-20T10:00:00+03:00',
        ...event,
      },
    })
  ).body!;
  const guest = async (name: string, phone: string) =>
    (
      await api(ctx, 'POST', `/v1/events/${ev.id}/guests`, {
        token: t,
        body: { displayName: name, phone },
      })
    ).body!;
  const g = await guest('Bibi Pendo Mussa', `07120${phone.slice(-5)}`);
  return { ev, g, t, guest };
}

describe('temporary photo album', () => {
  it('is off until the owner turns it on', async () => {
    const { ev, g, t } = await setup('0745000001');
    expect((await api(ctx, 'GET', `/v1/c/${g.cardToken}`)).body?.album).toBeNull();
    expect((await api(ctx, 'GET', `/v1/c/${g.cardToken}/album`)).status).toBe(404);
    const album = await api(ctx, 'GET', `/v1/events/${ev.id}/album`, { token: t });
    expect(album.body).toMatchObject({ enabled: false, open: false, canUpload: false });
  });

  it('compresses a guest photo: upright, at most 2048 px, WebP, no metadata, much smaller', async () => {
    const { ev, g, t } = await setup('0745000002');
    await api(ctx, 'PATCH', `/v1/events/${ev.id}`, {
      token: t,
      body: { albumEnabled: true, albumKeepDays: 7 },
    });
    const card = await api(ctx, 'GET', `/v1/c/${g.cardToken}`);
    expect(card.body?.album).toMatchObject({ open: true, guestUploads: true });

    const original = await cameraJpeg();
    const up = await upload(
      `/v1/c/${g.cardToken}/album/photos?caption=Siku%20ya%20furaha`,
      original,
    );
    expect(up.status).toBe(201);
    // EXIF orientation 6 turns a 4000×3000 sensor image into a portrait photo.
    expect(up.body).toMatchObject({
      width: 1536,
      height: 2048,
      caption: 'Siku ya furaha',
      mine: true,
    });

    const res = await ctx.app.request(up.body.url as string);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/webp');
    expect(res.headers.get('cross-origin-resource-policy')).toBe('cross-origin');
    const stored = Buffer.from(await res.arrayBuffer());
    const meta = await sharp(stored).metadata();
    expect(meta).toMatchObject({ format: 'webp', width: 1536, height: 2048 });
    expect(meta.exif).toBeUndefined();
    expect(meta.orientation).toBeUndefined();
    expect(stored.length).toBeLessThan(original.length / 2);

    const thumb = await ctx.app.request(up.body.thumbUrl as string);
    const tm = await sharp(Buffer.from(await thumb.arrayBuffer())).metadata();
    expect(Math.max(tm.width!, tm.height!)).toBe(480);

    // The console sees the full name and the space saved; another guest sees a first name only.
    const member = await api(ctx, 'GET', `/v1/events/${ev.id}/album`, { token: t });
    expect(member.body?.photos[0].uploaderName).toBe('Bibi Pendo Mussa');
    expect(member.body?.stats.originalBytes).toBe(original.length);
    expect(member.body?.stats.bytes).toBeLessThan(original.length);
    const guestView = await api(ctx, 'GET', `/v1/c/${g.cardToken}/album`);
    expect(guestView.body?.photos[0]).toMatchObject({ uploaderName: 'Bibi', mine: true });
  });

  it('never enlarges a small photo', async () => {
    const { ev, g, t } = await setup('0745000003');
    await api(ctx, 'PATCH', `/v1/events/${ev.id}`, { token: t, body: { albumEnabled: true } });
    const small = await sharp({
      create: { width: 640, height: 480, channels: 3, background: '#0F5C4D' },
    })
      .png()
      .toBuffer();
    const up = await upload(`/v1/c/${g.cardToken}/album/photos`, small);
    expect(up.body).toMatchObject({ width: 640, height: 480 });
  });

  it('refuses files that are not photos and links that were tampered with', async () => {
    const { ev, g, t } = await setup('0745000004');
    await api(ctx, 'PATCH', `/v1/events/${ev.id}`, { token: t, body: { albumEnabled: true } });
    const bad = await upload(`/v1/c/${g.cardToken}/album/photos`, Buffer.from('<svg></svg>'));
    expect(bad.status).toBe(400);
    expect(bad.body).toMatchObject({ error: { details: { reason: 'album.not_image' } } });

    const up = await upload(`/v1/events/${ev.id}/album/photos`, await cameraJpeg(800, 600, 1), t);
    expect(up.status).toBe(201);
    const url = up.body.url as string;
    expect((await ctx.app.request(url.replace(/k=.{4}/, 'k=AAAA'))).status).toBe(404);
    expect((await ctx.app.request(url.replace('s=full', 's=thumb'))).status).toBe(404);
  });

  it('lets a guest delete only their own photo, and the owner turn guest uploads off', async () => {
    const { ev, g, t, guest } = await setup('0745000005');
    const other = await guest('Mzee Hamisi', '0712999888');
    await api(ctx, 'PATCH', `/v1/events/${ev.id}`, { token: t, body: { albumEnabled: true } });
    const jpeg = await cameraJpeg(600, 400, 1);
    const mine = await upload(`/v1/c/${g.cardToken}/album/photos`, jpeg);
    const del = (token: string, id: string) =>
      api(ctx, 'DELETE', `/v1/c/${token}/album/photos/${id}`);
    expect((await del(other.cardToken, mine.body.id)).status).toBe(404);
    expect((await del(g.cardToken, mine.body.id)).status).toBe(200);

    await api(ctx, 'PATCH', `/v1/events/${ev.id}`, {
      token: t,
      body: { albumGuestUploads: false },
    });
    const view = await api(ctx, 'GET', `/v1/c/${g.cardToken}/album`);
    expect(view.body).toMatchObject({ open: true, canUpload: false });
    expect((await upload(`/v1/c/${g.cardToken}/album/photos`, jpeg)).status).toBe(403);
    // members still can, and the owner can take any photo down
    const byOwner = await upload(`/v1/events/${ev.id}/album/photos`, jpeg, t);
    expect(byOwner.status).toBe(201);
    expect(
      (
        await api(ctx, 'DELETE', `/v1/events/${ev.id}/album/photos/${byOwner.body.id}`, {
          token: t,
        })
      ).status,
    ).toBe(200);
  });

  it('closes after the event and the purge deletes every photo and file', async () => {
    const { ev, g, t } = await setup('0745000006');
    await api(ctx, 'PATCH', `/v1/events/${ev.id}`, {
      token: t,
      body: { albumEnabled: true, albumKeepDays: 1 },
    });
    const jpeg = await cameraJpeg(600, 400, 1);
    const up = await upload(`/v1/c/${g.cardToken}/album/photos`, jpeg);
    expect(up.status).toBe(201);
    expect(await readdir(join(dir, 'albums', ev.id))).toHaveLength(2);

    const album = new AlbumService(ctx.deps, new EventService(ctx.deps));
    expect(await album.purgeExpired()).toEqual({ events: 0, photos: 0 });

    const before = ctx.clock.now;
    ctx.clock.now = Date.parse('2026-10-21T10:00:01+03:00'); // one day after the event
    try {
      const view = await api(ctx, 'GET', `/v1/c/${g.cardToken}/album`);
      expect(view.body).toMatchObject({ open: false, canUpload: false, photos: [] });
      const late = await upload(`/v1/c/${g.cardToken}/album/photos`, jpeg);
      expect(late.status).toBe(409);
      expect((await ctx.app.request(up.body.url as string)).status).toBe(404);

      const purged = await album.purgeExpired();
      expect(purged.photos).toBeGreaterThanOrEqual(1);
      // (the owner's access token has expired by now, so look in the table directly)
      const left = await ctx.db.select().from(eventPhotos).where(eq(eventPhotos.eventId, ev.id));
      expect(left).toEqual([]);
      await expect(readdir(join(dir, 'albums', ev.id))).rejects.toThrow();
    } finally {
      ctx.clock.now = before;
    }
  });

  it('lets only the owner empty the album at once', async () => {
    const { ev, g, t } = await setup('0745000007');
    await api(ctx, 'PATCH', `/v1/events/${ev.id}`, { token: t, body: { albumEnabled: true } });
    await upload(`/v1/c/${g.cardToken}/album/photos`, await cameraJpeg(600, 400, 1));
    const cleared = await api(ctx, 'DELETE', `/v1/events/${ev.id}/album`, { token: t });
    expect(cleared.body).toEqual({ removed: 1 });
    expect((await api(ctx, 'GET', `/v1/c/${g.cardToken}/album`)).body?.photos).toEqual([]);
  });
});
