/**
 * Tiny client-side event emitter for anonymous public-site telemetry (ADR 057).
 *
 * The wire path (sendBeacon → `/v1/analytics`) isn't live for the public home yet; until it is,
 * `emit()` is a no-op outside development. The public home uses it so events like
 * `home_hero_view`, `home_hero_input`, `home_hero_cta_primary` and `home_try_step_interact`
 * emit from one place and gain a transport once that is consolidated.
 */
export function emit(name: string, data?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  if (process.env.NODE_ENV !== 'production') {
    try {
      // eslint-disable-next-line no-console
      console.debug('[analytics]', name, data ?? {});
    } catch {
      /* ignore */
    }
  }
  // TODO wire to /v1/analytics via navigator.sendBeacon() once the public-home ingest lands.
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
