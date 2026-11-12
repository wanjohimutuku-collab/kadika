import { createHash } from 'node:crypto';
import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { ApiError } from '../errors';
import { REFRESH_TTL_MS } from './tokens';

/**
 * Cookie sessions for browsers (security review M-05). A web client that sends
 * `X-Session-Transport: cookie` gets its refresh token in an `HttpOnly` cookie instead of the JSON
 * body, so no script on the page (an XSS, a compromised dependency) can read the 30-day token. The
 * access token still travels in the body and is kept in memory by the client. Clients that do not send
 * the header (the Android app, older web bundles) keep the body tokens, unchanged.
 *
 * - Scoped to `/v1/auth`: the cookie is only ever sent to refresh and logout.
 * - `SameSite=Strict`, and the custom header forces a CORS preflight against the allowed-origin list,
 *   so another site cannot make a visitor's browser spend or revoke the token.
 * - One cookie per web origin: the console (`app.`) and the staff panel (`my.`) share the API host, and
 *   a staff session must never be readable as, or overwritten by, a customer session.
 */
const HEADER = 'x-session-transport';
const PATH = '/v1/auth';

/** The allowed web origin asking for a cookie session, or null when the caller uses body tokens. */
export function cookieOrigin(c: Context, allowedOrigins: readonly string[]): string | null {
  if (c.req.header(HEADER) !== 'cookie') return null;
  const origin = c.req.header('origin');
  if (!origin || !allowedOrigins.includes(origin))
    throw new ApiError('forbidden', 'Cookie sessions are only for the web app', {
      reason: 'origin_not_allowed',
    });
  return origin;
}

const cookieName = (origin: string) =>
  `hp_rt_${createHash('sha256').update(origin).digest('hex').slice(0, 12)}`;

/** Plain-http local development has no TLS; everywhere else the cookie is `Secure`. */
const insecureLocal = (origin: string) => /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

const attributes = (origin: string) =>
  ({
    path: PATH,
    httpOnly: true,
    secure: !insecureLocal(origin),
    sameSite: 'Strict',
  }) as const;

/**
 * Moves a fresh refresh token from the response body into the cookie. Results without one (the staff
 * second-factor challenge) pass through untouched.
 */
export function toCookieSession<T extends object>(c: Context, origin: string | null, result: T): T {
  if (!origin || !('refreshToken' in result) || typeof result.refreshToken !== 'string')
    return result;
  setCookie(c, cookieName(origin), result.refreshToken, {
    ...attributes(origin),
    maxAge: Math.floor(REFRESH_TTL_MS / 1000),
  });
  return { ...result, refreshToken: null };
}

/** The refresh token this origin's cookie holds, if any. */
export const cookieRefreshToken = (c: Context, origin: string): string | undefined =>
  getCookie(c, cookieName(origin));

export function clearCookieSession(c: Context, origin: string): void {
  deleteCookie(c, cookieName(origin), attributes(origin));
}
