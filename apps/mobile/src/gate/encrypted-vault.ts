import {
  ed,
  fromB64u,
  fromHex,
  shortId,
  timingSafeEqual,
  toB64u,
  toHex,
  verifyQrToken,
} from '@harusi/crypto';
import type { Admission, Bundle, BundleGuest, LocalScan } from '@harusi/gate';
import { canSignQrToken, getDemoEventKeyPair, signDemoGuestQr } from './demo-bundle';

export const ENVELOPE_PREFIX = 'ksenc:v1:';
export const GENESIS_HASH = '0'.repeat(64);

const enc = new TextEncoder();
const dec = new TextDecoder();

export interface AttendingRecord {
  guestId: string;
  guestShort: string;
  shortCode: string;
  displayName: string;
  groupLabel: string | null;
  partyAdmitted: number;
  scannedAt: string;
  deviceId: string;
  via: 'qr' | 'code' | 'search';
  synced: boolean;
  signedToken: string | null;
  recordHash: string;
}

export interface AttendanceSnapshot {
  version: 1;
  eventId: string;
  eventName: string;
  publicKey: string;
  deviceId: string;
  savedAt: string;
  totalGuests: number;
  admittedCount: number;
  admittedPeople: number;
  chainDigest: string;
  records: AttendingRecord[];
}

export interface LocalVerifyReport {
  ok: boolean;
  verifiedAt: string;
  recordCount: number;
  peopleCount: number;
  signaturesVerified: number;
  chainDigest: string;
  fileUri: string | null;
  records: AttendingRecord[];
  error?: string;
}

export function isEncryptedEnvelope(raw: string): boolean {
  return raw.startsWith(ENVELOPE_PREFIX);
}

function sha512Bytes(...chunks: Uint8Array[]): Uint8Array {
  return ed.etc.sha512Sync!(...chunks);
}

/** RFC 2104 HMAC-SHA512 using noble/ed25519's synchronous SHA-512 (block size 128 bytes). */
export function hmacSha512Bytes(key: Uint8Array, ...chunks: Uint8Array[]): Uint8Array {
  const blockSize = 128;
  const normalized = key.length > blockSize ? sha512Bytes(key) : key;
  const kPad = new Uint8Array(blockSize);
  kPad.set(normalized, 0);

  const iKey = new Uint8Array(blockSize);
  const oKey = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    iKey[i] = kPad[i]! ^ 0x36;
    oKey[i] = kPad[i]! ^ 0x5c;
  }
  const inner = sha512Bytes(iKey, ...chunks);
  return sha512Bytes(oKey, inner);
}

export function sha256HexFrom512(...parts: string[]): string {
  const bytes = enc.encode(parts.join('|'));
  return toHex(sha512Bytes(bytes).slice(0, 32));
}

function defaultNonce16(): Uint8Array {
  const webCrypto = globalThis.crypto;
  if (webCrypto && typeof webCrypto.getRandomValues === 'function') {
    return webCrypto.getRandomValues(new Uint8Array(16));
  }
  return ed.etc.randomBytes(16);
}

function counterBytes(blockIndex: number): Uint8Array {
  return new Uint8Array([
    (blockIndex >>> 24) & 0xff,
    (blockIndex >>> 16) & 0xff,
    (blockIndex >>> 8) & 0xff,
    blockIndex & 0xff,
  ]);
}

function xorKeystream(plaintext: Uint8Array, encKey: Uint8Array, nonce: Uint8Array): Uint8Array {
  const out = new Uint8Array(plaintext.length);
  for (let offset = 0, block = 0; offset < plaintext.length; offset += 64, block++) {
    const keystream = sha512Bytes(encKey, nonce, counterBytes(block));
    const end = Math.min(64, plaintext.length - offset);
    for (let i = 0; i < end; i++) {
      out[offset + i] = plaintext[offset + i]! ^ keystream[i]!;
    }
  }
  return out;
}

function parseKey(keyHex: string): Uint8Array {
  const key = fromHex(keyHex);
  if (!key || key.length !== 32) throw new Error('invalid_vault_key');
  return key;
}

/**
 * Encrypts a JSON-serializable payload with CTR-SHA512 + Encrypt-then-MAC (SHA-512 MAC).
 * Pure TypeScript so it executes identically on React Native Hermes and Node Vitest.
 */
export function sealJson(value: unknown, keyHex: string, nonceBytes?: Uint8Array): string {
  const key = parseKey(keyHex);
  const nonce = nonceBytes ?? defaultNonce16();
  if (nonce.length !== 16) throw new Error('invalid_nonce');

  const plaintext = enc.encode(JSON.stringify(value));
  const encKey = hmacSha512Bytes(key, enc.encode('enc'), nonce);
  const macKey = hmacSha512Bytes(key, enc.encode('mac'), nonce);

  const ciphertext = xorKeystream(plaintext, encKey, nonce);
  const mac = hmacSha512Bytes(macKey, nonce, ciphertext).slice(0, 32);

  return `${ENVELOPE_PREFIX}${toHex(nonce)}.${toB64u(ciphertext)}.${toHex(mac)}`;
}

/** Authenticates the MAC in constant time before decrypting and parsing JSON. */
export function openJson<T>(envelope: string, keyHex: string): T {
  const key = parseKey(keyHex);
  if (!isEncryptedEnvelope(envelope)) throw new Error('bad_envelope_prefix');

  const body = envelope.slice(ENVELOPE_PREFIX.length);
  const parts = body.split('.');
  if (parts.length !== 3) throw new Error('malformed_envelope');

  const [nonceHex, cipherB64u, macHex] = parts as [string, string, string];
  const nonce = fromHex(nonceHex);
  const ciphertext = fromB64u(cipherB64u);
  const mac = fromHex(macHex);
  if (!nonce || nonce.length !== 16 || !ciphertext || !mac || mac.length !== 32) {
    throw new Error('malformed_envelope');
  }

  const encKey = hmacSha512Bytes(key, enc.encode('enc'), nonce);
  const macKey = hmacSha512Bytes(key, enc.encode('mac'), nonce);

  const expectedMac = hmacSha512Bytes(macKey, nonce, ciphertext).slice(0, 32);
  let activeEncKey = encKey;
  if (!timingSafeEqual(mac, expectedMac)) {
    const legacyMacKey = sha512Bytes(key, enc.encode('mac'), nonce);
    const legacyExpectedMac = sha512Bytes(legacyMacKey, nonce, ciphertext).slice(0, 32);
    if (!timingSafeEqual(mac, legacyExpectedMac)) {
      throw new Error('tampered_mac');
    }
    activeEncKey = sha512Bytes(key, enc.encode('enc'), nonce);
  }

  const plaintext = xorKeystream(ciphertext, activeEncKey, nonce);
  return JSON.parse(dec.decode(plaintext)) as T;
}

export function computeRecordHash(
  prevHash: string,
  rec: Omit<AttendingRecord, 'recordHash'>,
): string {
  return sha256HexFrom512(
    prevHash,
    rec.guestId,
    rec.shortCode,
    String(rec.partyAdmitted),
    rec.scannedAt,
    rec.deviceId,
    rec.signedToken ?? '',
  );
}

/** Builds an ordered, hash-chained snapshot of all attending guests on this gate device. */
export function buildAttendanceSnapshot(params: {
  bundle: Bundle;
  admissions: Admission[] | Record<string, Admission>;
  scans: LocalScan[];
  deviceId: string;
  savedAt?: string;
  scannedTokens?: Record<string, string>;
}): AttendanceSnapshot {
  const { bundle, scans, deviceId } = params;
  const savedAt = params.savedAt ?? new Date().toISOString();
  const admissionsList = Array.isArray(params.admissions)
    ? params.admissions
    : Object.values(params.admissions);

  const guestById = new Map<string, BundleGuest>(bundle.guests.map((g) => [g.id, g]));
  const demoPublicKey = getDemoEventKeyPair(bundle.event.id).publicKey;
  const isDemoSigned = bundle.publicKey === demoPublicKey;

  const entryMap = new Map<string, Omit<AttendingRecord, 'recordHash'>>();

  for (const a of admissionsList) {
    const guest = guestById.get(a.guestId);
    if (!guest) continue;
    const capturedToken = params.scannedTokens?.[guest.id];
    const signedToken =
      capturedToken && capturedToken.startsWith('v1.')
        ? capturedToken
        : isDemoSigned && canSignQrToken(bundle.event.id, guest.id)
          ? signDemoGuestQr(bundle.event.id, guest)
          : null;

    entryMap.set(guest.id, {
      guestId: guest.id,
      guestShort: guest.guestShort,
      shortCode: guest.shortCode,
      displayName: guest.displayName,
      groupLabel: guest.groupLabel,
      partyAdmitted: a.partyAdmitted,
      scannedAt: a.scannedAt,
      deviceId: a.deviceId,
      via: 'qr',
      synced: true,
      signedToken,
    });
  }

  for (const s of scans) {
    if (!s.guestId || s.override) continue;
    if (s.result !== 'ok' && s.result !== 'manual_ok') continue;
    const guest = guestById.get(s.guestId);
    if (!guest) continue;

    const via: 'qr' | 'code' = s.result === 'ok' ? 'qr' : 'code';
    const capturedToken = params.scannedTokens?.[guest.id];
    const signedToken =
      capturedToken && capturedToken.startsWith('v1.')
        ? capturedToken
        : isDemoSigned && canSignQrToken(bundle.event.id, guest.id)
          ? signDemoGuestQr(bundle.event.id, guest)
          : null;

    const existing = entryMap.get(guest.id);
    if (existing) {
      existing.via = via;
      existing.synced = s.synced;
      if (signedToken && !existing.signedToken) {
        existing.signedToken = signedToken;
      }
      if (s.scannedAt < existing.scannedAt) {
        existing.scannedAt = s.scannedAt;
        existing.partyAdmitted = s.partyAdmitted;
      }
    } else if (!s.synced) {
      entryMap.set(guest.id, {
        guestId: guest.id,
        guestShort: guest.guestShort,
        shortCode: guest.shortCode,
        displayName: guest.displayName,
        groupLabel: guest.groupLabel,
        partyAdmitted: s.partyAdmitted,
        scannedAt: s.scannedAt,
        deviceId,
        via,
        synced: false,
        signedToken,
      });
    }
  }

  const ordered = [...entryMap.values()].sort((a, b) => {
    const tCmp = a.scannedAt.localeCompare(b.scannedAt);
    return tCmp !== 0 ? tCmp : a.guestId.localeCompare(b.guestId);
  });

  let prevHash = GENESIS_HASH;
  const records: AttendingRecord[] = ordered.map((item) => {
    const recordHash = computeRecordHash(prevHash, item);
    prevHash = recordHash;
    return { ...item, recordHash };
  });

  const chainDigest = records.length > 0 ? prevHash : GENESIS_HASH;
  const admittedPeople = records.reduce((sum, r) => sum + r.partyAdmitted, 0);

  return {
    version: 1,
    eventId: bundle.event.id,
    eventName: bundle.event.coupleNames,
    publicKey: bundle.publicKey,
    deviceId,
    savedAt,
    totalGuests: bundle.guests.length,
    admittedCount: records.length,
    admittedPeople,
    chainDigest,
    records,
  };
}

/**
 * Verifies an encrypted attending snapshot completely offline:
 * 1. Authenticates ciphertext MAC and decrypts payload.
 * 2. Validates event ID and Ed25519 public key match the local bundle.
 * 3. Recomputes the tamper-evident hash chain and record counts.
 * 4. Verifies every record against bundle guests and validates Ed25519 QR signatures.
 */
export function verifyEncryptedAttendance(
  envelope: string,
  keyHex: string,
  bundle: Bundle,
  fileUri: string | null = null,
  verifiedAt?: string,
): LocalVerifyReport {
  const checkedAt = verifiedAt ?? new Date().toISOString();
  const fail = (
    error: string,
    chainDigest = '',
    records: AttendingRecord[] = [],
  ): LocalVerifyReport => ({
    ok: false,
    verifiedAt: checkedAt,
    recordCount: 0,
    peopleCount: 0,
    signaturesVerified: 0,
    chainDigest,
    fileUri,
    records,
    error,
  });

  let snapshot: AttendanceSnapshot;
  try {
    snapshot = openJson<AttendanceSnapshot>(envelope, keyHex);
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'decrypt_failed');
  }

  if (
    !snapshot ||
    snapshot.version !== 1 ||
    snapshot.eventId !== bundle.event.id ||
    snapshot.publicKey !== bundle.publicKey ||
    !Array.isArray(snapshot.records)
  ) {
    return fail('event_or_key_mismatch', snapshot?.chainDigest ?? '');
  }

  let prevHash = GENESIS_HASH;
  for (const rec of snapshot.records) {
    const expectedHash = computeRecordHash(prevHash, {
      guestId: rec.guestId,
      guestShort: rec.guestShort,
      shortCode: rec.shortCode,
      displayName: rec.displayName,
      groupLabel: rec.groupLabel,
      partyAdmitted: rec.partyAdmitted,
      scannedAt: rec.scannedAt,
      deviceId: rec.deviceId,
      via: rec.via,
      synced: rec.synced,
      signedToken: rec.signedToken,
    });
    if (rec.recordHash !== expectedHash) {
      return fail('hash_chain_mismatch', snapshot.chainDigest, snapshot.records);
    }
    prevHash = expectedHash;
  }

  const expectedDigest = snapshot.records.length > 0 ? prevHash : GENESIS_HASH;
  if (snapshot.chainDigest !== expectedDigest) {
    return fail('hash_chain_mismatch', snapshot.chainDigest, snapshot.records);
  }

  const peopleCount = snapshot.records.reduce((sum, r) => sum + r.partyAdmitted, 0);
  if (
    snapshot.admittedCount !== snapshot.records.length ||
    snapshot.admittedPeople !== peopleCount
  ) {
    return fail('count_mismatch', snapshot.chainDigest, snapshot.records);
  }

  const guestById = new Map<string, BundleGuest>(bundle.guests.map((g) => [g.id, g]));
  const guestByShort = new Map<string, BundleGuest>(bundle.guests.map((g) => [g.guestShort, g]));
  const seenGuests = new Set<string>();
  let signaturesVerified = 0;

  for (const rec of snapshot.records) {
    if (seenGuests.has(rec.guestId)) {
      return fail('duplicate_record', snapshot.chainDigest, snapshot.records);
    }
    seenGuests.add(rec.guestId);

    const guest = guestById.get(rec.guestId);
    if (!guest || guest.shortCode !== rec.shortCode || shortId(guest.id) !== rec.guestShort) {
      return fail('guest_mismatch', snapshot.chainDigest, snapshot.records);
    }

    if (
      !Number.isInteger(rec.partyAdmitted) ||
      rec.partyAdmitted < 1 ||
      rec.partyAdmitted > Math.max(1, guest.partySizeAllowed) * 2
    ) {
      return fail('invalid_party_size', snapshot.chainDigest, snapshot.records);
    }

    if (rec.signedToken) {
      let sigRes;
      try {
        sigRes = verifyQrToken(rec.signedToken, {
          eventId: bundle.event.id,
          publicKey: bundle.publicKey,
          lookupGuest: (short) => {
            const g = guestByShort.get(short);
            return g ? { guestId: g.id, currentVersion: g.tokenVersion } : null;
          },
        });
      } catch {
        return fail('invalid_public_key', snapshot.chainDigest, snapshot.records);
      }
      if (!sigRes.ok) {
        return fail(`qr_${sigRes.reason}`, snapshot.chainDigest, snapshot.records);
      }
      if (sigRes.claims.guestId !== rec.guestId) {
        return fail('token_guest_mismatch', snapshot.chainDigest, snapshot.records);
      }
      signaturesVerified++;
    }
  }

  return {
    ok: true,
    verifiedAt: checkedAt,
    recordCount: snapshot.records.length,
    peopleCount,
    signaturesVerified,
    chainDigest: snapshot.chainDigest,
    fileUri,
    records: snapshot.records,
  };
}
