import 'server-only';
import type { PublicBranding } from '@harusi/schemas/branding';
import { DEFAULT_PUBLIC_BRANDING, sanitizePublicBranding } from './branding';
import { USE_MOCKS } from './env';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * The business brand for the root layout (ADR 036). Cached for a minute by Next, so a change staff save
 * reaches every visitor within about that long. If the API is down the page still renders with the
 * default brand: branding must never take a page down.
 */
export async function getBrandingOnServer(): Promise<PublicBranding> {
  if (USE_MOCKS) return DEFAULT_PUBLIC_BRANDING;
  try {
    const res = await fetch(`${API_URL}/v1/branding`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return DEFAULT_PUBLIC_BRANDING;
    return sanitizePublicBranding(await res.json());
  } catch {
    return DEFAULT_PUBLIC_BRANDING;
  }
}
