import { and, count, eq, gte, inArray, isNotNull, isNull, ne, sql } from 'drizzle-orm';
import { events, guests, invitations, messageLog, payments, scanLog, users } from '@harusi/db';
import { networkLabel } from '@harusi/schemas/operators';
import type { Country } from '@harusi/schemas/country';
import type { PilotMetrics } from '@harusi/schemas/pilot';
import type { Deps } from '../context';
import { ApiError } from '../errors';

/** Anchor for "when a payment started": the prompt window is 60 s, see `PledgeService`. */
const PAY_PROMPT_MS = 60_000;
/** Gaps between admissions at one gate longer than this are idle time, not service time. */
const BURST_GAP_MS = 60_000;
/** A scan made offline and still not synced after this long counts as at risk of being lost. */
const UNSYNCED_AFTER_MS = 3_600_000;

const REACHED = ['delivered', 'opened', 'confirmed', 'declined', 'checked_in'] as const;

const rate = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 1000 : null);

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : Math.round(((s[m - 1]! + s[m]!) / 2) * 10) / 10;
}

/**
 * Launch-gate numbers per country (Phase 5, docs/ops/kenya-pilot-runbook.md). Read-only aggregates over
 * existing tables; staff only. No guest names or phone numbers leave this service.
 */
export class PilotMetricsService {
  constructor(private deps: Deps) {}

  private async requireStaff(userId: string) {
    const [u] = await this.deps.db
      .select({ role: users.roleGlobal, status: users.status })
      .from(users)
      .where(eq(users.id, userId));
    if (!u || u.role !== 'admin' || u.status !== 'active')
      throw new ApiError('forbidden', 'Staff only');
  }

  async report(
    userId: string,
    opts: { country?: Country | 'all'; days?: number } = {},
  ): Promise<PilotMetrics> {
    await this.requireStaff(userId);
    const country = opts.country ?? 'all';
    const days = Math.min(Math.max(Math.round(opts.days ?? 30), 1), 365);
    const now = this.deps.now();
    const since = new Date(now.getTime() - days * 86_400_000);
    const db = this.deps.db;
    const inCountry = country === 'all' ? undefined : eq(events.country, country);

    const [evCount] = await db.select({ n: count() }).from(events).where(inCountry);

    // ---- reach and the SMS path (guests with a phone, current state)
    const phoneGuests = and(inCountry, isNull(guests.deletedAt), isNotNull(guests.phoneE164));
    const [withPhone] = await db
      .select({ n: count() })
      .from(guests)
      .innerJoin(events, eq(events.id, guests.eventId))
      .where(phoneGuests);
    const [reached] = await db
      .select({ n: count() })
      .from(invitations)
      .innerJoin(guests, eq(guests.id, invitations.guestId))
      .innerJoin(events, eq(events.id, guests.eventId))
      .where(and(phoneGuests, inArray(invitations.status, [...REACHED])));
    const lastChannel = await db
      .select({ ch: invitations.channelLast, n: count() })
      .from(invitations)
      .innerJoin(guests, eq(guests.id, invitations.guestId))
      .innerJoin(events, eq(events.id, guests.eventId))
      .where(and(phoneGuests, isNotNull(invitations.channelLast)))
      .groupBy(invitations.channelLast);
    const invited = lastChannel.reduce((a, r) => a + r.n, 0);
    const viaSms = lastChannel.find((r) => r.ch === 'sms')?.n ?? 0;

    // ---- message delivery, overall and per operator
    const msgRows = await db
      .select({
        channel: messageLog.channel,
        network: messageLog.network,
        status: messageLog.status,
        n: count(),
      })
      .from(messageLog)
      .innerJoin(guests, eq(guests.id, messageLog.guestId))
      .innerJoin(events, eq(events.id, guests.eventId))
      .where(and(inCountry, gte(messageLog.createdAt, since)))
      .groupBy(messageLog.channel, messageLog.network, messageLog.status);
    const tally = (rows: typeof msgRows) => {
      let total = 0;
      let delivered = 0;
      let failed = 0;
      for (const r of rows) {
        total += r.n;
        if (r.status === 'delivered' || r.status === 'read') delivered += r.n;
        else if (r.status === 'failed') failed += r.n;
      }
      return {
        total,
        delivered,
        failed,
        inFlight: total - delivered - failed,
        deliveryRate: rate(delivered, total),
      };
    };
    const messages = (['sms', 'whatsapp'] as const).map((channel) => ({
      channel,
      ...tally(msgRows.filter((r) => r.channel === channel)),
    }));
    const networks = [
      ...new Set(msgRows.filter((r) => r.channel === 'sms').map((r) => r.network ?? '')),
    ];
    const smsByNetwork = networks
      .map((nw) => ({
        network: nw || 'unknown',
        label: networkLabel(nw || null),
        ...tally(msgRows.filter((r) => r.channel === 'sms' && (r.network ?? '') === nw)),
      }))
      .sort((a, b) => b.total - a.total);

    // ---- provider payments (manual entries are the committee's own and are not measured here)
    const payBase = and(inCountry, ne(payments.provider, 'manual'));
    const startedAfter = gte(payments.expiresAt, new Date(since.getTime() + PAY_PROMPT_MS));
    const payRows = await db
      .select({
        method: payments.method,
        status: payments.status,
        timeout: sql<boolean>`coalesce(${payments.raw}->>'failureReason' = 'timeout', false)`,
        late: sql<boolean>`coalesce(${payments.raw}->>'lateSuccess' = 'true', false)`,
        mismatch: sql<boolean>`${payments.raw}->'amountMismatch' is not null`,
        paidAt: payments.paidAt,
        expiresAt: payments.expiresAt,
        amount: payments.amount,
        currency: events.currency,
      })
      .from(payments)
      .innerJoin(guests, eq(guests.id, payments.guestId))
      .innerJoin(events, eq(events.id, guests.eventId))
      .where(and(payBase, startedAfter));
    const success = payRows.filter((p) => p.status === 'success');
    const byMethod = [...new Set(payRows.map((p) => p.method ?? 'unknown'))].map((m) => {
      const rows = payRows.filter((p) => (p.method ?? 'unknown') === m);
      const ok = rows.filter((p) => p.status === 'success').length;
      return { method: m, started: rows.length, success: ok, successRate: rate(ok, rows.length) };
    });
    const collected = new Map<string, number>();
    for (const p of success) collected.set(p.currency, (collected.get(p.currency) ?? 0) + p.amount);
    const secondsToConfirm = success
      .filter((p) => p.paidAt && p.expiresAt)
      .map((p) => (p.paidAt!.getTime() - (p.expiresAt!.getTime() - PAY_PROMPT_MS)) / 1000)
      .filter((s) => s >= 0);

    // ---- gate
    const scans = await db
      .select({
        guestId: scanLog.guestId,
        deviceId: scanLog.deviceId,
        result: scanLog.result,
        scannedAt: scanLog.scannedAt,
        syncedAt: scanLog.syncedAt,
        offline: scanLog.offline,
        override: scanLog.override,
      })
      .from(scanLog)
      .innerJoin(events, eq(events.id, scanLog.eventId))
      .where(and(inCountry, gte(scanLog.scannedAt, since)));
    const n = (r: string) => scans.filter((s) => s.result === r).length;
    const ok = n('ok');
    const bad = n('invalid_sig') + n('wrong_event') + n('not_found');
    const manual = n('manual_ok');
    const admissions = scans.filter(
      (s) => (s.result === 'ok' || s.result === 'manual_ok') && !s.override,
    );
    const perGuest = new Map<string, number>();
    for (const s of admissions)
      if (s.guestId) perGuest.set(s.guestId, (perGuest.get(s.guestId) ?? 0) + 1);
    const gaps: number[] = [];
    const perDevice = new Map<string, number[]>();
    for (const s of admissions)
      perDevice.set(s.deviceId, [...(perDevice.get(s.deviceId) ?? []), s.scannedAt.getTime()]);
    for (const times of perDevice.values()) {
      times.sort((a, b) => a - b);
      for (let i = 1; i < times.length; i++) {
        const gap = times[i]! - times[i - 1]!;
        if (gap > 0 && gap <= BURST_GAP_MS) gaps.push(gap / 1000);
      }
    }
    const unsyncedCutoff = now.getTime() - UNSYNCED_AFTER_MS;

    return {
      country,
      windowDays: days,
      generatedAt: now.toISOString(),
      events: evCount?.n ?? 0,
      reach: {
        guestsWithPhone: withPhone?.n ?? 0,
        reached: reached?.n ?? 0,
        rate: rate(reached?.n ?? 0, withPhone?.n ?? 0),
      },
      smsPath: { invited, viaSms, share: rate(viaSms, invited) },
      messages,
      smsByNetwork,
      payments: {
        started: payRows.length,
        success: success.length,
        failed: payRows.filter((p) => p.status === 'failed').length,
        pending: payRows.filter((p) => p.status === 'pending').length,
        successRate: rate(success.length, payRows.length),
        medianSecondsToConfirm: median(secondsToConfirm),
        timeouts: payRows.filter((p) => p.status === 'failed' && p.timeout).length,
        lateSuccesses: success.filter((p) => p.late).length,
        amountMismatches: payRows.filter((p) => p.mismatch).length,
        byMethod,
        collected: [...collected].map(([currency, amount]) => ({ currency, amount })),
      },
      gate: {
        scans: scans.length,
        admitted: ok + manual,
        firstScanSuccessRate: rate(ok, ok + bad),
        manualShare: rate(manual, ok + manual),
        duplicateScans: n('duplicate'),
        duplicateAdmissions: [...perGuest.values()].filter((c) => c > 1).length,
        offlineScans: scans.filter((s) => s.offline).length,
        unsyncedOffline: scans.filter(
          (s) => s.offline && !s.syncedAt && s.scannedAt.getTime() < unsyncedCutoff,
        ).length,
        medianSecondsBetweenAdmissions: median(gaps),
      },
    };
  }
}
