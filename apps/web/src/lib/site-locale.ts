import type { Locale } from '@harusi/i18n';
import { areaOf } from './surfaces';
import { routeSlugRedirect } from '@/content';

/**
 * Language of the public marketing site comes from the path:
 *
 *   /...       English, Tanzania (en-TZ) — the default edition
 *   /sw/...    Swahili, Tanzania (sw-TZ), the same pages rendered in Swahili
 *   /ke/...    English, Kenya (en-KE) — unchanged
 *
 * `/sw/x` is rewritten to `/x` with the language set, so there is one route tree. `/en` and
 * `/en/x` answer with a 301 to their canonical `/` and `/x`. Old `?lang=` URLs answer with a
 * 301 to the canonical URL. A TZ URL whose slug is in the wrong locale 301s to the right one
 * (see `routeSlugRedirect`).
 */

export type SiteMarket = 'tz' | 'ke';

export type LocaleRoute =
  | { action: 'redirect'; location: string }
  | { action: 'rewrite'; path: string; locale: Locale; market: SiteMarket }
  | { action: 'next'; locale: Locale; market: SiteMarket };

const isUnder = (p: string, prefix: string) => p === prefix || p.startsWith(`${prefix}/`);

export function isSitePath(path: string): boolean {
  return areaOf(path) === 'public' && !isUnder(path, '/dev') && !isUnder(path, '/gate-join');
}

/** `/sw/x` → `/x`, `/sw` → `/`; other paths unchanged. */
export function stripSwPrefix(path: string): string {
  if (path === '/sw') return '/';
  return path.startsWith('/sw/') ? path.slice(3) : path;
}

/** The Swahili TZ URL of a TZ path. */
export function swPath(path: string): string {
  return path === '/' ? '/sw' : `/sw${path}`;
}

const withQuery = (path: string, params: URLSearchParams) => {
  const q = params.toString();
  return q ? `${path}?${q}` : path;
};

export function routeSiteLocale(pathname: string, search: string): LocaleRoute | null {
  // /en and /en/x are retired — 301 to the canonical.
  if (pathname === '/en' || pathname.startsWith('/en/')) {
    const stripped = pathname === '/en' ? '/' : pathname.slice(3);
    const params = new URLSearchParams(search);
    params.delete('lang');
    // Also normalise a wrong-locale slug here so the hop is a single 301.
    const slugRedirect = routeSlugRedirect(stripped);
    return { action: 'redirect', location: withQuery(slugRedirect ?? stripped, params) };
  }

  const swPrefixed = pathname === '/sw' || pathname.startsWith('/sw/');
  const bare = swPrefixed ? stripSwPrefix(pathname) : pathname;
  if (!isSitePath(bare)) return null;

  const market: SiteMarket = isUnder(bare, '/ke') ? 'ke' : 'tz';

  // Legacy ?lang=sw|en — redirect to the canonical URL for the chosen locale.
  const params = new URLSearchParams(search);
  const legacy = params.get('lang');
  if (legacy !== null) {
    params.delete('lang');
    if (market === 'ke') return { action: 'redirect', location: withQuery(bare, params) };
    const wantSw = legacy === 'sw';
    const target = wantSw ? swPath(bare) : bare;
    return { action: 'redirect', location: withQuery(target, params) };
  }

  if (market === 'ke') return { action: 'next', locale: 'en', market };

  // Wrong-locale slug on a TZ path: single 301 to the right-locale canonical.
  const slugRedirect = routeSlugRedirect(pathname);
  if (slugRedirect) return { action: 'redirect', location: slugRedirect };

  if (swPrefixed) return { action: 'rewrite', path: bare, locale: 'sw', market };
  return { action: 'next', locale: 'en', market };
}

/** `/sw...` → `'sw'`; `/ke...` → `'ke'`; else `'en'`. */
export function editionOfPath(href: string): 'sw' | 'en' | 'ke' {
  const path = href.replace(/[?#].*$/, '');
  if (isUnder(path, '/sw')) return 'sw';
  if (isUnder(path, '/ke')) return 'ke';
  return 'en';
}
