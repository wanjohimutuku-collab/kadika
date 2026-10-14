import { createHttpRepository, isRepositoryError, type CardView } from '@harusi/api-client';
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from '@harusi/i18n';
import { APP_DOMAIN, USE_MOCKS } from '@/lib/env';
import { peekCardOnServer } from '@/lib/server-mock';
import { renderCard, renderProblem } from '@/lib/light-card/render';

/**
 * Guest card (§7.3, §17.6) as a plain HTML route handler: no React runtime on the page, so the
 * first load is a few KB of HTML plus a ~10 KB inline script (ADR 014). Always rendered per
 * request; the service worker keeps the last copy for offline use.
 */
export const dynamic = 'force-dynamic';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function localeOf(req: Request): Locale {
  const m = new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]+)`).exec(req.headers.get('cookie') ?? '');
  return isLocale(m?.[1]) ? m![1] : defaultLocale;
}

function html(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const locale = localeOf(req);
  const base = { locale, domain: APP_DOMAIN };
  if (new URL(req.url).searchParams.get('state') === 'reissued')
    return html(renderProblem('reissued', base));

  let view: CardView;
  try {
    view = USE_MOCKS ? peekCardOnServer(token) : await createHttpRepository(API_URL).getCard(token);
  } catch (e) {
    const code = isRepositoryError(e) ? e.code : 'server';
    if (code === 'reissued') return html(renderProblem('reissued', base));
    if (code === 'not_found' || code === 'invalid_token')
      return html(renderProblem('invalid', base), 404);
    return html(renderProblem('error', base), 503);
  }
  if (view.state !== 'ok' || !view.event || !view.guest)
    return view.state === 'reissued'
      ? html(renderProblem('reissued', base))
      : html(renderProblem('invalid', base), 404);
  return html(
    renderCard(view, {
      token,
      locale,
      domain: APP_DOMAIN,
      mode: USE_MOCKS ? 'mock' : 'api',
      apiUrl: API_URL,
    }),
  );
}
