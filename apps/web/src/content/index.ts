import type { Locale } from '@harusi/i18n';
import { COMPANY_PAGES } from './pages/company';
import { GUIDE_PAGES } from './pages/guides';
import { KENYA_PAGES } from './pages/kenya';
import { KENYA_LEGAL_PAGES } from './pages/kenya-legal';
import { LEGAL_PAGES } from './pages/legal';
import { PRODUCT_PAGES } from './pages/products';
import { OCCASION_PAGES } from './pages/occasions';
import { ARTICLE_PAGES } from './pages/articles';
import type { ContentPageDef, Market, PageGroup, PageText } from './types';

export const ALL_PAGES: ContentPageDef[] = [
  ...PRODUCT_PAGES,
  ...OCCASION_PAGES,
  ...GUIDE_PAGES,
  ...ARTICLE_PAGES,
  ...COMPANY_PAGES,
  ...LEGAL_PAGES,
  ...KENYA_PAGES,
  ...KENYA_LEGAL_PAGES,
];

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

/** Site path of a page: Tanzania at the root, Kenya under `/ke`. */
export function pagePath(p: ContentPageDef): string {
  return marketOf(p) === 'ke' ? (p.slug ? `/ke/${p.slug}` : '/ke') : `/${p.slug}`;
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
