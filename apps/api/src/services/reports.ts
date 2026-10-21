import { and, desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import { guests, invitations, messageLog, payments, scanLog } from '@harusi/db';
import type { Deps } from '../context';
import { ApiError } from '../errors';
import { ContributionRecords } from './contribution-records';
import type { DeliveryService } from './delivery';
import type { EventService } from './events';
import type { GateService } from './gate';
import type { PledgeService } from './pledges';

type ActivityKind =
  | 'rsvp_yes'
  | 'rsvp_no'
  | 'opened'
  | 'payment'
  | 'message_failed'
  | 'checked_in'
  | 'duplicate_scan';

export interface ActivityItem {
  id: string;
  at: string;
  kind: ActivityKind;
  guestId: string | null;
  guestName: string | null;
  amount?: number;
  count?: number;
}

/** Monday (UTC) of the week a date falls in, as YYYY-MM-DD. */
function weekOf(d: Date): string {
  const monday = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7)),
  );
  return monday.toISOString().slice(0, 10);
}

/** The console's "Recent activity" feed and the Reports page (§7.7). */
export class ReportService {
  constructor(
    private deps: Deps,
    private eventsSvc: EventService,
    private deliverySvc: DeliveryService,
    private pledgeSvc: PledgeService,
    private gateSvc: GateService,
  ) {}

  /** What happened lately, newest first: answers, opens, arrivals, failed messages and payments. */
  async activity(eventId: string, userId: string, limit = 20): Promise<ActivityItem[]> {
    const role = await this.eventsSvc.role(eventId, userId);
    const n = Math.min(100, Math.max(1, Math.floor(limit)));
    const live = and(eq(guests.eventId, eventId), isNull(guests.deletedAt));
    const items: ActivityItem[] = [];

    const answers = await this.deps.db
      .select({ inv: invitations, name: guests.displayName })
      .from(invitations)
      .innerJoin(guests, eq(guests.id, invitations.guestId))
      .where(and(live, isNotNull(invitations.rsvpAt)))
      .orderBy(desc(invitations.rsvpAt))
      .limit(n);
    for (const { inv, name } of answers) {
      const yes = inv.status === 'confirmed' || inv.status === 'checked_in';
      items.push({
        id: `r-${inv.id}`,
        at: inv.rsvpAt!.toISOString(),
        kind: yes ? 'rsvp_yes' : 'rsvp_no',
        guestId: inv.guestId,
        guestName: name,
        ...(yes ? { count: inv.rsvpPartySize ?? 1 } : {}),
      });
    }

    const opens = await this.deps.db
      .select({ inv: invitations, name: guests.displayName })
      .from(invitations)
      .innerJoin(guests, eq(guests.id, invitations.guestId))
      .where(and(live, eq(invitations.status, 'opened'), isNotNull(invitations.openedAt)))
      .orderBy(desc(invitations.openedAt))
      .limit(n);
    for (const { inv, name } of opens)
      items.push({
        id: `o-${inv.id}`,
        at: inv.openedAt!.toISOString(),
        kind: 'opened',
        guestId: inv.guestId,
        guestName: name,
      });

    const scans = await this.deps.db
      .select({ s: scanLog, name: guests.displayName })
      .from(scanLog)
      .leftJoin(guests, eq(guests.id, scanLog.guestId))
      .where(
        and(
          eq(scanLog.eventId, eventId),
          inArray(scanLog.result, ['ok', 'manual_ok', 'duplicate']),
        ),
      )
      .orderBy(desc(scanLog.scannedAt))
      .limit(n);
    for (const { s, name } of scans)
      items.push({
        id: `s-${s.id}`,
        at: s.scannedAt.toISOString(),
        kind: s.result === 'duplicate' ? 'duplicate_scan' : 'checked_in',
        guestId: s.guestId,
        guestName: name ?? null,
        ...(s.result === 'duplicate' ? {} : { count: s.partyAdmitted }),
      });

    const failed = await this.deps.db
      .select({ m: messageLog, name: guests.displayName })
      .from(messageLog)
      .innerJoin(guests, eq(guests.id, messageLog.guestId))
      .where(and(live, eq(messageLog.status, 'failed')))
      .orderBy(desc(messageLog.createdAt))
      .limit(n);
    for (const { m, name } of failed)
      items.push({
        id: `f-${m.id}`,
        at: m.createdAt.toISOString(),
        kind: 'message_failed',
        guestId: m.guestId,
        guestName: name,
      });

    // money stays out of what a gate agent can read (§2)
    if (role !== 'gate') {
      const records = ContributionRecords.of(this.deps);
      const paid = await this.deps.db
        .select({ p: payments, name: guests.displayName })
        .from(payments)
        .innerJoin(guests, eq(guests.id, payments.guestId))
        .where(and(live, eq(payments.status, 'success')))
        .orderBy(desc(payments.paidAt))
        .limit(n);
      for (const { p, name } of paid) {
        const open = await records.openPayment(p);
        items.push({
          id: `p-${p.id}`,
          at: (p.paidAt ?? p.createdAt).toISOString(),
          kind: 'payment',
          guestId: p.guestId,
          guestName: name,
          amount: open.amount,
        });
      }
    }

    return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, n);
  }

  /** Funnel, channels, arrivals, collections and pledge reconciliation for the Reports page. */
  async report(eventId: string, userId: string) {
    const role = await this.eventsSvc.role(eventId, userId);
    if (role === 'gate') throw new ApiError('forbidden', 'Gate agents cannot read reports');
    const stats = {
      ...(await this.deliverySvc.stats(eventId, userId)),
      ...(await this.pledgeSvc.totals(eventId)),
    };

    const invs = await this.deps.db
      .select({
        status: invitations.status,
        channel: invitations.channelLast,
        partySizeAllowed: guests.partySizeAllowed,
      })
      .from(invitations)
      .innerJoin(guests, eq(guests.id, invitations.guestId))
      .where(
        and(
          eq(guests.eventId, eventId),
          isNull(guests.deletedAt),
          eq(guests.cardKind, 'invitation'),
        ),
      );
    const reached = ['delivered', 'opened', 'confirmed', 'declined', 'checked_in'];
    const opened = ['opened', 'confirmed', 'declined', 'checked_in'];
    const channels = (['whatsapp', 'sms', 'print'] as const).map((channel) => {
      const list = invs.filter((i) => i.channel === channel);
      return {
        channel,
        sent: list.length,
        // a printed card is in the guest's hands once it is handed out
        delivered: list.filter(
          (i) => reached.includes(i.status) || (channel === 'print' && i.status === 'sent'),
        ).length,
        opened: list.filter((i) => opened.includes(i.status)).length,
        confirmed: list.filter((i) => i.status === 'confirmed' || i.status === 'checked_in').length,
      };
    });

    const records = ContributionRecords.of(this.deps);
    const weeks = new Map<string, number>();
    const paid = await this.deps.db
      .select({ p: payments })
      .from(payments)
      .innerJoin(guests, eq(guests.id, payments.guestId))
      .where(and(eq(guests.eventId, eventId), eq(payments.status, 'success')));
    for (const { p } of paid) {
      const open = await records.openPayment(p);
      const key = weekOf(p.paidAt ?? p.createdAt);
      weeks.set(key, (weeks.get(key) ?? 0) + open.amount);
    }

    const { totals, guests: rows } = await this.pledgeSvc.summary(eventId, userId);
    const pledgedRows = rows.filter((r) => r.status !== null && r.status !== 'waived');

    return {
      stats,
      channels,
      arrivalsByHour: (await this.gateSvc.overview(eventId, userId)).arrivalsByHour,
      collectionsByWeek: [...weeks.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, amount]) => ({ week, amount })),
      pledgeReconciliation: {
        pledged: totals.pledged,
        collected: totals.collected,
        outstanding: totals.balance,
        overpaid: rows.reduce((s, r) => s + (r.amount > 0 ? Math.max(0, r.paid - r.amount) : 0), 0),
        guestsPaid: pledgedRows.filter((r) => r.status === 'paid').length,
        guestsPartial: pledgedRows.filter((r) => r.status === 'partial').length,
        guestsUnpaid: pledgedRows.filter((r) => r.status === 'pledged').length,
      },
      headcountForecast: stats.headcountConfirmed,
      headcountTarget: invs.reduce((s, i) => s + i.partySizeAllowed, 0),
    };
  }
}
