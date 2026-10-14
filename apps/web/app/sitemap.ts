import type { MetadataRoute } from 'next';
import { PUBLIC_PATHS, SITE_URL, localeUrl } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.map((path) => ({
    url: `${SITE_URL}${localeUrl(path, 'sw')}`,
    changeFrequency: path === '/' ? 'weekly' : 'yearly',
    priority: path === '/' ? 1 : 0.3,
    alternates: {
      languages: {
        sw: `${SITE_URL}${localeUrl(path, 'sw')}`,
        en: `${SITE_URL}${localeUrl(path, 'en')}`,
      },
    },
  }));
}
