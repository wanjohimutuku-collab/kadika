import type { Locale } from '@harusi/i18n';
import { COMPANY_PAGES } from './pages/company';
import { GUIDE_PAGES } from './pages/guides';
import { KENYA_PAGES } from './pages/kenya';
import { KENYA_LEGAL_PAGES } from './pages/kenya-legal';
import { LEGAL_PAGES } from './pages/legal';
import { PRODUCT_PAGES } from './pages/products';
import { OCCASION_PAGES } from './pages/occasions';
import { ARTICLE_PAGES } from './pages/articles';
import { GEO_PAGES } from './pages/geo';
import { EXPANSIONS } from './pages/expansions';
import type { ContentPageDef, Market, PageGroup, PageText } from './types';

/** Appends the worked examples and extra answers from `pages/expansions` to Tanzania pages. */
function withExpansions(p: ContentPageDef): ContentPageDef {
  const x = p.market === 'ke' ? undefined : EXPANSIONS[p.slug];
  if (!x) return p;
  const merge = (t: PageText, add: (typeof x)['sw']): PageText => ({
    ...t,
    sections: [...t.sections, ...add.sections],
    faq: [...(t.faq ?? []), ...add.faq],
  });
  return { ...p, updated: x.updated, sw: merge(p.sw, x.sw), en: merge(p.en, x.en) };
}

export const ALL_PAGES: ContentPageDef[] = [
  ...PRODUCT_PAGES,
  ...OCCASION_PAGES,
  ...GEO_PAGES,
  ...GUIDE_PAGES,
  ...ARTICLE_PAGES,
  ...COMPANY_PAGES,
  ...LEGAL_PAGES,
  ...KENYA_PAGES,
  ...KENYA_LEGAL_PAGES,
].map(withExpansions);

export const marketOf = (p: ContentPageDef): Market => p.market ?? 'tz';

const key = (market: Market, slug: string) => `${market}:${slug}`;
const BY_KEY = new Map(ALL_PAGES.map((p) => [key(marketOf(p), p.slug), p]));

export function getPage(slug: string, market: Market = 'tz'): ContentPageDef | undefined {
  return BY_KEY.get(key(market, slug));
}

/** Resolves a `related` entry: plain slug (same market) or `tz:slug` / `ke:slug`. */
export function resolveRelated(from: ContentPageDef, ref: string): ContentPageDef | undefined {
  const m = /^(tz|ke):(.*)$/.exec(ref);
  return m ? getPage(m[2]!, m[1] as Market) : getPage(ref, marketOf(from));
}

/**
 * Site path of a page for a given locale (before `localeUrl` adds the `/sw` prefix):
 *   - TZ `en`: `/<slugEn>`
 *   - TZ `sw`: `/<slug>` (SW slug; `localeUrl` wraps this with `/sw`)
 *   - KE    : `/ke/<slug>` (KE slug is English; `slugEn === slug`)
 */
export function pagePath(p: ContentPageDef, locale: Locale): string {
  if (marketOf(p) === 'ke') return p.slug ? `/ke/${p.slug}` : '/ke';
  const s = locale === 'en' ? p.slugEn : p.slug;
  return `/${s}`;
}

/**
 * Look a TZ or KE page up by any slug a visitor might type: EN first (default edition), SW
 * second. Returns `null` for unknown slugs, including empty strings and non-TZ market paths.
 */
export function pageBySlug(
  slug: string,
  market: Market,
): { page: ContentPageDef; matchedLocale: Locale } | null {
  for (const p of ALL_PAGES) {
    if (marketOf(p) !== market) continue;
    if (p.slugEn === slug) return { page: p, matchedLocale: 'en' };
  }
  if (market === 'tz') {
    for (const p of ALL_PAGES) {
      if (marketOf(p) !== 'tz') continue;
      if (p.slug === slug && p.slug !== p.slugEn) return { page: p, matchedLocale: 'sw' };
    }
  }
  return null;
}

/**
 * Permanent-redirect target for a TZ path whose slug is the wrong locale's variant:
 *   - `/<slug-sw>` where the page's EN slug differs → `/<slug-en>` (EN is the default edition)
 *   - `/sw/<slug-en>` where the page's SW slug differs → `/sw/<slug-sw>`
 * Returns `null` when the path is already canonical, the home, a `/ke` path, or unknown.
 */
export function routeSlugRedirect(path: string): string | null {
  if (path === '/' || path === '/sw' || path.startsWith('/ke')) return null;
  const sw = path.startsWith('/sw/');
  const slug = sw ? path.slice(4) : path.slice(1);
  if (!slug || slug.includes('/')) return null;
  const match = pageBySlug(slug, 'tz');
  if (!match) return null;
  if (match.page.slug === match.page.slugEn) return null;
  if (sw && match.matchedLocale === 'en') return `/sw/${match.page.slug}`;
  if (!sw && match.matchedLocale === 'sw') return `/${match.page.slugEn}`;
  return null;
}

/** The same-topic page in the other market, found from either side so hreflang is reciprocal. */
export function counterpartOf(p: ContentPageDef): ContentPageDef | undefined {
  if (p.counterpart) return getPage(p.counterpart.slug, p.counterpart.market);
  return ALL_PAGES.find(
    (o) =>
      o.counterpart?.slug === p.slug &&
      o.counterpart.market === marketOf(p) &&
      marketOf(o) !== marketOf(p),
  );
}

export function textOf(page: ContentPageDef, locale: Locale): PageText {
  return page[locale];
}

export function pagesIn(group: PageGroup, market: Market = 'tz'): ContentPageDef[] {
  return ALL_PAGES.filter((p) => p.group === group && marketOf(p) === market);
}

export function pagesOf(market: Market): ContentPageDef[] {
  return ALL_PAGES.filter((p) => marketOf(p) === market);
}

/** Pages that have their own routes (`privacy`, `terms`) are rendered by those routes. */
export const STATIC_ROUTE_SLUGS = new Set(['privacy', 'terms']);
