import type { Admission, Bundle, GateStore, LocalScan, ScanResult } from './types';

/** In-memory store: tests, and the browser preview where SQLite is not available. */
export class MemoryGateStore implements GateStore {
  private bundle: { bundle: Bundle; etag: string | null } | null = null;
  private adm: Admission[] = [];
  private scanList: LocalScan[] = [];
  private kv = new Map<string, string>();

  async saveBundle(bundle: Bundle, etag: string | null) {
    this.bundle = { bundle, etag };
  }
  async loadBundle() {
    return this.bundle;
  }
  async replaceAdmissions(list: Admission[]) {
    this.adm = list.map((a) => ({ ...a }));
  }
  async admissions() {
    return this.adm.map((a) => ({ ...a }));
  }
  async addScan(scan: LocalScan) {
    this.scanList.push({ ...scan });
  }
  async scans() {
    return this.scanList.map((s) => ({ ...s }));
  }
  async pendingScans(limit: number) {
    return this.scanList
      .filter((s) => !s.synced)
      .slice(0, limit)
      .map((s) => ({ ...s }));
  }
  async applyResults(results: { clientId: string; result: ScanResult }[]) {
    const byId = new Map(results.map((r) => [r.clientId, r.result]));
    for (const s of this.scanList) {
      const r = byId.get(s.clientId);
      if (r) {
        s.synced = true;
        s.result = r;
      }
    }
  }
  async getKv(key: string) {
    return this.kv.get(key) ?? null;
  }
  async setKv(key: string, value: string) {
    this.kv.set(key, value);
  }
}
