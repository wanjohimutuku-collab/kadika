import type { Locale } from '@harusi/i18n';
import type { Currency } from '@harusi/schemas/country';
import { formatMoney as formatMoneyIn } from '@harusi/schemas/money';
import type { Guest } from '@harusi/api-client';

const MONTHS: Record<Locale, string[]> = {
  sw: ['Jan', 'Feb', 'Machi', 'Apr', 'Mei', 'Juni', 'Julai', 'Ago', 'Sep', 'Okt', 'Nov', 'Des'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

/**
 * Dates in East Africa Time (UTC+3, no DST): Dar es Salaam and Nairobi share it. A country with a
 * different offset needs this revisited (`COUNTRY_INFO` test guards the assumption, ADR 025).
 */
export function formatDate(iso: string, locale: Locale): string {
  const d = new Date(new Date(iso).getTime() + 3 * 3_600_000);
  return `${d.getUTCDate()} ${MONTHS[locale][d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export const daysUntil = (iso: string, now = Date.now()): number =>
  Math.floor((new Date(iso).getTime() + 3 * 3_600_000) / 86_400_000) -
  Math.floor((now + 3 * 3_600_000) / 86_400_000);

export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

/** `TZS 1,200,000` / `KES 1,200,000`. Amounts are whole currency units. */
export const formatMoney = (n: number, currency: Currency = 'TZS'): string =>
  formatMoneyIn(n, currency);

/** Tanzanian shillings; event screens use `formatMoney` with the event's currency. */
export const formatTzs = (n: number): string => formatMoney(n, 'TZS');

/** The status shown on a guest row (a failed message wins over "created"). */
export function statusKey(g: Guest): string {
  return g.lastMessageFailed && g.status === 'created' ? 'failed' : g.status;
}
