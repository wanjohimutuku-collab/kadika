import type { Locale } from '@harusi/i18n';
import { DEFAULT_BRANDING } from '@harusi/schemas/branding';
import { APP_DOMAIN } from './env';
import { enPath } from './site-locale';

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

/** Swahili on Tanzania pages (the root), English on Kenya pages (kit sitemap.md). */
export function defaultLocaleFor(market: Market): Locale {
  return market === 'ke' ? 'en' : 'sw';
}

/** Kenya pages are English only; Swahili may not be served there. */
export function localesFor(market: Market): readonly Locale[] {
  return market === 'ke' ? ['en'] : ['sw', 'en'];
}

/**
 * The URL of a site page in a language. Tanzania: Swahili at the plain path, English under `/en`.
 * Kenya: always the plain `/ke` path.
 */
export function localeUrl(path: string, locale: Locale): string {
  if (marketOfPath(path) === 'ke' || locale === 'sw') return path;
  return enPath(path);
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
    map['sw-TZ'] = abs(tz, 'sw');
    map['en-TZ'] = abs(tz, 'en');
  }
  if (ke) map['en-KE'] = abs(ke, 'en');
  map['x-default'] = tz ? abs(tz, 'sw') : abs(ke!, 'en');
  return map;
}
