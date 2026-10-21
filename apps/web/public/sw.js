/* Guest-card service worker (§7.3): the card shell, its assets and the last card view
 * stay available offline after the first open. Console routes are never cached. */
const VERSION = 'v1';
const PAGES = `hp-pages-${VERSION}`;
const ASSETS = `hp-assets-${VERSION}`;
const GUEST_PATH = /^\/(c|s|k)(\/|$)/;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (![PAGES, ASSETS].includes(key)) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

/** The page sends the URLs it already loaded (before the worker existed) so they get cached too. */
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type !== 'cache-urls' || !Array.isArray(data.urls)) return;
  event.waitUntil(
    (async () => {
      const pages = await caches.open(PAGES);
      const assets = await caches.open(ASSETS);
      for (const raw of data.urls) {
        try {
          const url = new URL(raw, self.location.origin);
          if (url.origin !== self.location.origin) continue;
          if (GUEST_PATH.test(url.pathname)) {
            const res = await fetch(url.href, { credentials: 'same-origin' });
            if (res.ok && !res.redirected) await pages.put(url.pathname, res);
          } else if (isAsset(url)) {
            if (!(await assets.match(url.href))) {
              const res = await fetch(url.href);
              if (res.ok) await assets.put(url.href, res);
            }
          }
        } catch {
          /* best effort */
        }
      }
    })(),
  );
});

function isAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/brand/') ||
    url.pathname === '/favicon.ico'
  );
}

async function networkFirst(request, key) {
  const cache = await caches.open(PAGES);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok && !res.redirected) await cache.put(key, res.clone());
    return res;
  } catch {
    const cached = await cache.match(key);
    if (cached) return cached;
    throw new Error('offline and not cached');
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(ASSETS);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) await cache.put(request, res.clone());
  return res;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (!GUEST_PATH.test(url.pathname)) return;
  const isRsc = request.headers.get('RSC') === '1' || url.searchParams.has('_rsc');
  if (request.mode === 'navigate') event.respondWith(networkFirst(request, url.pathname));
  else if (isRsc) event.respondWith(networkFirst(request, `${url.pathname}?rsc`));
});
