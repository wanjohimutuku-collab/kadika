import { createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { and, asc, count, eq, isNotNull, isNull, lt, or, sql } from 'drizzle-orm';
import sharp, { type Metadata } from 'sharp';
import { eventPhotos, events, guests, invitations, newId, users } from '@harusi/db';
import { hashGuestToken } from '@harusi/crypto';
import type { Deps } from '../context';
import { ApiError } from '../errors';
import { recordAudit } from './audit';
import type { EventService } from './events';

const DAY_MS = 86_400_000;
/** Biggest file a phone may send; anything larger is refused before it is decoded. */
export const MAX_UPLOAD_BYTES = 15_000_000;
/** Refuses decompression bombs: a 15 MB file can still claim a gigantic canvas. */
const MAX_INPUT_PIXELS = 60_000_000;
const MAX_PHOTOS_PER_EVENT = 500;
const MAX_PHOTOS_PER_GUEST = 20;
/** Display size: sharp on a phone held at arm's length and on a laptop, yet ~200–500 KB. */
const DISPLAY_EDGE = 2048;
const DISPLAY_QUALITY = 82;
const THUMB_EDGE = 480;
const THUMB_QUALITY = 72;
const DECODABLE = new Set(['jpeg', 'png', 'webp', 'avif', 'heif', 'tiff']);

export type PhotoSize = 'full' | 'thumb';

export interface CompressedPhoto {
  display: Buffer;
  thumb: Buffer;
  width: number;
  height: number;
}

/**
 * Compresses one uploaded photo (ADR 050). It is turned upright from its EXIF orientation, converted to
 * sRGB and stripped of all metadata (so no GPS position leaks), scaled down to fit 2048 px and saved as
 * WebP. A light unsharp mask after downscaling keeps faces and text crisp; images already small are
 * never enlarged or sharpened.
 */
export async function compressPhoto(bytes: Uint8Array): Promise<CompressedPhoto> {
  const input = Buffer.from(bytes);
  let meta: Metadata | undefined;
  try {
    meta = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
  } catch {
    meta = undefined;
  }
  if (!meta?.format || !DECODABLE.has(meta.format))
    throw new ApiError('validation', 'This file is not a photo', {
      field: 'file',
      reason: 'album.not_image',
    });
  const base = () =>
    sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' })
      .rotate()
      .toColourspace('srgb');
  try {
    const shrinks = Math.max(meta.width ?? 0, meta.height ?? 0) > DISPLAY_EDGE;
    let display = base().resize({
      width: DISPLAY_EDGE,
      height: DISPLAY_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    });
    if (shrinks) display = display.sharpen({ sigma: 0.6, m1: 0.5, m2: 1.5 });
    const full = await display
      .webp({ quality: DISPLAY_QUALITY, smartSubsample: true, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    const thumb = await base()
      .resize({ width: THUMB_EDGE, height: THUMB_EDGE, fit: 'inside', withoutEnlargement: true })
      .sharpen({ sigma: 0.5 })
      .webp({ quality: THUMB_QUALITY, smartSubsample: true, effort: 4 })
      .toBuffer();
    return { display: full.data, thumb, width: full.info.width, height: full.info.height };
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError('validation', 'This photo could not be read', {
      field: 'file',
      reason: 'album.unreadable',
    });
  }
}

export interface AlbumPhotoView {
  id: string;
  uploaderName: string;
  caption: string | null;
  width: number;
  height: number;
  createdAt: Date;
  /** Signed links that work until the album closes; `<img>` cannot send a bearer token. */
  url: string;
  thumbUrl: string;
  /** The guest's own photo (guest view), which they may delete. */
  mine?: boolean;
}

export interface AlbumView {
  enabled: boolean;
  guestUploads: boolean;
  keepDays: number;
  /** When the photos are deleted for good. */
  closesAt: Date;
  /** Enabled and not yet closed: photos can be seen and added. */
  open: boolean;
  /** Whether this caller may add a photo now. */
  canUpload: boolean;
  photos: AlbumPhotoView[];
  /** Totals for the console: how much space the album uses after compression. */
  stats?: { count: number; bytes: number; originalBytes: number };
}

type EventRow = typeof events.$inferSelect;
type PhotoRow = typeof eventPhotos.$inferSelect;

export function albumClosesAt(e: Pick<EventRow, 'dateStart' | 'albumKeepDays'>): Date {
  return new Date(e.dateStart.getTime() + e.albumKeepDays * DAY_MS);
}

/**
 * The event's temporary photo album (ADR 050). Members (owner, committee) see and add photos from the
 * console, guests from their card when the owner allows it. Everything is deleted once the album
 * closes, `album_keep_days` after the event date, or when the event is deleted.
 */
export class AlbumService {
  constructor(
    private deps: Deps,
    private eventsSvc: EventService,
  ) {}

  private get root() {
    return resolve(this.deps.config.appFilesDir ?? 'data/app-files', 'albums');
  }

  private dirOf(eventId: string) {
    return join(this.root, eventId);
  }

  private pathOf(eventId: string, photoId: string, size: PhotoSize) {
    return join(this.dirOf(eventId), size === 'thumb' ? `${photoId}.t.webp` : `${photoId}.webp`);
  }

  private sign(photoId: string, size: PhotoSize, exp: number) {
    return createHmac('sha256', this.deps.config.jwtSecret)
      .update(`album|${photoId}|${size}|${exp}`)
      .digest('base64url')
      .slice(0, 32);
  }

  /** API-relative link; the client puts its API base in front. */
  private link(photoId: string, size: PhotoSize, closesAt: Date) {
    const exp = Math.floor(closesAt.getTime() / 1000);
    return `/v1/album-photos/${photoId}?s=${size}&e=${exp}&k=${this.sign(photoId, size, exp)}`;
  }

  private isOpen(e: EventRow) {
    return e.albumEnabled && !e.deletedAt && this.deps.now() < albumClosesAt(e);
  }

  private async photos(eventId: string) {
    return this.deps.db
      .select()
      .from(eventPhotos)
      .where(eq(eventPhotos.eventId, eventId))
      .orderBy(asc(eventPhotos.createdAt));
  }

  private photoView(p: PhotoRow, closesAt: Date): AlbumPhotoView {
    return {
      id: p.id,
      uploaderName: p.uploaderName,
      caption: p.caption,
      width: p.width,
      height: p.height,
      createdAt: p.createdAt,
      url: this.link(p.id, 'full', closesAt),
      thumbUrl: this.link(p.id, 'thumb', closesAt),
    };
  }

  private async eventOf(eventId: string) {
    const [e] = await this.deps.db.select().from(events).where(eq(events.id, eventId));
    if (!e) throw new ApiError('not_found', 'Event not found');
    return e;
  }

  /** Owner and committee only: gate agents never see the album (§17.3). */
  private async memberRole(eventId: string, userId: string) {
    const role = await this.eventsSvc.role(eventId, userId);
    if (role === 'gate') throw new ApiError('forbidden', 'Gate agents cannot open the album');
    return role;
  }

  private async byToken(token: string) {
    const [row] = await this.deps.db
      .select({ guest: guests, event: events })
      .from(invitations)
      .innerJoin(guests, eq(guests.id, invitations.guestId))
      .innerJoin(events, eq(events.id, guests.eventId))
      .where(
        and(
          eq(invitations.tokenHash, hashGuestToken(token)),
          isNull(guests.deletedAt),
          isNull(events.deletedAt),
        ),
      );
    if (!row) throw new ApiError('not_found', 'Invalid link');
    return row;
  }

  async forMember(eventId: string, userId: string): Promise<AlbumView> {
    await this.memberRole(eventId, userId);
    const e = await this.eventOf(eventId);
    const closesAt = albumClosesAt(e);
    const rows = await this.photos(eventId);
    return {
      enabled: e.albumEnabled,
      guestUploads: e.albumGuestUploads,
      keepDays: e.albumKeepDays,
      closesAt,
      open: this.isOpen(e),
      canUpload: this.isOpen(e) && rows.length < MAX_PHOTOS_PER_EVENT,
      photos: rows.map((p) => this.photoView(p, closesAt)),
      stats: {
        count: rows.length,
        bytes: rows.reduce((t, p) => t + p.bytes + p.thumbBytes, 0),
        originalBytes: rows.reduce((t, p) => t + p.originalBytes, 0),
      },
    };
  }

  /** The card's album page. A guest sees only first names of other uploaders. */
  async forGuest(token: string): Promise<AlbumView> {
    const { guest, event: e } = await this.byToken(token);
    if (!e.albumEnabled) throw new ApiError('not_found', 'No album for this event');
    const closesAt = albumClosesAt(e);
    const open = this.isOpen(e);
    const rows = open ? await this.photos(e.id) : [];
    const mine = rows.filter((p) => p.guestId === guest.id).length;
    return {
      enabled: true,
      guestUploads: e.albumGuestUploads,
      keepDays: e.albumKeepDays,
      closesAt,
      open,
      canUpload:
        open &&
        e.albumGuestUploads &&
        mine < MAX_PHOTOS_PER_GUEST &&
        rows.length < MAX_PHOTOS_PER_EVENT,
      photos: rows.map((p) => ({
        ...this.photoView(p, closesAt),
        uploaderName: p.uploaderName.trim().split(/\s+/)[0] ?? '',
        mine: p.guestId === guest.id,
      })),
    };
  }

  private async store(
    e: EventRow,
    by: { userId: string | null; guestId: string | null; name: string },
    bytes: Uint8Array,
    caption: string | null,
  ): Promise<PhotoRow> {
    if (bytes.length === 0)
      throw new ApiError('validation', 'No photo was sent', { field: 'file' });
    if (bytes.length > MAX_UPLOAD_BYTES)
      throw new ApiError('validation', 'The photo is larger than 15 MB', {
        field: 'file',
        reason: 'album.too_large',
      });
    const [{ n } = { n: 0 }] = await this.deps.db
      .select({ n: count() })
      .from(eventPhotos)
      .where(eq(eventPhotos.eventId, e.id));
    if (n >= MAX_PHOTOS_PER_EVENT)
      throw new ApiError('conflict', 'The album is full', { reason: 'album.full' });
    const photo = await compressPhoto(bytes);
    const id = newId();
    await mkdir(this.dirOf(e.id), { recursive: true });
    // Written under a temporary name and renamed, so a reader never sees half a file.
    for (const [size, data] of [
      ['full', photo.display],
      ['thumb', photo.thumb],
    ] as const) {
      const final = this.pathOf(e.id, id, size);
      await writeFile(`${final}.tmp`, data);
      await rename(`${final}.tmp`, final);
    }
    const [row] = await this.deps.db
      .insert(eventPhotos)
      .values({
        id,
        eventId: e.id,
        userId: by.userId,
        guestId: by.guestId,
        uploaderName: by.name,
        caption: caption?.trim() || null,
        width: photo.width,
        height: photo.height,
        bytes: photo.display.length,
        thumbBytes: photo.thumb.length,
        originalBytes: bytes.length,
      })
      .returning();
    return row!;
  }

  async addByMember(eventId: string, userId: string, bytes: Uint8Array, caption: string | null) {
    await this.memberRole(eventId, userId);
    const e = await this.eventOf(eventId);
    if (!this.isOpen(e))
      throw new ApiError('conflict', 'The album is closed', { reason: 'album.closed' });
    const [u] = await this.deps.db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, userId));
    const row = await this.store(
      e,
      { userId, guestId: null, name: u?.name?.trim() || e.coupleNames },
      bytes,
      caption,
    );
    return this.photoView(row, albumClosesAt(e));
  }

  async addByGuest(token: string, bytes: Uint8Array, caption: string | null) {
    const { guest, event: e } = await this.byToken(token);
    if (!e.albumEnabled) throw new ApiError('not_found', 'No album for this event');
    if (!this.isOpen(e))
      throw new ApiError('conflict', 'The album is closed', { reason: 'album.closed' });
    if (!e.albumGuestUploads)
      throw new ApiError('forbidden', 'Guests cannot add photos to this album', {
        reason: 'album.guest_uploads_off',
      });
    const [{ n } = { n: 0 }] = await this.deps.db
      .select({ n: count() })
      .from(eventPhotos)
      .where(and(eq(eventPhotos.eventId, e.id), eq(eventPhotos.guestId, guest.id)));
    if (n >= MAX_PHOTOS_PER_GUEST)
      throw new ApiError('conflict', `You can add up to ${MAX_PHOTOS_PER_GUEST} photos`, {
        reason: 'album.guest_limit',
      });
    const row = await this.store(
      e,
      { userId: null, guestId: guest.id, name: guest.displayName },
      bytes,
      caption,
    );
    return { ...this.photoView(row, albumClosesAt(e)), mine: true };
  }

  private async removeFiles(eventId: string, photoId: string) {
    await rm(this.pathOf(eventId, photoId, 'full'), { force: true });
    await rm(this.pathOf(eventId, photoId, 'thumb'), { force: true });
  }

  /** Owner and committee may take down any photo. */
  async removeByMember(eventId: string, userId: string, photoId: string) {
    await this.memberRole(eventId, userId);
    const [row] = await this.deps.db
      .delete(eventPhotos)
      .where(and(eq(eventPhotos.id, photoId), eq(eventPhotos.eventId, eventId)))
      .returning();
    if (!row) throw new ApiError('not_found', 'Photo not found');
    await this.removeFiles(eventId, photoId);
    await recordAudit(this.deps.db, {
      eventId,
      actorId: userId,
      action: 'album.photo.delete',
      entity: 'event_photo',
      entityId: photoId,
      diff: { uploaderName: row.uploaderName },
    });
  }

  /** A guest may take down only their own photo. */
  async removeByGuest(token: string, photoId: string) {
    const { guest, event: e } = await this.byToken(token);
    const [row] = await this.deps.db
      .delete(eventPhotos)
      .where(
        and(
          eq(eventPhotos.id, photoId),
          eq(eventPhotos.eventId, e.id),
          eq(eventPhotos.guestId, guest.id),
        ),
      )
      .returning();
    if (!row) throw new ApiError('not_found', 'Photo not found');
    await this.removeFiles(e.id, photoId);
  }

  /** Owner only: deletes every photo now, without waiting for the album to close. */
  async clear(eventId: string, userId: string) {
    const role = await this.eventsSvc.role(eventId, userId);
    if (role !== 'owner') throw new ApiError('forbidden', 'Only the owner can empty the album');
    const removed = await this.purgeEvent(eventId);
    await recordAudit(this.deps.db, {
      eventId,
      actorId: userId,
      action: 'album.clear',
      entity: 'event',
      entityId: eventId,
      diff: { removed },
    });
    return { removed };
  }

  private async purgeEvent(eventId: string) {
    const rows = await this.deps.db
      .delete(eventPhotos)
      .where(eq(eventPhotos.eventId, eventId))
      .returning({ id: eventPhotos.id });
    await rm(this.dirOf(eventId), { recursive: true, force: true });
    return rows.length;
  }

  /**
   * Deletes the photos of every album that has closed (its keep-days after the event have passed) or
   * whose event was deleted. Run by the scheduler; safe to run on several instances at once.
   */
  async purgeExpired(): Promise<{ events: number; photos: number }> {
    const now = this.deps.now();
    const due = await this.deps.db
      .selectDistinct({ id: events.id })
      .from(events)
      .innerJoin(eventPhotos, eq(eventPhotos.eventId, events.id))
      .where(
        or(
          isNotNull(events.deletedAt),
          lt(
            sql`${events.dateStart} + make_interval(days => ${events.albumKeepDays})`,
            now.toISOString(),
          ),
        ),
      );
    let photos = 0;
    for (const { id } of due) photos += await this.purgeEvent(id);
    return { events: due.length, photos };
  }

  /** One stored image for a signed link, or not_found for a bad, expired or removed link. */
  async file(photoId: string, size: string, exp: string, sig: string) {
    if (size !== 'full' && size !== 'thumb') throw new ApiError('not_found');
    if (!/^\d{1,12}$/.test(exp)) throw new ApiError('not_found');
    const want = Buffer.from(this.sign(photoId, size, Number(exp)));
    const got = Buffer.from(sig);
    if (want.length !== got.length || !timingSafeEqual(want, got)) throw new ApiError('not_found');
    if (this.deps.now().getTime() > Number(exp) * 1000) throw new ApiError('not_found');
    const [row] = await this.deps.db
      .select({ eventId: eventPhotos.eventId })
      .from(eventPhotos)
      .where(eq(eventPhotos.id, photoId));
    if (!row) throw new ApiError('not_found');
    try {
      return { body: await readFile(this.pathOf(row.eventId, photoId, size)), exp: Number(exp) };
    } catch {
      throw new ApiError('not_found');
    }
  }
}
