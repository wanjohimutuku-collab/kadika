import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';
import { toHex, fromHex } from './b64';

// @noble/ed25519 v2 needs a sync SHA-512 for the *Sync functions.
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

export interface EventKeyPair {
  /** 32-byte public key, hex. Ships to gate devices and the guest card. */
  publicKey: string;
  /** 32-byte seed, hex. Never leaves the server (stored encrypted, §9). */
  privateKey: string;
}

/** Generates an Ed25519 signing key for one event. `randomBytes` is injectable for tests. */
export function generateEventKeyPair(
  randomBytes: (n: number) => Uint8Array = ed.etc.randomBytes,
): EventKeyPair {
  const seed = randomBytes(32);
  return { privateKey: toHex(seed), publicKey: toHex(ed.getPublicKey(seed)) };
}

export function publicKeyFromPrivate(privateKeyHex: string): string {
  const seed = fromHex(privateKeyHex);
  if (!seed || seed.length !== 32) throw new Error('invalid private key');
  return toHex(ed.getPublicKey(seed));
}

export { ed };
