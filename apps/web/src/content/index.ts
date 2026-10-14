import type { Locale } from '@harusi/i18n';
import { COMPANY_PAGES } from './pages/company';
import { GUIDE_PAGES } from './pages/guides';
import { LEGAL_PAGES } from './pages/legal';
import { PRODUCT_PAGES } from './pages/products';
import type { ContentPageDef, PageGroup, PageText } from './types';

export const ALL_PAGES: ContentPageDef[] = [
  ...PRODUCT_PAGES,
  ...GUIDE_PAGES,
  ...COMPANY_PAGES,
  ...LEGAL_PAGES,
];

const BY_SLUG = new Map(ALL_PAGES.map((p) => [p.slug, p]));

export function getPage(slug: string): ContentPageDef | undefined {
  return BY_SLUG.get(slug);
}

export function textOf(page: ContentPageDef, locale: Locale): PageText {
  return page[locale];
}

export function pagesIn(group: PageGroup): ContentPageDef[] {
  return ALL_PAGES.filter((p) => p.group === group);
}

/** Pages that have their own routes (`privacy`, `terms`) are rendered by those routes. */
export const STATIC_ROUTE_SLUGS = new Set(['privacy', 'terms']);
