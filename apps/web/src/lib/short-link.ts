import { normalizeShortCode } from '@harusi/schemas/short-code';

/** ADR 016: in real mode `/s/<card-token>` redirects to the card; a short code does not. */
export function cardTokenFromShortPath(raw: string): string | null {
  const value = decodeURIComponent(raw);
  return !normalizeShortCode(value) && /^[\w-]{16,}$/.test(value) ? value : null;
}
