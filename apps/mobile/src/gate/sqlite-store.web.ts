import { MemoryGateStore, type GateStore } from '@harusi/gate';

/**
 * Web preview only: expo-sqlite's web build needs a WASM worker, so the browser preview keeps the
 * gate data in memory. Devices always use `sqlite-store.ts` (Metro picks this file for web).
 */
export class SqliteGateStore {
  static async open(_eventId: string): Promise<GateStore> {
    return new MemoryGateStore();
  }
}
