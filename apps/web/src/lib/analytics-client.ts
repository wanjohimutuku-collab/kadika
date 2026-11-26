const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== '0';

/** Public analytics event names accepted by POST /v1/analytics (no cookies, no guest PII). */
const BACKEND_EVENTS = new Set([
  'page_view',
  'start_registration',
  'complete_registration',
  'create_event',
  'complete_event_setup',
  'create_invitation',
  'share_invitation',
  'add_guest',
  'receive_rsvp',
  'record_contribution',
  'scan_qr',
  'complete_checkin',
  'signup_started',
  'signup_completed',
  'event_created',
  'guests_added',
  'cards_sent',
  'first_payment',
  'gate_app_installed',
  'gate_scan_session_started',
  'michango_enabled',
  'referral_link_clicked',
  'referral_signup',
]);

const ALLOWED_PROPS = new Set([
  'country',
  'source',
  'landing_path',
  'invitation_channel',
  'occasion_bucket',
  'step_name',
  'event_kind',
  'count_bucket',
  'channel',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'referral_code',
]);

function marketFromPath(path: string): {
  market: 'tz' | 'ke' | 'ug';
  edition: 'sw' | 'en' | 'ke' | 'ug';
  locale: 'sw' | 'en';
} {
  const clean = path.toLowerCase();
  if (clean === '/ke' || clean.startsWith('/ke/'))
    return { market: 'ke', edition: 'ke', locale: clean.includes('/sw') ? 'sw' : 'en' };
  if (clean === '/ug' || clean.startsWith('/ug/'))
    return { market: 'ug', edition: 'ug', locale: 'en' };
  const locale =
    typeof document !== 'undefined' && document.documentElement.lang === 'en' ? 'en' : 'sw';
  return { market: 'tz', edition: locale, locale };
}

/**
 * Anonymous first-party event emitter (ADR 057, Prompt 9).
 * Respects browser Do Not Track (`doNotTrack === '1'`), sets zero cookies, and never sends guest PII.
 */
export function emit(name: string, data?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  if (process.env.NODE_ENV !== 'production') {
    try {
      console.debug('[analytics]', name, data ?? {});
    } catch {
      /* ignore */
    }
  }
  if (USE_MOCKS || !BACKEND_EVENTS.has(name)) return;
  if (navigator.doNotTrack === '1' || (navigator as { doNotTrack?: string }).doNotTrack === 'yes')
    return;

  const properties: Record<string, string> = {};
  if (data) {
    for (const [k, v] of Object.entries(data)) {
      if (!ALLOWED_PROPS.has(k) || v === undefined || v === null) continue;
      const str = String(v).slice(0, 64);
      if (str) properties[k] = str;
    }
  }

  const path = window.location.pathname || '/';
  const { market, locale, edition } = marketFromPath(path);
  const payload = JSON.stringify({
    name,
    path,
    market,
    locale,
    edition,
    ...(document.referrer ? { referrer: document.referrer.slice(0, 2048) } : {}),
    properties,
  });

  try {
    const endpoint = `${API_URL}/v1/analytics`;
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, new Blob([payload], { type: 'application/json' }));
    } else if (typeof fetch === 'function') {
      void fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: payload,
        keepalive: true,
        credentials: 'omit',
      });
    }
  } catch {
    // Analytics must never interrupt user actions.
  }
}

/** Hash a short string client-side (first 6 bytes of SHA-256 as hex) for privacy. */
export async function hashShort(value: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return '';
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest).slice(0, 6))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
