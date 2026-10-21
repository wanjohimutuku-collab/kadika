import { and, count, desc, eq, gte, ilike, inArray, isNull, like, ne, or, sql } from 'drizzle-orm';
import {
  auditLog,
  dataRequests,
  eventInvites,
  eventMembers,
  events,
  guests,
  invitations,
  messageLog,
  eventPurchases,
  refreshTokens,
  users,
} from '@harusi/db';
import { maskPhone } from '@harusi/schemas/phone';
import type { Deps } from '../context';
import { ApiError } from '../errors';
import { recordAudit } from './audit';
import { BillingService } from './billing';
import { EventService } from './events';
import { requireStaff, type StaffCaller } from './staff-guard';

type Db = Deps['db'];

const DAY_MS = 86_400_000;
const WINDOW_DAYS = 30;
/** Invitation states that count as "confirmed" on the dashboards (same as the funnel). */
const CONFIRMED = ['confirmed', 'checked_in'] as const;

type EventStatus = (typeof events.$inferSelect)['status'];
type OpsAction =
  | 'reveal_phone'
  | 'suspend'
  | 'reactivate'
  | 'set_plan'
  | 'resolve_request'
  | 'lookup'
  | 'messaging'
  | 'payments'
  | 'branding'
  | 'pricing'
  | 'grant'
  | 'purchase_paid';

const masked = (p: string | null) => (p ? maskPhone(p) : null);
/** `%`, `_` and `\` are LIKE wildcards; a support search must match them literally. */
const likeEscape = (s: string) => s.replace(/[\\%_]/g, (m) => `\\${m}`);
/** A search typed as a phone number is logged with only its last three digits (§12). */
const scrubDigits = (s: string) => s.replace(/\d{5,}/g, (d) => `•••${d.slice(-3)}`);
const day = (col: unknown) => sql<string>`to_char(${col} at time zone 'UTC', 'YYYY-MM-DD')`;

/**
 * The staff panel at /ops (ADR 012): aggregate dashboards for every staff level, and the actions that
 * touch customer data, each checked against the staff level and written to the audit log. Phones
 * leave this service masked, except through `revealPhone`, which needs a reason.
 */
export class OpsService {
  constructor(private deps: Deps) {}

  private get db(): Db {
    return this.deps.db;
  }

  private since() {
    return new Date(this.deps.now().getTime() - WINDOW_DAYS * DAY_MS);
  }

  private async log(
    actorId: string,
    action: Exclude<OpsAction, 'messaging' | 'payments' | 'branding'>,
    entity: string,
    entityId: string | null,
    target: string,
    details: string,
    extra: Record<string, unknown> = {},
    db: Db = this.db,
  ) {
    await recordAudit(db, {
      eventId: null,
      actorId,
      action: `ops.${action}`,
      entity,
      entityId,
      diff: { target, details, ...extra },
    });
  }

  // ---------------------------------------------------------------- customers and weddings

  /** Customer rows (never staff, never deleted accounts) with their usage, phones masked. */
  private async organizerRows(where?: ReturnType<typeof and>) {
    const list = await this.db
      .select()
      .from(users)
      .where(and(eq(users.roleGlobal, 'user'), isNull(users.deletedAt), where));
    if (!list.length) return [];
    const ids = list.map((u) => u.id);
    const evs = await this.db
      .select({ owner: events.ownerId, n: count() })
      .from(events)
      .where(inArray(events.ownerId, ids))
      .groupBy(events.ownerId);
    const gs = await this.db
      .select({ owner: events.ownerId, n: count() })
      .from(guests)
      .innerJoin(events, eq(events.id, guests.eventId))
      .where(and(inArray(events.ownerId, ids), isNull(guests.deletedAt)))
      .groupBy(events.ownerId);
    const ms = await this.db
      .select({ owner: events.ownerId, n: count() })
      .from(messageLog)
      .innerJoin(guests, eq(guests.id, messageLog.guestId))
      .innerJoin(events, eq(events.id, guests.eventId))
      .where(and(inArray(events.ownerId, ids), ne(messageLog.status, 'failed')))
      .groupBy(events.ownerId);
    const of = (rows: { owner: string; n: number }[], id: string) =>
      rows.find((r) => r.owner === id)?.n ?? 0;
    return list.map((u) => ({
      id: u.id,
      name: u.name || '—',
      phoneE164: maskPhone(u.phoneE164),
      status: u.status,
      suspendedReason: u.suspendedReason,
      createdAt: u.createdAt.toISOString(),
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      eventCount: of(evs, u.id),
      guestCount: of(gs, u.id),
      messagesSent: of(ms, u.id),
    }));
  }

  async listOrganizers(caller: StaffCaller) {
    await requireStaff(this.db, caller);
    return (await this.organizerRows()).sort((a, b) =>
      (b.lastLoginAt ?? '').localeCompare(a.lastLoginAt ?? ''),
    );
  }

  private async eventRows(where?: ReturnType<typeof eq>) {
    const list = await this.db
      .select({ e: events, ownerName: users.name })
      .from(events)
      .innerJoin(users, eq(users.id, events.ownerId))
      .where(where)
      .orderBy(desc(events.dateStart));
    if (!list.length) return [];
    const ids = list.map((r) => r.e.id);
    const gs = await this.db
      .select({ id: guests.eventId, n: count() })
      .from(guests)
      .where(and(inArray(guests.eventId, ids), isNull(guests.deletedAt)))
      .groupBy(guests.eventId);
    const ms = await this.db
      .select({
        id: guests.eventId,
        sent: sql<number>`count(*) filter (where ${messageLog.status} <> 'failed')`.mapWith(Number),
        failed: sql<number>`count(*) filter (where ${messageLog.status} = 'failed')`.mapWith(
          Number,
        ),
        cost: sql<number>`coalesce(sum(${messageLog.cost}), 0)`.mapWith(Number),
      })
      .from(messageLog)
      .innerJoin(guests, eq(guests.id, messageLog.guestId))
      .where(inArray(guests.eventId, ids))
      .groupBy(guests.eventId);
    const conf = await this.db
      .select({ id: guests.eventId, n: count() })
      .from(invitations)
      .innerJoin(guests, eq(guests.id, invitations.guestId))
      .where(
        and(
          inArray(guests.eventId, ids),
          isNull(guests.deletedAt),
          inArray(invitations.status, [...CONFIRMED]),
        ),
      )
      .groupBy(guests.eventId);
    return list.map(({ e, ownerName }) => {
      const m = ms.find((r) => r.id === e.id);
      return {
        id: e.id,
        coupleNames: e.coupleNames,
        dateStart: e.dateStart.toISOString(),
        status: e.status,
        plan: e.plan,
        ownerId: e.ownerId,
        ownerName: ownerName || '—',
        guests: gs.find((r) => r.id === e.id)?.n ?? 0,
        sent: m?.sent ?? 0,
        failedMessages: m?.failed ?? 0,
        confirmed: conf.find((r) => r.id === e.id)?.n ?? 0,
        smsCost: m?.cost ?? 0,
      };
    });
  }

  async listEvents(caller: StaffCaller) {
    await requireStaff(this.db, caller);
    return this.eventRows();
  }

  async overview(caller: StaffCaller) {
    await requireStaff(this.db, caller);
    const since = this.since();
    const [cust] = await this.db
      .select({
        total: count(),
        suspended: sql<number>`count(*) filter (where ${users.status} = 'suspended')`.mapWith(
          Number,
        ),
        fresh: sql<number>`count(*) filter (where ${users.createdAt} >= ${since})`.mapWith(Number),
      })
      .from(users)
      .where(and(eq(users.roleGlobal, 'user'), isNull(users.deletedAt)));
    const byStatus = await this.db
      .select({ status: events.status, n: count() })
      .from(events)
      .groupBy(events.status);
    const eventCounts: Record<EventStatus, number> & { total: number } = {
      total: 0,
      draft: 0,
      active: 0,
      completed: 0,
      archived: 0,
    };
    for (const r of byStatus) {
      eventCounts[r.status] = r.n;
      eventCounts.total += r.n;
    }
    const [paidPlans] = await this.db
      .select({ n: count() })
      .from(events)
      .where(eq(events.plan, 'paid'));
    const [guestCount] = await this.db
      .select({ n: count() })
      .from(guests)
      .where(isNull(guests.deletedAt));
    const [msg] = await this.db
      .select({
        total: count(),
        whatsapp: sql<number>`count(*) filter (where ${messageLog.channel} = 'whatsapp')`.mapWith(
          Number,
        ),
        sms: sql<number>`count(*) filter (where ${messageLog.channel} = 'sms')`.mapWith(Number),
        failed: sql<number>`count(*) filter (where ${messageLog.status} = 'failed')`.mapWith(
          Number,
        ),
        cost: sql<number>`coalesce(sum(${messageLog.cost}), 0)`.mapWith(Number),
      })
      .from(messageLog)
      .where(gte(messageLog.createdAt, since));
    const d = day(messageLog.createdAt);
    const perDay = await this.db
      .select({
        day: d,
        sent: sql<number>`count(*) filter (where ${messageLog.status} <> 'failed')`.mapWith(Number),
        failed: sql<number>`count(*) filter (where ${messageLog.status} = 'failed')`.mapWith(
          Number,
        ),
      })
      .from(messageLog)
      .where(gte(messageLog.createdAt, since))
      .groupBy(d)
      .orderBy(d);
    const [open] = await this.db
      .select({ n: count() })
      .from(dataRequests)
      .where(eq(dataRequests.status, 'open'));
    const total = msg?.total ?? 0;
    return {
      organizers: cust?.total ?? 0,
      suspendedOrganizers: cust?.suspended ?? 0,
      newOrganizers30d: cust?.fresh ?? 0,
      events: eventCounts,
      guests: guestCount?.n ?? 0,
      messages30d: {
        whatsapp: msg?.whatsapp ?? 0,
        sms: msg?.sms ?? 0,
        failed: msg?.failed ?? 0,
        total,
      },
      smsCost30d: msg?.cost ?? 0,
      failureRate30d: total ? (msg?.failed ?? 0) / total : 0,
      paidPlans: paidPlans?.n ?? 0,
      messagesByDay: perDay.map((r) => ({ day: r.day, sent: r.sent, failed: r.failed })),
      openDataRequests: open?.n ?? 0,
    };
  }

  async usage(caller: StaffCaller) {
    await requireStaff(this.db, caller);
    const since = this.since();
    const window = and(
      gte(messageLog.createdAt, since),
      inArray(messageLog.channel, ['whatsapp', 'sms']),
    );
    const filtered = (cond: ReturnType<typeof sql>) =>
      sql<number>`count(*) filter (where ${cond})`.mapWith(Number);
    const ok = sql`${messageLog.status} <> 'failed'`;
    const failed = sql`${messageLog.status} = 'failed'`;
    const byChannel = await this.db
      .select({
        channel: messageLog.channel,
        sent: count(),
        delivered: filtered(sql`${messageLog.status} in ('delivered', 'read')`),
        failed: filtered(failed),
        cost: sql<number>`coalesce(sum(${messageLog.cost}), 0)`.mapWith(Number),
      })
      .from(messageLog)
      .where(window)
      .groupBy(messageLog.channel);
    const d = day(messageLog.createdAt);
    const counts = {
      whatsapp: filtered(sql`${ok} and ${messageLog.channel} = 'whatsapp'`),
      sms: filtered(sql`${ok} and ${messageLog.channel} = 'sms'`),
      failed: filtered(failed),
    };
    const byDay = await this.db
      .select({ day: d, ...counts })
      .from(messageLog)
      .where(window)
      .groupBy(d)
      .orderBy(d);
    const total = sql<number>`count(*)`.mapWith(Number);
    const topEvents = await this.db
      .select({
        eventId: events.id,
        coupleNames: events.coupleNames,
        ...counts,
        cost: sql<number>`coalesce(sum(${messageLog.cost}), 0)`.mapWith(Number),
        total,
      })
      .from(messageLog)
      .innerJoin(guests, eq(guests.id, messageLog.guestId))
      .innerJoin(events, eq(events.id, guests.eventId))
      .where(window)
      .groupBy(events.id, events.coupleNames)
      .orderBy(desc(sql`count(*)`))
      .limit(8);
    const reasons = await this.db
      .select({ reason: messageLog.error, count: count() })
      .from(messageLog)
      .where(and(window, sql`${messageLog.error} is not null`))
      .groupBy(messageLog.error)
      .orderBy(desc(count()));
    const channel = (c: 'whatsapp' | 'sms') => {
      const r = byChannel.find((x) => x.channel === c);
      return {
        channel: c,
        sent: r?.sent ?? 0,
        delivered: r?.delivered ?? 0,
        failed: r?.failed ?? 0,
        cost: r?.cost ?? 0,
      };
    };
    return {
      byChannel: [channel('whatsapp'), channel('sms')],
      byDay,
      topEvents: topEvents.map(({ total: _t, ...e }) => e),
      failureReasons: reasons.map((r) => ({ reason: r.reason ?? '', count: r.count })),
    };
  }

  // ---------------------------------------------------------------- support lookup
  // Guests' contribution records are the host's (ADR 043): staff search finds billing orders, not them.

  /** Support search by name, phone digits, card code or order reference. Every search is logged. */
  async lookup(caller: StaffCaller, query: string) {
    const staff = await requireStaff(this.db, caller, 'lookup');
    const q = query.trim().toLowerCase();
    if (q.length < 3) return { organizers: [], guests: [], orders: [] };
    const digits = q.replace(/\D/g, '').replace(/^0/, '');
    const code = q.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const name = `%${likeEscape(q)}%`;
    const phoneLike = (col: typeof users.phoneE164 | typeof guests.phoneE164) =>
      digits.length >= 3 ? like(col, `%${digits}%`) : undefined;

    const organizers = await this.organizerRows(
      or(ilike(users.name, name), phoneLike(users.phoneE164)),
    );
    const guestRows = await this.db
      .select({
        g: guests,
        coupleNames: events.coupleNames,
        status: invitations.status,
      })
      .from(guests)
      .innerJoin(events, eq(events.id, guests.eventId))
      .leftJoin(invitations, eq(invitations.guestId, guests.id))
      .where(
        and(
          isNull(guests.deletedAt),
          or(
            ilike(guests.displayName, name),
            phoneLike(guests.phoneE164),
            code.length >= 4 ? sql`replace(${guests.shortCode}, '-', '') = ${code}` : undefined,
          ),
        ),
      )
      .limit(25);
    const orderIds = await this.db
      .select({ id: eventPurchases.id })
      .from(eventPurchases)
      .innerJoin(events, eq(events.id, eventPurchases.eventId))
      .where(or(sql`lower(${eventPurchases.providerRef}) = ${q}`, ilike(events.coupleNames, name)))
      .orderBy(desc(eventPurchases.createdAt))
      .limit(25);
    const orders = (
      await new BillingService(this.deps, new EventService(this.deps)).opsListPurchases(caller)
    ).filter((o) => orderIds.some((r) => r.id === o.id));
    await this.log(
      staff.id,
      'lookup',
      'support',
      null,
      'support',
      `Utafutaji: "${scrubDigits(q.slice(0, 40))}"`,
    );
    return {
      organizers,
      guests: guestRows.map((r) => ({
        guestId: r.g.id,
        eventId: r.g.eventId,
        coupleNames: r.coupleNames,
        displayName: r.g.displayName,
        phoneMasked: masked(r.g.phoneE164),
        shortCode: r.g.shortCode,
        status: r.status ?? 'created',
      })),
      orders,
    };
  }

  /** The full number, once, for a written reason (≥ 5 characters) that goes to the audit log. */
  async revealPhone(
    caller: StaffCaller,
    target: { kind: 'guest' | 'organizer'; id: string },
    reason: string,
  ) {
    const staff = await requireStaff(this.db, caller, 'reveal');
    const why = reason.trim();
    if (why.length < 5) throw new ApiError('validation', 'reason_required', { field: 'reason' });
    let label: string;
    let phone: string | null;
    if (target.kind === 'guest') {
      const [g] = await this.db
        .select()
        .from(guests)
        .where(and(eq(guests.id, target.id), isNull(guests.deletedAt)));
      label = g?.displayName ?? '';
      phone = g?.phoneE164 ?? null;
    } else {
      const [u] = await this.db
        .select()
        .from(users)
        .where(and(eq(users.id, target.id), eq(users.roleGlobal, 'user'), isNull(users.deletedAt)));
      label = u ? u.name || maskPhone(u.phoneE164) : '';
      phone = u?.phoneE164 ?? null;
    }
    if (!phone) throw new ApiError('not_found', 'No phone number to show');
    await this.log(
      staff.id,
      'reveal_phone',
      target.kind === 'guest' ? 'guest' : 'user',
      target.id,
      label,
      why,
    );
    return { phoneE164: phone };
  }

  // ---------------------------------------------------------------- account and plan changes

  /** Suspends or reactivates a customer. Staff accounts cannot be suspended from here. */
  async setUserStatus(
    caller: StaffCaller,
    targetId: string,
    status: 'active' | 'suspended',
    reason: string,
  ) {
    const staff = await requireStaff(this.db, caller, 'suspend');
    const why = reason.trim();
    const [u] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, targetId), eq(users.roleGlobal, 'user'), isNull(users.deletedAt)));
    if (!u) throw new ApiError('not_found', 'Customer not found');
    if (status === 'suspended' && why.length < 5)
      throw new ApiError('validation', 'reason_required', { field: 'reason' });
    await this.db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ status, suspendedReason: status === 'suspended' ? why : null })
        .where(eq(users.id, u.id));
      // The access-token check already refuses a suspended account; this ends their sessions too.
      if (status === 'suspended')
        await tx
          .update(refreshTokens)
          .set({ revokedAt: this.deps.now() })
          .where(and(eq(refreshTokens.userId, u.id), isNull(refreshTokens.revokedAt)));
      await this.log(
        staff.id,
        status === 'suspended' ? 'suspend' : 'reactivate',
        'user',
        u.id,
        u.name || maskPhone(u.phoneE164),
        why || '—',
        {},
        tx as Db,
      );
    });
    const [row] = await this.organizerRows(eq(users.id, u.id));
    return row!;
  }

  /** Billing is manual (ADR 012): staff mark a wedding as paid or free. */
  async setEventPlan(caller: StaffCaller, eventId: string, plan: 'free' | 'paid') {
    const staff = await requireStaff(this.db, caller, 'plan');
    const [e] = await this.db.select().from(events).where(eq(events.id, eventId));
    if (!e) throw new ApiError('not_found', 'Event not found');
    if (e.plan !== plan) {
      await this.db.update(events).set({ plan }).where(eq(events.id, e.id));
      await this.log(staff.id, 'set_plan', 'event', e.id, e.coupleNames, `Mpango: ${plan}`, {
        plan: { from: e.plan, to: plan },
      });
    }
    const [row] = await this.eventRows(eq(events.id, e.id));
    return row!;
  }

  // ---------------------------------------------------------------- staff audit log

  async listAudit(caller: StaffCaller) {
    await requireStaff(this.db, caller);
    const rows = await this.db
      .select({ a: auditLog, name: users.name, phone: users.phoneE164 })
      .from(auditLog)
      .leftJoin(users, eq(users.id, auditLog.actorId))
      .where(like(auditLog.action, 'ops.%'))
      .orderBy(desc(auditLog.createdAt))
      .limit(500);
    return rows.map(({ a, name, phone }) => {
      const [, kind = '', sub = ''] = a.action.split('.');
      const diff = (a.diff ?? {}) as Record<string, unknown>;
      // The settings pages (ADR 031, 036) log `ops.<area>.<what>` without a target or details line.
      const settings = kind === 'messaging' || kind === 'payments' || kind === 'branding';
      const provider = (diff.provider as { to?: string } | undefined)?.to;
      return {
        id: a.id,
        at: a.createdAt.toISOString(),
        actorName: name?.trim() || (phone ? `…${phone.slice(-4)}` : '—'),
        action: kind as OpsAction,
        target: typeof diff.target === 'string' ? diff.target : (a.entityId ?? ''),
        details:
          typeof diff.details === 'string'
            ? diff.details
            : settings
              ? [sub, provider].filter(Boolean).join(': ')
              : '',
      };
    });
  }

  // ---------------------------------------------------------------- PDPA data requests

  private requestRow(r: typeof dataRequests.$inferSelect, resolver: string | null) {
    return {
      id: r.id,
      userId: r.userId,
      userName: r.userName,
      phoneE164: r.phoneE164 ? maskPhone(r.phoneE164) : '—',
      kind: r.kind,
      status: r.status,
      requestedAt: r.createdAt.toISOString(),
      resolvedAt: r.resolvedAt?.toISOString() ?? null,
      resolvedBy: resolver,
      note: r.note,
    };
  }

  /** A customer asks for their data or for their account to be deleted (Akaunti). Repeats reuse the open one. */
  async fileRequest(userId: string, kind: 'export' | 'deletion') {
    const [open] = await this.db
      .select()
      .from(dataRequests)
      .where(
        and(
          eq(dataRequests.userId, userId),
          eq(dataRequests.kind, kind),
          eq(dataRequests.status, 'open'),
        ),
      );
    if (open) return { requestedAt: open.createdAt.toISOString() };
    const [u] = await this.db.select().from(users).where(eq(users.id, userId));
    if (!u) throw new ApiError('unauthorized', 'Unknown user');
    const [row] = await this.db
      .insert(dataRequests)
      .values({ userId, userName: u.name || maskPhone(u.phoneE164), phoneE164: u.phoneE164, kind })
      .returning();
    return { requestedAt: row!.createdAt.toISOString() };
  }

  async listRequests(caller: StaffCaller) {
    await requireStaff(this.db, caller);
    const rows = await this.db
      .select({ r: dataRequests, resolver: users.name })
      .from(dataRequests)
      .leftJoin(users, eq(users.id, dataRequests.resolvedBy))
      .orderBy(sql`${dataRequests.status} <> 'open'`, desc(dataRequests.createdAt))
      .limit(500);
    return rows.map((x) => this.requestRow(x.r, x.resolver));
  }

  /**
   * Closes a request. Completing a deletion wipes the account (name and phone gone, sessions ended,
   * team places removed, pending invitations to that phone dropped) and archives the weddings it
   * owns; guests' cards keep working, as with a suspension (ADR 012, 039).
   */
  async resolveRequest(caller: StaffCaller, id: string, status: 'done' | 'rejected', note: string) {
    const staff = await requireStaff(this.db, caller, 'requests');
    const [r] = await this.db.select().from(dataRequests).where(eq(dataRequests.id, id));
    if (!r) throw new ApiError('not_found', 'Request not found');
    if (r.status !== 'open') throw new ApiError('conflict', 'already_resolved');
    const text = note.trim();
    const now = this.deps.now();
    await this.db.transaction(async (tx) => {
      await tx
        .update(dataRequests)
        .set({ status, note: text, resolvedAt: now, resolvedBy: staff.id })
        .where(eq(dataRequests.id, r.id));
      if (status === 'done' && r.kind === 'deletion') await this.deleteAccount(tx as Db, r.userId);
      await this.log(
        staff.id,
        'resolve_request',
        'data_request',
        r.id,
        r.userName,
        `${r.kind}: ${status}${text ? ` — ${text}` : ''}`,
        {},
        tx as Db,
      );
    });
    const [after] = await this.db.select().from(dataRequests).where(eq(dataRequests.id, r.id));
    return this.requestRow(after!, staff.name);
  }

  private async deleteAccount(db: Db, userId: string) {
    const [u] = await db.select().from(users).where(eq(users.id, userId));
    if (!u || u.deletedAt) return;
    const now = this.deps.now();
    await db
      .update(users)
      .set({
        name: '',
        // phone_e164 is unique and required; this placeholder can never match a real login.
        phoneE164: `deleted:${u.id}`,
        email: null,
        status: 'suspended',
        suspendedReason: 'deleted',
        deletedAt: now,
      })
      .where(eq(users.id, u.id));
    await db
      .update(refreshTokens)
      .set({ revokedAt: now })
      .where(and(eq(refreshTokens.userId, u.id), isNull(refreshTokens.revokedAt)));
    await db.delete(eventMembers).where(eq(eventMembers.userId, u.id));
    await db.delete(eventInvites).where(eq(eventInvites.phoneE164, u.phoneE164));
    await db.update(events).set({ status: 'archived' }).where(eq(events.ownerId, u.id));
    await db.update(dataRequests).set({ phoneE164: null }).where(eq(dataRequests.userId, u.id));
  }
}
