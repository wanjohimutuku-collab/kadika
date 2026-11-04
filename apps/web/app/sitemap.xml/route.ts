import { renderIndex } from '@/lib/sitemap';

export const dynamic = 'force-static';

/** Sitemap index: one child per site edition (sw, en, ke). */
export function GET() {
  return new Response(renderIndex(), {
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  });
}
