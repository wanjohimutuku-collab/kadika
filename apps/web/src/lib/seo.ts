import type { Locale } from '@harusi/i18n';
import { DEFAULT_BRANDING } from '@harusi/schemas/branding';
import { APP_DOMAIN } from './env';
import { swPath } from './site-locale';

/** Public origin used for canonical URLs, hreflang, the sitemap and structured data. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? `https://${APP_DOMAIN}`).replace(
  /\/$/,
  '',
);

export type Market = 'tz' | 'ke';

/** The site's link-preview images, one per edition (`app/og/[file]/route.tsx`). */
export const OG_EDITIONS = ['sw', 'en', 'ke'] as const;
export type OgEdition = (typeof OG_EDITIONS)[number];
export const OG_SIZE = { width: 1200, height: 630 };

/**
 * `openGraph.images` for a public page. Next copies them into the Twitter card, which then becomes
 * `summary_large_image`. Every page that sets `openGraph` must pass these, because a page's `openGraph`
 * replaces the parent's whole object.
 */
export function ogImages(locale: Locale, market: Market = 'tz') {
  const edition: OgEdition = market === 'ke' ? 'ke' : locale;
  return [
    {
      url: `${SITE_URL}/og/${edition}.png`,
      ...OG_SIZE,
      alt:
        edition === 'sw'
          ? 'Kadi Sasa: kadi moja kwa kila mgeni'
          : 'Kadi Sasa: one card for every guest',
    },
  ];
}

/** The organisation node every page's structured data shares, by `@id` (one entity, not one per page). */
export const ORG_ID = `${SITE_URL}/#org`;
export function organizationNode(description?: string) {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: DEFAULT_BRANDING.businessName,
    url: SITE_URL,
    logo: { '@type': 'ImageObject', url: `${SITE_URL}/icons/512.png`, width: 512, height: 512 },
    ...(description ? { description } : {}),
    areaServed: ['TZ', 'KE'],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'faragha@kadisasa.com',
      availableLanguage: ['sw', 'en'],
    },
  };
}

/** Kenya content lives under `/ke`; everything else is Tanzania. */
export function marketOfPath(path: string): Market {
  return path === '/ke' || path.startsWith('/ke/') ? 'ke' : 'tz';
}

/** English on both markets (English-default scheme). */
export function defaultLocaleFor(_market: Market): Locale {
  return 'en';
}

/** Kenya pages are English only; Swahili may not be served there. */
export function localesFor(market: Market): readonly Locale[] {
  return market === 'ke' ? ['en'] : ['sw', 'en'];
}

/**
 * The URL of a site page in a language. Tanzania: English at the plain path, Swahili under `/sw`.
 * Kenya: always the plain `/ke` path. The caller is responsible for passing a slug-correct path
 * via `pagePath(p, locale)`.
 */
export function localeUrl(path: string, locale: Locale): string {
  if (marketOfPath(path) === 'ke' || locale === 'en') return path;
  return swPath(path);
}

export function absoluteLocaleUrl(path: string, locale: Locale): string {
  return `${SITE_URL}${localeUrl(path, locale)}`;
}

/**
 * hreflang for one page: `sw-TZ` and `en-TZ` for a Tanzania page, `en-KE` for a Kenya page, both
 * markets when the page has a same-topic counterpart. `x-default` is the Tanzania Swahili page, or
 * the Kenya page when there is no Tanzania one.
 */
export function hreflangMap(path: string, counterpartPath?: string): Record<string, string> {
  const abs = absoluteLocaleUrl;
  const market = marketOfPath(path);
  const tz = market === 'tz' ? path : counterpartPath;
  const ke = market === 'ke' ? path : counterpartPath;
  const map: Record<string, string> = {};
  if (tz) {
    map['en-TZ'] = abs(tz, 'en');
    map['sw-TZ'] = abs(tz, 'sw');
  }
  if (ke) map['en-KE'] = abs(ke, 'en');
  map['x-default'] = tz ? abs(tz, 'en') : abs(ke!, 'en');
  return map;
}
