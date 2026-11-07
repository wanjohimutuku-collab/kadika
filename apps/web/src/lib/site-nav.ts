import type { Locale } from '@harusi/i18n';
import { ALL_PAGES, counterpartOf, pagePath } from '@/content';
import { localeUrl, marketOfPath } from './seo';

/** The three site editions the locale switch offers (kit sitemap.md § Navigation). */
export type SiteEdition = 'sw' | 'en' | 'ke';

/**
 * Where each edition's link goes from `path` (a route path, without `/sw`): the same page, its
 * same-topic counterpart in the other market, or that market's home when there is none. The
 * `locale` is the locale whose slug the caller is currently rendering — needed so the
 * counterpart lookup can match the right-locale slug.
 */
export function editionTargets(path: string, locale: Locale): Record<SiteEdition, string> {
  const market = marketOfPath(path);
  const other = counterpartPath(path, locale);
  const tz = market === 'tz' ? path : (other ?? '/');
  const ke = market === 'ke' ? path : (other ?? '/ke');
  return { sw: localeUrl(tz, 'sw'), en: localeUrl(tz, 'en'), ke };
}

/** The same-topic page in the other market: the two homes pair with each other, content pages by `counterpart`. */
export function counterpartPath(path: string, locale: Locale): string | undefined {
  if (path === '/') return '/ke';
  if (path === '/ke') return '/';
  const page = ALL_PAGES.find((p) => pagePath(p, locale) === path);
  const other = page ? counterpartOf(page) : undefined;
  return other ? pagePath(other, locale) : undefined;
}
