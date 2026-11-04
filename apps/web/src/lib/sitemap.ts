import { ALL_PAGES, marketOf, pagePath } from '@/content';
import type { ContentPageDef } from '@/content/types';
import { APP_DOWNLOAD_PATH } from './app-download';
import { PRICING_PATH } from './server-pricing';
import { SITE_URL, absoluteLocaleUrl, hreflangMap } from './seo';
import { counterpartPath, type SiteEdition } from './site-nav';

/**
 * One sitemap index with a child per edition (kit sitemap.md § Technical): sw, en and ke. Private
 * surfaces (/k, /c, /s, /login, /app, /ops, /dev) are never listed: only site pages are.
 */
export const SITEMAP_EDITIONS: readonly SiteEdition[] = ['sw', 'en', 'ke'];

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  priority: number;
  alternates: Record<string, string>;
}

const weight = (p: ContentPageDef) =>
  p.slug === '' ? 1 : p.group === 'legal' ? 0.3 : p.group === 'product' ? 0.9 : 0.7;

export function sitemapEntries(edition: SiteEdition): SitemapEntry[] {
  const market = edition === 'ke' ? 'ke' : 'tz';
  const locale = edition === 'sw' ? 'sw' : 'en';
  const pages: { path: string; counterpart?: string; updated?: string; priority: number }[] =
    market === 'tz'
      ? [
          { path: '/', counterpart: '/ke', priority: 1 },
          { path: PRICING_PATH, priority: 0.8 },
          { path: APP_DOWNLOAD_PATH, priority: 0.6 },
        ]
      : [];
  for (const p of ALL_PAGES) {
    if (marketOf(p) !== market) continue;
    pages.push({
      path: pagePath(p),
      counterpart: counterpartPath(pagePath(p)),
      updated: p.updated,
      priority: weight(p),
    });
  }
  return pages.map((p) => ({
    loc: absoluteLocaleUrl(p.path, locale),
    ...(p.updated ? { lastmod: p.updated } : {}),
    priority: p.priority,
    alternates: hreflangMap(p.path, p.counterpart),
  }));
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function renderUrlset(entries: SitemapEntry[]): string {
  const urls = entries
    .map(
      (e) =>
        `<url><loc>${esc(e.loc)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}<priority>${e.priority}</priority>${Object.entries(
          e.alternates,
        )
          .map(([l, href]) => `<xhtml:link rel="alternate" hreflang="${l}" href="${esc(href)}"/>`)
          .join('')}</url>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
}

export const childSitemapUrl = (e: SiteEdition) => `${SITE_URL}/sitemaps/${e}.xml`;

export function renderIndex(): string {
  const items = SITEMAP_EDITIONS.map(
    (e) => `<sitemap><loc>${childSitemapUrl(e)}</loc></sitemap>`,
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>\n`;
}
