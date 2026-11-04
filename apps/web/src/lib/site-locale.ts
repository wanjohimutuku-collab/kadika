import type { Locale } from '@harusi/i18n';
import { areaOf } from './surfaces';

/**
 * Language of the public marketing site comes from the path (kit sitemap.md):
 *
 *   /...      Swahili, Tanzania (sw-TZ)
 *   /en/...   English, Tanzania (en-TZ), the same pages rendered in English
 *   /ke/...   English, Kenya (en-KE)
 *
 * `/en/x` is rewritten to `/x` with the language set, so there is one route tree. The old scheme
 * (`?lang=sw|en` on the same URL) answers with a permanent redirect to the new URL.
 */

export type SiteMarket = 'tz' | 'ke';

export type LocaleRoute =
  /** Permanent redirect; `location` is a path plus query, relative to the current host. */
  | { action: 'redirect'; location: string }
  /** Serve `path` (the URL without `/en`) in `locale`. */
  | { action: 'rewrite'; path: string; locale: Locale; market: SiteMarket }
  /** Serve the URL as it is in `locale`. */
  | { action: 'next'; locale: Locale; market: SiteMarket };

const isUnder = (p: string, prefix: string) => p === prefix || p.startsWith(`${prefix}/`);

/** True for paths of the public marketing site (not the card, console, staff panel, sign-in or dev). */
export function isSitePath(path: string): boolean {
  return areaOf(path) === 'public' && !isUnder(path, '/dev') && !isUnder(path, '/gate-join');
}

/** `/en/x` → `/x`, `/en` → `/`; other paths unchanged. */
export function stripEnPrefix(path: string): string {
  if (path === '/en') return '/';
  return path.startsWith('/en/') ? path.slice(3) : path;
}

const withQuery = (path: string, params: URLSearchParams) => {
  const q = params.toString();
  return q ? `${path}?${q}` : path;
};

/** What the middleware does with a public request. `null` means it is not a site path. */
export function routeSiteLocale(pathname: string, search: string): LocaleRoute | null {
  const enPrefixed = pathname === '/en' || pathname.startsWith('/en/');
  const path = stripEnPrefix(pathname);
  if (!isSitePath(path)) return null;
  const market: SiteMarket = isUnder(path, '/ke') ? 'ke' : 'tz';

  const params = new URLSearchParams(search);
  const legacy = params.get('lang');
  if (legacy !== null || (enPrefixed && market === 'ke')) {
    params.delete('lang');
    const english = market === 'tz' && (enPrefixed ? legacy !== 'sw' : legacy === 'en');
    return { action: 'redirect', location: withQuery(english ? enPath(path) : path, params) };
  }

  if (market === 'ke') return { action: 'next', locale: 'en', market };
  if (enPrefixed) return { action: 'rewrite', path, locale: 'en', market };
  return { action: 'next', locale: 'sw', market };
}

/** The English Tanzania URL of a Tanzania path. */
export function enPath(path: string): string {
  return path === '/' ? '/en' : `/en${path}`;
}

/** Which site edition a path (or href with query/hash) belongs to: `ke`, `en` (under `/en`) or `sw`. */
export function editionOfPath(href: string): 'sw' | 'en' | 'ke' {
  const path = href.replace(/[?#].*$/, '');
  const market = stripEnPrefix(path);
  if (isUnder(market, '/ke')) return 'ke';
  return path === '/en' || path.startsWith('/en/') ? 'en' : 'sw';
}
