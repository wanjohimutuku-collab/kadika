import { ALL_PAGES, counterpartsOf, marketOf, pagePath } from '@/content';
import type { ContentPageDef } from '@/content/types';
import { APP_DOWNLOAD_PATH } from './app-download';
import { PRICING_PATH } from './server-pricing';
import { SITE_URL, absoluteLocaleUrl, hreflangMap } from './seo';
import { counterpartPath, type SiteEdition } from './site-nav';

/**
 * One sitemap index with a child per edition (kit sitemap.md § Technical): sw, en, ke and ug. Private
 * surfaces (/k, /c, /s, /login, /app, /ops, /dev) are never listed: only site pages are.
 */
export const SITEMAP_EDITIONS: readonly SiteEdition[] = ['sw', 'en', 'ke', 'ug'];

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  priority: number;
  alternates: Record<string, string>;
}

const CORE_UPDATED = '2026-11-26';

const weight = (p: ContentPageDef) =>
  p.slug === '' ? 1 : p.group === 'legal' ? 0.3 : p.group === 'product' ? 0.9 : 0.7;

export function sitemapEntries(edition: SiteEdition): SitemapEntry[] {
  const market = edition === 'ke' ? 'ke' : edition === 'ug' ? 'ug' : 'tz';
  const locale = edition === 'sw' ? 'sw' : 'en';
  const pages: {
    path: string;
    pathEn?: string;
    pathSw?: string;
    counterpart?: string | string[];
    updated?: string;
    priority: number;
  }[] =
    market === 'tz'
      ? [
          { path: '/', counterpart: ['/ke', '/ug'], updated: CORE_UPDATED, priority: 1 },
          { path: PRICING_PATH, updated: CORE_UPDATED, priority: 0.8 },
          { path: APP_DOWNLOAD_PATH, updated: CORE_UPDATED, priority: 0.6 },
        ]
      : [];
  for (const p of ALL_PAGES) {
    if (marketOf(p) !== market) continue;
    const path = pagePath(p, locale);
    const tzCounterpart =
      market !== 'tz' ? counterpartsOf(p).find((c) => marketOf(c) === 'tz') : undefined;
    // hreflangMap expects the TZ EN path as the first arg; keep the SW path aside so the
    // alternate can use the SW slug, not the EN slug under /sw.
    pages.push({
      path,
      pathEn: market === 'tz' ? pagePath(p, 'en') : path,
      pathSw:
        market === 'tz'
          ? pagePath(p, 'sw')
          : tzCounterpart
            ? pagePath(tzCounterpart, 'sw')
            : undefined,
      counterpart:
        p.slug === '' && market !== 'tz'
          ? ['/', market === 'ke' ? '/ug' : '/ke']
          : counterpartPath(path, 'en'),
      updated: p.updated,
      priority: weight(p),
    });
  }
  return pages.map((p) => {
    const anchor = p.pathEn ?? p.path;
    return {
      loc: absoluteLocaleUrl(p.path, locale),
      ...(p.updated ? { lastmod: p.updated } : {}),
      priority: p.priority,
      alternates: hreflangMap(anchor, p.counterpart, p.pathSw),
    };
  });
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

/** All unique canonical sitemap URLs across English (en), Swahili (sw), Kenya (ke) and Uganda (ug). */
export function allSitemapEntries(): SitemapEntry[] {
  const seen = new Set<string>();
  const all: SitemapEntry[] = [];
  for (const ed of ['en', 'sw', 'ke', 'ug'] as const) {
    for (const entry of sitemapEntries(ed)) {
      if (seen.has(entry.loc)) continue;
      seen.add(entry.loc);
      all.push(entry);
    }
  }
  return all;
}

export function renderIndex(): string {
  const items = SITEMAP_EDITIONS.map((e) => {
    const latest = sitemapEntries(e)
      .map((entry) => entry.lastmod)
      .filter((d): d is string => Boolean(d))
      .sort()
      .at(-1);
    return `<sitemap><loc>${childSitemapUrl(e)}</loc>${latest ? `<lastmod>${latest}</lastmod>` : ''}</sitemap>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>\n`;
}
