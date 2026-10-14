import { sha256 } from '@noble/hashes/sha256';
import { fromHex, timingSafeEqual, toB64u, toHex } from './b64';

/**
 * Opaque guest-card tokens (§9): 128 random bits, shown once in the link; only the SHA-256 hash is
 * stored, and lookups compare hashes in constant time.
 */
export function generateGuestToken(randomBytes: (n: number) => Uint8Array): string {
  return toB64u(randomBytes(16));
}

export function hashGuestToken(token: string): string {
  return toHex(sha256(new TextEncoder().encode(token)));
}

export function guestTokenMatches(token: string, storedHashHex: string): boolean {
  const stored = fromHex(storedHashHex);
  if (!stored) return false;
  return timingSafeEqual(sha256(new TextEncoder().encode(token)), stored);
}
