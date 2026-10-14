import { and, eq, inArray, isNull } from 'drizzle-orm';
import { eventMembers, events, newId, signingKeys } from '@harusi/db';
import { generateEventKeyPair } from '@harusi/crypto';
import type { Deps } from '../context';
import { ApiError } from '../errors';
import { encryptSecret } from '../crypto-at-rest';

export type MemberRole = 'owner' | 'committee' | 'gate';

export interface EventInput {
  title: string;
  coupleNames: string;
  dateStart: Date;
  venueName?: string | null;
  venueMapUrl?: string | null;
  dressCode?: string | null;
  languageDefault?: 'sw' | 'en';
  rsvpDeadline?: Date | null;
  contributionTargetTzs?: number | null;
  brandTheme?: Record<string, unknown> | null;
}

export class EventService {
  constructor(private deps: Deps) {}

  /** Creates the event, its owner membership and its Ed25519 signing key in one transaction. */
  async create(ownerId: string, input: EventInput) {
    const keys = generateEventKeyPair(this.deps.random);
    const encrypted = await encryptSecret(keys.privateKey, this.deps.config.keyEncSecret);
    return this.deps.db.transaction(async (tx) => {
      const eventId = newId();
      const keyId = newId();
      const [event] = await tx
        .insert(events)
        .values({ id: eventId, ownerId, ...input, brandTheme: input.brandTheme ?? undefined })
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
      .where(eq(eventMembers.userId, userId));
    return rows.map((r) => ({ ...r.event, myRole: r.role }));
  }

  /** The caller's role on an event, or a 404 (never reveal that an event exists to non-members). */
  async role(eventId: string, userId: string): Promise<MemberRole> {
    const [m] = await this.deps.db
      .select({ role: eventMembers.role })
      .from(eventMembers)
      .where(and(eq(eventMembers.eventId, eventId), eq(eventMembers.userId, userId)));
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
    const [updated] = await this.deps.db
      .update(events)
      .set({ ...patch, brandTheme: patch.brandTheme ?? undefined })
      .where(eq(events.id, eventId))
      .returning();
    if (!updated) throw new ApiError('not_found');
    return updated;
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
