import { defaultLocale, type Locale } from '@harusi/i18n';
import { APP_DOMAIN } from './env';

/** Public origin used for canonical URLs, hreflang, the sitemap and structured data. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? `https://${APP_DOMAIN}`).replace(
  /\/$/,
  '',
);

/** Language is chosen with `?lang=en`; Swahili (the default) has the clean URL. */
export function localeUrl(path: string, locale: Locale): string {
  return locale === defaultLocale ? path : `${path}?lang=${locale}`;
}

/** Absolute form for metadata: relative URLs lose their query string when Next resolves them. */
export function absoluteLocaleUrl(path: string, locale: Locale): string {
  return `${SITE_URL}${localeUrl(path, locale)}`;
}
