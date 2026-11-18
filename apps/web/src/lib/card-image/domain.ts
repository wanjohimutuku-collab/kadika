import { APP_DOMAIN } from '@/lib/env';

/** Container or private-network addresses: never something to print on a guest's card. */
const INTERNAL = /^(0\.0\.0\.0|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[)/;
const HOST = /^[\w.-]+(:\d+)?$/;

/**
 * Domain printed in the card image footer. Behind Coolify's proxy `req.url` is the container address
 * (0.0.0.0:3000), so this reads the forwarded host (like `originOf` in light-card/route-utils) and
 * falls back to the app domain.
 */
export function cardDomain(req: Request, fallback: string = APP_DOMAIN): string {
  const u = new URL(req.url);
  const explicit = u.searchParams.get('domain');
  if (explicit && HOST.test(explicit)) return explicit;
  const host = (req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? u.host)
    .split(',')[0]!
    .trim()
    .replace(/^www\./, '');
  return host && HOST.test(host) && !INTERNAL.test(host) ? host : fallback;
}
