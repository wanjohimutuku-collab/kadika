/** AES-256-GCM for event private keys (§9). Format: base64url(iv ‖ ciphertext+tag). */
const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64url');
const unb64 = (s: string) => new Uint8Array(Buffer.from(s, 'base64url'));

async function importKey(
  secretB64: string,
): Promise<Awaited<ReturnType<typeof crypto.subtle.importKey>>> {
  const raw = new Uint8Array(Buffer.from(secretB64, 'base64'));
  if (raw.length !== 32)
    throw new Error('KEY_ENC_SECRET must be 32 bytes, base64 (openssl rand -base64 32)');
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptSecret(plain: string, secretB64: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      await importKey(secretB64),
      new TextEncoder().encode(plain),
    ),
  );
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return b64(out);
}

export async function decryptSecret(blob: string, secretB64: string): Promise<string> {
  const bytes = unb64(blob);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: bytes.slice(0, 12) },
    await importKey(secretB64),
    bytes.slice(12),
  );
  return new TextDecoder().decode(plain);
}

const keys = new Map<string, ReturnType<typeof importKey>>();
const cachedKey = (secretB64: string) => {
  let k = keys.get(secretB64);
  if (!k) keys.set(secretB64, (k = importKey(secretB64)));
  return k;
};

/**
 * AES-256-GCM for one field of one row (ADR 043). `context` (for example `payments:<id>:amount`) is
 * bound as additional data, so a ciphertext copied onto another row or column does not decrypt.
 */
export async function encryptField(
  plain: string,
  secretB64: string,
  context: string,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(context) },
      await cachedKey(secretB64),
      new TextEncoder().encode(plain),
    ),
  );
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return b64(out);
}

export async function decryptField(
  blob: string,
  secretB64: string,
  context: string,
): Promise<string> {
  const bytes = unb64(blob);
  const plain = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: bytes.slice(0, 12),
      additionalData: new TextEncoder().encode(context),
    },
    await cachedKey(secretB64),
    bytes.slice(12),
  );
  return new TextDecoder().decode(plain);
}
