import * as SQLite from 'expo-sqlite';
import type { Admission, Bundle, GateStore, LocalScan, ScanResult } from '@harusi/gate';
import { isEncryptedEnvelope, openJson, sealJson } from './encrypted-vault';
import { getOrCreateVaultKey, randomVaultBytes } from './vault-key';

export const ENCRYPTED_ATTENDANCE_KV = 'encrypted_attendance_v1';
export const ENCRYPTED_ADMISSIONS_KV = 'encrypted_admissions_v1';
export const ENCRYPTED_SCANS_KV = 'encrypted_scans_v1';

interface ScanRow {
  client_id: string;
  guest_id: string | null;
  result: ScanResult;
  party: number;
  scanned_at: string;
  offline: number;
  override: number;
  reason: string | null;
  synced: number;
}

const toScan = (r: ScanRow): LocalScan => ({
  clientId: r.client_id,
  guestId: r.guest_id,
  result: r.result,
  partyAdmitted: r.party,
  scannedAt: r.scanned_at,
  offline: !!r.offline,
  override: !!r.override,
  reason: r.reason,
  synced: !!r.synced,
});

/**
 * The gate device's database (§7.6): the bundle, the admission list and every scan live in SQLite,
 * so the app keeps working after a restart with no network. One file per event.
 */
export class SqliteGateStore implements GateStore {
  private constructor(private db: SQLite.SQLiteDatabase) {}

  static async open(eventId: string): Promise<SqliteGateStore> {
    const db = await SQLite.openDatabaseAsync(`harusi-gate-${eventId}.db`);
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS bundle (id INTEGER PRIMARY KEY CHECK (id = 1), json TEXT NOT NULL, etag TEXT);
      CREATE TABLE IF NOT EXISTS admissions (guest_id TEXT PRIMARY KEY, scanned_at TEXT NOT NULL, device_id TEXT NOT NULL, party INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS scans (
        client_id TEXT PRIMARY KEY, guest_id TEXT, result TEXT NOT NULL, party INTEGER NOT NULL,
        scanned_at TEXT NOT NULL, offline INTEGER NOT NULL, override INTEGER NOT NULL DEFAULT 0,
        reason TEXT, synced INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS scans_synced_idx ON scans (synced);
    `);
    return new SqliteGateStore(db);
  }

  async saveBundle(bundle: Bundle, etag: string | null) {
    const key = await getOrCreateVaultKey();
    const encrypted = sealJson(bundle, key, randomVaultBytes(16));
    await this.db.runAsync(
      'INSERT OR REPLACE INTO bundle (id, json, etag) VALUES (1, ?, ?)',
      encrypted,
      etag,
    );
  }
  async loadBundle() {
    const r = await this.db.getFirstAsync<{ json: string; etag: string | null }>(
      'SELECT json, etag FROM bundle WHERE id = 1',
    );
    if (!r) return null;
    try {
      if (isEncryptedEnvelope(r.json)) {
        const key = await getOrCreateVaultKey();
        return { bundle: openJson<Bundle>(r.json, key), etag: r.etag };
      }
      return { bundle: JSON.parse(r.json) as Bundle, etag: r.etag };
    } catch {
      return null;
    }
  }
  async replaceAdmissions(list: Admission[]) {
    const key = await getOrCreateVaultKey();
    const encrypted = sealJson(list, key, randomVaultBytes(16));
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync('DELETE FROM admissions');
      for (const a of list)
        await this.db.runAsync(
          'INSERT OR REPLACE INTO admissions VALUES (?, ?, ?, ?)',
          a.guestId,
          a.scannedAt,
          a.deviceId,
          a.partyAdmitted,
        );
      await this.db.runAsync(
        'INSERT OR REPLACE INTO kv (k, v) VALUES (?, ?)',
        ENCRYPTED_ADMISSIONS_KV,
        encrypted,
      );
    });
  }
  async admissions() {
    const sealed = await this.getKv(ENCRYPTED_ADMISSIONS_KV);
    if (sealed) {
      try {
        const key = await getOrCreateVaultKey();
        return openJson<Admission[]>(sealed, key);
      } catch {
        return [];
      }
    }
    const rows = await this.db.getAllAsync<{
      guest_id: string;
      scanned_at: string;
      device_id: string;
      party: number;
    }>('SELECT * FROM admissions');
    return rows.map((r) => ({
      guestId: r.guest_id,
      scannedAt: r.scanned_at,
      deviceId: r.device_id,
      partyAdmitted: r.party,
    }));
  }
  private async persistEncryptedScans() {
    const rows = (await this.db.getAllAsync<ScanRow>('SELECT * FROM scans ORDER BY rowid')).map(
      toScan,
    );
    const key = await getOrCreateVaultKey();
    await this.setKv(ENCRYPTED_SCANS_KV, sealJson(rows, key, randomVaultBytes(16)));
  }
  async addScan(s: LocalScan) {
    await this.db.runAsync(
      'INSERT OR IGNORE INTO scans (client_id, guest_id, result, party, scanned_at, offline, override, reason, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      s.clientId,
      s.guestId,
      s.result,
      s.partyAdmitted,
      s.scannedAt,
      s.offline ? 1 : 0,
      s.override ? 1 : 0,
      s.reason ?? null,
      s.synced ? 1 : 0,
    );
    await this.persistEncryptedScans();
  }
  async scans() {
    const sealed = await this.getKv(ENCRYPTED_SCANS_KV);
    if (sealed) {
      try {
        const key = await getOrCreateVaultKey();
        return openJson<LocalScan[]>(sealed, key);
      } catch {
        return [];
      }
    }
    return (await this.db.getAllAsync<ScanRow>('SELECT * FROM scans ORDER BY rowid')).map(toScan);
  }
  async pendingScans(limit: number) {
    const all = await this.scans();
    return all.filter((s) => !s.synced).slice(0, limit);
  }
  async applyResults(results: { clientId: string; result: ScanResult }[]) {
    await this.db.withTransactionAsync(async () => {
      for (const r of results)
        await this.db.runAsync(
          'UPDATE scans SET synced = 1, result = ? WHERE client_id = ?',
          r.result,
          r.clientId,
        );
    });
    await this.persistEncryptedScans();
  }
  async getKv(key: string) {
    return (
      (await this.db.getFirstAsync<{ v: string }>('SELECT v FROM kv WHERE k = ?', key))?.v ?? null
    );
  }
  async setKv(key: string, value: string) {
    await this.db.runAsync('INSERT OR REPLACE INTO kv (k, v) VALUES (?, ?)', key, value);
  }
  async saveEncryptedSnapshot(envelope: string) {
    await this.setKv(ENCRYPTED_ATTENDANCE_KV, envelope);
  }
  async loadEncryptedSnapshot() {
    return this.getKv(ENCRYPTED_ATTENDANCE_KV);
  }
}
