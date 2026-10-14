import { describe, expect, it } from 'vitest';
import { SHORT_CODE_DIGITS, SHORT_CODE_LETTERS } from '../../schemas/src/short-code';
import { fromB64u, toB64u } from './b64';
import {
  generateEventKeyPair,
  generateGuestToken,
  guestTokenMatches,
  hashGuestToken,
  parseQrToken,
  shortId,
  signQrToken,
  verifyQrToken,
  type QrClaims,
} from './index';

const EVENT = '0192f1a0-7c3e-7a11-9b2c-5e8d4a6f0001';
const OTHER_EVENT = '0192f1a0-7c3e-7a11-9b2c-5e8d4a6f0002';
const GUEST = '0192f1a1-1111-7a11-9b2c-aaaaaaaaaaaa';
const GUEST2 = '0192f1a2-2222-7a11-9b2c-bbbbbbbbbbbb';

function seeded(): (n: number) => Uint8Array {
  let x = 12345;
  return (n) =>
    Uint8Array.from({ length: n }, () => ((x = (x * 1103515245 + 12345) & 0x7fffffff) >> 16) & 255);
}

const keys = generateEventKeyPair(seeded());
const claims: QrClaims = { eventId: EVENT, guestId: GUEST, partySize: 2, version: 1 };
const guests = new Map([
  [shortId(GUEST), { guestId: GUEST, currentVersion: 1 }],
  [shortId(GUEST2), { guestId: GUEST2, currentVersion: 1 }],
]);
const ctx = (over: Partial<Parameters<typeof verifyQrToken>[1]> = {}) => ({
  eventId: EVENT,
  publicKey: keys.publicKey,
  lookupGuest: (g: string) => guests.get(g) ?? null,
  ...over,
});

describe('qr token', () => {
  it('has the §6.1 shape and verifies offline with only the public key', () => {
    const t = signQrToken(claims, keys.privateKey);
    expect(t).toMatch(/^v1\.[0-9a-f]{8}\.[0-9a-f]{8}\.2\.1\.[A-Za-z0-9_-]{86}$/);
    expect(verifyQrToken(t, ctx())).toEqual({ ok: true, claims });
  });

  it('is deterministic (Ed25519)', () => {
    expect(signQrToken(claims, keys.privateKey)).toBe(signQrToken(claims, keys.privateKey));
  });

  it('a tampered payload fails', () => {
    const t = signQrToken(claims, keys.privateKey);
    const parts = t.split('.');
    const party = [...parts.slice(0, 3), '9', ...parts.slice(4)].join('.'); // party size changed
    const ver = [...parts.slice(0, 4), '2', parts[5]].join('.');
    const guest = [parts[0], parts[1], shortId(GUEST2), ...parts.slice(3)].join('.'); // swapped guest
    const sigFlip = `${t.slice(0, -2)}${t.endsWith('AA') ? 'BB' : 'AA'}`;
    for (const bad of [party, ver, guest, sigFlip])
      expect(verifyQrToken(bad, ctx())).toMatchObject({ ok: false, reason: 'bad_signature' });
  });

  it('a token for another event fails (wrong event)', () => {
    const other = generateEventKeyPair(seeded());
    const t = signQrToken({ ...claims, eventId: OTHER_EVENT }, other.privateKey);
    expect(verifyQrToken(t, ctx())).toMatchObject({ ok: false, reason: 'wrong_event' });
  });

  it('a token signed with another event key fails even with matching ids', () => {
    const other = generateEventKeyPair(() => Uint8Array.from({ length: 32 }, (_, i) => i + 7));
    const t = signQrToken(claims, other.privateKey);
    expect(verifyQrToken(t, ctx())).toMatchObject({ ok: false, reason: 'bad_signature' });
  });

  it('reissue invalidates the old token and accepts the new one', () => {
    const v1 = signQrToken(claims, keys.privateKey);
    const v2 = signQrToken({ ...claims, version: 2 }, keys.privateKey);
    const after = ctx({
      lookupGuest: (g) => (g === shortId(GUEST) ? { guestId: GUEST, currentVersion: 2 } : null),
    });
    expect(verifyQrToken(v1, after)).toMatchObject({ ok: false, reason: 'revoked' });
    expect(verifyQrToken(v2, after)).toMatchObject({ ok: true });
  });

  it('rejects malformed input without throwing', () => {
    for (const bad of [
      '',
      'x',
      'v1.a.b.c.d.e',
      'v2.00000000.00000000.1.1.' + 'A'.repeat(86),
      'v1.0192f1a0.0192f1a1.1.1.' + '*'.repeat(86),
      'v1.0192f1a0.0192f1a1.1.1.AAAA',
      'v1.0192f1a0.0192f1a1.100.1.' + 'A'.repeat(86),
    ]) {
      const r = verifyQrToken(bad, ctx());
      expect(r.ok).toBe(false);
    }
    expect(parseQrToken('v2.00000000.00000000.1.1.sig')).toEqual({ error: 'bad_version' });
  });

  it('refuses to sign nonsense', () => {
    expect(() => signQrToken({ ...claims, partySize: 0 }, keys.privateKey)).toThrow();
    expect(() => signQrToken({ ...claims, version: 0 }, keys.privateKey)).toThrow();
    expect(() => signQrToken(claims, 'abcd')).toThrow();
  });

  it('unknown guests and forgeries look the same to an attacker', () => {
    const t = signQrToken(
      { ...claims, guestId: '0192f1a9-9999-7a11-9b2c-cccccccccccc' },
      keys.privateKey,
    );
    expect(verifyQrToken(t, ctx())).toMatchObject({ ok: false, reason: 'bad_signature' });
  });
});

describe('guest card tokens', () => {
  it('are 128-bit, hashed at rest and compared in constant time', () => {
    const t = generateGuestToken(seeded());
    expect(fromB64u(t)?.length).toBe(16);
    expect(t).toHaveLength(22);
    const h = hashGuestToken(t);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain(t);
    expect(guestTokenMatches(t, h)).toBe(true);
    expect(guestTokenMatches(t + 'x', h)).toBe(false);
    expect(guestTokenMatches(t, 'zz')).toBe(false);
  });
});

describe('base64url', () => {
  it('round-trips and rejects bad input', () => {
    for (let n = 0; n < 40; n++) {
      const b = Uint8Array.from({ length: n }, (_, i) => (i * 37 + n) & 255);
      expect([...(fromB64u(toB64u(b)) ?? [])]).toEqual([...b]);
    }
    expect(fromB64u('ab+/')).toBeNull();
    expect(fromB64u('a')).toBeNull();
  });
});

describe('short code alphabet', () => {
  it('has no ambiguous characters', () => {
    for (const ch of ['0', 'O', '1', 'I', 'L'])
      expect(SHORT_CODE_LETTERS + SHORT_CODE_DIGITS).not.toContain(ch);
  });
});
