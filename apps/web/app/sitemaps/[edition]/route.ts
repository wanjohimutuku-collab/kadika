import { SITEMAP_EDITIONS, renderUrlset, sitemapEntries } from '@/lib/sitemap';
import type { SiteEdition } from '@/lib/site-nav';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return SITEMAP_EDITIONS.map((e) => ({ edition: `${e}.xml` }));
}

/** `/sitemaps/sw.xml`, `/sitemaps/en.xml`, `/sitemaps/ke.xml`, `/sitemaps/ug.xml`. */
export async function GET(_req: Request, { params }: { params: Promise<{ edition: string }> }) {
  const edition = (await params).edition.replace(/\.xml$/, '') as SiteEdition;
  if (!SITEMAP_EDITIONS.includes(edition)) return new Response('Not found', { status: 404 });
  return new Response(renderUrlset(sitemapEntries(edition)), {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
    },
  });
}
