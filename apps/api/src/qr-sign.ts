import { createPrivateKey, sign, type KeyObject } from 'node:crypto';
import { TOKEN_VERSION, shortId, toB64u, type QrClaims } from '@harusi/crypto';

/** PKCS#8 prefix for a raw 32-byte Ed25519 seed (RFC 8410). */
const PKCS8_ED25519 = Buffer.from('302e020100300506032b657004220420', 'hex');
const keyCache = new Map<string, KeyObject>();

function keyObject(privateKeyHex: string): KeyObject {
  let k = keyCache.get(privateKeyHex);
  if (!k) {
    k = createPrivateKey({
      key: Buffer.concat([PKCS8_ED25519, Buffer.from(privateKeyHex, 'hex')]),
      format: 'der',
      type: 'pkcs8',
    });
    if (keyCache.size > 500) keyCache.clear();
    keyCache.set(privateKeyHex, k);
  }
  return k;
}

/**
 * Same token as `signQrToken` from `@harusi/crypto` (Ed25519 is deterministic, so the bytes are
 * identical, which a test asserts), but signed with Node's native implementation, about a hundred
 * times faster than the pure-JS one the phones need. The server signs thousands of cards in bursts.
 */
export function signQrTokenFast(claims: QrClaims, privateKeyHex: string): string {
  if (!Number.isInteger(claims.partySize) || claims.partySize < 1 || claims.partySize > 99)
    throw new Error('invalid party size');
  if (!Number.isInteger(claims.version) || claims.version < 1) throw new Error('invalid version');
  if (!/^[0-9a-f]{64}$/.test(privateKeyHex)) throw new Error('invalid private key');
  const msg = Buffer.from(
    `${TOKEN_VERSION}|${claims.eventId}|${claims.guestId}|${claims.partySize}|${claims.version}`,
  );
  const sig = sign(null, msg, keyObject(privateKeyHex));
  return [
    TOKEN_VERSION,
    shortId(claims.eventId),
    shortId(claims.guestId),
    claims.partySize,
    claims.version,
    toB64u(new Uint8Array(sig)),
  ].join('.');
}
