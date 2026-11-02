import { and, asc, count, eq, sql } from 'drizzle-orm';
import { eventPurchases, events, memories, newId } from '@harusi/db';
import type { Deps } from '../context';
import { ApiError } from '../errors';
import { processPhoto } from '../photos/process';
import { photosOf } from '../photos/store';
import { recordAudit } from './audit';
import type { EventService } from './events';

export interface MemoryView {
  id: string;
  caption: string | null;
  takenOn: string | null;
  sortOrder: number;
  width: number;
  height: number;
}

export interface MemoriesAdminView {
  unlocked: boolean;
  enabled: boolean;
  limit: number;
  count: number;
  memories: MemoryView[];
}

const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const view = (m: typeof memories.$inferSelect): MemoryView => ({
  id: m.id,
  caption: m.caption,
  takenOn: m.takenOn,
  sortOrder: m.sortOrder,
  width: m.width,
  height: m.height,
});

/** Trimmed, at most 140 characters; empty means none. `undefined` leaves it unchanged. */
export function cleanCaption(v: string | null | undefined): string | null | undefined {
  if (v === undefined) return undefined;
  const s = (v ?? '').trim();
  if (s.length > 140)
    throw new ApiError('validation', 'Caption is at most 140 characters', { field: 'caption' });
  return s || null;
}

/** A real calendar date as `YYYY-MM-DD`; empty means none. `undefined` leaves it unchanged. */
export function cleanDate(v: string | null | undefined): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  const d = new Date(`${v}T00:00:00Z`);
  if (!DATE.test(v) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v)
    throw new ApiError('validation', 'Date must look like 2019-03-02', { field: 'takenOn' });
  return v;
}

/**
 * Kumbukumbu (ADR 050): the couple's past photos for their guests. Unlocked by any paid card order;
 * owner and committee manage them; guests see them through their card token.
 */
export class MemoriesService {
  constructor(
    private deps: Deps,
    private eventsSvc: EventService,
  ) {}

  private get photos() {
    return photosOf(this.deps);
  }

  /** Owner or committee; a gate agent is refused, a non-member gets "not found". */
  async assertStaff(eventId: string, userId: string) {
    const role = await this.eventsSvc.role(eventId, userId);
    if (role === 'gate') throw new ApiError('forbidden', 'Gate agents cannot manage memories');
    return role;
  }

  async unlocked(eventId: string): Promise<boolean> {
    const [row] = await this.deps.db
      .select({ n: count() })
      .from(eventPurchases)
      .where(
        and(
          eq(eventPurchases.eventId, eventId),
          eq(eventPurchases.kind, 'cards'),
          eq(eventPurchases.status, 'paid'),
        ),
      );
    return (row?.n ?? 0) > 0;
  }

  /** Date first (undated last), then the host's order. */
  async rows(eventId: string) {
    return this.deps.db
      .select()
      .from(memories)
      .where(eq(memories.eventId, eventId))
      .orderBy(
        sql`${memories.takenOn} asc nulls last`,
        asc(memories.sortOrder),
        asc(memories.createdAt),
      );
  }

  private async event(eventId: string) {
    const [event] = await this.deps.db.select().from(events).where(eq(events.id, eventId));
    if (!event) throw new ApiError('not_found', 'Event not found');
    return event;
  }

  async list(eventId: string, userId: string): Promise<MemoriesAdminView> {
    await this.assertStaff(eventId, userId);
    const event = await this.event(eventId);
    const rows = await this.rows(eventId);
    return {
      unlocked: await this.unlocked(eventId),
      enabled: event.memoriesEnabled,
      limit: event.memoriesLimit,
      count: rows.length,
      memories: rows.map(view),
    };
  }

  async add(
    eventId: string,
    userId: string,
    bytes: Uint8Array,
    input: { caption?: string | null; takenOn?: string | null },
  ): Promise<MemoryView> {
    await this.assertStaff(eventId, userId);
    const caption = cleanCaption(input.caption) ?? null;
    const takenOn = cleanDate(input.takenOn) ?? null;
    if (!(await this.unlocked(eventId)))
      throw new ApiError('payment_required', 'Buy cards to unlock memories', {
        reason: 'feature_locked',
        feature: 'memories',
      });
    const event = await this.event(eventId);
    const [{ n } = { n: 0 }] = await this.deps.db
      .select({ n: count() })
      .from(memories)
      .where(eq(memories.eventId, eventId));
    if (n >= event.memoriesLimit)
      throw new ApiError('payment_required', 'Memories limit reached', {
        reason: 'quota_exceeded',
        resource: 'memories',
        remaining: 0,
        needed: 1,
      });
    const img = await processPhoto(bytes);
    const id = newId();
    const photoKey = `events/${eventId}/${id}.webp`;
    const thumbKey = `events/${eventId}/${id}.thumb.webp`;
    await this.photos.put(photoKey, img.full);
    await this.photos.put(thumbKey, img.thumb);
    const [row] = await this.deps.db
      .insert(memories)
      .values({
        id,
        eventId,
        photoKey,
        thumbKey,
        width: img.width,
        height: img.height,
        caption,
        takenOn,
        sortOrder: n,
        createdBy: userId,
      })
      .returning();
    await recordAudit(this.deps.db, {
      eventId,
      actorId: userId,
      action: 'memory.create',
      entity: 'memory',
      entityId: id,
    });
    return view(row!);
  }

  private async own(memoryId: string, userId: string) {
    const [m] = await this.deps.db.select().from(memories).where(eq(memories.id, memoryId));
    if (!m) throw new ApiError('not_found', 'Memory not found');
    await this.assertStaff(m.eventId, userId);
    return m;
  }

  async update(
    memoryId: string,
    userId: string,
    patch: { caption?: string | null; takenOn?: string | null; sortOrder?: number },
  ): Promise<MemoryView> {
    const m = await this.own(memoryId, userId);
    const [row] = await this.deps.db
      .update(memories)
      .set({
        caption: cleanCaption(patch.caption),
        takenOn: cleanDate(patch.takenOn),
        sortOrder: patch.sortOrder,
      })
      .where(eq(memories.id, memoryId))
      .returning();
    await recordAudit(this.deps.db, {
      eventId: m.eventId,
      actorId: userId,
      action: 'memory.update',
      entity: 'memory',
      entityId: memoryId,
    });
    return view(row!);
  }

  async remove(memoryId: string, userId: string): Promise<void> {
    const m = await this.own(memoryId, userId);
    await this.deps.db.delete(memories).where(eq(memories.id, memoryId));
    await this.photos.delete(m.photoKey);
    await this.photos.delete(m.thumbKey);
    await recordAudit(this.deps.db, {
      eventId: m.eventId,
      actorId: userId,
      action: 'memory.delete',
      entity: 'memory',
      entityId: memoryId,
    });
  }

  /** The file for a memory of this event; null when the memory is not this event's. */
  async photo(eventId: string, memoryId: string, size: 'thumb' | 'full') {
    const [m] = await this.deps.db
      .select()
      .from(memories)
      .where(and(eq(memories.id, memoryId), eq(memories.eventId, eventId)));
    if (!m) return null;
    return this.photos.get(size === 'thumb' ? m.thumbKey : m.photoKey);
  }

  /** Deletes every memory of an event, files first (event deletion, PDPA erasure). */
  async purgeEvent(eventId: string): Promise<void> {
    const rows = await this.deps.db.select().from(memories).where(eq(memories.eventId, eventId));
    for (const m of rows) {
      await this.photos.delete(m.photoKey);
      await this.photos.delete(m.thumbKey);
    }
    await this.deps.db.delete(memories).where(eq(memories.eventId, eventId));
  }
}
