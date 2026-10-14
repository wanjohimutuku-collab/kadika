import { NextResponse, type NextRequest } from 'next/server';
import { isLocale } from '@harusi/i18n';

/**
 * `?lang=sw|en` selects the language for that request, so each language has its own crawlable URL
 * (hreflang). The cookie from the language chip still decides when the parameter is absent.
 */
export function middleware(req: NextRequest) {
  const lang = req.nextUrl.searchParams.get('lang');
  if (!isLocale(lang)) return NextResponse.next();
  const headers = new Headers(req.headers);
  headers.set('x-hp-lang', lang);
  return NextResponse.next({ request: { headers } });
}

/** Public content routes only; private surfaces and assets are left alone. */
export const config = {
  matcher: ['/((?!_next|api|icons|c/|s/|k|app|ops|dev|login|sw\\.js|.*\\..*).*)'],
};
