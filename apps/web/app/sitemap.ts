import type { MetadataRoute } from 'next';
import { SITE_URL, localeUrl } from '@/lib/seo';
import { ALL_PAGES } from '@/content';

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    { path: '/', updated: undefined, weight: 1 },
    ...ALL_PAGES.map((p) => ({
      path: `/${p.slug}`,
      updated: p.updated,
      weight: p.group === 'legal' ? 0.3 : p.group === 'product' ? 0.9 : 0.7,
    })),
  ];
  return pages.map(({ path, updated, weight }) => ({
    url: `${SITE_URL}${localeUrl(path, 'sw')}`,
    ...(updated ? { lastModified: updated } : {}),
    changeFrequency: path === '/' ? ('weekly' as const) : ('monthly' as const),
    priority: weight,
    alternates: {
      languages: {
        sw: `${SITE_URL}${localeUrl(path, 'sw')}`,
        en: `${SITE_URL}${localeUrl(path, 'en')}`,
      },
    },
  }));
}
