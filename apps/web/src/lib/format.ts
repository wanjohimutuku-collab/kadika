import { formatPhone as formatPhoneIn } from '@harusi/schemas/phone';
import {
  formatMoney as formatMoneyIn,
  formatMoneyCompact as formatMoneyCompactIn,
} from '@harusi/schemas/money';
import type { Country, Currency } from '@harusi/schemas/country';
import type { Locale } from '@harusi/i18n';

/**
 * Africa/Dar_es_Salaam is UTC+3 all year (no DST), so EAT wall-clock parts are read from the UTC
 * fields of a +3 h shifted Date. This keeps the guest card free of a timezone library (ADR 008);
 * console date maths that needs calendars uses date-fns with @date-fns/tz (see `daysUntil`).
 */
export const TZ = 'Africa/Dar_es_Salaam';
const EAT_MS = 3 * 3_600_000;

const SW_MONTHS = [
  'Januari',
  'Februari',
  'Machi',
  'Aprili',
  'Mei',
  'Juni',
  'Julai',
  'Agosti',
  'Septemba',
  'Oktoba',
  'Novemba',
  'Desemba',
];
const SW_MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mac',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];
const SW_WEEKDAYS = [
  'Jumapili',
  'Jumatatu',
  'Jumanne',
  'Jumatano',
  'Alhamisi',
  'Ijumaa',
  'Jumamosi',
];
const EN_MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const EN_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const EN_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface EatParts {
  y: number;
  mo: number;
  d: number;
  h: number;
  mi: number;
  wd: number;
}

function eat(iso: string | number | Date): EatParts {
  const x = new Date(new Date(iso).getTime() + EAT_MS);
  return {
    y: x.getUTCFullYear(),
    mo: x.getUTCMonth(),
    d: x.getUTCDate(),
    h: x.getUTCHours(),
    mi: x.getUTCMinutes(),
    wd: x.getUTCDay(),
  };
}

const NUMBER = new Intl.NumberFormat('en-US');

/** `TZS 1,200,000` / `KES 1,200,000` (§17.9 CurrencyText). Amounts are whole currency units. */
export function formatMoney(amount: number, currency: Currency = 'TZS'): string {
  return formatMoneyIn(amount, currency);
}

/** `TZS 1,200,000`. For screens that are Tanzania-only (staff panel); event screens use `formatMoney`. */
export function formatTzs(amount: number): string {
  return formatMoney(amount, 'TZS');
}

export function formatNumber(n: number): string {
  return NUMBER.format(n);
}

/** `TZS 8.4M` / `KES 450K` for tiles. */
export function formatMoneyCompact(amount: number, currency: Currency = 'TZS'): string {
  return formatMoneyCompactIn(amount, currency);
}

export function formatTzsCompact(amount: number): string {
  return formatMoneyCompact(amount, 'TZS');
}

/** National form for numbers of the event's country, international form for others (ADR 025). */
export function formatPhone(e164: string | null | undefined, home: Country = 'TZ'): string {
  return e164 ? formatPhoneIn(e164, home) : '—';
}

/** `14 Desemba 2026` / `14 December 2026`. */
export function formatDate(iso: string, locale: Locale): string {
  const p = eat(iso);
  return `${p.d} ${(locale === 'sw' ? SW_MONTHS : EN_MONTHS)[p.mo]} ${p.y}`;
}

/** `14 Des 2026`. */
export function formatDateShort(iso: string, locale: Locale): string {
  const p = eat(iso);
  return `${p.d} ${(locale === 'sw' ? SW_MONTHS_SHORT : EN_MONTHS_SHORT)[p.mo]} ${p.y}`;
}

export function formatWeekday(iso: string, locale: Locale): string {
  return (locale === 'sw' ? SW_WEEKDAYS : EN_WEEKDAYS)[eat(iso).wd]!;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 24-hour clock in Dar es Salaam: `16:00`. */
export function formatClock(iso: string): string {
  const p = eat(iso);
  return `${pad(p.h)}:${pad(p.mi)}`;
}

/**
 * Swahili time counts hours from sunrise (06:00 = saa 12 asubuhi … 16:00 = saa 10 jioni).
 * Shown with the 24-hour time alongside to avoid ambiguity (ADR 008).
 */
export function swahiliTime(iso: string): string {
  const { h, mi } = eat(iso);
  const sh = (((h - 6) % 12) + 12) % 12 || 12;
  const period =
    h >= 5 && h < 12
      ? 'asubuhi'
      : h >= 12 && h < 16
        ? 'mchana'
        : h >= 16 && h < 19
          ? 'jioni'
          : 'usiku';
  return `${sh}:${pad(mi)} ${period}`;
}

export function formatTime(iso: string, locale: Locale): string {
  if (locale === 'sw') return `${swahiliTime(iso)} (${formatClock(iso)})`;
  const { h, mi } = eat(iso);
  return `${h % 12 || 12}:${pad(mi)} ${h < 12 ? 'am' : 'pm'}`;
}

/** `14 Des, 16:00` for tables and logs. */
export function formatDateTimeShort(iso: string, locale: Locale): string {
  const p = eat(iso);
  return `${p.d} ${(locale === 'sw' ? SW_MONTHS_SHORT : EN_MONTHS_SHORT)[p.mo]}, ${formatClock(iso)}`;
}

export function formatRelative(iso: string, locale: Locale, now: number = Date.now()): string {
  const diff = (new Date(iso).getTime() - now) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), 'second');
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86_400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (abs < 30 * 86_400) return rtf.format(Math.round(diff / 86_400), 'day');
  return formatDateShort(iso, locale);
}

/** Value for `<input type="datetime-local">` in Dar es Salaam time. */
export function toLocalInput(iso: string): string {
  const p = eat(iso);
  return `${p.y}-${pad(p.mo + 1)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}`;
}

/** Interprets a `datetime-local` value as Dar es Salaam time (UTC+3, no DST). */
export function fromLocalInput(value: string): string {
  return new Date(`${value}:00+03:00`).toISOString();
}

export function initials(name: string): string {
  const words = name
    .replace(/^(Mama|Baba|Bi\.|Bibi|Mzee|Babu|Dkt\.|Mch\.|Sheikh|Prof\.|Eng\.|Familia ya)\s+/i, '')
    .split(/\s+/)
    .filter(Boolean);
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase() || '?';
}
