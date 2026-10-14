import sw from './sw.json';
import en from './en.json';

export type Messages = typeof sw;
export const locales = ['sw', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'sw';
export const LOCALE_COOKIE = 'NEXT_LOCALE';

export const messages: Record<Locale, Messages> = { sw, en: en as Messages };

export function isLocale(value: unknown): value is Locale {
  return value === 'sw' || value === 'en';
}

/** Resolves a dotted key (`rsvp.yes`) — for non-React callers such as the mobile shell. */
export function t(key: string, locale: Locale = defaultLocale): string {
  let node: unknown = messages[locale];
  for (const part of key.split('.')) {
    node = node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined;
  }
  return typeof node === 'string' ? node : key;
}

/** Picks top-level namespaces, so client bundles only receive what a route needs. */
export function pickMessages<K extends keyof Messages>(
  locale: Locale,
  namespaces: readonly K[],
): Pick<Messages, K> {
  const all = messages[locale];
  const out = {} as Pick<Messages, K>;
  for (const ns of namespaces) out[ns] = all[ns];
  return out;
}
export { formatIcu, type Values, type Msgs } from './icu';
