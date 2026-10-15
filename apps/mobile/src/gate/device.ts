import * as Crypto from 'expo-crypto';
import { store } from '../lib/storage';

const KEY = 'harusi.device.id';
let cached: string | null = null;

/** A stable id for this phone. It names the "gate" in duplicate messages and in the scan log. */
export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  let id = await store.get(KEY);
  if (!id) {
    id = Crypto.randomUUID();
    await store.set(KEY, id);
  }
  cached = id;
  return id;
}

/** Short label such as "A3F" shown in the gate header. */
export const gateLabel = (deviceId: string) => deviceId.replace(/-/g, '').slice(-3).toUpperCase();
