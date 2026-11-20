import { fromB64u, toB64u } from './b64';

/**
 * Authenticated AES-256-GCM encryption for engagement payloads (RSVP, check-in, opt-out,
 * memories access), bound to an explicit context (such as `eventId:guestId:rsvp`) so tokens or
 * payloads from one event/guest cannot be replayed on another.
 */
async function importAesKey(keyBytes: Uint8Array) {
  if (keyBytes.length !== 32) throw new Error('engagement key must be 32 bytes');
  return crypto.subtle.importKey(
    'raw',
    keyBytes.buffer.slice(keyBytes.byteOffset, keyBytes.byteOffset + keyBytes.byteLength) as ArrayBuffer,
    'AES-GCM',
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function sealEngagementPayload(
  payload: unknown,
  keyBytes: Uint8Array,
  context: string,
  ivBytes?: Uint8Array,
): Promise<string> {
  const iv = ivBytes ?? crypto.getRandomValues(new Uint8Array(12));
  if (iv.length !== 12) throw new Error('iv must be 12 bytes');
  const key = await importAesKey(keyBytes);
  const pt = new TextEncoder().encode(JSON.stringify(payload));
  const aad = new TextEncoder().encode(context);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer,
        additionalData: aad.buffer.slice(aad.byteOffset, aad.byteOffset + aad.byteLength) as ArrayBuffer,
      },
      key,
      pt.buffer.slice(pt.byteOffset, pt.byteOffset + pt.byteLength) as ArrayBuffer,
    ),
  );
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return toB64u(out);
}

export async function openEngagementPayload<T = unknown>(
  token: string,
  keyBytes: Uint8Array,
  context: string,
): Promise<T | null> {
  const bytes = fromB64u(token);
  if (!bytes || bytes.length < 13) return null;
  const iv = bytes.slice(0, 12);
  const ct = bytes.slice(12);
  try {
    const key = await importAesKey(keyBytes);
    const aad = new TextEncoder().encode(context);
    const pt = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer,
        additionalData: aad.buffer.slice(aad.byteOffset, aad.byteOffset + aad.byteLength) as ArrayBuffer,
      },
      key,
      ct.buffer.slice(ct.byteOffset, ct.byteOffset + ct.byteLength) as ArrayBuffer,
    );
    return JSON.parse(new TextDecoder().decode(pt)) as T;
  } catch {
    return null;
  }
}
