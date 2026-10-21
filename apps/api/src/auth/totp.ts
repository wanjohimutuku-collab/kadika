import { hmac } from '@noble/hashes/hmac';
import { sha1 } from '@noble/hashes/legacy';

/**
 * TOTP (RFC 6238) for the staff second factor (ADR 040): HMAC-SHA1, 30-second steps, 6 digits, the
 * parameters every authenticator app supports. Secrets are 20 random bytes, shown to the user in base32.
 */
export const TOTP_STEP_S = 30;
const DIGITS = 6;
/** Steps either side of now that still count, for phones whose clock is a little off. */
const WINDOW = 1;

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(bytes: Uint8Array): string {
  let out = '';
  let bits = 0;
  let value = 0;
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string): Uint8Array {
  const clean = s.toUpperCase().replace(/[\s=]/g, '');
  const out: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of clean) {
    const i = B32.indexOf(ch);
    if (i < 0) throw new Error('invalid base32');
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Uint8Array.from(out);
}

/** HOTP (RFC 4226) for one counter value. */
export function hotp(secret: Uint8Array, counter: number, digits = DIGITS): string {
  const msg = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    msg[i] = c & 255;
    c = Math.floor(c / 256);
  }
  const mac = hmac(sha1, secret, msg);
  const off = mac[mac.length - 1]! & 15;
  const bin =
    ((mac[off]! & 127) << 24) | (mac[off + 1]! << 16) | (mac[off + 2]! << 8) | mac[off + 3]!;
  return String(bin % 10 ** digits).padStart(digits, '0');
}

export const totpStep = (now: Date) => Math.floor(now.getTime() / 1000 / TOTP_STEP_S);

/**
 * The step a code belongs to, or null when it matches none in the window. Steps at or before
 * `lastStep` never match, so a code that was already used is refused (RFC 6238 §5.2).
 */
export function matchTotp(
  secret: Uint8Array,
  code: string,
  now: Date,
  lastStep: number | null = null,
): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const current = totpStep(now);
  let found: number | null = null;
  for (let s = current - WINDOW; s <= current + WINDOW; s++) {
    // Compare every candidate so the time taken does not tell which step matched.
    if (constantTimeEqual(hotp(secret, s), code) && found === null) found = s;
  }
  if (found === null || (lastStep !== null && found <= lastStep)) return null;
  return found;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** The `otpauth://` link authenticator apps read from a QR code (Key Uri Format). */
export function otpauthUrl(secretB32: string, issuer: string, account: string): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  const q = new URLSearchParams({
    secret: secretB32,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(TOTP_STEP_S),
  });
  return `otpauth://totp/${label}?${q}`;
}
