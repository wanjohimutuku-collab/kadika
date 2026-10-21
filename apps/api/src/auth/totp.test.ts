import { describe, expect, it } from 'vitest';
import { base32Decode, base32Encode, hotp, matchTotp, otpauthUrl } from './totp';

// RFC 6238 appendix B (SHA-1 seed); the 6-digit codes are the last six of the 8-digit vectors.
const SEED = new TextEncoder().encode('12345678901234567890');

describe('TOTP (RFC 6238)', () => {
  it('matches the RFC test vectors', () => {
    for (const [t, code] of [
      [59, '287082'],
      [1111111109, '081804'],
      [1111111111, '050471'],
      [1234567890, '005924'],
      [2000000000, '279037'],
    ] as const)
      expect(hotp(SEED, Math.floor(t / 30))).toBe(code);
    expect(hotp(SEED, 1, 8)).toBe('94287082');
  });

  it('round-trips base32', () => {
    const b = Uint8Array.from({ length: 20 }, (_, i) => i * 13);
    expect(base32Decode(base32Encode(b))).toEqual(b);
    expect(base32Encode(SEED)).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
  });

  it('accepts one step of clock drift, refuses more and refuses reuse', () => {
    const now = new Date(1111111111 * 1000);
    const step = Math.floor(1111111111 / 30);
    expect(matchTotp(SEED, hotp(SEED, step), now)).toBe(step);
    expect(matchTotp(SEED, hotp(SEED, step - 1), now)).toBe(step - 1);
    expect(matchTotp(SEED, hotp(SEED, step + 1), now)).toBe(step + 1);
    expect(matchTotp(SEED, hotp(SEED, step - 2), now)).toBeNull();
    expect(matchTotp(SEED, hotp(SEED, step), now, step)).toBeNull();
    expect(matchTotp(SEED, 'abcdef', now)).toBeNull();
  });

  it('builds an otpauth link', () => {
    expect(otpauthUrl('ABC', 'Kadi Sasa', 'Amina')).toBe(
      'otpauth://totp/Kadi%20Sasa:Amina?secret=ABC&issuer=Kadi+Sasa&algorithm=SHA1&digits=6&period=30',
    );
  });
});
