import { defaultLocale, type Locale } from '@harusi/i18n';
import { APP_DOMAIN } from './env';

/** Public origin used for canonical URLs, hreflang, the sitemap and structured data. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? `https://${APP_DOMAIN}`).replace(
  /\/$/,
  '',
);

export type Market = 'tz' | 'ke';

/** Kenya content lives under `/ke`; everything else is Tanzania. */
export function marketOfPath(path: string): Market {
  return path === '/ke' || path.startsWith('/ke/') ? 'ke' : 'tz';
}

/** English is the default everywhere; Swahili is one tap away. */
export function defaultLocaleFor(_market: Market): Locale {
  return defaultLocale;
}

/** The default language has the clean URL; the other one is `?lang=`. */
export function localeUrl(path: string, locale: Locale): string {
  return locale === defaultLocaleFor(marketOfPath(path)) ? path : `${path}?lang=${locale}`;
}

/** Absolute form for metadata: relative URLs lose their query string when Next resolves them. */
export function absoluteLocaleUrl(path: string, locale: Locale): string {
  return `${SITE_URL}${localeUrl(path, locale)}`;
}

/**
 * hreflang for one page. Pages with a counterpart in the other market get region-specific codes
 * (sw-TZ, en-TZ, sw-KE, en-KE); Tanzania-only pages use plain sw and en; Kenya-only pages use
 * en-KE and sw-KE.
 */
export function hreflangMap(path: string, counterpartPath?: string): Record<string, string> {
  const abs = absoluteLocaleUrl;
  const market = marketOfPath(path);
  if (!counterpartPath) {
    return market === 'tz'
      ? { sw: abs(path, 'sw'), en: abs(path, 'en'), 'x-default': abs(path, 'en') }
      : { 'en-KE': abs(path, 'en'), 'sw-KE': abs(path, 'sw'), 'x-default': abs(path, 'en') };
  }
  const tz = market === 'tz' ? path : counterpartPath;
  const ke = market === 'ke' ? path : counterpartPath;
  return {
    'sw-TZ': abs(tz, 'sw'),
    'en-TZ': abs(tz, 'en'),
    'sw-KE': abs(ke, 'sw'),
    'en-KE': abs(ke, 'en'),
    'x-default': abs(tz, 'en'),
  };
}
