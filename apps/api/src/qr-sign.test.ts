import { describe, expect, it } from 'vitest';
import { generateEventKeyPair, signQrToken, verifyQrToken, shortId } from '@harusi/crypto';
import { signQrTokenFast } from './qr-sign';

describe('native QR signing', () => {
  const eventId = '0192f1a0-7c3e-7a11-9b2c-5e8d4a6f0001';
  const guestId = '0192f1a0-7c3e-7a11-9b2c-5e8d4a6f0099';

  it('produces byte-identical tokens to the shared library, and they verify', () => {
    for (const [partySize, version] of [
      [1, 1],
      [2, 1],
      [5, 3],
      [99, 12],
    ] as const) {
      const keys = generateEventKeyPair();
      const claims = { eventId, guestId, partySize, version };
      const fast = signQrTokenFast(claims, keys.privateKey);
      expect(fast).toBe(signQrToken(claims, keys.privateKey));
      const r = verifyQrToken(fast, {
        eventId,
        publicKey: keys.publicKey,
        lookupGuest: (s) => (s === shortId(guestId) ? { guestId, currentVersion: version } : null),
      });
      expect(r).toMatchObject({ ok: true });
    }
  });

  it('refuses the same bad inputs as the library', () => {
    const k = generateEventKeyPair().privateKey;
    expect(() => signQrTokenFast({ eventId, guestId, partySize: 0, version: 1 }, k)).toThrow();
    expect(() => signQrTokenFast({ eventId, guestId, partySize: 100, version: 1 }, k)).toThrow();
    expect(() => signQrTokenFast({ eventId, guestId, partySize: 1, version: 0 }, k)).toThrow();
    expect(() => signQrTokenFast({ eventId, guestId, partySize: 1, version: 1 }, 'zz')).toThrow();
  });

  it('is much faster than the pure-JS signer', () => {
    const k = generateEventKeyPair().privateKey;
    const claims = { eventId, guestId, partySize: 2, version: 1 };
    const time = (fn: () => void, n: number) => {
      const t = performance.now();
      for (let i = 0; i < n; i++) fn();
      return (performance.now() - t) / n;
    };
    const fast = time(() => signQrTokenFast(claims, k), 300);
    const slow = time(() => signQrToken(claims, k), 60);
    expect(fast).toBeLessThan(slow / 5);
  });
});
