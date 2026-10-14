import type { Locale } from '@harusi/i18n';
import type { Guest } from '@harusi/api-client';

const MONTHS: Record<Locale, string[]> = {
  sw: ['Jan', 'Feb', 'Machi', 'Apr', 'Mei', 'Juni', 'Julai', 'Ago', 'Sep', 'Okt', 'Nov', 'Des'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

/** Dates in Africa/Dar_es_Salaam (UTC+3, no DST), Swahili month names (§10). */
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

export const formatTzs = (n: number): string => `TZS ${n.toLocaleString('en-US')}`;

/** The status shown on a guest row (a failed message wins over "created"). */
export function statusKey(g: Guest): string {
  return g.lastMessageFailed && g.status === 'created' ? 'failed' : g.status;
}
