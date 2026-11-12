import { notFound } from 'next/navigation';
import { createSeedState, sampleCardToken } from '@harusi/api-client/mock';
import { APP_DOMAIN, SHOW_DEV_TOOLS } from '@/lib/env';
import { peekCardOnServer } from '@/lib/server-mock';
import { renderMemories, renderMemoriesUnavailable } from '@/lib/light-card/memories';
import { API_URL, brandOf, html, localeOf } from '@/lib/light-card/route-utils';

/**
 * Dev only: the Kumbukumbu guest page (ADR 050) with sample photos, and `?state=unavailable`.
 * Mock mode's server seed has no paid orders, so `/c/<token>/kumbukumbu` reads "not available" there.
 */
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!SHOW_DEV_TOOLS) notFound();
  const locale = localeOf(req);
  const base = { locale, domain: APP_DOMAIN, brand: await brandOf() };
  if (new URL(req.url).searchParams.get('state') === 'unavailable')
    return html(renderMemoriesUnavailable(base));
  const token = sampleCardToken(createSeedState(), 'delivered');
  const card = peekCardOnServer(token);
  const memories = [
    { caption: 'Tulipokutana chuoni', takenOn: '2019-03-02', w: 640, h: 427 },
    { caption: 'Safari ya kwanza Zanzibar', takenOn: '2021-08-14', w: 427, h: 640 },
    { caption: 'Siku ya posa', takenOn: '2025-12-20', w: 640, h: 427 },
    { caption: null, takenOn: null, w: 427, h: 640 },
  ].map((m, i) => ({
    id: `dev-${i + 1}`,
    caption: m.caption,
    takenOn: m.takenOn,
    sortOrder: i,
    width: m.w,
    height: m.h,
  }));
  return html(
    renderMemories(
      { card, memories },
      {
        token,
        ...base,
        mode: 'mock',
        apiUrl: API_URL,
        photoUrl: (id) => `/dev/memories/${Number(id.slice(4)) % 2 ? 1 : 2}.webp`,
      },
    ),
  );
}
