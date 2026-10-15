import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

/** Private surfaces stay out of search. Guest cards (/c, /s, /k) carry personal links. */
const PRIVATE = ['/app', '/ops', '/c/', '/s/', '/k', '/login', '/dev', '/api/', '/icons/'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: PRIVATE }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
