import { and, desc, eq, lt } from 'drizzle-orm';
import { auditLog, guests, messageLog, newId, payments, pledges, scanLog, users } from '@harusi/db';
import type { Deps } from '../context';
import { ApiError } from '../errors';
import type { EventService } from './events';

type Db = Deps['db'];

export interface AuditEntry {
  eventId: string | null;
  actorId: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  /** Never put tokens, OTPs, PINs, keys or full phone numbers here (§12). */
  diff?: Record<string, unknown>;
}

/** Appends to the audit trail (§9): admin actions, overrides, payment and access changes. */
export async function recordAudit(db: Db, e: AuditEntry): Promise<void> {
  await db.insert(auditLog).values({
    id: newId(),
    eventId: e.eventId,
    actorId: e.actorId,
    action: e.action,
    entity: e.entity,
    entityId: e.entityId ?? null,
    diff: (e.diff ?? null) as never,
  });
}

/** What an owner can read about their event's audit trail, newest first. */
export class AuditService {
  constructor(
    private deps: Deps,
    private eventsSvc: EventService,
  ) {}

  async list(eventId: string, userId: string, q: { limit?: number; before?: string } = {}) {
    const role = await this.eventsSvc.role(eventId, userId);
    if (role !== 'owner')
      throw new ApiError('forbidden', 'Only the owner can read the audit trail');
    const limit = Math.min(200, Math.max(1, Math.floor(q.limit ?? 50)));
    const where = [eq(auditLog.eventId, eventId)];
    if (q.before) {
      const d = new Date(q.before);
      if (Number.isNaN(d.getTime()))
        throw new ApiError('validation', 'Invalid cursor', { field: 'before' });
      where.push(lt(auditLog.createdAt, d));
    }
    const rows = await this.deps.db
      .select({ a: auditLog, actor: users.name, phone: users.phoneE164 })
      .from(auditLog)
      .leftJoin(users, eq(users.id, auditLog.actorId))
      .where(and(...where))
      .orderBy(desc(auditLog.createdAt))
      .limit(limit + 1);
    const page = rows.slice(0, limit);
    return {
      items: page.map((r) => ({
        id: r.a.id,
        at: r.a.createdAt.toISOString(),
        // a name if they gave one, otherwise only the last four digits of their phone
        actor: r.a.actorId
          ? r.actor?.trim() || (r.phone ? `…${r.phone.slice(-4)}` : 'unknown')
          : 'system',
        action: r.a.action,
        entity: r.a.entity,
        entityId: r.a.entityId,
        diff: r.a.diff,
      })),
      nextBefore: rows.length > limit ? page.at(-1)!.a.createdAt.toISOString() : null,
    };
  }
}

/**
 * Personal data rights (Tanzania PDPA, §9): everything we hold about one guest, and erasure that
 * keeps only what accounting needs (payment amounts), with no name, phone or notes left.
 */
export class PrivacyService {
  constructor(
    private deps: Deps,
    private eventsSvc: EventService,
  ) {}

  private async owned(guestId: string, userId: string) {
    const [g] = await this.deps.db.select().from(guests).where(eq(guests.id, guestId));
    if (!g) throw new ApiError('not_found', 'Guest not found');
    const role = await this.eventsSvc.role(g.eventId, userId);
    if (role !== 'owner')
      throw new ApiError('forbidden', 'Only the owner can export or erase guest data');
    return g;
  }

  async exportGuest(guestId: string, userId: string) {
    const g = await this.owned(guestId, userId);
    const [pledge] = await this.deps.db.select().from(pledges).where(eq(pledges.guestId, guestId));
    const pays = await this.deps.db.select().from(payments).where(eq(payments.guestId, guestId));
    const msgs = await this.deps.db
      .select()
      .from(messageLog)
      .where(eq(messageLog.guestId, guestId));
    const scans = await this.deps.db.select().from(scanLog).where(eq(scanLog.guestId, guestId));
    await recordAudit(this.deps.db, {
      eventId: g.eventId,
      actorId: userId,
      action: 'guest.export',
      entity: 'guest',
      entityId: guestId,
    });
    return {
      exportedAt: this.deps.now().toISOString(),
      guest: {
        displayName: g.displayName,
        phoneE164: g.phoneE164,
        groupLabel: g.groupLabel,
        partySizeAllowed: g.partySizeAllowed,
        shortCode: g.shortCode,
        language: g.language,
        notes: g.notes,
        createdAt: g.createdAt,
      },
      pledge: pledge ? { amount: pledge.amount, status: pledge.status, note: pledge.note } : null,
      payments: pays.map((p) => ({
        amount: p.amount,
        method: p.method,
        status: p.status,
        paidAt: p.paidAt,
        phoneE164: p.phoneE164,
      })),
      messages: msgs.map((m) => ({
        channel: m.channel,
        kind: m.kind,
        status: m.status,
        at: m.createdAt,
      })),
      scans: scans.map((s) => ({
        result: s.result,
        partyAdmitted: s.partyAdmitted,
        scannedAt: s.scannedAt,
      })),
    };
  }

  async eraseGuest(guestId: string, userId: string) {
    const g = await this.owned(guestId, userId);
    await this.deps.db.transaction(async (tx) => {
      await tx
        .update(guests)
        .set({
          displayName: 'Mgeni aliyefutwa',
          phoneE164: null,
          notes: null,
          groupLabel: null,
          deletedAt: this.deps.now(),
        })
        .where(eq(guests.id, guestId));
      await tx
        .update(payments)
        .set({ phoneE164: null, note: null })
        .where(eq(payments.guestId, guestId));
      await tx.update(pledges).set({ note: null }).where(eq(pledges.guestId, guestId));
      await recordAudit(tx as Db, {
        eventId: g.eventId,
        actorId: userId,
        action: 'guest.erase',
        entity: 'guest',
        entityId: guestId,
      });
    });
  }
}
