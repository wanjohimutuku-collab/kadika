import { and, asc, eq, gt, ilike, isNull, or, sql } from 'drizzle-orm';
import { guests, invitations, newId, shortOf, signingKeys } from '@harusi/db';
import { decryptSecret } from '../crypto-at-rest';
import { generateGuestToken, hashGuestToken, signQrToken } from '@harusi/crypto';
import {
  buildPreview,
  summarizePreview,
  guessMapping,
  parseCsv,
  type ImportField,
} from '@harusi/api-client';
import { generateShortCode } from '@harusi/schemas/short-code';
import { normalizeTzPhone } from '@harusi/schemas/phone';
import type { Deps } from '../context';
import { ApiError } from '../errors';
import type { EventService } from './events';

export interface GuestInput {
  displayName: string;
  phone?: string | null;
  groupLabel?: string | null;
  partySizeAllowed?: number;
  hasSmartphone?: boolean | null;
  language?: 'sw' | 'en';
  inviteChannelPref?: 'whatsapp' | 'sms' | 'print' | 'mixed';
  notes?: string | null;
}

export interface ImportRow {
  displayName: string;
  phone?: string;
  groupLabel?: string;
  partySizeAllowed?: number;
}

export class GuestService {
  constructor(
    private deps: Deps,
    private eventsSvc: EventService,
  ) {}

  private async canManage(eventId: string, userId: string) {
    const role = await this.eventsSvc.role(eventId, userId);
    if (role === 'gate') throw new ApiError('forbidden', 'Gate agents cannot manage guests');
    return role;
  }

  private rnd(): () => number {
    return () => {
      const b = this.deps.random(4);
      return (((b[0]! << 24) | (b[1]! << 16) | (b[2]! << 8) | b[3]!) >>> 0) / 4294967296;
    };
  }

  /** A short code unique within the event (2 letters + 4 digits, unambiguous alphabet — §6.1). */
  private async uniqueShortCode(eventId: string, tx: Deps['db']): Promise<string> {
    const rnd = this.rnd();
    for (let i = 0; i < 20; i++) {
      const code = generateShortCode(rnd);
      const [hit] = await tx
        .select({ id: guests.id })
        .from(guests)
        .where(and(eq(guests.eventId, eventId), eq(guests.shortCode, code)));
      if (!hit) return code;
    }
    throw new ApiError('conflict', 'Could not allocate a short code');
  }

  /** A guest id whose 8-hex tail is unused in the event (the on-card id, ADR 013). */
  private async uniqueGuestId(
    eventId: string,
    tx: Deps['db'],
  ): Promise<{ id: string; short: string }> {
    for (let i = 0; i < 10; i++) {
      const id = newId();
      const short = shortOf(id);
      const [hit] = await tx
        .select({ id: guests.id })
        .from(guests)
        .where(and(eq(guests.eventId, eventId), eq(guests.guestShort, short)));
      if (!hit) return { id, short };
    }
    throw new ApiError('conflict', 'Could not allocate a guest id');
  }

  private normalizePhone(phone: string | null | undefined): string | null {
    if (!phone?.trim()) return null;
    const r = normalizeTzPhone(phone);
    if (!r.ok)
      throw new ApiError('validation', 'Invalid phone number', { field: 'phone', reason: r.error });
    return r.e164;
  }

  async create(eventId: string, userId: string, input: GuestInput) {
    await this.canManage(eventId, userId);
    const phone = this.normalizePhone(input.phone);
    return this.deps.db.transaction(async (tx) => {
      if (phone) {
        const [dupe] = await tx
          .select({ id: guests.id })
          .from(guests)
          .where(
            and(eq(guests.eventId, eventId), eq(guests.phoneE164, phone), isNull(guests.deletedAt)),
          );
        if (dupe)
          throw new ApiError('conflict', 'Phone already on the guest list', {
            field: 'phone',
            guestId: dupe.id,
          });
      }
      const ids = await this.uniqueGuestId(eventId, tx as Deps['db']);
      const token = generateGuestToken(this.deps.random);
      const [guest] = await tx
        .insert(guests)
        .values({
          id: ids.id,
          guestShort: ids.short,
          eventId,
          displayName: input.displayName.trim(),
          phoneE164: phone,
          hasSmartphone: input.hasSmartphone ?? null,
          groupLabel: input.groupLabel?.trim() || null,
          partySizeAllowed: input.partySizeAllowed ?? 1,
          shortCode: await this.uniqueShortCode(eventId, tx as Deps['db']),
          language: input.language ?? 'sw',
          inviteChannelPref: phone ? (input.inviteChannelPref ?? 'mixed') : 'print',
          notes: input.notes ?? null,
        })
        .returning();
      await tx
        .insert(invitations)
        .values({ id: newId(), guestId: ids.id, tokenHash: hashGuestToken(token) });
      return { ...guest!, cardToken: token };
    });
  }

  /**
   * Cursor-paginated list ordered by (name, id). The cursor is opaque (base64url of `name\0id`), so
   * inserts between pages never skip or repeat a guest. `limit` is clamped to 1–200.
   */
  async list(
    eventId: string,
    userId: string,
    q: { search?: string; status?: string; limit?: number; cursor?: string } = {},
  ) {
    await this.eventsSvc.role(eventId, userId);
    const limit = Math.min(200, Math.max(1, Math.floor(q.limit ?? 50)));
    const where = [eq(guests.eventId, eventId), isNull(guests.deletedAt)];
    if (q.search?.trim()) {
      const s = `%${q.search.trim()}%`;
      where.push(
        or(ilike(guests.displayName, s), ilike(guests.phoneE164, s), ilike(guests.shortCode, s))!,
      );
    }
    if (q.status)
      where.push(eq(invitations.status, q.status as typeof invitations.$inferSelect.status));
    if (q.cursor) {
      const decoded = Buffer.from(q.cursor, 'base64url').toString('utf8');
      const sep = decoded.lastIndexOf('\u0000');
      if (sep < 0) throw new ApiError('validation', 'Invalid cursor', { field: 'cursor' });
      const name = decoded.slice(0, sep);
      const id = decoded.slice(sep + 1);
      where.push(
        or(gt(guests.displayName, name), and(eq(guests.displayName, name), gt(guests.id, id)))!,
      );
    }
    const rows = await this.deps.db
      .select({
        guest: guests,
        status: invitations.status,
        rsvpPartySize: invitations.rsvpPartySize,
      })
      .from(guests)
      .leftJoin(invitations, eq(invitations.guestId, guests.id))
      .where(and(...where))
      .orderBy(asc(guests.displayName), asc(guests.id))
      .limit(limit + 1);
    const page = rows.slice(0, limit);
    const last = page.at(-1)?.guest;
    return {
      items: page.map((r) => ({
        ...r.guest,
        status: r.status ?? 'created',
        rsvpPartySize: r.rsvpPartySize,
      })),
      nextCursor:
        rows.length > limit && last
          ? Buffer.from(`${last.displayName}\u0000${last.id}`).toString('base64url')
          : null,
    };
  }

  async get(guestId: string, userId: string) {
    const [g] = await this.deps.db
      .select()
      .from(guests)
      .where(and(eq(guests.id, guestId), isNull(guests.deletedAt)));
    if (!g) throw new ApiError('not_found', 'Guest not found');
    await this.eventsSvc.role(g.eventId, userId);
    return g;
  }

  async update(guestId: string, userId: string, patch: Partial<GuestInput>) {
    const g = await this.get(guestId, userId);
    await this.canManage(g.eventId, userId);
    const set: Partial<typeof guests.$inferInsert> = {};
    if (patch.displayName !== undefined) set.displayName = patch.displayName.trim();
    if (patch.phone !== undefined) {
      const phone = this.normalizePhone(patch.phone);
      if (phone && phone !== g.phoneE164) {
        const [dupe] = await this.deps.db
          .select({ id: guests.id })
          .from(guests)
          .where(
            and(
              eq(guests.eventId, g.eventId),
              eq(guests.phoneE164, phone),
              isNull(guests.deletedAt),
            ),
          );
        if (dupe)
          throw new ApiError('conflict', 'Phone already on the guest list', {
            field: 'phone',
            guestId: dupe.id,
          });
      }
      set.phoneE164 = phone;
    }
    for (const k of [
      'groupLabel',
      'partySizeAllowed',
      'hasSmartphone',
      'language',
      'inviteChannelPref',
      'notes',
    ] as const) {
      if (patch[k] !== undefined) (set as Record<string, unknown>)[k] = patch[k];
    }
    const [updated] = await this.deps.db
      .update(guests)
      .set(set)
      .where(eq(guests.id, guestId))
      .returning();
    return updated!;
  }

  async remove(guestId: string, userId: string) {
    const g = await this.get(guestId, userId);
    await this.canManage(g.eventId, userId);
    await this.deps.db
      .update(guests)
      .set({ deletedAt: this.deps.now() })
      .where(eq(guests.id, guestId));
  }

  /**
   * Reissue (§6.3): bumps `token_version` (old QR dies at the gate) and rotates the card link token
   * (old link shows "reissued"). Returns the new card token once.
   */
  async reissue(guestId: string, userId: string) {
    const g = await this.get(guestId, userId);
    await this.canManage(g.eventId, userId);
    const token = generateGuestToken(this.deps.random);
    const updated = await this.deps.db.transaction(async (tx) => {
      const [u] = await tx
        .update(guests)
        .set({ tokenVersion: sql`${guests.tokenVersion} + 1` })
        .where(eq(guests.id, guestId))
        .returning();
      await tx
        .update(invitations)
        .set({ tokenHash: hashGuestToken(token) })
        .where(eq(invitations.guestId, guestId));
      return u!;
    });
    return { guest: updated, cardToken: token };
  }

  /** The signed QR payload for a guest at its current version (§6.1). */
  async qrToken(guestId: string, userId: string): Promise<{ token: string; version: number }> {
    const g = await this.get(guestId, userId);
    await this.canManage(g.eventId, userId);
    const [key] = await this.deps.db
      .select()
      .from(signingKeys)
      .where(and(eq(signingKeys.eventId, g.eventId), isNull(signingKeys.revokedAt)));
    if (!key) throw new ApiError('not_found', 'No signing key');
    const privateKey = await decryptSecret(key.privateKeyEncrypted, this.deps.config.keyEncSecret);
    const token = signQrToken(
      { eventId: g.eventId, guestId: g.id, partySize: g.partySizeAllowed, version: g.tokenVersion },
      privateKey,
    );
    return { token, version: g.tokenVersion };
  }

  /**
   * CSV / pasted-list import with phone normalisation and dedupe (within the file and against the
   * event). `dryRun` returns the preview without saving.
   */
  async import(
    eventId: string,
    userId: string,
    input: { csv: string; dryRun?: boolean; defaultGroup?: string },
  ) {
    await this.canManage(eventId, userId);
    const rows = parseCsv(input.csv);
    if (!rows.length) throw new ApiError('validation', 'No rows found');
    const { mapping, hasHeader } = guessMapping(rows[0]!);
    const width = Math.max(...rows.map((r) => r.length));
    const fullMapping: ImportField[] = Array.from(
      { length: width },
      (_, i) => mapping[i] ?? 'ignore',
    );
    const existing = await this.deps.db
      .select({ phone: guests.phoneE164, name: guests.displayName })
      .from(guests)
      .where(and(eq(guests.eventId, eventId), isNull(guests.deletedAt)));
    const preview = buildPreview(rows, fullMapping, {
      hasHeader,
      existingPhones: existing.map((e) => e.phone).filter((p): p is string => !!p),
      existingNames: existing.map((e) => e.name),
      defaultGroup: input.defaultGroup,
    });
    const summary = summarizePreview(preview);
    if (input.dryRun)
      return { summary, created: 0, skipped: summary.total - summary.valid, rows: preview };
    let created = 0;
    for (const r of preview.filter((p) => p.include)) {
      await this.create(eventId, userId, {
        displayName: r.displayName,
        phone: r.phoneE164,
        groupLabel: r.groupLabel,
        partySizeAllowed: r.partySizeAllowed,
        hasSmartphone: r.hasSmartphone,
        inviteChannelPref: r.inviteChannelPref,
      });
      created++;
    }
    return { summary, created, skipped: summary.total - created };
  }
}
