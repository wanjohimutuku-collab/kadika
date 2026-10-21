import { and, desc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import {
  auditLog,
  eventPurchases,
  events,
  guests,
  invitations,
  messageLog,
  scanLog,
  users,
} from '@harusi/db';
import type { Deps } from '../context';
import { ApiError } from '../errors';
import { recordAudit } from './audit';
import type { EventService, MemberRole } from './events';
import type { PledgeService } from './pledges';

const ADMIT = ['ok', 'manual_ok'] as const;
/** How far along an invitation is, for "reached at least this step" counts. */
const RANK: Record<string, number> = {
  created: 0,
  queued: 1,
  sent: 2,
  delivered: 3,
  opened: 4,
  confirmed: 5,
  declined: 5,
  checked_in: 6,
};

type ActivityKind =
  | 'rsvp_yes'
  | 'rsvp_no'
  | 'opened'
  | 'payment'
  | 'message_failed'
  | 'checked_in'
  | 'duplicate_scan';

/** "14:00" in the event's own time zone. */
function hourIn(d: Date, timeZone: string): string {
  const h = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).format(d);
  return `${h.padStart(2, '0')}:00`;
}

/** The Monday (UTC) of the week a date falls in, as YYYY-MM-DD. */
function weekOf(d: Date): string {
  const monday = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7)),
  );
  return monday.toISOString().slice(0, 10);
}

/** message_log keeps finer kinds (fallback, reminder_7, pledge_reminder …); the console shows four. */
function messageKind(kind: string): 'invite' | 'reminder' | 'thank_you' | 'test' {
  if (kind === 'test') return 'test';
  if (kind === 'thank_you') return 'thank_you';
  if (kind.includes('reminder')) return 'reminder';
  return 'invite';
}

/**
 * Read models and small actions behind the organiser console (§7.7, §17.4) that the mobile app and
 * guest card do not need: recent activity, the report, a guest's history, and deleting a wedding.
 * Contribution amounts are sealed at rest (ADR 043), so they are read through the pledge service,
 * which opens them for the event's own team only; nothing about money reaches a gate agent (§2).
 */
export class ConsoleService {
  constructor(
    private deps: Deps,
    private eventsSvc: EventService,
    private pledgeSvc: PledgeService,
  ) {}

  private async manager(eventId: string, userId: string): Promise<MemberRole> {
    const role = await this.eventsSvc.role(eventId, userId);
    if (role === 'gate') throw new ApiError('forbidden', 'Gate agents cannot use this');
    return role;
  }

  private async event(eventId: string) {
    const [e] = await this.deps.db.select().from(events).where(eq(events.id, eventId));
    if (!e) throw new ApiError('not_found', 'Event not found');
    return e;
  }

  /** A guest of any event the caller manages (deleted ones only when asked for). */
  private async guest(guestId: string, userId: string, opts: { deleted?: boolean } = {}) {
    const [g] = await this.deps.db
      .select()
      .from(guests)
      .where(
        and(
          eq(guests.id, guestId),
          opts.deleted ? isNotNull(guests.deletedAt) : isNull(guests.deletedAt),
        ),
      );
    if (!g) throw new ApiError('not_found', 'Guest not found');
    await this.manager(g.eventId, userId);
    return g;
  }

  /** Recorded contributions with their amounts opened (ADR 043); owner and committee only. */
  private async paidContributions(eventId: string, userId: string) {
    return (await this.pledgeSvc.listPayments(eventId, userId)).items.filter(
      (p) => p.status === 'success',
    );
  }

  // ---- overview

  async activity(eventId: string, userId: string, limit = 20) {
    const role = await this.eventsSvc.role(eventId, userId);
    const n = Math.min(100, Math.max(1, Math.floor(limit)));
    const db = this.deps.db;
    const live = and(eq(guests.eventId, eventId), isNull(guests.deletedAt));
    const items: {
      id: string;
      at: string;
      kind: ActivityKind;
      guestId: string | null;
      guestName: string | null;
      amount?: number;
      count?: number;
    }[] = [];

    const answers = await db
      .select({
        id: invitations.id,
        status: invitations.status,
        rsvpAt: invitations.rsvpAt,
        openedAt: invitations.openedAt,
        party: invitations.rsvpPartySize,
        guestId: guests.id,
        name: guests.displayName,
      })
      .from(invitations)
      .innerJoin(guests, eq(guests.id, invitations.guestId))
      .where(and(live, isNotNull(invitations.openedAt)))
      .orderBy(desc(sql`coalesce(${invitations.rsvpAt}, ${invitations.openedAt})`))
      .limit(n);
    for (const r of answers) {
      const base = { guestId: r.guestId, guestName: r.name };
      if (r.rsvpAt && (r.status === 'confirmed' || r.status === 'checked_in'))
        items.push({
          id: `c-${r.id}`,
          at: r.rsvpAt.toISOString(),
          kind: 'rsvp_yes',
          count: r.party ?? 1,
          ...base,
        });
      else if (r.rsvpAt && r.status === 'declined')
        items.push({ id: `d-${r.id}`, at: r.rsvpAt.toISOString(), kind: 'rsvp_no', ...base });
      else if (r.openedAt)
        items.push({ id: `o-${r.id}`, at: r.openedAt.toISOString(), kind: 'opened', ...base });
    }

    const scans = await db
      .select({
        id: scanLog.id,
        result: scanLog.result,
        at: scanLog.scannedAt,
        party: scanLog.partyAdmitted,
        guestId: scanLog.guestId,
        name: guests.displayName,
      })
      .from(scanLog)
      .leftJoin(guests, eq(guests.id, scanLog.guestId))
      .where(and(eq(scanLog.eventId, eventId), inArray(scanLog.result, [...ADMIT, 'duplicate'])))
      .orderBy(desc(scanLog.scannedAt))
      .limit(n);
    for (const s of scans)
      items.push(
        s.result === 'duplicate'
          ? {
              id: `s-${s.id}`,
              at: s.at.toISOString(),
              kind: 'duplicate_scan',
              guestId: s.guestId,
              guestName: s.name,
            }
          : {
              id: `s-${s.id}`,
              at: s.at.toISOString(),
              kind: 'checked_in',
              count: s.party,
              guestId: s.guestId,
              guestName: s.name,
            },
      );

    const failed = await db
      .select({
        id: messageLog.id,
        at: messageLog.createdAt,
        guestId: guests.id,
        name: guests.displayName,
      })
      .from(messageLog)
      .innerJoin(guests, eq(guests.id, messageLog.guestId))
      .where(and(live, eq(messageLog.status, 'failed')))
      .orderBy(desc(messageLog.createdAt))
      .limit(n);
    for (const m of failed)
      items.push({
        id: `f-${m.id}`,
        at: m.at.toISOString(),
        kind: 'message_failed',
        guestId: m.guestId,
        guestName: m.name,
      });

    // money stays out of what a gate agent can read (§2)
    if (role !== 'gate')
      for (const p of (await this.paidContributions(eventId, userId)).slice(0, n))
        items.push({
          id: `p-${p.id}`,
          at: p.paidAt,
          kind: 'payment',
          amount: p.amount,
          guestId: p.guestId,
          guestName: p.guestName,
        });

    return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, n);
  }

  // ---- report (§7.7)

  /** Everything the report needs beyond the funnel stats, which the client already reads. */
  async report(eventId: string, userId: string) {
    await this.manager(eventId, userId);
    const event = await this.event(eventId);
    const db = this.deps.db;
    const inv = await db
      .select({ status: invitations.status, channel: invitations.channelLast })
      .from(invitations)
      .innerJoin(guests, eq(guests.id, invitations.guestId))
      .where(
        and(
          eq(guests.eventId, eventId),
          isNull(guests.deletedAt),
          eq(guests.cardKind, 'invitation'),
        ),
      );
    const channels = (['whatsapp', 'sms', 'print'] as const).map((channel) => {
      const list = inv.filter((r) => r.channel === channel);
      const atLeast = (s: string) => list.filter((r) => (RANK[r.status] ?? 0) >= RANK[s]!).length;
      return {
        channel,
        sent: list.length,
        // a printed card counts as delivered once it is sent to print
        delivered: channel === 'print' ? atLeast('sent') : atLeast('delivered'),
        opened: atLeast('opened'),
        confirmed: list.filter((r) => r.status === 'confirmed' || r.status === 'checked_in').length,
      };
    });
    const arrivals = new Map<string, number>();
    for (const s of await db
      .select({ at: scanLog.scannedAt, party: scanLog.partyAdmitted })
      .from(scanLog)
      .where(and(eq(scanLog.eventId, eventId), inArray(scanLog.result, [...ADMIT])))) {
      const h = hourIn(s.at, event.timezone);
      arrivals.set(h, (arrivals.get(h) ?? 0) + s.party);
    }
    const weeks = new Map<string, number>();
    for (const p of await this.paidContributions(eventId, userId)) {
      const w = weekOf(new Date(p.paidAt));
      weeks.set(w, (weeks.get(w) ?? 0) + p.amount);
    }
    const { totals, guests: rows } = await this.pledgeSvc.summary(eventId, userId);
    const withPledge = rows.filter((r) => r.status && r.status !== 'waived' && r.amount > 0);
    const [target] = await db
      .select({ n: sql<number>`coalesce(sum(${guests.partySizeAllowed}), 0)::int` })
      .from(guests)
      .where(
        and(
          eq(guests.eventId, eventId),
          isNull(guests.deletedAt),
          eq(guests.cardKind, 'invitation'),
        ),
      );
    return {
      channels,
      arrivalsByHour: [...arrivals.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([hour, count]) => ({ hour, count })),
      collectionsByWeek: [...weeks.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, amount]) => ({ week, amount })),
      pledgeReconciliation: {
        pledged: totals.pledged,
        collected: totals.collected,
        outstanding: totals.balance,
        overpaid: withPledge.reduce((n, r) => n + Math.max(0, r.paid - r.amount), 0),
        guestsPaid: withPledge.filter((r) => r.paid >= r.amount).length,
        guestsPartial: withPledge.filter((r) => r.paid > 0 && r.paid < r.amount).length,
        guestsUnpaid: withPledge.filter((r) => r.paid <= 0).length,
      },
      headcountTarget: target?.n ?? 0,
    };
  }

  // ---- one guest's history (§17.4 guest detail)

  async guestMessages(guestId: string, userId: string) {
    await this.guest(guestId, userId);
    const rows = await this.deps.db
      .select()
      .from(messageLog)
      .where(eq(messageLog.guestId, guestId))
      .orderBy(desc(messageLog.createdAt))
      .limit(100);
    return rows.map((m) => ({
      id: m.id,
      guestId: m.guestId,
      channel: m.channel,
      provider: m.provider,
      kind: messageKind(m.kind),
      status: m.status,
      error: m.error,
      cost: m.cost ?? 0,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  private auditView(r: {
    a: typeof auditLog.$inferSelect;
    actor: string | null;
    phone: string | null;
  }) {
    const diff = (r.a.diff ?? {}) as Record<string, unknown>;
    const details =
      typeof diff.note === 'string'
        ? diff.note
        : Object.entries(diff)
            .filter(([, v]) => v !== null && v !== undefined && typeof v !== 'object')
            .map(([k, v]) => `${k}: ${String(v)}`)
            .join(', ');
    return {
      id: r.a.id,
      at: r.a.createdAt.toISOString(),
      // a name if they gave one, otherwise only the last four digits of their phone (§12)
      actorName: r.a.actorId
        ? r.actor?.trim() || (r.phone ? `…${r.phone.slice(-4)}` : 'unknown')
        : 'system',
      action: r.a.action.replace(/^guest\./, ''),
      details,
    };
  }

  async guestAudit(guestId: string, userId: string) {
    await this.guest(guestId, userId);
    const rows = await this.deps.db
      .select({ a: auditLog, actor: users.name, phone: users.phoneE164 })
      .from(auditLog)
      .leftJoin(users, eq(users.id, auditLog.actorId))
      .where(and(eq(auditLog.entity, 'guest'), eq(auditLog.entityId, guestId)))
      .orderBy(desc(auditLog.createdAt))
      .limit(100);
    return rows.map((r) => this.auditView(r));
  }

  async addNote(guestId: string, userId: string, note: string) {
    const g = await this.guest(guestId, userId);
    const text = note.trim();
    if (!text) throw new ApiError('validation', 'Note is empty', { field: 'note' });
    await recordAudit(this.deps.db, {
      eventId: g.eventId,
      actorId: userId,
      action: 'guest.note',
      entity: 'guest',
      entityId: guestId,
      diff: { note: text },
    });
    const [row] = await this.deps.db
      .select({ a: auditLog, actor: users.name, phone: users.phoneE164 })
      .from(auditLog)
      .leftJoin(users, eq(users.id, auditLog.actorId))
      .where(and(eq(auditLog.entityId, guestId), eq(auditLog.action, 'guest.note')))
      .orderBy(desc(auditLog.createdAt))
      .limit(1);
    return this.auditView(row!);
  }

  /** Undo for a soft delete (the "Tendua" snackbar). Refused if the phone is now taken by another guest. */
  async restoreGuest(guestId: string, userId: string) {
    const g = await this.guest(guestId, userId, { deleted: true });
    if (g.phoneE164) {
      const [dupe] = await this.deps.db
        .select({ id: guests.id })
        .from(guests)
        .where(
          and(
            eq(guests.eventId, g.eventId),
            eq(guests.phoneE164, g.phoneE164),
            isNull(guests.deletedAt),
          ),
        );
      if (dupe)
        throw new ApiError('conflict', 'Phone already on the guest list', {
          field: 'phone',
          guestId: dupe.id,
        });
    }
    await this.deps.db.update(guests).set({ deletedAt: null }).where(eq(guests.id, guestId));
    await recordAudit(this.deps.db, {
      eventId: g.eventId,
      actorId: userId,
      action: 'guest.restore',
      entity: 'guest',
      entityId: guestId,
    });
  }

  // ---- the wedding itself

  /**
   * Deletes a wedding for good (owner only), as the "type FUTA" confirmation says: guests, cards,
   * messages, scans and the host's own contribution records go with it. Refused while it holds paid
   * purchases (ADR 042), which are our billing records and would otherwise be deleted with it;
   * archive it instead.
   */
  async deleteEvent(eventId: string, userId: string) {
    const role = await this.eventsSvc.role(eventId, userId);
    if (role !== 'owner') throw new ApiError('forbidden', 'Only the owner can delete the event');
    const event = await this.event(eventId);
    const [paid] = await this.deps.db
      .select({ n: sql<number>`count(*)::int` })
      .from(eventPurchases)
      .where(and(eq(eventPurchases.eventId, eventId), eq(eventPurchases.status, 'paid')));
    if ((paid?.n ?? 0) > 0)
      throw new ApiError('conflict', 'This event has paid purchases; archive it instead', {
        reason: 'has_purchases',
      });
    await this.deps.db.delete(events).where(eq(events.id, eventId));
    await recordAudit(this.deps.db, {
      eventId: null,
      actorId: userId,
      action: 'event.delete',
      entity: 'event',
      entityId: eventId,
      diff: { title: event.title },
    });
  }
}
