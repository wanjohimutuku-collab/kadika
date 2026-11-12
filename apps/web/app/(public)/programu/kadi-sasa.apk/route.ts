const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * The Android app, downloaded from our own domain (ADR 047): kadisasa.com/programu/kadi-sasa.apk. The
 * file lives with the API; this streams it through so people only ever see our address.
 */
export async function GET(req: Request) {
  const upstream = await fetch(`${API_URL}/v1/app/android.apk`, {
    headers: { 'if-none-match': req.headers.get('if-none-match') ?? '' },
    cache: 'no-store',
  }).catch(() => null);
  if (!upstream || (upstream.status !== 200 && upstream.status !== 304))
    return new Response('Programu haipatikani kwa sasa. / The app is not available right now.', {
      status: upstream?.status === 404 ? 404 : 503,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
    });
  const headers = new Headers();
  for (const h of [
    'content-type',
    'content-length',
    'content-disposition',
    'etag',
    'cache-control',
    'x-content-type-options',
  ]) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  return new Response(upstream.status === 304 ? null : upstream.body, {
    status: upstream.status,
    headers,
  });
}
