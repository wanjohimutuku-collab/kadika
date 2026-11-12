import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

/**
 * Private surfaces stay out of search. Guest cards (/c, /s, /k) carry personal links. Rules are path
 * prefixes, so the card-number page is anchored with `$`: a bare `/k` would also block `/ke` and every
 * `/kadi-…` and `/ku…` page (robots.test.ts checks every sitemap URL stays allowed). `/icons/` is not
 * listed: it holds the logo the structured data points to.
 */
export const PRIVATE = [
  '/app',
  '/ops',
  '/c/',
  '/s/',
  '/k$',
  '/en/k$',
  '/login',
  '/dev',
  '/api/',
  '/jaribu',
  '/en/jaribu',
];

/**
 * Search and answer engines named in the kit (sitemap.md § Technical), allowed explicitly. A crawler
 * that matches its own group ignores `*`, so each group repeats the private list. Training crawlers
 * (GPTBot, ClaudeBot, Google-Extended) fall under `*` until the owner decides on them.
 */
export const SEARCH_BOTS = [
  'Googlebot',
  'Bingbot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'PerplexityBot',
  'Claude-SearchBot',
  'Claude-User',
] as const;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: [...SEARCH_BOTS], allow: '/', disallow: PRIVATE },
      { userAgent: '*', allow: '/', disallow: PRIVATE },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
