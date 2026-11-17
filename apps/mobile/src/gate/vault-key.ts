import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';
import { toHex } from '@harusi/crypto';
import { secureGet, secureSet, store } from '../lib/storage';

const VAULT_KEY_STORAGE = 'harusi.gate.vaultKey.v1';
const HEX64 = /^[0-9a-f]{64}$/;

let cachedKey: string | null = null;
let inflightKey: Promise<string> | null = null;

/** Generates cryptographic random bytes via the native/OS CSPRNG (works on Hermes). */
export function randomVaultBytes(length = 16): Uint8Array {
  return Crypto.getRandomBytes(length);
}

/**
 * Returns the device's 256-bit (64-hex) local encryption key from OS Keystore (`expo-secure-store`),
 * creating and persisting it on first launch. Falls back to AsyncStorage only if Keystore fails.
 */
export async function getOrCreateVaultKey(): Promise<string> {
  if (cachedKey && HEX64.test(cachedKey)) return cachedKey;
  if (inflightKey) return inflightKey;

  inflightKey = (async () => {
    try {
      const fromSecure = (await secureGet(VAULT_KEY_STORAGE))?.toLowerCase();
      if (fromSecure && HEX64.test(fromSecure)) {
        cachedKey = fromSecure;
        return fromSecure;
      }

      const fromStore = (await store.get(VAULT_KEY_STORAGE))?.toLowerCase();
      if (fromStore && HEX64.test(fromStore)) {
        cachedKey = fromStore;
        const savedSecure = await secureSet(VAULT_KEY_STORAGE, fromStore);
        if (savedSecure) await store.remove(VAULT_KEY_STORAGE);
        return fromStore;
      }

      const fresh = toHex(randomVaultBytes(32));
      cachedKey = fresh;
      const savedSecure = await secureSet(VAULT_KEY_STORAGE, fresh);
      if (!savedSecure) await store.set(VAULT_KEY_STORAGE, fresh);
      return fresh;
    } finally {
      inflightKey = null;
    }
  })();

  return inflightKey;
}

export function attendanceFileUri(eventId: string): string | null {
  if (!FileSystem.documentDirectory) return null;
  const safeId = eventId.replace(/[^a-zA-Z0-9_-]/g, '');
  return `${FileSystem.documentDirectory}kadi-attending-${safeId}.ksenc`;
}

export async function writeEncryptedAttendanceFile(
  eventId: string,
  envelope: string,
): Promise<string | null> {
  const uri = attendanceFileUri(eventId);
  if (!uri) return null;
  await FileSystem.writeAsStringAsync(uri, envelope, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return uri;
}

export async function readEncryptedAttendanceFile(eventId: string): Promise<{
  uri: string | null;
  envelope: string | null;
}> {
  const uri = attendanceFileUri(eventId);
  if (!uri) return { uri: null, envelope: null };
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return { uri, envelope: null };
    const envelope = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return { uri, envelope };
  } catch {
    return { uri, envelope: null };
  }
}
