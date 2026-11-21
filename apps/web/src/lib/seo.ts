import type { Metadata } from 'next';
import type { Locale } from '@harusi/i18n';
import { DEFAULT_BRANDING } from '@harusi/schemas/branding';
import { APP_DOMAIN } from './env';
import { swPath } from './site-locale';

/** Search-engine & AI snippet indexing policy shared by all public marketing pages. */
export const PUBLIC_ROBOTS: NonNullable<Metadata['robots']> = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    'max-snippet': -1,
    'max-image-preview': 'large',
    'max-video-preview': -1,
  },
};

export function twitterSummaryCard(
  title: string,
  description: string,
  locale: Locale,
  market: Market = 'tz',
): NonNullable<Metadata['twitter']> {
  return {
    card: 'summary_large_image',
    title,
    description,
    images: ogImages(locale, market).map((img) => img.url),
  };
}

/** Public origin used for canonical URLs, hreflang, the sitemap and structured data. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? `https://${APP_DOMAIN}`).replace(
  /\/$/,
  '',
);

export type Market = 'tz' | 'ke' | 'ug';

/** The site's link-preview images, one per edition (`app/og/[file]/route.tsx`). */
export const OG_EDITIONS = ['sw', 'en', 'ke', 'ug'] as const;
export type OgEdition = (typeof OG_EDITIONS)[number];
export const OG_SIZE = { width: 1200, height: 630 };

/**
 * `openGraph.images` for a public page. Next copies them into the Twitter card, which then becomes
 * `summary_large_image`. Every page that sets `openGraph` must pass these, because a page's `openGraph`
 * replaces the parent's whole object.
 */
export function ogImages(locale: Locale, market: Market = 'tz') {
  const edition: OgEdition = market === 'ke' ? 'ke' : market === 'ug' ? 'ug' : locale;
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
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Dar es Salaam',
      addressCountry: 'TZ',
    },
    foundingLocation: {
      '@type': 'Place',
      name: 'Dar es Salaam, Tanzania',
    },
    areaServed: ['TZ', 'KE', 'UG'],
    knowsAbout: [
      'Digital wedding invitations',
      'E-cards Tanzania, Kenya, and Uganda',
      'Digital invitation cards (e-cards) for weddings and events',
      'Kadi za mwaliko wa harusi Tanzania',
      'Kwanjula and Kuhingira digital invitations Uganda',
      'WhatsApp and SMS event invitations',
      'Wedding RSVP management',
      'Michango, harambee, and pledge card contribution tracking',
      'Offline QR code gate check-in',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'faragha@kadisasa.com',
      availableLanguage: ['sw', 'en'],
    },
  };
}

/** Kenya content lives under `/ke`, Uganda under `/ug`; everything else is Tanzania. */
export function marketOfPath(path: string): Market {
  if (path === '/ke' || path.startsWith('/ke/')) return 'ke';
  if (path === '/ug' || path.startsWith('/ug/')) return 'ug';
  return 'tz';
}

/** English on all markets (English-default scheme). */
export function defaultLocaleFor(_market: Market): Locale {
  return 'en';
}

/** Kenya and Uganda pages are English only; Swahili is served on Tanzania only. */
export function localesFor(market: Market): readonly Locale[] {
  return market === 'tz' ? ['sw', 'en'] : ['en'];
}

/**
 * The URL of a site page in a language. Tanzania: English at the plain path, Swahili under `/sw`.
 * Kenya and Uganda: always the plain `/ke` or `/ug` path. The caller is responsible for passing a
 * slug-correct path via `pagePath(p, locale)`.
 */
export function localeUrl(path: string, locale: Locale): string {
  if (marketOfPath(path) !== 'tz' || locale === 'en') return path;
  return swPath(path);
}

export function absoluteLocaleUrl(path: string, locale: Locale): string {
  return `${SITE_URL}${localeUrl(path, locale)}`;
}

/**
 * hreflang for one page: `en-TZ` and `sw-TZ` for a Tanzania page, `en-KE` for a Kenya page, `en-UG`
 * for a Uganda page, and all matching markets when the page has same-topic counterparts. `x-default`
 * is the Tanzania English page (the default edition), or the current market page when there is no
 * Tanzania counterpart.
 *
 * `path` is the English TZ URL (slug-correct for EN) or the KE/UG path. `counterpartPath` can be a
 * single path or an array of counterpart paths across other markets.
 */
export function hreflangMap(
  path: string,
  counterpartPath?: string | string[],
  swOverride?: string,
): Record<string, string> {
  const abs = absoluteLocaleUrl;
  const all = [path, ...(Array.isArray(counterpartPath) ? counterpartPath : counterpartPath ? [counterpartPath] : [])];
  const tz = all.find((p) => marketOfPath(p) === 'tz');
  const ke = all.find((p) => marketOfPath(p) === 'ke');
  const ug = all.find((p) => marketOfPath(p) === 'ug');
  const tzSw = tz ? (swOverride && marketOfPath(path) === 'tz' ? swOverride : tz) : undefined;
  const map: Record<string, string> = {};
  if (tz) {
    map['en-TZ'] = abs(tz, 'en');
    map['sw-TZ'] = abs(tzSw ?? tz, 'sw');
  }
  if (ke) map['en-KE'] = abs(ke, 'en');
  if (ug) map['en-UG'] = abs(ug, 'en');
  map['x-default'] = tz ? abs(tz, 'en') : abs((ke ?? ug)!, 'en');
  return map;
}
