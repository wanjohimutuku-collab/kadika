import { NextResponse, type NextRequest } from 'next/server';
import { isLocale } from '@harusi/i18n';

/**
 * `?lang=sw|en` selects the language for that request, so each language has its own crawlable URL
 * (hreflang). `/ke` pages default to English; the language cookie still decides when the parameter is
 * absent.
 */
export function middleware(req: NextRequest) {
  const headers = new Headers(req.headers);
  const lang = req.nextUrl.searchParams.get('lang');
  if (isLocale(lang)) headers.set('x-hp-lang', lang);
  const p = req.nextUrl.pathname;
  if (p === '/ke' || p.startsWith('/ke/')) headers.set('x-hp-market', 'ke');
  return NextResponse.next({ request: { headers } });
}

/** Public content routes only; private surfaces and assets are left alone. */
export const config = {
  matcher: [
    '/((?!_next/|api/|icons/|c/|s/|k(?:/|$)|app(?:/|$)|ops(?:/|$)|dev(?:/|$)|login|sw\\.js|.*\\..*).*)',
  ],
};
