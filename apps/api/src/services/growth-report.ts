import { and, eq, gte, inArray, isNull, ne, sql } from 'drizzle-orm';
import { eventPurchases, events, users } from '@harusi/db';
import type { Country } from '@harusi/schemas/country';
import type { GrowthReport, GrowthReportSourceRow, GrowthReportWeek } from '@harusi/api-client';
import type { Deps } from '../context';
import { requireStaff, type StaffCaller } from './staff-guard';

function weekKey(d: Date): string {
  // Truncate to Monday UTC (YYYY-MM-DD) matching Postgres date_trunc('week', ... at time zone 'UTC').
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = utc.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  utc.setUTCDate(utc.getUTCDate() + diff);
  return utc.toISOString().slice(0, 10);
}

function countryFromPhone(phoneE164: string): Country | 'UG' | 'unknown' {
  if (phoneE164.startsWith('+255')) return 'TZ';
  if (phoneE164.startsWith('+254')) return 'KE';
  if (phoneE164.startsWith('+256')) return 'UG';
  return 'unknown';
}

function attributionSourceOf(u: {
  signupUtmSource: string | null;
  signupReferralCode: string | null;
  signupReferrerHost: string | null;
}): string {
  if (u.signupUtmSource) return u.signupUtmSource;
  if (u.signupReferralCode) return 'referral';
  if (u.signupReferrerHost) return u.signupReferrerHost;
  return 'direct';
}

/**
 * Weekly growth funnel and attribution report by country for staff (Prompt 9).
 * Uses only account-level attribution and aggregate counts — zero guest PII.
 */
export class GrowthReportService {
  constructor(private deps: Deps) {}

  async report(
    caller: StaffCaller,
    opts: { country?: Country | 'UG' | 'all'; weeks?: number } = {},
  ): Promise<GrowthReport> {
    await requireStaff(this.deps.db, caller);
    const weeks = Math.min(Math.max(Math.round(opts.weeks ?? 12), 1), 52);
    const countryFilter = opts.country ?? 'all';
    const now = this.deps.now();
    const since = new Date(now.getTime() - weeks * 7 * 86_400_000);

    const weekMap = new Map<string, GrowthReportWeek>();
    const bumpWeek = (
      weekStart: string,
      country: Country | 'UG' | 'unknown',
      field: 'signups' | 'eventsCreated' | 'eventsReachedPayment',
    ) => {
      if (countryFilter !== 'all' && country !== countryFilter) return;
      const key = `${weekStart}|${country}`;
      let row = weekMap.get(key);
      if (!row) {
        row = { weekStart, country, signups: 0, eventsCreated: 0, eventsReachedPayment: 0 };
        weekMap.set(key, row);
      }
      row[field] += 1;
    };

    const userRows = await this.deps.db
      .select({
        phoneE164: users.phoneE164,
        createdAt: users.createdAt,
        signupUtmSource: users.signupUtmSource,
        signupReferralCode: users.signupReferralCode,
        signupReferrerHost: users.signupReferrerHost,
      })
      .from(users)
      .where(and(isNull(users.deletedAt), gte(users.createdAt, since)));

    const sourceMap = new Map<string, GrowthReportSourceRow>();
    for (const u of userRows) {
      const country = countryFromPhone(u.phoneE164);
      const ws = weekKey(u.createdAt);
      bumpWeek(ws, country, 'signups');
      if (countryFilter !== 'all' && country !== countryFilter) continue;
      const source = attributionSourceOf(u);
      const sKey = `${ws}|${country}|${source}`;
      let sRow = sourceMap.get(sKey);
      if (!sRow) {
        sRow = { weekStart: ws, country, source, signups: 0 };
        sourceMap.set(sKey, sRow);
      }
      sRow.signups += 1;
    }

    const eventRows =
      countryFilter === 'UG'
        ? []
        : await this.deps.db
            .select({ id: events.id, country: events.country, createdAt: events.createdAt })
            .from(events)
            .where(
              and(
                isNull(events.deletedAt),
                gte(events.createdAt, since),
                ...(countryFilter === 'all' ? [] : [eq(events.country, countryFilter)]),
              ),
            );
    for (const ev of eventRows) {
      bumpWeek(weekKey(ev.createdAt), ev.country, 'eventsCreated');
    }

    // Distinct events reaching their first paid non-grant purchase within the window.
    const firstPaidRows =
      countryFilter === 'UG'
        ? []
        : await this.deps.db
            .select({
              eventId: eventPurchases.eventId,
              country: events.country,
              firstPaidAt: sql<Date>`min(${eventPurchases.paidAt})`,
            })
            .from(eventPurchases)
            .innerJoin(events, eq(events.id, eventPurchases.eventId))
            .where(
              and(
                isNull(events.deletedAt),
                eq(eventPurchases.status, 'paid'),
                ne(eventPurchases.method, 'grant'),
                inArray(eventPurchases.kind, ['cards', 'pack']),
                ...(countryFilter === 'all' ? [] : [eq(events.country, countryFilter)]),
              ),
            )
            .groupBy(eventPurchases.eventId, events.country);

    for (const row of firstPaidRows) {
      if (!row.firstPaidAt) continue;
      const paidDate = row.firstPaidAt instanceof Date ? row.firstPaidAt : new Date(row.firstPaidAt);
      if (paidDate < since) continue;
      bumpWeek(weekKey(paidDate), row.country, 'eventsReachedPayment');
    }

    const weekly = [...weekMap.values()].sort((a, b) =>
      a.weekStart === b.weekStart ? a.country.localeCompare(b.country) : b.weekStart.localeCompare(a.weekStart),
    );
    const signupsBySource = [...sourceMap.values()].sort((a, b) =>
      a.weekStart === b.weekStart
        ? b.signups - a.signups || a.source.localeCompare(b.source)
        : b.weekStart.localeCompare(a.weekStart),
    );

    return {
      windowWeeks: weeks,
      generatedAt: now.toISOString(),
      weekly,
      signupsBySource,
    };
  }
}
