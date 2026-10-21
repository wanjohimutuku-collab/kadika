import 'server-only';
import {
  DEFAULT_PRICING,
  pricingCatalogSchema,
  type PricingCatalog,
} from '@harusi/schemas/billing';
import { USE_MOCKS } from './env';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/** Where the public prices live (ADR 042). */
export const PRICING_PATH = '/bei';

/**
 * The prices staff set in /ops/billing, for the public pricing page. Cached for a minute like the
 * branding; with the API down or in mock mode the starting prices show, never an error.
 */
export async function getPricingOnServer(): Promise<PricingCatalog> {
  if (USE_MOCKS) return DEFAULT_PRICING;
  try {
    const res = await fetch(`${API_URL}/v1/pricing`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return DEFAULT_PRICING;
    const parsed = pricingCatalogSchema.safeParse(await res.json());
    return parsed.success ? parsed.data : DEFAULT_PRICING;
  } catch {
    return DEFAULT_PRICING;
  }
}
