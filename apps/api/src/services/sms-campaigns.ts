import { and, asc, count, desc, eq, inArray, isNull, lte, ne, sql } from 'drizzle-orm';
import { events, guests, messageLog, newId, smsCampaigns, users } from '@harusi/db';
import { renderTemplate } from '@harusi/schemas/card-content';
import { maskPhone } from '@harusi/schemas/phone';
import {
  SMS_MAX_PENDING,
  SMS_MAX_SEGMENTS,
  smsCampaignProblem,
  smsSegments,
  type OpsSmsCustomer,
  type SmsCampaignPreview,
  type SmsCampaignView,
  type SmsTarget,
} from '@harusi/schemas/sms';
import { smsCampaignVars } from './messages';
import type { Deps } from '../context';
import { ApiError } from '../errors';
import { routeCountry, smsFor } from '../sms-routing';
import { recordAudit } from './audit';
import { BillingService } from './billing';
import type { EventService } from './events';
import { requireStaff, type StaffCaller } from './staff-guard';
import { safeErrorMessage } from '../observability';

type Row = typeof smsCampaigns.$inferSelect;
type Guest = typeof guests.$inferSelect;

/** The message kind every campaign SMS is logged with; it spends reminder credits (ADR 042). */
export const SMS_CAMPAIGN_KIND = 'sms_campaign';
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [500, 2_000];
const MIN_LEAD_MS = 60_000;
/** Nothing is scheduled more than a year ahead. */
const MAX_AHEAD_MS = 366 * 24 * 3_600_000;
const STUCK_AFTER_MS = 30 * 60_000;
/** A reminder this late is not sent: "tomorrow is the meeting" is wrong a day later. */
const MISSED_AFTER_MS = 24 * 3_600_000;

const view = (r: Row): SmsCampaignView => ({
  id: r.id,
  eventId: r.eventId,
  body: r.body,
  target: r.target as SmsTarget,
  status: r.status,
  scheduledFor: r.scheduledFor?.toISOString() ?? null,
  segments: r.segments,
  recipientCount: r.recipientCount,
  sent: r.sentCount,
  failed: r.failedCount,
  skipped: r.skippedCount,
  credits: r.status === 'done' ? r.sentCount * r.segments : r.recipientCount * r.segments,
  error: r.error,
  createdAt: r.createdAt.toISOString(),
  finishedAt: r.finishedAt?.toISOString() ?? null,
});

/**
 * SMS reminders only (ADR 055): a customer with `events.product = 'sms'` writes their own text and sends
 * it to their contacts (the event's guests) now or at a set time. Each SMS part spends one reminder
 * credit, refused up front (402) when credits are short and enforcement is on. Every message is logged
 * in `message_log`, so usage, staff reports and delivery reports work as for the card product.
 */
export class SmsCampaignService {
  constructor(
    private deps: Deps,
    private eventsSvc: EventService,
  ) {}

  private billingSvc?: BillingService;
  private get billing(): BillingService {
    return (this.billingSvc ??= new BillingService(this.deps, this.eventsSvc));
  }

  /** Members other than gate agents, on an SMS-only event. */
  private async smsEvent(eventId: string, userId: string) {
    const role = await this.eventsSvc.role(eventId, userId);
    if (role === 'gate') throw new ApiError('forbidden', 'Gate agents cannot send messages');
    const [event] = await this.deps.db.select().from(events).where(eq(events.id, eventId));
    if (!event) throw new ApiError('not_found', 'Event not found');
    if (event.product !== 'sms')
      throw new ApiError('conflict', 'Custom SMS sends are for SMS reminder accounts', {
        reason: 'not_sms_product',
      });
    return event;
  }

  private checkBody(body: string, sample?: string) {
    if (body.trim().length < 2)
      throw new ApiError('validation', 'Write the message', { field: 'body' });
    const problem = smsCampaignProblem(body);
    if (problem) throw new ApiError('validation', problem, { field: 'body', reason: problem });
    const seg = smsSegments(sample ?? body);
    if (seg.segments > SMS_MAX_SEGMENTS)
      throw new ApiError('validation', `At most ${SMS_MAX_SEGMENTS} SMS parts`, {
        field: 'body',
        reason: 'body.tooLong',
      });
    return seg;
  }

  /** Contacts the target matches: who gets the text, and how many are left out (no phone, opted out). */
  private async audience(eventId: string, target: SmsTarget) {
    const rows = await this.deps.db
      .select()
      .from(guests)
      .where(
        and(
          eq(guests.eventId, eventId),
          isNull(guests.deletedAt),
          target === 'all'
            ? undefined
            : 'group' in target
              ? eq(guests.groupLabel, target.group)
              : inArray(guests.id, target.guestIds),
        ),
      );
    const reachable = rows.filter((g) => g.phoneE164 && !g.remindersOptOut);
    return { reachable, skipped: rows.length - reachable.length };
  }

  async preview(
    eventId: string,
    userId: string,
    input: { body: string; target: SmsTarget },
  ): Promise<SmsCampaignPreview> {
    const event = await this.smsEvent(eventId, userId);
    const { reachable, skipped } = await this.audience(eventId, input.target);
    const sample =
      input.body.trim() && reachable[0]
        ? renderTemplate(input.body, smsCampaignVars(event, reachable[0])) || ' '
        : input.body || ' ';
    const seg = smsSegments(sample);
    return {
      recipients: reachable.length,
      withoutPhone: skipped,
      segments: seg.segments,
      encoding: seg.encoding,
      credits: reachable.length * seg.segments,
      remaining: await this.billing.messagesLeft(eventId),
    };
  }

  async create(
    eventId: string,
    userId: string,
    input: { body: string; target: SmsTarget; scheduleAt?: Date },
  ): Promise<SmsCampaignView> {
    const event = await this.smsEvent(eventId, userId);
    const body = input.body.trim();
    this.checkBody(body);
    const now = this.deps.now();
    if (input.scheduleAt) {
      const at = input.scheduleAt.getTime();
      if (at < now.getTime() + MIN_LEAD_MS)
        throw new ApiError('validation', 'Pick a time at least a minute from now', {
          field: 'scheduleAt',
        });
      if (at > now.getTime() + MAX_AHEAD_MS)
        throw new ApiError('validation', 'Pick a time within a year', { field: 'scheduleAt' });
      const [pending] = await this.deps.db
        .select({ n: count() })
        .from(smsCampaigns)
        .where(and(eq(smsCampaigns.eventId, eventId), eq(smsCampaigns.status, 'scheduled')));
      if ((pending?.n ?? 0) >= SMS_MAX_PENDING)
        throw new ApiError('conflict', `At most ${SMS_MAX_PENDING} sends can wait at once`, {
          limit: SMS_MAX_PENDING,
        });
    }
    const { reachable, skipped } = await this.audience(eventId, input.target);
    if (reachable.length === 0)
      throw new ApiError('validation', 'No contact with a phone number matches', {
        field: 'target',
        reason: 'no_recipients',
      });
    const seg = this.checkBody(
      body,
      renderTemplate(body, smsCampaignVars(event, reachable[0]!)) || body,
    );
    await this.billing.assertCanUse(eventId, { messages: reachable.length * seg.segments });
    const [row] = await this.deps.db
      .insert(smsCampaigns)
      .values({
        id: newId(),
        eventId,
        createdBy: userId,
        body,
        target: input.target,
        status: input.scheduleAt ? 'scheduled' : 'running',
        scheduledFor: input.scheduleAt ?? null,
        segments: seg.segments,
        recipientCount: reachable.length,
        skippedCount: skipped,
        startedAt: input.scheduleAt ? null : now,
      })
      .returning();
    await recordAudit(this.deps.db, {
      eventId,
      actorId: userId,
      action: input.scheduleAt ? 'sms.schedule' : 'sms.send',
      entity: 'sms_campaign',
      entityId: row!.id,
      diff: {
        recipients: reachable.length,
        segments: seg.segments,
        scheduledFor: input.scheduleAt?.toISOString() ?? null,
      },
    });
    if (input.scheduleAt) return view(row!);
    return view(await this.execute(row!, event));
  }

  /** Sends to everyone the audience matches now, spending credits per part; returns the finished row. */
  private async execute(row: Row, event: typeof events.$inferSelect): Promise<Row> {
    const finish = async (patch: Partial<Row>) => {
      const [done] = await this.deps.db
        .update(smsCampaigns)
        .set({ status: 'done', finishedAt: this.deps.now(), ...patch })
        .where(eq(smsCampaigns.id, row.id))
        .returning();
      return done!;
    };
    if (event.deletedAt) return finish({ error: 'event_deleted' });
    if (event.country !== 'TZ' && this.deps.config.kenyaSendingPaused)
      return finish({ error: 'sending paused' });
    const { reachable, skipped } = await this.audience(row.eventId, row.target as SmsTarget);
    const budget = await this.billing.budget(row.eventId);
    const out = { sent: 0, failed: 0, skipped };
    let error: string | null = null;
    let lastError: string | null = null;
    const take = () => {
      for (let i = 0; i < row.segments; i++) {
        if (budget.takeMessage()) continue;
        for (let j = 0; j < i; j++) budget.refundMessage();
        return false;
      }
      return true;
    };
    const refund = () => {
      for (let i = 0; i < row.segments; i++) budget.refundMessage();
    };
    for (const g of reachable) {
      if (!take()) {
        error = 'quota_exceeded';
        out.skipped += reachable.length - out.sent - out.failed;
        break;
      }
      const r = await this.deliver(g, row, event);
      if (r.ok) out.sent++;
      else {
        refund(); // a failed SMS is not charged
        out.failed++;
        lastError = r.error;
      }
    }
    // When nothing went out, say why (e.g. no SMS gateway configured); single failures show in counts.
    if (!error && out.sent === 0 && lastError) error = lastError;
    await recordAudit(this.deps.db, {
      eventId: row.eventId,
      actorId: row.createdBy,
      action: 'sms.run',
      entity: 'sms_campaign',
      entityId: row.id,
      diff: { ...out, error },
    });
    return finish({
      sentCount: out.sent,
      failedCount: out.failed,
      skippedCount: out.skipped,
      recipientCount: reachable.length,
      error,
    });
  }

  private async deliver(
    g: Guest,
    row: Row,
    event: typeof events.$inferSelect,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const to = g.phoneE164!;
    const p = smsFor(this.deps, routeCountry(to, event.country));
    const text = renderTemplate(row.body, smsCampaignVars(event, g)) || row.body;
    const log = (r: { ok: true; id: string; cost?: number } | { ok: false; error: string }) =>
      this.deps.db.insert(messageLog).values({
        id: newId(),
        guestId: g.id,
        channel: 'sms',
        kind: SMS_CAMPAIGN_KIND,
        provider: p?.name ?? 'none',
        providerMsgId: r.ok ? r.id : null,
        status: r.ok ? 'sent' : 'failed',
        error: r.ok ? null : r.error,
        cost: r.ok ? (r.cost ?? null) : null,
        segments: row.segments,
        campaignId: row.id,
      });
    if (!p) {
      await log({ ok: false, error: 'no provider configured' });
      return { ok: false, error: 'no provider configured' };
    }
    const sleep = this.deps.sleep ?? ((ms) => new Promise<void>((r) => setTimeout(r, ms)));
    let error = 'unknown error';
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      try {
        const sent = await p.send(to, text);
        await log({ ok: true, id: sent.providerMsgId, cost: sent.cost });
        return { ok: true };
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
        if (i < MAX_ATTEMPTS - 1) await sleep(BACKOFF_MS[i] ?? 2_000);
      }
    }
    await log({ ok: false, error });
    return { ok: false, error };
  }

  /** Newest first. */
  async list(eventId: string, userId: string): Promise<SmsCampaignView[]> {
    await this.smsEvent(eventId, userId);
    const rows = await this.deps.db
      .select()
      .from(smsCampaigns)
      .where(eq(smsCampaigns.eventId, eventId))
      .orderBy(desc(smsCampaigns.createdAt))
      .limit(100);
    return rows.map(view);
  }

  async cancel(eventId: string, id: string, userId: string): Promise<SmsCampaignView> {
    await this.smsEvent(eventId, userId);
    const [row] = await this.deps.db
      .update(smsCampaigns)
      .set({ status: 'cancelled', finishedAt: this.deps.now() })
      .where(
        and(
          eq(smsCampaigns.id, id),
          eq(smsCampaigns.eventId, eventId),
          eq(smsCampaigns.status, 'scheduled'),
        ),
      )
      .returning();
    if (!row) {
      const [existing] = await this.deps.db
        .select({ id: smsCampaigns.id })
        .from(smsCampaigns)
        .where(and(eq(smsCampaigns.id, id), eq(smsCampaigns.eventId, eventId)));
      if (!existing) throw new ApiError('not_found', 'Send not found');
      throw new ApiError('conflict', 'This send has already started or finished');
    }
    await recordAudit(this.deps.db, {
      eventId,
      actorId: userId,
      action: 'sms.cancel',
      entity: 'sms_campaign',
      entityId: id,
    });
    return view(row);
  }

  /**
   * Runs what has come due. Each row is claimed with a conditional update, so two instances never send
   * the same campaign twice; a run that died is put back in line after 30 minutes.
   */
  async runDue(limit = 10): Promise<{ ran: number; missed: number }> {
    const now = this.deps.now();
    const out = { ran: 0, missed: 0 };
    await this.deps.db
      .update(smsCampaigns)
      .set({ status: 'scheduled', startedAt: null })
      .where(
        and(
          eq(smsCampaigns.status, 'running'),
          sql`${smsCampaigns.scheduledFor} is not null`,
          lte(smsCampaigns.startedAt, new Date(now.getTime() - STUCK_AFTER_MS)),
        ),
      );
    const due = await this.deps.db
      .select({ id: smsCampaigns.id })
      .from(smsCampaigns)
      .where(and(eq(smsCampaigns.status, 'scheduled'), lte(smsCampaigns.scheduledFor, now)))
      .orderBy(asc(smsCampaigns.scheduledFor))
      .limit(limit);
    for (const { id } of due) {
      const [row] = await this.deps.db
        .update(smsCampaigns)
        .set({ status: 'running', startedAt: now })
        .where(and(eq(smsCampaigns.id, id), eq(smsCampaigns.status, 'scheduled')))
        .returning();
      if (!row) continue; // another instance took it
      if (now.getTime() - row.scheduledFor!.getTime() > MISSED_AFTER_MS) {
        await this.deps.db
          .update(smsCampaigns)
          .set({ status: 'done', error: 'missed', finishedAt: now })
          .where(eq(smsCampaigns.id, id));
        out.missed++;
        continue;
      }
      const [event] = await this.deps.db.select().from(events).where(eq(events.id, row.eventId));
      try {
        await this.execute(row, event!);
        out.ran++;
      } catch (e) {
        await this.deps.db
          .update(smsCampaigns)
          .set({
            status: 'done',
            // shown to the customer: never a failed query's bound values
            error: safeErrorMessage(e),
            finishedAt: this.deps.now(),
          })
          .where(eq(smsCampaigns.id, id));
        if (!(e instanceof ApiError)) this.deps.reportError?.(e as Error);
      }
    }
    return out;
  }

  /** Staff (ADR 055): every SMS-only customer with contacts, credits and recent sends. */
  async opsCustomers(caller: StaffCaller): Promise<OpsSmsCustomer[]> {
    await requireStaff(this.deps.db, caller);
    const list = await this.deps.db
      .select({ e: events, ownerName: users.name, ownerPhone: users.phoneE164 })
      .from(events)
      .innerJoin(users, eq(users.id, events.ownerId))
      .where(and(eq(events.product, 'sms'), isNull(events.deletedAt)))
      .orderBy(desc(events.createdAt));
    if (!list.length) return [];
    const ids = list.map((r) => r.e.id);
    const since = new Date(this.deps.now().getTime() - 30 * 24 * 3_600_000);
    const contacts = await this.deps.db
      .select({ id: guests.eventId, n: count() })
      .from(guests)
      .where(and(inArray(guests.eventId, ids), isNull(guests.deletedAt)))
      .groupBy(guests.eventId);
    const camp = await this.deps.db
      .select({
        id: smsCampaigns.eventId,
        n: count(),
        scheduled:
          sql<number>`count(*) filter (where ${smsCampaigns.status} = 'scheduled')`.mapWith(Number),
      })
      .from(smsCampaigns)
      .where(inArray(smsCampaigns.eventId, ids))
      .groupBy(smsCampaigns.eventId);
    const sent = await this.deps.db
      .select({
        id: guests.eventId,
        total: sql<number>`coalesce(sum(${messageLog.segments}), 0)`.mapWith(Number),
        recent:
          sql<number>`coalesce(sum(${messageLog.segments}) filter (where ${messageLog.createdAt} >= ${since}), 0)`.mapWith(
            Number,
          ),
        last: sql<string | null>`max(${messageLog.createdAt})`,
      })
      .from(messageLog)
      .innerJoin(guests, eq(guests.id, messageLog.guestId))
      .where(and(inArray(guests.eventId, ids), ne(messageLog.status, 'failed')))
      .groupBy(guests.eventId);
    const catalog = await this.billing.catalog();
    const out: OpsSmsCustomer[] = [];
    for (const { e, ownerName, ownerPhone } of list) {
      const allowance = await this.billing.allowance(e.id, catalog);
      const used = await this.billing.usage(e.id);
      const s = sent.find((r) => r.id === e.id);
      const c = camp.find((r) => r.id === e.id);
      out.push({
        eventId: e.id,
        title: e.title,
        ownerName: ownerName || '—',
        ownerPhone: maskPhone(ownerPhone),
        country: e.country,
        status: e.status,
        contacts: contacts.find((r) => r.id === e.id)?.n ?? 0,
        campaigns: c?.n ?? 0,
        scheduled: c?.scheduled ?? 0,
        smsSent: s?.total ?? 0,
        smsSent30d: s?.recent ?? 0,
        lastSentAt: s?.last ? new Date(s.last).toISOString() : null,
        allowance: allowance.messages,
        used: used.messages,
        remaining: Math.max(0, allowance.messages - used.messages),
        createdAt: e.createdAt.toISOString(),
      });
    }
    return out;
  }
}
