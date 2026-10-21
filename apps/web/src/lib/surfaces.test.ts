import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { areaOf, bareHost, decide, hostFor, rootDomain, surfaceOf } from './surfaces';

const ROOT = 'kadisasa.com';

describe('which surface a host belongs to (ADR 032)', () => {
  it('knows the four production hosts', () => {
    expect(surfaceOf('kadisasa.com', ROOT)).toBe('public');
    expect(surfaceOf('www.kadisasa.com', ROOT)).toBe('public');
    expect(surfaceOf('app.kadisasa.com', ROOT)).toBe('console');
    expect(surfaceOf('my.kadisasa.com', ROOT)).toBe('admin');
  });

  it('ignores case and port', () => {
    expect(surfaceOf('APP.KadiSasa.com:443', ROOT)).toBe('console');
    expect(bareHost(' My.Example.com:3000 ')).toBe('my.example.com');
  });

  it('leaves every other host alone, including look-alikes', () => {
    for (const h of [
      'localhost:3000',
      '127.0.0.1',
      'blog.kadisasa.com',
      'staging.kadisasa.com',
      'api.kadisasa.com',
      'kadisasa.com.evil.test',
      'evilkadisasa.com',
      'xapp.kadisasa.com',
      'app.kadisasa.com.evil.test',
      '',
    ])
      expect(surfaceOf(h, ROOT), h).toBeNull();
    expect(surfaceOf(null, ROOT)).toBeNull();
  });

  it('tidies a mistyped root domain instead of silently matching nothing', () => {
    for (const r of [
      'https://Kadisasa.com/',
      'www.kadisasa.com',
      ' kadisasa.com ',
      'http://kadisasa.com:443/x?y',
    ])
      expect(rootDomain(r), r).toBe('kadisasa.com');
    expect(surfaceOf('my.kadisasa.com', 'https://kadisasa.com/')).toBe('admin');
    expect(hostFor('console', 'www.kadisasa.com')).toBe('app.kadisasa.com');
    expect(rootDomain(undefined)).toBe('');
  });

  it('gates nothing when no root domain is set', () => {
    expect(surfaceOf('my.kadisasa.com', undefined)).toBeNull();
    expect(surfaceOf('my.kadisasa.com', '')).toBeNull();
  });

  it('builds each surface host from the root', () => {
    expect(hostFor('public', ROOT)).toBe('kadisasa.com');
    expect(hostFor('console', ROOT)).toBe('app.kadisasa.com');
    expect(hostFor('admin', 'Kadisasa.com')).toBe('my.kadisasa.com');
  });
});

describe('which part of the site a path belongs to', () => {
  it.each([
    ['/', 'public'],
    ['/privacy', 'public'],
    ['/ke/harusi', 'public'],
    ['/application', 'public'],
    ['/opsx', 'public'],
    ['/app', 'app'],
    ['/app/e/1/guests', 'app'],
    ['/ops', 'ops'],
    ['/ops/payments', 'ops'],
    ['/login', 'login'],
    ['/c/abc', 'card'],
    ['/s/abc', 'card'],
    ['/k', 'card'],
    ['/_next/static/x.js', 'asset'],
    ['/api/health', 'asset'],
    ['/icons/a.png', 'asset'],
    ['/sw.js', 'asset'],
    ['/robots.txt', 'asset'],
    ['/c/abc/manifest.webmanifest', 'asset'],
  ])('%s is %s', (path, area) => expect(areaOf(path)).toBe(area));
});

describe('what each surface does with a path', () => {
  const to = (surface: 'public' | 'console' | 'admin') => ({ action: 'redirect-surface', surface });
  const at = (path: string) => ({ action: 'redirect-path', path });
  const allow = { action: 'allow' };

  it('public host: the site and the guest card, nothing private', () => {
    for (const p of ['/', '/privacy', '/terms', '/ke', '/c/t', '/s/code', '/k'])
      expect(decide('public', p), p).toEqual(allow);
    expect(decide('public', '/app')).toEqual(to('console'));
    expect(decide('public', '/app/e/1')).toEqual(to('console'));
    expect(decide('public', '/login')).toEqual(to('console'));
    expect(decide('public', '/ops')).toEqual(to('admin'));
    expect(decide('public', '/ops/payments')).toEqual(to('admin'));
  });

  it('console host: /app and sign-in, and its front door goes to /app', () => {
    expect(decide('console', '/')).toEqual(at('/app'));
    expect(decide('console', '/app')).toEqual(allow);
    expect(decide('console', '/app/events/new')).toEqual(allow);
    expect(decide('console', '/login')).toEqual(allow);
    expect(decide('console', '/ops')).toEqual(to('admin'));
    expect(decide('console', '/privacy')).toEqual(to('public'));
    expect(decide('console', '/c/t')).toEqual(to('public'));
  });

  it('admin host: /ops and sign-in, and its front door goes to /ops', () => {
    expect(decide('admin', '/')).toEqual(at('/ops'));
    expect(decide('admin', '/ops')).toEqual(allow);
    expect(decide('admin', '/ops/support')).toEqual(allow);
    expect(decide('admin', '/login')).toEqual(allow);
    expect(decide('admin', '/app')).toEqual(to('console'));
    expect(decide('admin', '/terms')).toEqual(to('public'));
    expect(decide('admin', '/s/code')).toEqual(to('public'));
  });

  it('serves assets and the API on every host', () => {
    for (const s of ['public', 'console', 'admin'] as const)
      for (const p of ['/api/health', '/_next/static/a.js', '/sw.js', '/robots.txt'])
        expect(decide(s, p), `${s} ${p}`).toEqual(allow);
  });
});

describe('middleware with a root domain set', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });
  async function load(root?: string) {
    vi.resetModules();
    if (root) vi.stubEnv('NEXT_PUBLIC_APP_DOMAIN', root);
    else vi.stubEnv('NEXT_PUBLIC_APP_DOMAIN', '');
    return (await import('../../middleware')).middleware;
  }
  // A real server builds the request URL from its own listen address, not the public host, so the host
  // only arrives in the Host header. Build requests the same way or redirects can look right in tests only.
  const req = (host: string, path: string) =>
    new NextRequest(`http://localhost:3000${path}`, { headers: { host } });

  it('sends the staff panel away from the public host, keeping path and query', async () => {
    const mw = await load(ROOT);
    const res = mw(req('kadisasa.com', '/ops/payments?x=1'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://my.kadisasa.com/ops/payments?x=1');
  });

  it('sends sign-in on the public host to the console host', async () => {
    const mw = await load(ROOT);
    const res = mw(req('www.kadisasa.com', '/login?next=/app'));
    expect(res.headers.get('location')).toBe('https://app.kadisasa.com/login?next=/app');
  });

  // A <Link> to another host is prefetched with fetch(); a cross-origin redirect fails CORS in the browser
  // and floods the console. Any non-RSC answer makes the Next router load the page normally instead. Next
  // strips its RSC headers before middleware, so the browser's Sec-Fetch-Dest is what tells them apart.
  it('answers a router fetch for another host without a redirect, so the browser navigates', async () => {
    const mw = await load(ROOT);
    const rsc = (host: string, path: string) =>
      new NextRequest(`http://localhost:3000${path}`, {
        headers: { host, 'sec-fetch-dest': 'empty', 'sec-fetch-mode': 'cors' },
      });
    for (const [host, path] of [
      ['my.kadisasa.com', '/maswali?_rsc=abc'],
      ['my.kadisasa.com', '/app'],
      ['app.kadisasa.com', '/privacy'],
      ['kadisasa.com', '/login'],
    ] as const) {
      const res = mw(rsc(host, path));
      expect(res.status, `${host}${path}`).toBe(204);
      expect(res.headers.get('location')).toBeNull();
      expect(res.headers.get('cache-control')).toBe('no-store');
    }
    // a same-host redirect still works for the router
    expect(mw(rsc('my.kadisasa.com', '/')).headers.get('location')).toBe(
      'https://my.kadisasa.com/ops',
    );
    // a page load is still redirected
    const page = new NextRequest('http://localhost:3000/maswali', {
      headers: {
        host: 'my.kadisasa.com',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
      },
    });
    expect(mw(page).headers.get('location')).toBe('https://kadisasa.com/maswali');
  });

  it('gives each private host its own front door', async () => {
    const mw = await load(ROOT);
    expect(mw(req('app.kadisasa.com', '/')).headers.get('location')).toBe(
      'https://app.kadisasa.com/app',
    );
    expect(mw(req('my.kadisasa.com', '/')).headers.get('location')).toBe(
      'https://my.kadisasa.com/ops',
    );
  });

  it('does not redirect what a host serves, and still handles ?lang= and /ke', async () => {
    const mw = await load(ROOT);
    for (const [host, path] of [
      ['kadisasa.com', '/'],
      ['kadisasa.com', '/c/token'],
      ['app.kadisasa.com', '/app/events'],
      ['my.kadisasa.com', '/ops'],
    ] as const)
      expect(mw(req(host, path)).headers.get('location'), `${host}${path}`).toBeNull();
    const lang = mw(req('kadisasa.com', '/?lang=en'));
    expect(lang.headers.get('x-middleware-request-x-hp-lang')).toBe('en');
    const ke = mw(req('kadisasa.com', '/ke/harusi'));
    expect(ke.headers.get('x-middleware-request-x-hp-market')).toBe('ke');
  });

  it('applies no host rules when no root domain was set at build time', async () => {
    const mw = await load();
    for (const host of ['kadisasa.com', 'my.kadisasa.com', 'localhost:3000'])
      expect(mw(req(host, '/ops')).headers.get('location'), host).toBeNull();
  });

  it('does not touch hosts that are not ours, such as staging', async () => {
    const mw = await load(ROOT);
    expect(mw(req('staging.kadisasa.com', '/ops')).headers.get('location')).toBeNull();
    expect(mw(req('blog.kadisasa.com', '/app')).headers.get('location')).toBeNull();
  });
});
