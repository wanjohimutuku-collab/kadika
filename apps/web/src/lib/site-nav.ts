import type { Locale } from '@harusi/i18n';
import { ALL_PAGES, counterpartOf, marketOf, pageBySlug, pagePath } from '@/content';
import type { ContentPageDef } from '@/content/types';
import { localeUrl, marketOfPath } from './seo';

/** The three site editions the locale switch offers (kit sitemap.md § Navigation). */
export type SiteEdition = 'sw' | 'en' | 'ke';

const stripSwPrefix = (p: string) => (p === '/sw' ? '/' : p.startsWith('/sw/') ? p.slice(3) : p);

/** Returns the TZ page whose path (for the given locale) is `path`, or null. */
function tzPageByPath(path: string, _locale: Locale): ContentPageDef | null {
  if (path === '/') return null;
  const slug = path.startsWith('/') ? path.slice(1) : path;
  const match = pageBySlug(slug, 'tz');
  if (!match) return null;
  // If the typed slug is the other locale's slug, still return the page — the caller may
  // want to switch locales and pick the right slug per edition.
  return match.page;
}

/** Returns the KE page at the KE path, or null. */
function kePageByPath(path: string): ContentPageDef | null {
  if (path === '/ke') return null;
  const slug = path.startsWith('/ke/') ? path.slice(4) : null;
  if (!slug) return null;
  return ALL_PAGES.find((p) => marketOf(p) === 'ke' && p.slug === slug) ?? null;
}

/**
 * Where each edition's link goes from `path` (the route path as seen by the layout, without the
 * `/sw` prefix): the same page in the chosen locale's slug, its same-topic counterpart in the
 * other market, or that market's home when there is none. `locale` is what is being rendered
 * right now, used to resolve the input path.
 */
export function editionTargets(path: string, locale: Locale): Record<SiteEdition, string> {
  const bare = stripSwPrefix(path);
  const market = marketOfPath(bare);
  if (market === 'ke') {
    const page = kePageByPath(bare);
    const tz = page ? counterpartOf(page) : null;
    return {
      en: tz ? pagePath(tz, 'en') : '/',
      sw: tz ? localeUrl(pagePath(tz, 'sw'), 'sw') : '/sw',
      ke: bare,
    };
  }
  const page = tzPageByPath(bare, locale);
  if (page) {
    const ke = counterpartOf(page);
    return {
      en: pagePath(page, 'en'),
      sw: localeUrl(pagePath(page, 'sw'), 'sw'),
      ke: ke ? pagePath(ke, 'en') : '/ke',
    };
  }
  // Home or a non-content path (e.g. /bei): slug stays as-is in both locales.
  return {
    en: bare,
    sw: localeUrl(bare, 'sw'),
    ke: bare === '/' ? '/ke' : '/ke',
  };
}

/** The same-topic page in the other market as a bare path (no `/sw` prefix). */
export function counterpartPath(path: string, locale: Locale): string | undefined {
  if (path === '/') return '/ke';
  if (path === '/ke') return '/';
  const market = marketOfPath(path);
  if (market === 'ke') {
    const page = kePageByPath(path);
    const tz = page ? counterpartOf(page) : null;
    return tz ? pagePath(tz, locale) : undefined;
  }
  const page = tzPageByPath(path, locale);
  const ke = page ? counterpartOf(page) : null;
  return ke ? pagePath(ke, 'en') : undefined;
}
