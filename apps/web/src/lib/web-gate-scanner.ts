import type { CardKind, InvitationStatus } from '@harusi/schemas';
import {
  extractShortCode,
  extractShortCodeFromPartialSms,
  normalizeShortCode,
} from '@harusi/schemas/short-code';

/** Minimal guest shape needed by the mobile web gate scanner (compatible with Guest & GuestRecord). */
export interface ScannerGuest {
  id: string;
  eventId: string;
  cardKind: CardKind;
  displayName: string;
  phoneE164: string | null;
  groupLabel: string;
  partySizeAllowed: number;
  shortCode: string;
  status: InvitationStatus;
  rsvpPartySize: number | null;
  checkedInAt: string | null;
  partyAdmitted: number;
  token?: string;
  tokenVersion?: number;
}

export type ScanAdmissionMethod = 'qr' | 'code' | 'manual' | 'demo';

export interface WebAdmissionRecord {
  id: string;
  eventId: string;
  guestId: string;
  displayName: string;
  shortCode: string;
  partyAdmitted: number;
  scannedAt: string;
  gateName: string;
  method: ScanAdmissionMethod;
  qrDigest: string;
  prevHash: string;
  entryHash: string;
}

export interface WebAttendanceSnapshot {
  v: 1;
  eventId: string;
  eventTitle: string;
  linkCode: string;
  savedAt: string;
  totalCheckedIn: number;
  totalPeople: number;
  chainDigest: string;
  records: WebAdmissionRecord[];
}

export interface EncryptedWebEnvelope {
  v: 1;
  alg: 'CTR-SHA256-HMAC-SHA256';
  ivHex: string;
  ciphertextB64: string;
  tagHex: string;
}

export interface WebVaultVerification {
  valid: boolean;
  reason: string | null;
  checkedAt: string;
  sealedBytes: number;
  recordCount: number;
  totalPeople: number;
  chainDigest: string;
  records: WebAdmissionRecord[];
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export interface ParsedGatePayload {
  raw: string;
  shortCode: string | null;
  token: string | null;
  guestId: string | null;
  eventShort?: string | null;
  guestShort?: string | null;
  version?: number | null;
}

export type GateMatchResult =
  | { kind: 'ok'; guest: ScannerGuest; payload: ParsedGatePayload }
  | { kind: 'duplicate'; guest: ScannerGuest; payload: ParsedGatePayload }
  | { kind: 'contribution_only'; guest: ScannerGuest; payload: ParsedGatePayload }
  | { kind: 'revoked'; guest: ScannerGuest; payload: ParsedGatePayload }
  | { kind: 'not_found'; payload: ParsedGatePayload };

const WEB_VAULT_PREFIX = 'ksweb:v1:';
const WEB_VAULT_KEY_STORAGE = 'harusi.web.gate.vault-key.v1';
const WEB_VAULT_SALT_STORAGE = 'harusi.web.gate.vault-salt.v1';
const WEB_VAULT_DATA_PREFIX = 'harusi.web.gate.vault-data.v1:';
const ZERO_HASH = '0'.repeat(64);

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/** Pure-TS synchronous SHA-256 so encrypted vault works on HTTP LAN & HTTPS mobile browsers alike. */
export function sha256Bytes(data: Uint8Array): Uint8Array {
  const len = data.length;
  const bitLen = len * 8;
  const padLen = ((len + 9 + 63) >> 6) << 6;
  const padded = new Uint8Array(padLen);
  padded.set(data, 0);
  padded[len] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(padLen - 4, bitLen >>> 0, false);

  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

  for (let offset = 0; offset < padLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15]!, 7) ^ rotr(w[i - 15]!, 18) ^ (w[i - 15]! >>> 3);
      const s1 = rotr(w[i - 2]!, 17) ^ rotr(w[i - 2]!, 19) ^ (w[i - 2]! >>> 10);
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) >>> 0;
    }

    let a = h[0]!;
    let b = h[1]!;
    let c = h[2]!;
    let d = h[3]!;
    let e = h[4]!;
    let f = h[5]!;
    let g = h[6]!;
    let hh = h[7]!;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + S1 + ch + SHA256_K[i]! + w[i]!) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      hh = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h[0] = (h[0]! + a) >>> 0;
    h[1] = (h[1]! + b) >>> 0;
    h[2] = (h[2]! + c) >>> 0;
    h[3] = (h[3]! + d) >>> 0;
    h[4] = (h[4]! + e) >>> 0;
    h[5] = (h[5]! + f) >>> 0;
    h[6] = (h[6]! + g) >>> 0;
    h[7] = (h[7]! + hh) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) outView.setUint32(i * 4, h[i]!, false);
  return out;
}

export function hmacSha256Bytes(key: Uint8Array, data: Uint8Array): Uint8Array {
  const blockSize = 64;
  const normalized = key.length > blockSize ? sha256Bytes(key) : key;
  const kPad = new Uint8Array(blockSize);
  kPad.set(normalized, 0);

  const oKey = new Uint8Array(blockSize + 32);
  const iKey = new Uint8Array(blockSize + data.length);
  for (let i = 0; i < blockSize; i++) {
    oKey[i] = kPad[i]! ^ 0x5c;
    iKey[i] = kPad[i]! ^ 0x36;
  }
  iKey.set(data, blockSize);
  oKey.set(sha256Bytes(iKey), blockSize);
  return sha256Bytes(oKey);
}

export function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i]!.toString(16).padStart(2, '0');
  }
  return out;
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim();
  if (clean.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(clean)) {
    throw new Error('Invalid hex string');
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(b64, 'base64'));
  }
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function randomBytes(length: number): Uint8Array {
  const out = new Uint8Array(length);
  const c = globalThis.crypto;
  if (c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(out);
    return out;
  }
  for (let i = 0; i < length; i++) {
    out[i] = Math.floor(Math.random() * 256);
  }
  return out;
}

function ctEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

function deriveKeystream(encKey: Uint8Array, iv: Uint8Array, length: number): Uint8Array {
  const out = new Uint8Array(length);
  const blockInput = new Uint8Array(iv.length + 4);
  blockInput.set(iv, 0);
  const view = new DataView(blockInput.buffer);

  let offset = 0;
  let counter = 0;
  while (offset < length) {
    view.setUint32(iv.length, counter >>> 0, false);
    const block = hmacSha256Bytes(encKey, blockInput);
    const take = Math.min(block.length, length - offset);
    out.set(block.subarray(0, take), offset);
    offset += take;
    counter++;
  }
  return out;
}

function deriveSubkeys(masterKey: Uint8Array): { encKey: Uint8Array; macKey: Uint8Array } {
  return {
    encKey: hmacSha256Bytes(masterKey, textEncoder.encode('harusi-web-enc-v1')),
    macKey: hmacSha256Bytes(masterKey, textEncoder.encode('harusi-web-mac-v1')),
  };
}

export function sha256Hex(input: string): string {
  return bytesToHex(sha256Bytes(textEncoder.encode(input)));
}

/** Encrypts and MACs a JSON value into a `ksweb:v1:` envelope string. */
export function sealWebJson(payload: unknown, masterKey: Uint8Array): string {
  const plaintext = textEncoder.encode(JSON.stringify(payload));
  const iv = randomBytes(16);
  const { encKey, macKey } = deriveSubkeys(masterKey);
  const stream = deriveKeystream(encKey, iv, plaintext.length);
  const ciphertext = new Uint8Array(plaintext.length);
  for (let i = 0; i < plaintext.length; i++) {
    ciphertext[i] = plaintext[i]! ^ stream[i]!;
  }

  const macInput = new Uint8Array(iv.length + ciphertext.length);
  macInput.set(iv, 0);
  macInput.set(ciphertext, iv.length);
  const tag = hmacSha256Bytes(macKey, macInput);

  const envelope: EncryptedWebEnvelope = {
    v: 1,
    alg: 'CTR-SHA256-HMAC-SHA256',
    ivHex: bytesToHex(iv),
    ciphertextB64: bytesToBase64(ciphertext),
    tagHex: bytesToHex(tag),
  };
  return `${WEB_VAULT_PREFIX}${JSON.stringify(envelope)}`;
}

/** Verifies MAC and decrypts a `ksweb:v1:` envelope, returning null if corrupted or tampered. */
export function openWebJson<T>(sealed: string, masterKey: Uint8Array): T | null {
  if (!sealed.startsWith(WEB_VAULT_PREFIX)) return null;
  try {
    const parsed = JSON.parse(
      sealed.slice(WEB_VAULT_PREFIX.length),
    ) as Partial<EncryptedWebEnvelope>;
    if (
      parsed.v !== 1 ||
      parsed.alg !== 'CTR-SHA256-HMAC-SHA256' ||
      typeof parsed.ivHex !== 'string' ||
      typeof parsed.ciphertextB64 !== 'string' ||
      typeof parsed.tagHex !== 'string'
    ) {
      return null;
    }
    const iv = hexToBytes(parsed.ivHex);
    const ciphertext = base64ToBytes(parsed.ciphertextB64);
    const tag = hexToBytes(parsed.tagHex);
    if (iv.length !== 16 || tag.length !== 32) return null;

    const { encKey, macKey } = deriveSubkeys(masterKey);
    const macInput = new Uint8Array(iv.length + ciphertext.length);
    macInput.set(iv, 0);
    macInput.set(ciphertext, iv.length);
    const expectedTag = hmacSha256Bytes(macKey, macInput);
    if (!ctEqual(tag, expectedTag)) return null;

    const stream = deriveKeystream(encKey, iv, ciphertext.length);
    const plaintext = new Uint8Array(ciphertext.length);
    for (let i = 0; i < ciphertext.length; i++) {
      plaintext[i] = ciphertext[i]! ^ stream[i]!;
    }
    return JSON.parse(textDecoder.decode(plaintext)) as T;
  } catch {
    return null;
  }
}

export function getOrCreateWebVaultKey(storage?: StorageLike | null): Uint8Array {
  if (!storage) {
    return sha256Bytes(textEncoder.encode('harusi-web-ephemeral-vault'));
  }
  const existing = storage.getItem(WEB_VAULT_KEY_STORAGE);
  if (existing && /^[0-9a-fA-F]{64}$/.test(existing)) {
    return hexToBytes(existing);
  }
  const fresh = randomBytes(32);
  storage.setItem(WEB_VAULT_KEY_STORAGE, bytesToHex(fresh));
  return fresh;
}

/**
 * Derives a 256-bit vault key from the gate agent's PIN/passphrase and a stored random salt
 * so raw key material is not saved alongside ciphertext in `localStorage`.
 */
export function derivePinVaultKey(passphrase: string, storage?: StorageLike | null): Uint8Array {
  let salt: Uint8Array;
  const savedSalt = storage?.getItem(WEB_VAULT_SALT_STORAGE);
  if (savedSalt && /^[0-9a-fA-F]{32}$/.test(savedSalt)) {
    salt = hexToBytes(savedSalt);
  } else {
    salt = randomBytes(16);
    storage?.setItem(WEB_VAULT_SALT_STORAGE, bytesToHex(salt));
  }

  const secret = textEncoder.encode(passphrase);
  const input = new Uint8Array(salt.length + 4);
  input.set(salt, 0);
  input[salt.length + 3] = 1;

  let u = hmacSha256Bytes(secret, input);
  const dk = new Uint8Array(u);
  for (let round = 1; round < 2048; round++) {
    u = hmacSha256Bytes(secret, u);
    for (let i = 0; i < 32; i++) {
      dk[i]! ^= u[i]!;
    }
  }
  return dk;
}

export function exportWebVaultEnvelope(
  storage: StorageLike | null | undefined,
  eventId: string,
): string | null {
  return storage?.getItem(vaultStorageKey(eventId)) ?? null;
}

function computeEntryHash(input: {
  prevHash: string;
  eventId: string;
  guestId: string;
  shortCode: string;
  partyAdmitted: number;
  scannedAt: string;
  method: ScanAdmissionMethod;
  qrDigest: string;
}): string {
  return sha256Hex(
    `${input.prevHash}|${input.eventId}|${input.guestId}|${input.shortCode}|${input.partyAdmitted}|${input.scannedAt}|${input.method}|${input.qrDigest}`,
  );
}

/** Appends a tamper-evident admission entry onto the current hash chain. */
export function appendWebAdmission(
  existing: WebAdmissionRecord[],
  input: {
    id: string;
    eventId: string;
    guestId: string;
    displayName: string;
    shortCode: string;
    partyAdmitted: number;
    scannedAt: string;
    gateName: string;
    method: ScanAdmissionMethod;
    rawCredential: string;
  },
): WebAdmissionRecord[] {
  const prevHash = existing.length > 0 ? existing[existing.length - 1]!.entryHash : ZERO_HASH;
  const qrDigest = sha256Hex(input.rawCredential || input.shortCode).slice(0, 16);
  const entryHash = computeEntryHash({
    prevHash,
    eventId: input.eventId,
    guestId: input.guestId,
    shortCode: input.shortCode,
    partyAdmitted: input.partyAdmitted,
    scannedAt: input.scannedAt,
    method: input.method,
    qrDigest,
  });
  return [
    ...existing,
    {
      id: input.id,
      eventId: input.eventId,
      guestId: input.guestId,
      displayName: input.displayName,
      shortCode: input.shortCode,
      partyAdmitted: input.partyAdmitted,
      scannedAt: input.scannedAt,
      gateName: input.gateName,
      method: input.method,
      qrDigest,
      prevHash,
      entryHash,
    },
  ];
}

export function buildWebAttendanceSnapshot(
  eventId: string,
  eventTitle: string,
  linkCode: string,
  records: WebAdmissionRecord[],
): WebAttendanceSnapshot {
  const totalCheckedIn = records.length;
  const totalPeople = records.reduce((sum, r) => sum + r.partyAdmitted, 0);
  const chainDigest = records.length > 0 ? records[records.length - 1]!.entryHash : ZERO_HASH;
  return {
    v: 1,
    eventId,
    eventTitle,
    linkCode,
    savedAt: new Date().toISOString(),
    totalCheckedIn,
    totalPeople,
    chainDigest,
    records,
  };
}

export function verifyWebAttendanceSnapshot(
  snapshot: WebAttendanceSnapshot,
  sealedBytes = 0,
): WebVaultVerification {
  const checkedAt = new Date().toISOString();
  if (snapshot.v !== 1 || !Array.isArray(snapshot.records)) {
    return {
      valid: false,
      reason: 'Unsupported snapshot format',
      checkedAt,
      sealedBytes,
      recordCount: 0,
      totalPeople: 0,
      chainDigest: ZERO_HASH,
      records: [],
    };
  }

  let expectedPrev = ZERO_HASH;
  let totalPeople = 0;

  for (let i = 0; i < snapshot.records.length; i++) {
    const rec = snapshot.records[i]!;
    if (rec.prevHash !== expectedPrev) {
      return {
        valid: false,
        reason: `Hash chain break at entry ${i + 1} (${rec.shortCode})`,
        checkedAt,
        sealedBytes,
        recordCount: snapshot.records.length,
        totalPeople,
        chainDigest: snapshot.chainDigest,
        records: snapshot.records,
      };
    }
    const recomputed = computeEntryHash({
      prevHash: rec.prevHash,
      eventId: rec.eventId,
      guestId: rec.guestId,
      shortCode: rec.shortCode,
      partyAdmitted: rec.partyAdmitted,
      scannedAt: rec.scannedAt,
      method: rec.method,
      qrDigest: rec.qrDigest,
    });
    if (recomputed !== rec.entryHash) {
      return {
        valid: false,
        reason: `Modified record signature at ${rec.shortCode}`,
        checkedAt,
        sealedBytes,
        recordCount: snapshot.records.length,
        totalPeople,
        chainDigest: snapshot.chainDigest,
        records: snapshot.records,
      };
    }
    expectedPrev = rec.entryHash;
    totalPeople += rec.partyAdmitted;
  }

  const tail =
    snapshot.records.length > 0
      ? snapshot.records[snapshot.records.length - 1]!.entryHash
      : ZERO_HASH;
  if (snapshot.chainDigest !== tail) {
    return {
      valid: false,
      reason: 'Chain tail digest mismatch',
      checkedAt,
      sealedBytes,
      recordCount: snapshot.records.length,
      totalPeople,
      chainDigest: snapshot.chainDigest,
      records: snapshot.records,
    };
  }

  if (snapshot.totalCheckedIn !== snapshot.records.length || snapshot.totalPeople !== totalPeople) {
    return {
      valid: false,
      reason: 'Attendance total count mismatch',
      checkedAt,
      sealedBytes,
      recordCount: snapshot.records.length,
      totalPeople,
      chainDigest: snapshot.chainDigest,
      records: snapshot.records,
    };
  }

  return {
    valid: true,
    reason: null,
    checkedAt,
    sealedBytes,
    recordCount: snapshot.records.length,
    totalPeople,
    chainDigest: tail,
    records: snapshot.records,
  };
}

export function vaultStorageKey(eventId: string): string {
  return `${WEB_VAULT_DATA_PREFIX}${eventId}`;
}

export function saveAndVerifyWebVault(
  storage: StorageLike,
  masterKey: Uint8Array,
  snapshot: WebAttendanceSnapshot,
): WebVaultVerification {
  const sealed = sealWebJson(snapshot, masterKey);
  storage.setItem(vaultStorageKey(snapshot.eventId), sealed);
  return verifyStoredWebVault(storage, masterKey, snapshot.eventId);
}

export function verifyStoredWebVault(
  storage: StorageLike,
  masterKey: Uint8Array,
  eventId: string,
): WebVaultVerification {
  const checkedAt = new Date().toISOString();
  const raw = storage.getItem(vaultStorageKey(eventId));
  if (!raw) {
    return {
      valid: false,
      reason: 'No local encrypted vault saved yet',
      checkedAt,
      sealedBytes: 0,
      recordCount: 0,
      totalPeople: 0,
      chainDigest: ZERO_HASH,
      records: [],
    };
  }
  const opened = openWebJson<WebAttendanceSnapshot>(raw, masterKey);
  if (!opened) {
    return {
      valid: false,
      reason: 'Encrypted vault MAC verification failed (tampered or wrong key)',
      checkedAt,
      sealedBytes: raw.length,
      recordCount: 0,
      totalPeople: 0,
      chainDigest: ZERO_HASH,
      records: [],
    };
  }
  return verifyWebAttendanceSnapshot(opened, raw.length);
}

export function loadWebAdmissions(
  storage: StorageLike | null | undefined,
  masterKey: Uint8Array,
  eventId: string,
): WebAdmissionRecord[] {
  if (!storage) return [];
  const verification = verifyStoredWebVault(storage, masterKey, eventId);
  return verification.valid ? verification.records : [];
}

function decodeBase64UrlJson(segment: string): Record<string, unknown> | null {
  try {
    const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
    const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
    const json = textDecoder.decode(base64ToBytes(`${padded}${pad}`));
    const parsed = JSON.parse(json) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Parses QR payloads (`k1...`, `/c/<token>`, JSON, or short code like `KH-4821`). */
export function parseScannedGatePayload(rawInput: string): ParsedGatePayload {
  const raw = rawInput.trim();
  if (!raw) return { raw, shortCode: null, token: null, guestId: null };

  const directCode = normalizeShortCode(raw);
  if (directCode) {
    return { raw, shortCode: directCode, token: null, guestId: null };
  }

  if (raw.startsWith('{') && raw.endsWith('}')) {
    try {
      const obj = JSON.parse(raw) as Record<string, unknown>;
      const sc =
        typeof obj.shortCode === 'string'
          ? normalizeShortCode(obj.shortCode)
          : typeof obj.c === 'string'
            ? normalizeShortCode(obj.c)
            : null;
      const tok =
        typeof obj.token === 'string' ? obj.token : typeof obj.t === 'string' ? obj.t : null;
      const gid =
        typeof obj.guestId === 'string'
          ? obj.guestId
          : typeof obj.g === 'string'
            ? obj.g
            : typeof obj.id === 'string'
              ? obj.id
              : null;
      return { raw, shortCode: sc, token: tok, guestId: gid };
    } catch {
      // fall through to URL / k1 parsing
    }
  }

  if (/^https?:\/\//i.test(raw) || raw.includes('/c/')) {
    try {
      const url = new URL(
        raw.startsWith('http')
          ? raw
          : `https://local.invalid${raw.startsWith('/') ? '' : '/'}${raw}`,
      );
      const cardMatch = url.pathname.match(/\/c\/([^/?#]+)/);
      const tokenParam = url.searchParams.get('t') ?? url.searchParams.get('token');
      const codeParam = url.searchParams.get('code') ?? url.searchParams.get('c');
      const extractedToken = cardMatch?.[1] ? decodeURIComponent(cardMatch[1]) : tokenParam;
      const sc = codeParam ? normalizeShortCode(codeParam) : null;
      if (extractedToken || sc) {
        return { raw, shortCode: sc, token: extractedToken, guestId: null };
      }
    } catch {
      // fall through
    }
  }

  if (raw.startsWith('v1.')) {
    const parts = raw.split('.');
    if (parts.length === 6) {
      const [, ev, gu, party, ver] = parts as [string, string, string, string, string, string];
      if (/^[0-9a-f]{8}$/i.test(ev) && /^[0-9a-f]{8}$/i.test(gu) && /^\d{1,2}$/.test(party)) {
        return {
          raw,
          shortCode: null,
          token: raw,
          guestId: null,
          eventShort: ev.toLowerCase(),
          guestShort: gu.toLowerCase(),
          version: /^\d{1,6}$/.test(ver) ? Number(ver) : null,
        };
      }
    }
  }

  if (raw.startsWith('k1.')) {
    const parts = raw.split('.');
    const claims = parts[1] ? decodeBase64UrlJson(parts[1]) : null;
    const sc =
      claims && typeof claims.c === 'string'
        ? normalizeShortCode(claims.c)
        : claims && typeof claims.shortCode === 'string'
          ? normalizeShortCode(claims.shortCode)
          : null;
    const gid =
      claims && typeof claims.g === 'string'
        ? claims.g
        : claims && typeof claims.sub === 'string'
          ? claims.sub
          : null;
    return { raw, shortCode: sc, token: raw, guestId: gid };
  }

  const embeddedCode = extractShortCode(raw);
  if (embeddedCode) {
    return { raw, shortCode: embeddedCode, token: raw, guestId: null };
  }

  return { raw, shortCode: null, token: raw, guestId: null };
}

function shortHexId(uuid: string): string {
  return uuid.replace(/-/g, '').slice(-8).toLowerCase();
}

/** Matches a scanned QR string or short code against the event's guest roster. */
export function matchScannedGuest(guests: ScannerGuest[], rawInput: string): GateMatchResult {
  const payload = parseScannedGatePayload(rawInput);
  let guest: ScannerGuest | undefined;

  if (payload.token) {
    guest = guests.find((g) => g.token && g.token === payload.token);
  }
  if (!guest && payload.guestId) {
    guest = guests.find((g) => g.id === payload.guestId);
  }
  if (!guest && payload.guestShort) {
    guest = guests.find(
      (g) =>
        shortHexId(g.id) === payload.guestShort &&
        (!payload.eventShort || shortHexId(g.eventId) === payload.eventShort),
    );
  }
  if (!guest && payload.shortCode) {
    guest = guests.find((g) => g.shortCode === payload.shortCode);
  }
  if (!guest && payload.raw) {
    guest = guests.find((g) => g.token === payload.raw || g.id === payload.raw);
  }
  if (!guest && payload.raw) {
    const partialCode = extractShortCodeFromPartialSms(payload.raw, guests);
    if (partialCode) {
      guest = guests.find((g) => g.shortCode === partialCode);
    }
  }

  if (!guest) {
    return { kind: 'not_found', payload };
  }
  if (guest.cardKind === 'contribution') {
    return { kind: 'contribution_only', guest, payload };
  }
  if (
    payload.version !== undefined &&
    payload.version !== null &&
    guest.tokenVersion !== undefined &&
    payload.version < guest.tokenVersion
  ) {
    return { kind: 'revoked', guest, payload };
  }
  if (guest.status === 'checked_in' || guest.checkedInAt) {
    return { kind: 'duplicate', guest, payload };
  }
  return { kind: 'ok', guest, payload };
}
