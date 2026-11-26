import { renderIndex } from '@/lib/sitemap';

export const dynamic = 'force-static';

/** Sitemap index: one child per site edition (sw, en, ke, ug). */
export function GET() {
  return new Response(renderIndex(), {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
    },
  });
}
