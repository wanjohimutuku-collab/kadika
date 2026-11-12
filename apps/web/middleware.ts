import { NextResponse, type NextRequest } from 'next/server';
import { canonicalHostFor, decide, hostFor, surfaceOf } from '@/lib/surfaces';
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

/** Where sessions live: the console, the staff panel and sign-in. These get the strict script policy. */
const STRICT_CSP_PATHS = /^\/(app|ops|login)(\/|$)/;

/**
 * A nonce-based "strict CSP" (security review M-04): only scripts carrying this response's nonce run,
 * plus what those scripts load themselves ('strict-dynamic'), so markup injected into a page cannot
 * execute and reach the session. Next.js reads the nonce from the request header and puts it on its
 * own scripts. 'unsafe-inline' and https: are fallbacks that browsers honouring the nonce ignore.
 * It names no hosts on purpose: the API, Firebase sign-in and reCAPTCHA keep working without a list
 * to maintain. The remaining directives repeat the baseline from next.config.ts, which this replaces.
 */
function strictCsp(nonce: string): string {
  const dev = process.env.NODE_ENV !== 'production' ? " 'unsafe-eval'" : '';
  return [
    `script-src 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline' https:${dev}`,
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ].join('; ');
}

/**
 * The public site takes its language from the path: `/` English Tanzania (the default edition),
 * `/sw/...` Swahili Tanzania (rewritten to the same route), `/ke/...` English Kenya. Old `/en`,
 * `/en/x`, `?lang=` and legacy-slug URLs all 301 to the canonical en-TZ or sw-TZ URL.
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
    // One public host for search: www gets a permanent redirect to the bare domain, path and query kept.
    // After the surface rules, so a www request for another surface goes there in one hop.
    const apex = canonicalHostFor(req.headers.get('host'), ROOT_DOMAIN);
    if (apex) {
      const url = req.nextUrl.clone();
      url.protocol = 'https:';
      url.port = '';
      url.host = apex;
      return NextResponse.redirect(url, 308);
    }
  }

  // Language and market only matter for the public site pages.
  const route = routeSiteLocale(p, req.nextUrl.search);
  if (route?.action === 'redirect')
    return NextResponse.redirect(publicUrl(req, route.location), 301);
  const headers = new Headers(req.headers);
  const strict = STRICT_CSP_PATHS.test(route?.action === 'rewrite' ? route.path : p);
  const csp = strict ? strictCsp(btoa(crypto.randomUUID())) : null;
  // Next.js takes the nonce from the policy on the request; the browser enforces the one on the response.
  if (csp) headers.set('content-security-policy', csp);
  const send = (res: NextResponse) => {
    if (csp) res.headers.set('Content-Security-Policy', csp);
    return res;
  };
  if (!route) return csp ? send(NextResponse.next({ request: { headers } })) : NextResponse.next();
  headers.set('x-hp-lang', route.locale);
  if (route.market === 'ke') headers.set('x-hp-market', 'ke');
  // The route path (without `/en`), so the layout can link to the same page in the other languages.
  headers.set('x-hp-path', route.action === 'rewrite' ? route.path : p);
  if (route.action === 'rewrite') {
    const url = req.nextUrl.clone();
    url.pathname = route.path;
    return send(NextResponse.rewrite(url, { request: { headers } }));
  }
  return send(NextResponse.next({ request: { headers } }));
}

/** Everything except Next internals, the API and files with an extension (assets, sw.js, robots.txt). */
export const config = {
  matcher: ['/((?!_next/|api/|icons/|.*\\..*).*)'],
};
