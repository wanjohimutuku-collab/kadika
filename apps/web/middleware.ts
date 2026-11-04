import { NextResponse, type NextRequest } from 'next/server';
import { decide, hostFor, surfaceOf } from '@/lib/surfaces';
import { routeSiteLocale } from '@/lib/site-locale';

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
 * An absolute URL on the host the visitor used. Next needs an absolute Location, and `req.nextUrl` behind the
 * proxy can carry the server's listen address, so the origin comes from the forwarded or Host header.
 */
function publicUrl(req: NextRequest, pathAndQuery: string): URL {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? req.nextUrl.host;
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
  const proto = req.headers.get('x-forwarded-proto') ?? (local ? 'http' : 'https');
  return new URL(pathAndQuery, `${proto.split(',')[0]!.trim()}://${host}`);
}

/**
 * The public site takes its language from the path: `/` Swahili, `/en/...` English (rewritten to the same
 * route), `/ke/...` English Kenya. Old `?lang=` URLs get a permanent redirect to the new ones.
 */
export function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname;

  const surface = surfaceOf(req.headers.get('host'), ROOT_DOMAIN);
  if (surface && ROOT_DOMAIN) {
    const d = decide(surface, p);
    if (d.action === 'redirect-path') return redirect(req, hostFor(surface, ROOT_DOMAIN), d.path);
    if (d.action === 'redirect-surface') {
      // The client router fetches (and prefetches) a <Link> target with fetch(). A redirect to another host
      // fails CORS in the browser, one console error per link. A body that is not an RSC payload makes the
      // router load the URL as a normal page instead, which then gets the redirect below. Next strips its own
      // RSC headers before middleware runs, so tell a fetch from a page load by the browser's Sec-Fetch-Dest.
      if (req.headers.get('sec-fetch-dest') === 'empty')
        return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
      return redirect(req, hostFor(d.surface, ROOT_DOMAIN));
    }
  }

  // Language and market only matter for the public site pages.
  const route = routeSiteLocale(p, req.nextUrl.search);
  if (!route) return NextResponse.next();
  if (route.action === 'redirect')
    return NextResponse.redirect(publicUrl(req, route.location), 301);
  const headers = new Headers(req.headers);
  headers.set('x-hp-lang', route.locale);
  if (route.market === 'ke') headers.set('x-hp-market', 'ke');
  // The route path (without `/en`), so the layout can link to the same page in the other languages.
  headers.set('x-hp-path', route.action === 'rewrite' ? route.path : p);
  if (route.action === 'rewrite') {
    const url = req.nextUrl.clone();
    url.pathname = route.path;
    return NextResponse.rewrite(url, { request: { headers } });
  }
  return NextResponse.next({ request: { headers } });
}

/** Everything except Next internals, the API and files with an extension (assets, sw.js, robots.txt). */
export const config = {
  matcher: ['/((?!_next/|api/|icons/|.*\\..*).*)'],
};
