import type { MetadataRoute } from 'next';
import { SITE_URL, hreflangMap, localeUrl } from '@/lib/seo';
import { ALL_PAGES, counterpartOf, pagePath } from '@/content';
import { APP_DOWNLOAD_PATH } from '@/lib/app-download';
import { PRICING_PATH } from '@/lib/server-pricing';

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    { path: '/', counterpart: undefined, updated: undefined, weight: 1 },
    { path: APP_DOWNLOAD_PATH, counterpart: undefined, updated: undefined, weight: 0.6 },
    { path: PRICING_PATH, counterpart: undefined, updated: undefined, weight: 0.8 },
    ...ALL_PAGES.map((p) => {
      const c = counterpartOf(p);
      return {
        path: pagePath(p),
        counterpart: c ? pagePath(c) : undefined,
        updated: p.updated,
        weight: p.group === 'legal' ? 0.3 : p.group === 'product' ? 0.9 : 0.7,
      };
    }),
  ];
  return pages.map(({ path, counterpart, updated, weight }) => {
    const defaultLang = 'en';
    return {
      url: `${SITE_URL}${localeUrl(path, defaultLang)}`,
      ...(updated ? { lastModified: updated } : {}),
      changeFrequency: path === '/' ? ('weekly' as const) : ('monthly' as const),
      priority: weight,
      alternates: { languages: hreflangMap(path, counterpart) },
    };
  });
}
