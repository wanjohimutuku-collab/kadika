import { NextResponse, type NextRequest } from 'next/server';
import { isLocale } from '@harusi/i18n';
import { areaOf, decide, hostFor, surfaceOf } from '@/lib/surfaces';

/**
 * Inlined at build time. Unset (local development, tests, staging) means no host rules at all.
 * Set to `kadisasa.com`, the apex serves the public site and the guest card, `app.` the console and `my.`
 * the staff panel; a request for a surface that lives on another host is redirected there (ADR 032).
 */
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN;

/**
 * A redirect to `host`, keeping path and query unless `path` replaces the path. The target always names the
 * public host: behind the proxy `req.nextUrl` carries the server's own listen address (for example
 * `localhost:3000`), which must never leak into a Location header. 307, not 308, so a browser does not
 * remember a redirect that a later change to the rules could undo.
 */
function redirect(req: NextRequest, host: string, path?: string) {
  const url = req.nextUrl.clone();
  url.protocol = 'https:';
  url.port = '';
  url.host = host;
  if (path) url.pathname = path;
  return NextResponse.redirect(url, 307);
}

/**
 * `?lang=sw|en` selects the language for that request, so each language has its own crawlable URL
 * (hreflang). `/ke` pages default to English; the language cookie still decides when the parameter is
 * absent.
 */
export function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname;

  const surface = surfaceOf(req.headers.get('host'), ROOT_DOMAIN);
  if (surface && ROOT_DOMAIN) {
    const d = decide(surface, p);
    if (d.action === 'redirect-path') return redirect(req, hostFor(surface, ROOT_DOMAIN), d.path);
    if (d.action === 'redirect-surface') return redirect(req, hostFor(d.surface, ROOT_DOMAIN));
  }

  // Language and market only matter for the public content pages.
  const isPublicContent = areaOf(p) === 'public' && p !== '/dev' && !p.startsWith('/dev/');
  if (!isPublicContent) return NextResponse.next();
  const headers = new Headers(req.headers);
  const lang = req.nextUrl.searchParams.get('lang');
  if (isLocale(lang)) headers.set('x-hp-lang', lang);
  if (p === '/ke' || p.startsWith('/ke/')) headers.set('x-hp-market', 'ke');
  return NextResponse.next({ request: { headers } });
}

/** Everything except Next internals, the API and files with an extension (assets, sw.js, robots.txt). */
export const config = {
  matcher: ['/((?!_next/|api/|icons/|.*\\..*).*)'],
};
