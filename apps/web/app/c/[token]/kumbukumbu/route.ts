import {
  createHttpRepository,
  isRepositoryError,
  type GuestMemoriesView,
} from '@harusi/api-client';
import { APP_DOMAIN, USE_MOCKS } from '@/lib/env';
import { peekGuestMemoriesOnServer } from '@/lib/server-mock';
import { renderProblem } from '@/lib/light-card/render';
import { renderMemories, renderMemoriesUnavailable } from '@/lib/light-card/memories';
import { API_URL, brandOf, html, localeOf } from '@/lib/light-card/route-utils';

/**
 * Kumbukumbu (ADR 050): the couple's photos for one guest, by their card token. Plain HTML like the
 * card (ADR 014); photos come from the API, which checks the token again for every file.
 */
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const locale = localeOf(req);
  const base = { locale, domain: APP_DOMAIN, brand: await brandOf() };
  let view: GuestMemoriesView;
  try {
    view = USE_MOCKS
      ? peekGuestMemoriesOnServer(token)
      : await createHttpRepository(API_URL).getGuestMemories(token);
  } catch (e) {
    const code = isRepositoryError(e) ? e.code : 'server';
    if (code === 'reissued') return html(renderProblem('reissued', base));
    if (isRepositoryError(e) && e.details?.reason === 'memories_unavailable')
      return html(renderMemoriesUnavailable(base), 404);
    if (code === 'not_found' || code === 'invalid_token')
      return html(renderProblem('invalid', base), 404);
    return html(renderProblem('error', base), 503);
  }
  return html(
    renderMemories(view, {
      token,
      ...base,
      mode: USE_MOCKS ? 'mock' : 'api',
      apiUrl: API_URL,
      // Mock mode has no API to serve photos: two sample files stand in for every memory.
      photoUrl: USE_MOCKS
        ? (id) => `/dev/memories/${view.memories.findIndex((m) => m.id === id) % 2 ? 2 : 1}.webp`
        : undefined,
    }),
  );
}
