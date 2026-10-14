import { ed } from './keys';
import { fromB64u, fromHex, toB64u } from './b64';

/**
 * Signed QR payload (§6.1): `v1.<eventId8>.<guestId8>.<partySize>.<ver>.<sigB64u>`.
 * Verifiable offline with only the event's public key. The signature covers the *full* event and
 * guest ids, which the payload only carries as 8-character prefixes; verification therefore needs
 * the full ids (the gate bundle has them) and resolves the prefixes locally.
 */
export const TOKEN_VERSION = 'v1';

export interface QrClaims {
  eventId: string;
  guestId: string;
  partySize: number;
  version: number;
}

export type VerifyResult =
  | { ok: true; claims: QrClaims }
  | {
      ok: false;
      reason:
        'malformed' | 'bad_version' | 'bad_signature' | 'wrong_event' | 'unknown_guest' | 'revoked';
    };

const enc = new TextEncoder();

function message(c: QrClaims): Uint8Array {
  return enc.encode(`${TOKEN_VERSION}|${c.eventId}|${c.guestId}|${c.partySize}|${c.version}`);
}

/**
 * The 8-hex-character on-card identifier of a UUID: its *last* 8 hex characters. UUIDv7 starts with
 * a millisecond timestamp, so the first 8 characters are identical for everything created within
 * about a minute (a whole imported guest list); the tail is random (ADR 013).
 */
export function shortId(uuid: string): string {
  return uuid.replace(/-/g, '').slice(-8);
}

export function signQrToken(claims: QrClaims, privateKeyHex: string): string {
  if (!Number.isInteger(claims.partySize) || claims.partySize < 1 || claims.partySize > 99)
    throw new Error('invalid party size');
  if (!Number.isInteger(claims.version) || claims.version < 1) throw new Error('invalid version');
  const seed = fromHex(privateKeyHex);
  if (!seed || seed.length !== 32) throw new Error('invalid private key');
  const sig = ed.sign(message(claims), seed);
  return [
    TOKEN_VERSION,
    shortId(claims.eventId),
    shortId(claims.guestId),
    claims.partySize,
    claims.version,
    toB64u(sig),
  ].join('.');
}

export interface ParsedToken {
  eventShort: string;
  guestShort: string;
  partySize: number;
  version: number;
  signature: Uint8Array;
}

export function parseQrToken(token: string): ParsedToken | { error: 'malformed' | 'bad_version' } {
  const parts = token.trim().split('.');
  if (parts.length !== 6) return { error: 'malformed' };
  const [v, ev, gu, party, ver, sig] = parts as [string, string, string, string, string, string];
  if (v !== TOKEN_VERSION) return { error: v.startsWith('v') ? 'bad_version' : 'malformed' };
  if (!/^[0-9a-f]{8}$/.test(ev) || !/^[0-9a-f]{8}$/.test(gu)) return { error: 'malformed' };
  if (!/^\d{1,2}$/.test(party) || !/^\d{1,6}$/.test(ver)) return { error: 'malformed' };
  const signature = fromB64u(sig);
  if (!signature || signature.length !== 64) return { error: 'malformed' };
  return {
    eventShort: ev,
    guestShort: gu,
    partySize: Number(party),
    version: Number(ver),
    signature,
  };
}

export interface VerifyContext {
  /** The event this gate or card belongs to. */
  eventId: string;
  publicKey: string;
  /** Resolves an 8-character guest prefix to the full guest id and the current token version. */
  lookupGuest: (guestShort: string) => { guestId: string; currentVersion: number } | null;
}

/**
 * Verifies a scanned or typed token offline. Order matters: shape → event → signature → guest →
 * revocation, so a forged token never reveals whether a guest exists.
 */
export function verifyQrToken(token: string, ctx: VerifyContext): VerifyResult {
  const parsed = parseQrToken(token);
  if ('error' in parsed) return { ok: false, reason: parsed.error };
  if (parsed.eventShort !== shortId(ctx.eventId)) return { ok: false, reason: 'wrong_event' };
  const pub = fromHex(ctx.publicKey);
  if (!pub || pub.length !== 32) throw new Error('invalid public key');
  const guest = ctx.lookupGuest(parsed.guestShort);
  // Verify against the claimed ids even when the guest is unknown, so the failure reason is
  // "bad_signature" for forgeries and "unknown_guest" only for validly signed tokens we don't have.
  const guestId = guest?.guestId ?? parsed.guestShort;
  const claims: QrClaims = {
    eventId: ctx.eventId,
    guestId,
    partySize: parsed.partySize,
    version: parsed.version,
  };
  let valid = false;
  try {
    valid = guest ? ed.verify(parsed.signature, message(claims), pub) : false;
  } catch {
    valid = false;
  }
  if (!guest) return { ok: false, reason: 'bad_signature' };
  if (!valid) return { ok: false, reason: 'bad_signature' };
  if (parsed.version < guest.currentVersion) return { ok: false, reason: 'revoked' };
  return { ok: true, claims };
}
