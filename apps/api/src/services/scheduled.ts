import { and, asc, desc, eq, lte, sql } from 'drizzle-orm';
import { events, newId, scheduledSends } from '@harusi/db';
import type { CardKind } from '@harusi/schemas';
import type { Deps } from '../context';
import { ApiError } from '../errors';
import { recordAudit } from './audit';
import {
  assertCardKindFits,
  assertContributionsOpen,
  assertTargetFits,
  type DeliveryService,
  type SendInput,
  type SendKind,
} from './delivery';
import type { SendSummary, SendTarget } from './delivery';
import type { EventService } from './events';

type Row = typeof scheduledSends.$inferSelect;

/** Pending sends per wedding: enough for a plan of reminders, too few to be used as a spam queue. */
const MAX_PENDING = 20;
const MIN_LEAD_MS = 60_000;
/** A run that started this long ago and never finished is put back in line (its guests are de-duplicated). */
const STUCK_AFTER_MS = 30 * 60_000;
/** A send this far past its time is not sent: "remind them the day before" is wrong a day later. */
const MISSED_AFTER_MS = 24 * 3_600_000;

export interface ScheduleInput {
  kind: SendKind;
  /** Which cards the send is for; left out, both kinds match (ADR 040). */
  cardKind?: CardKind;
  target: SendTarget;
  channel?: 'auto' | 'whatsapp' | 'sms';
  scheduledFor: Date;
}

export interface ScheduledSendView {
  id: string;
  eventId: string;
  kind: SendKind;
  /** `null` for sends made before cards had a kind, which went to both. */
  cardKind: CardKind | null;
  target: SendTarget;
  channel: 'auto' | 'whatsapp' | 'sms';
  scheduledFor: string;
  status: Row['status'];
  /** Guests the audience matched when it was scheduled; the real outcome is in `summary`. */
  recipientCount: number;
  summary: (SendSummary & { error?: string }) | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

const view = (r: Row): ScheduledSendView => ({
  id: r.id,
  eventId: r.eventId,
  kind: r.kind,
  cardKind: r.cardKind ?? null,
  target: r.target as SendTarget,
  channel: r.channel as ScheduledSendView['channel'],
  scheduledFor: r.scheduledFor.toISOString(),
  status: r.status,
  recipientCount: r.recipientCount,
  summary: (r.summary ?? null) as ScheduledSendView['summary'],
  startedAt: r.startedAt?.toISOString() ?? null,
  finishedAt: r.finishedAt?.toISOString() ?? null,
  createdAt: r.createdAt.toISOString(),
});

/**
 * Invitations and reminders the organiser asked to go out later (ADR 030). The audience is kept as a rule
 * and resolved when the time comes, so guests added in between are included and guests who answered in
 * between are not nagged. A guest needs no account for any of it: it is just an SMS or WhatsApp to the
 * number the organiser gave.
 */
export class ScheduledSendService {
  constructor(
    private deps: Deps,
    private eventsSvc: EventService,
    private delivery: DeliveryService,
  ) {}

  private async assertCanManage(eventId: string, userId: string) {
    const role = await this.eventsSvc.role(eventId, userId);
    if (role === 'gate') throw new ApiError('forbidden', 'Gate agents cannot schedule sends');
  }

  async create(eventId: string, userId: string, input: ScheduleInput): Promise<ScheduledSendView> {
    await this.assertCanManage(eventId, userId);
    assertTargetFits(input.kind, input.target);
    assertCardKindFits(input.kind, input.cardKind);
    const now = this.deps.now();
    const [event] = await this.deps.db.select().from(events).where(eq(events.id, eventId));
    if (!event) throw new ApiError('not_found', 'Event not found');
    assertContributionsOpen(event, input.cardKind);
    if (input.scheduledFor.getTime() < now.getTime() + MIN_LEAD_MS)
      throw new ApiError('validation', 'Pick a time at least a minute from now', {
        field: 'scheduledFor',
      });
    if (input.scheduledFor.getTime() >= event.dateStart.getTime())
      throw new ApiError('validation', 'Pick a time before the event starts', {
        field: 'scheduledFor',
      });
    const [pending] = await this.deps.db
      .select({ n: sql<number>`count(*)::int` })
      .from(scheduledSends)
      .where(and(eq(scheduledSends.eventId, eventId), eq(scheduledSends.status, 'scheduled')));
    if ((pending?.n ?? 0) >= MAX_PENDING)
      throw new ApiError('conflict', `At most ${MAX_PENDING} sends can wait at once`, {
        limit: MAX_PENDING,
      });

    const channel = input.channel ?? 'auto';
    const recipientCount = await this.delivery.countAudience(eventId, {
      target: input.target,
      kind: input.kind,
      cardKind: input.cardKind,
    });
    const [row] = await this.deps.db
      .insert(scheduledSends)
      .values({
        id: newId(),
        eventId,
        createdBy: userId,
        kind: input.kind,
        cardKind: input.cardKind ?? null,
        target: input.target,
        channel,
        scheduledFor: input.scheduledFor,
        recipientCount,
      })
      .returning();
    await recordAudit(this.deps.db, {
      eventId,
      actorId: userId,
      action: 'send.schedule',
      entity: 'scheduled_send',
      entityId: row!.id,
      diff: {
        kind: input.kind,
        cardKind: input.cardKind ?? null,
        channel,
        scheduledFor: input.scheduledFor.toISOString(),
        recipientCount,
      },
    });
    return view(row!);
  }

  /** Newest first: what is waiting, what ran and what it did. */
  async list(eventId: string, userId: string): Promise<ScheduledSendView[]> {
    await this.assertCanManage(eventId, userId);
    const rows = await this.deps.db
      .select()
      .from(scheduledSends)
      .where(eq(scheduledSends.eventId, eventId))
      .orderBy(desc(scheduledSends.scheduledFor))
      .limit(50);
    return rows.map(view);
  }

  async cancel(eventId: string, id: string, userId: string): Promise<ScheduledSendView> {
    await this.assertCanManage(eventId, userId);
    const [row] = await this.deps.db
      .update(scheduledSends)
      .set({ status: 'cancelled', finishedAt: this.deps.now() })
      .where(
        and(
          eq(scheduledSends.id, id),
          eq(scheduledSends.eventId, eventId),
          eq(scheduledSends.status, 'scheduled'),
        ),
      )
      .returning();
    if (!row) {
      const [existing] = await this.deps.db
        .select({ id: scheduledSends.id })
        .from(scheduledSends)
        .where(and(eq(scheduledSends.id, id), eq(scheduledSends.eventId, eventId)));
      if (!existing) throw new ApiError('not_found', 'Scheduled send not found');
      throw new ApiError('conflict', 'This send has already started or finished');
    }
    await recordAudit(this.deps.db, {
      eventId,
      actorId: userId,
      action: 'send.cancel',
      entity: 'scheduled_send',
      entityId: id,
    });
    return view(row);
  }

  /**
   * Runs what has come due. Each row is claimed with a conditional update, so two workers (or an API
   * instance and a worker) never run the same send twice.
   */
  async runDue(limit = 10): Promise<{ ran: number; failed: number; missed: number }> {
    const now = this.deps.now();
    const out = { ran: 0, failed: 0, missed: 0 };
    await this.deps.db
      .update(scheduledSends)
      .set({ status: 'scheduled', startedAt: null })
      .where(
        and(
          eq(scheduledSends.status, 'running'),
          lte(scheduledSends.startedAt, new Date(now.getTime() - STUCK_AFTER_MS)),
        ),
      );
    const due = await this.deps.db
      .select({ id: scheduledSends.id })
      .from(scheduledSends)
      .where(and(eq(scheduledSends.status, 'scheduled'), lte(scheduledSends.scheduledFor, now)))
      .orderBy(asc(scheduledSends.scheduledFor))
      .limit(limit);
    for (const { id } of due) {
      const [row] = await this.deps.db
        .update(scheduledSends)
        .set({ status: 'running', startedAt: now })
        .where(and(eq(scheduledSends.id, id), eq(scheduledSends.status, 'scheduled')))
        .returning();
      if (!row) continue; // another worker took it
      const finish = (summary: ScheduledSendView['summary']) =>
        this.deps.db
          .update(scheduledSends)
          .set({ status: 'done', summary, finishedAt: this.deps.now() })
          .where(eq(scheduledSends.id, id));
      const empty = {
        total: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        byChannel: { whatsapp: 0, sms: 0 },
      };
      if (now.getTime() - row.scheduledFor.getTime() > MISSED_AFTER_MS) {
        await finish({ ...empty, failures: [], error: 'missed' });
        out.missed++;
        continue;
      }
      const input: SendInput = {
        target: row.target as SendTarget,
        channel: row.channel as SendInput['channel'],
        kind: row.kind,
        cardKind: row.cardKind ?? undefined,
      };
      try {
        const summary = await this.delivery.run(row.eventId, input);
        await finish(summary);
        await recordAudit(this.deps.db, {
          eventId: row.eventId,
          actorId: row.createdBy,
          action: 'send.scheduled_run',
          entity: 'scheduled_send',
          entityId: id,
          diff: {
            kind: row.kind,
            cardKind: row.cardKind,
            total: summary.total,
            sent: summary.sent,
            failed: summary.failed,
          },
        });
        out.ran++;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        await finish({ ...empty, failures: [], error: message });
        if (!(e instanceof ApiError)) this.deps.reportError?.(e as Error);
        out.failed++;
      }
    }
    return out;
  }
}
