import type { Locale } from '@harusi/i18n';
import {
  ALL_PAGES,
  counterpartOf,
  counterpartsOf,
  marketOf,
  pageBySlug,
  pagePath,
} from '@/content';
import type { ContentPageDef } from '@/content/types';
import { localeUrl, marketOfPath } from './seo';

/** The four site editions the locale switch offers. */
export type SiteEdition = 'sw' | 'en' | 'ke' | 'ug';

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

/** Returns the KE or UG page at its path, or null. */
function regionalPageByPath(path: string, market: 'ke' | 'ug'): ContentPageDef | null {
  const prefix = `/${market}`;
  if (path === prefix) return null;
  const slug = path.startsWith(`${prefix}/`) ? path.slice(prefix.length + 1) : null;
  if (!slug) return null;
  return ALL_PAGES.find((p) => marketOf(p) === market && p.slug === slug) ?? null;
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
  if (market === 'ke' || market === 'ug') {
    const page = regionalPageByPath(bare, market);
    const counterpart = page ? counterpartOf(page) : null;
    const tz = counterpart && marketOf(counterpart) === 'tz' ? counterpart : null;
    return {
      en: tz ? pagePath(tz, 'en') : '/',
      sw: tz ? localeUrl(pagePath(tz, 'sw'), 'sw') : '/sw',
      ke: market === 'ke' ? bare : '/ke',
      ug: market === 'ug' ? bare : '/ug',
    };
  }
  const page = tzPageByPath(bare, locale);
  if (page) {
    const c = counterpartOf(page);
    return {
      en: pagePath(page, 'en'),
      sw: localeUrl(pagePath(page, 'sw'), 'sw'),
      ke: c && marketOf(c) === 'ke' ? pagePath(c, 'en') : '/ke',
      ug: c && marketOf(c) === 'ug' ? pagePath(c, 'en') : '/ug',
    };
  }
  // Home or a non-content path (e.g. /bei): slug stays as-is in both TZ locales.
  return {
    en: bare,
    sw: localeUrl(bare, 'sw'),
    ke: '/ke',
    ug: '/ug',
  };
}

/** The same-topic page(s) in other markets as bare paths (no `/sw` prefix). */
export function counterpartPath(path: string, locale: Locale): string | string[] | undefined {
  if (path === '/') return ['/ke', '/ug'];
  if (path === '/ke') return ['/', '/ug'];
  if (path === '/ug') return ['/', '/ke'];
  const market = marketOfPath(path);
  if (market === 'ke' || market === 'ug') {
    const page = regionalPageByPath(path, market);
    const list = page ? counterpartsOf(page) : [];
    if (!list.length) return undefined;
    const paths = list.map((c) => pagePath(c, marketOf(c) === 'tz' ? locale : 'en'));
    return paths.length === 1 ? paths[0] : paths;
  }
  const page = tzPageByPath(path, locale);
  const list = page ? counterpartsOf(page) : [];
  if (!list.length) return undefined;
  const paths = list.map((c) => pagePath(c, 'en'));
  return paths.length === 1 ? paths[0] : paths;
}
