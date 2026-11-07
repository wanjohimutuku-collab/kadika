import 'server-only';
import type { Locale } from '@harusi/i18n';

/**
 * Server-side helper that posts a first-party analytics event to the API's internal ingest
 * route (ADR 057 §5). Call it from an RSC server component or a server action; the browser never
 * sees the request.
 *
 * The helper is best-effort. A missing API URL, a missing secret, a non-2xx response or a thrown
 * error all swallow silently: a page render must never fail because a metric did not go through.
 * In mock mode (local dev without the API) it is also a no-op so nothing extra starts up.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const INTERNAL_SECRET = process.env.ANALYTICS_INTERNAL_SECRET ?? '';
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== '0';

/** Pulled from the request's headers inside an RSC render; see `recordServerPageView`. */
export interface ServerEventContext {
  path: string;
  ip: string;
  userAgent: string;
  referrer?: string;
  market: 'tz' | 'ke';
  locale: Locale;
  edition: 'sw' | 'en' | 'ke';
  properties?: Record<string, string>;
}

export type AnalyticsEventName =
  | 'page_view'
  | 'start_registration'
  | 'complete_registration'
  | 'create_event'
  | 'complete_event_setup'
  | 'create_invitation'
  | 'share_invitation'
  | 'add_guest'
  | 'receive_rsvp'
  | 'record_contribution'
  | 'scan_qr'
  | 'complete_checkin';

/**
 * Posts one event to the ingest route. Swallows all errors; callers must not await it on a
 * critical path (prefer fire-and-forget: `void recordServerEvent(…)`).
 */
export async function recordServerEvent(
  name: AnalyticsEventName,
  ctx: ServerEventContext,
): Promise<void> {
  if (USE_MOCKS || !API_URL || !INTERNAL_SECRET) return;
  try {
    await fetch(`${API_URL}/v1/internal/analytics/events`, {
      method: 'POST',
      cache: 'no-store',
      signal: AbortSignal.timeout(1500),
      headers: {
        'content-type': 'application/json',
        'x-internal-secret': INTERNAL_SECRET,
      },
      body: JSON.stringify({ name, ...ctx }),
    });
  } catch {
    // intentional: never block or fail a render on a metric.
  }
}

/**
 * Extracts IP, user-agent and referrer from Next's request headers (`next/headers`). The caller
 * supplies the page's path, market, locale and edition so the helper does not depend on
 * app-specific layout state. Pass the headers object you already awaited; the helper only reads.
 */
export function buildServerContext(
  h: Headers,
  base: Omit<ServerEventContext, 'ip' | 'userAgent' | 'referrer'>,
): ServerEventContext {
  // Behind the Coolify/Traefik proxy the client address is in `x-forwarded-for` as a list; take
  // the first entry. `x-real-ip` is a single value some proxies use instead.
  const fwd = h.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = fwd || h.get('x-real-ip') || 'unknown';
  const userAgent = h.get('user-agent') || 'unknown';
  const referrer = h.get('referer') || undefined;
  return { ...base, ip, userAgent, referrer };
}
