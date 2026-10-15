import type { Country } from './country';

/**
 * Mobile networks by MCC+MNC, as Africa's Talking delivery reports quote them (`networkCode`). Used to
 * break SMS delivery down per operator in the pilot dashboard (Phase 5). The mapping is from public
 * numbering lists; confirm it against the provider before relying on a label for a decision.
 */
export const NETWORKS: Readonly<Record<string, { country: Country; label: string }>> = {
  '63902': { country: 'KE', label: 'Safaricom' },
  '63903': { country: 'KE', label: 'Airtel Kenya' },
  '63907': { country: 'KE', label: 'Telkom Kenya' },
  '64002': { country: 'TZ', label: 'Tigo / Mixx by Yas' },
  '64004': { country: 'TZ', label: 'Vodacom' },
  '64005': { country: 'TZ', label: 'Airtel Tanzania' },
  '64007': { country: 'TZ', label: 'TTCL' },
  '64009': { country: 'TZ', label: 'Halotel' },
};

/** Label for a network code; a code we do not know is shown as is, a missing one as `unknown`. */
export function networkLabel(code: string | null | undefined): string {
  if (!code) return 'unknown';
  return NETWORKS[code]?.label ?? code;
}
