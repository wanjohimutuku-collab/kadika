import { LOCALE_COOKIE, type Locale } from '@harusi/i18n';

/** Persists the locale for a year (§10: Swahili default, English one tap away). */
export function persistLocale(locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.lang = locale;
}
