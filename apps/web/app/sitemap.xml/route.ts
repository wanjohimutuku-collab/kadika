import { allSitemapEntries, renderUrlset } from '@/lib/sitemap';

export const dynamic = 'force-static';

/** Unified sitemap: all public URLs across English (en-TZ), Swahili (sw-TZ), Kenya (en-KE) and Uganda (en-UG). */
export function GET() {
  return new Response(renderUrlset(allSitemapEntries()), {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
    },
  });
}
