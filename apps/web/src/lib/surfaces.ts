/**
 * One web image serves three surfaces, and the hostname decides which of them a request may reach
 * (ADR 032):
 *
 *   kadisasa.com, www.kadisasa.com  public site and the guest card (/c, /s, /k)
 *   app.kadisasa.com                the customer and reseller console (/app)
 *   my.kadisasa.com                 the staff panel (/ops)
 *
 * A request for a surface that lives on another host is redirected there, so the staff panel never answers
 * on the public host. The rules only apply when `NEXT_PUBLIC_APP_DOMAIN` is set at build time and the request
 * is for that domain or one of its subdomains above; localhost, staging and preview hosts are not gated.
 */

export type Surface = 'public' | 'console' | 'admin';

/** The subdomain each non-public surface lives on. */
export const SURFACE_LABEL = { console: 'app', admin: 'my' } as const;

/** Which part of the site a path belongs to. */
export type Area = 'asset' | 'ops' | 'app' | 'login' | 'card' | 'public';

const isUnder = (p: string, prefix: string) => p === prefix || p.startsWith(`${prefix}/`);

export function areaOf(pathname: string): Area {
  if (
    pathname.startsWith('/_next/') ||
    isUnder(pathname, '/api') ||
    isUnder(pathname, '/icons') ||
    /\.[^/]+$/.test(pathname) // sw.js, robots.txt, sitemap.xml, images
  )
    return 'asset';
  if (isUnder(pathname, '/ops')) return 'ops';
  if (isUnder(pathname, '/app')) return 'app';
  if (isUnder(pathname, '/login')) return 'login';
  if (isUnder(pathname, '/c') || isUnder(pathname, '/s') || isUnder(pathname, '/k')) return 'card';
  return 'public';
}

/** The host with any port removed and in lower case. */
export function bareHost(host: string | null | undefined): string {
  return (host ?? '').trim().toLowerCase().replace(/:\d+$/, '');
}

/** The surface a host belongs to, or null if it is not one of ours (so nothing is gated). */
export function surfaceOf(
  host: string | null | undefined,
  root: string | undefined,
): Surface | null {
  const r = root?.trim().toLowerCase();
  if (!r) return null;
  const h = bareHost(host);
  if (h === r || h === `www.${r}`) return 'public';
  if (h === `${SURFACE_LABEL.console}.${r}`) return 'console';
  if (h === `${SURFACE_LABEL.admin}.${r}`) return 'admin';
  return null;
}

export function hostFor(surface: Surface, root: string): string {
  const r = root.trim().toLowerCase();
  return surface === 'public' ? r : `${SURFACE_LABEL[surface]}.${r}`;
}

export type Decision =
  | { action: 'allow' }
  /** Same host, different path. */
  | { action: 'redirect-path'; path: string }
  /** The surface that owns this path lives on another host; keep the path and query. */
  | { action: 'redirect-surface'; surface: Surface };

/** What a surface does with a path. */
export function decide(surface: Surface, pathname: string): Decision {
  const area = areaOf(pathname);
  if (area === 'asset') return { action: 'allow' };
  const owner: Record<Exclude<Area, 'asset'>, Surface | 'any'> = {
    ops: 'admin',
    app: 'console',
    login: 'any', // each of the two private hosts has its own sign-in; the session belongs to the host
    card: 'public',
    public: 'public',
  };
  const who = owner[area];
  if (surface === 'public') {
    if (area === 'login') return { action: 'redirect-surface', surface: 'console' };
    return who === 'public'
      ? { action: 'allow' }
      : { action: 'redirect-surface', surface: who as Surface };
  }
  // The two private hosts: the front door goes to the surface's own home.
  if (pathname === '/')
    return { action: 'redirect-path', path: surface === 'admin' ? '/ops' : '/app' };
  if (who === 'any' || who === surface) return { action: 'allow' };
  return { action: 'redirect-surface', surface: who === 'public' ? 'public' : (who as Surface) };
}
