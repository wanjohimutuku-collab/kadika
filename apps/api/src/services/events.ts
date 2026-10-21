import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { CardContent } from '@harusi/schemas/card-content';
import { allowedCountries, currencyOf, timezoneOf, type Country } from '@harusi/schemas/country';
import { eventMembers, events, gateLinks, newId, scheduledSends, signingKeys } from '@harusi/db';
import { generateEventKeyPair } from '@harusi/crypto';
import {
  paletteContrastIssues,
  resolvePalette,
  sanitizeOverrides,
} from '@harusi/ui-tokens/palette';
import type { Deps } from '../context';
import { ApiError } from '../errors';
import { recordAudit } from './audit';
import { encryptSecret } from '../crypto-at-rest';

export type MemberRole = 'owner' | 'committee' | 'gate';

export interface EventInput {
  title: string;
  /** Defaults to Tanzania. Kenya needs `KENYA_ENABLED` (ADR 025). */
  country?: Country;
  eventKind?: string | null;
  coupleNames: string;
  dateStart: Date;
  venueName?: string | null;
  venueMapUrl?: string | null;
  dressCode?: string | null;
  committeePhone?: string | null;
  senderName?: string | null;
  greeting?: string | null;
  languageDefault?: 'sw' | 'en';
  rsvpDeadline?: Date | null;
  contributionTarget?: number | null;
  pledgesEnabled?: boolean;
  brandTheme?: Record<string, unknown> | null;
  /** Validated by the route; new events default to family-sent cards (ADR 029). */
  cardContent?: CardContent;
}

/**
 * `brand_theme` holds `{ themeId, coverGradient, palette }`. A patch only replaces the keys it
 * sends, and the resulting palette must stay readable (WCAG contrast, ADR 015) or the call fails.
 */
export function mergeBrandTheme(
  current: Record<string, unknown> | null,
  patch: Record<string, unknown> | null | undefined,
): Record<string, unknown> | undefined {
  if (!patch) return current ?? undefined;
  const merged: Record<string, unknown> = { ...(current ?? {}) };
  for (const [k, v] of Object.entries(patch)) if (v !== undefined) merged[k] = v;
  const themeId = typeof merged.themeId === 'string' ? merged.themeId : undefined;
  if ('palette' in merged) {
    const palette = sanitizeOverrides(merged.palette);
    const issues = paletteContrastIssues(resolvePalette(themeId, palette));
    if (issues.length)
      throw new ApiError('validation', 'Palette is not readable', {
        reason: 'palette.contrast',
        pairs: issues.map((i) => i.pair),
      });
    merged.palette = palette;
  }
  return merged;
}

/** The event's country, defaulting to Tanzania when the row is missing. */
export async function eventCountry(db: Deps['db'], eventId: string): Promise<Country> {
  const [row] = await db
    .select({ country: events.country })
    .from(events)
    .where(eq(events.id, eventId));
  return row?.country ?? 'TZ';
}

export class EventService {
  constructor(private deps: Deps) {}

  /** Creates the event, its owner membership and its Ed25519 signing key in one transaction. */
  async create(ownerId: string, input: EventInput) {
    const country = input.country ?? 'TZ';
    if (!allowedCountries(this.deps.config.kenyaEnabled).includes(country))
      throw new ApiError('validation', 'Country is not available', {
        field: 'country',
        reason: 'country.disabled',
      });
    const keys = generateEventKeyPair(this.deps.random);
    const encrypted = await encryptSecret(keys.privateKey, this.deps.config.keyEncSecret);
    return this.deps.db.transaction(async (tx) => {
      const eventId = newId();
      const keyId = newId();
      const [event] = await tx
        .insert(events)
        .values({
          id: eventId,
          ownerId,
          ...input,
          country,
          currency: currencyOf(country),
          timezone: timezoneOf(country),
          brandTheme: mergeBrandTheme(null, input.brandTheme),
          cardContent: input.cardContent ?? { sender: { kind: 'family' } },
        })
        .returning();
      await tx
        .insert(signingKeys)
        .values({ id: keyId, eventId, publicKey: keys.publicKey, privateKeyEncrypted: encrypted });
      const [updated] = await tx
        .update(events)
        .set({ signingKeyId: keyId })
        .where(eq(events.id, eventId))
        .returning();
      await tx
        .insert(eventMembers)
        .values({ id: newId(), eventId, userId: ownerId, role: 'owner' });
      return updated ?? event!;
    });
  }

  async listForUser(userId: string) {
    const rows = await this.deps.db
      .select({ event: events, role: eventMembers.role })
      .from(eventMembers)
      .innerJoin(events, eq(events.id, eventMembers.eventId))
      .where(and(eq(eventMembers.userId, userId), isNull(events.deletedAt)));
    return rows.map((r) => ({ ...r.event, myRole: r.role }));
  }

  /** The caller's role on an event, or a 404 (never reveal that an event exists to non-members). */
  async role(eventId: string, userId: string): Promise<MemberRole> {
    const [m] = await this.deps.db
      .select({ role: eventMembers.role })
      .from(eventMembers)
      .innerJoin(events, eq(events.id, eventMembers.eventId))
      .where(
        and(
          eq(eventMembers.eventId, eventId),
          eq(eventMembers.userId, userId),
          isNull(events.deletedAt),
        ),
      );
    if (!m) throw new ApiError('not_found', 'Event not found');
    return m.role;
  }

  async get(eventId: string, userId: string) {
    const role = await this.role(eventId, userId);
    const [event] = await this.deps.db.select().from(events).where(eq(events.id, eventId));
    if (!event) throw new ApiError('not_found', 'Event not found');
    return { ...event, myRole: role };
  }

  async update(
    eventId: string,
    userId: string,
    patch: Partial<EventInput> & { status?: 'draft' | 'active' | 'completed' | 'archived' },
  ) {
    const role = await this.role(eventId, userId);
    if (role !== 'owner')
      throw new ApiError('forbidden', 'Only the owner can change event settings');
    let brandTheme: Record<string, unknown> | undefined;
    if (patch.brandTheme) {
      const [current] = await this.deps.db
        .select({ brandTheme: events.brandTheme })
        .from(events)
        .where(eq(events.id, eventId));
      brandTheme = mergeBrandTheme(current?.brandTheme ?? null, patch.brandTheme);
    }
    const values = { ...patch, brandTheme };
    // Nothing to change (a client toggle the API does not store yet): answer with the event as it is.
    if (Object.values(values).every((v) => v === undefined)) {
      const [current] = await this.deps.db.select().from(events).where(eq(events.id, eventId));
      if (!current) throw new ApiError('not_found');
      return current;
    }
    const [updated] = await this.deps.db
      .update(events)
      .set(values)
      .where(eq(events.id, eventId))
      .returning();
    if (!updated) throw new ApiError('not_found');
    return updated;
  }

  /**
   * Deletes an event for its owner (Mipangilio → Futa harusi). A soft delete: from now on it is "not
   * found" to every member, its cards read as invalid, gate links and queued sends stop, and no
   * reminder goes out. The rows stay for billing and PDPA requests.
   */
  async remove(eventId: string, userId: string) {
    const role = await this.role(eventId, userId);
    if (role !== 'owner') throw new ApiError('forbidden', 'Only the owner can delete the event');
    const now = this.deps.now();
    await this.deps.db.transaction(async (tx) => {
      await tx
        .update(events)
        .set({ deletedAt: now, status: 'archived' })
        .where(eq(events.id, eventId));
      await tx
        .update(gateLinks)
        .set({ revokedAt: now })
        .where(and(eq(gateLinks.eventId, eventId), isNull(gateLinks.revokedAt)));
      await tx
        .update(scheduledSends)
        .set({ status: 'cancelled', finishedAt: now })
        .where(and(eq(scheduledSends.eventId, eventId), eq(scheduledSends.status, 'scheduled')));
    });
    await recordAudit(this.deps.db, {
      eventId,
      actorId: userId,
      action: 'event.delete',
      entity: 'event',
      entityId: eventId,
    });
  }

  /** Public key for gate devices and the guest card. The private key never leaves the server. */
  async publicKey(eventId: string): Promise<string> {
    const [k] = await this.deps.db
      .select({ publicKey: signingKeys.publicKey })
      .from(signingKeys)
      .where(and(eq(signingKeys.eventId, eventId), isNull(signingKeys.revokedAt)));
    if (!k) throw new ApiError('not_found', 'No signing key');
    return k.publicKey;
  }

  async memberEventIds(userId: string): Promise<string[]> {
    const rows = await this.deps.db
      .select({ id: eventMembers.eventId })
      .from(eventMembers)
      .where(eq(eventMembers.userId, userId));
    return rows.map((r) => r.id);
  }
}

export { inArray };
