import { verifyQrToken, type QrClaims } from '@harusi/crypto';
import { normalizeShortCode } from '@harusi/schemas/short-code';
import type {
  Admission,
  Bundle,
  BundleGuest,
  DenyReason,
  GateApi,
  GateStore,
  LocalScan,
  ScanOutcome,
  ScanResult,
} from './types';

export type GateRole = 'owner' | 'committee' | 'gate';

export interface EngineOptions {
  deviceId: string;
  role: GateRole;
  now?: () => Date;
  uuid?: () => string;
}

export interface SyncReport {
  sent: number;
  pending: number;
  error?: string;
}

const BATCH = 200;
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * Everything a gate device does without a network (§6.2, §7.6): verify the signed QR against the
 * bundle's public key, look guests up by code, name or last four digits, decide admit / duplicate /
 * deny, and keep a queue of scans to sync. The server orders admissions across devices; this class
 * only has to be right about what this device can know.
 */
export class GateEngine {
  private bundle: Bundle | null = null;
  private byShort = new Map<string, BundleGuest>();
  private byId = new Map<string, BundleGuest>();
  private byCode = new Map<string, BundleGuest>();
  private server = new Map<string, Admission>();
  private local = new Map<string, Admission>();
  /** Tokens already verified against the current bundle: a re-scan skips the ~60 ms signature check. */
  private verified = new Map<string, QrClaims>();
  private verifyCalls = 0;
  private failures = 0;
  private nextRetryAt = 0;

  private readonly now: () => Date;
  private readonly uuid: () => string;

  constructor(
    private store: GateStore,
    private o: EngineOptions,
  ) {
    this.now = o.now ?? (() => new Date());
    this.uuid = o.uuid ?? (() => crypto.randomUUID());
  }

  /** Loads the saved bundle and scans (call on app start; works fully offline). */
  async load(): Promise<boolean> {
    const saved = await this.store.loadBundle();
    if (!saved) return false;
    this.index(saved.bundle);
    this.server = new Map((await this.store.admissions()).map((a) => [a.guestId, a]));
    this.local = new Map();
    for (const s of await this.store.scans()) if (!s.synced) this.track(s);
    return true;
  }

  private index(b: Bundle) {
    this.bundle = b;
    this.verified.clear(); // a reissue changes token versions, so earlier results no longer apply
    this.byShort = new Map(b.guests.map((g) => [g.guestShort, g]));
    this.byId = new Map(b.guests.map((g) => [g.id, g]));
    this.byCode = new Map(b.guests.map((g) => [g.shortCode, g]));
  }

  /** Remembers an unsynced admission claim so the next scan of the same guest is a duplicate. */
  private track(s: LocalScan) {
    if (!s.guestId || s.override) return;
    if (s.result !== 'ok' && s.result !== 'manual_ok') return;
    const cur = this.local.get(s.guestId);
    if (!cur || s.scannedAt < cur.scannedAt)
      this.local.set(s.guestId, {
        guestId: s.guestId,
        scannedAt: s.scannedAt,
        deviceId: this.o.deviceId,
        partyAdmitted: s.partyAdmitted,
      });
  }

  private firstAdmission(guestId: string): Admission | null {
    const a = this.server.get(guestId);
    const b = this.local.get(guestId);
    if (a && b) return a.scannedAt <= b.scannedAt ? a : b;
    return a ?? b ?? null;
  }

  /** How many signature checks this device has done (a re-scan of a verified QR does not count). */
  get verifications(): number {
    return this.verifyCalls;
  }

  get ready(): boolean {
    return this.bundle !== null;
  }
  get event() {
    return this.bundle?.event ?? null;
  }

  async installBundle(bundle: Bundle, etag: string | null) {
    await this.store.saveBundle(bundle, etag);
    this.index(bundle);
  }

  // ---- decisions

  private async record(
    guest: BundleGuest | null,
    result: ScanResult,
    extra: { partyAdmitted?: number; override?: boolean; reason?: string } = {},
  ) {
    const scan: LocalScan = {
      clientId: this.uuid(),
      guestId: guest?.id ?? null,
      result,
      partyAdmitted: result === 'ok' || result === 'manual_ok' ? (extra.partyAdmitted ?? 1) : 0,
      scannedAt: this.now().toISOString(),
      offline: true,
      override: extra.override,
      reason: extra.reason ?? null,
      synced: false,
    };
    await this.store.addScan(scan);
    this.track(scan);
    return scan;
  }

  private async admit(
    guest: BundleGuest,
    party: number,
    via: 'qr' | 'code' | 'search',
    reason?: string,
  ): Promise<ScanOutcome> {
    const first = this.firstAdmission(guest.id);
    if (first) {
      await this.record(guest, 'duplicate');
      return {
        kind: 'duplicate',
        guest,
        first: {
          at: first.scannedAt,
          deviceId: first.deviceId,
          partyAdmitted: first.partyAdmitted,
        },
      };
    }
    await this.record(guest, via === 'qr' ? 'ok' : 'manual_ok', { partyAdmitted: party, reason });
    return { kind: 'admit', guest, partyAdmitted: party, via };
  }

  /** Scan a QR: signature, event and revocation are all checked on this device. */
  async scanQr(raw: string): Promise<ScanOutcome> {
    if (!this.bundle) throw new Error('Gate bundle not loaded');
    const cached = this.verified.get(raw);
    if (cached) {
      const guest = this.byId.get(cached.guestId);
      if (guest) return this.admit(guest, Math.min(cached.partySize, guest.partySizeAllowed), 'qr');
    }
    this.verifyCalls++;
    const r = verifyQrToken(raw, {
      eventId: this.bundle.event.id,
      publicKey: this.bundle.publicKey,
      lookupGuest: (short) => {
        const g = this.byShort.get(short);
        return g ? { guestId: g.id, currentVersion: g.tokenVersion } : null;
      },
    });
    if (r.ok) {
      if (this.verified.size > 5000) this.verified.clear(); // bounded: a few thousand guests at most
      this.verified.set(raw, r.claims);
      const guest = this.byId.get(r.claims.guestId)!;
      return this.admit(guest, Math.min(r.claims.partySize, guest.partySizeAllowed), 'qr');
    }
    const reason: DenyReason =
      r.reason === 'bad_signature' || r.reason === 'unknown_guest'
        ? 'tampered'
        : r.reason === 'wrong_event'
          ? 'wrong_event'
          : r.reason === 'revoked'
            ? 'revoked'
            : 'malformed';
    await this.record(null, reason === 'wrong_event' ? 'wrong_event' : 'invalid_sig', { reason });
    return { kind: 'deny', reason };
  }

  /** Typed card number (fallback 2). There is no signature to check, so it is logged as manual. */
  async scanCode(code: string): Promise<ScanOutcome> {
    if (!this.bundle) throw new Error('Gate bundle not loaded');
    const n = normalizeShortCode(code);
    const guest = n ? this.byCode.get(n) : undefined;
    if (!guest) {
      await this.record(null, 'not_found', { reason: 'code' });
      return { kind: 'deny', reason: 'not_found' };
    }
    return this.admit(guest, guest.partySizeAllowed, 'code', 'code');
  }

  /** Search by name, last four phone digits or card number (fallback 3). */
  search(query: string, limit = 20): BundleGuest[] {
    if (!this.bundle) return [];
    const q = norm(query);
    if (!q) return [];
    const digits = q.replace(/\D/g, '');
    const out: BundleGuest[] = [];
    for (const g of this.bundle.guests) {
      if (
        norm(g.displayName).includes(q) ||
        g.shortCode.toLowerCase().includes(q.replace(/\s/g, '')) ||
        (digits.length >= 3 && g.phoneLast4?.endsWith(digits.slice(-4)) === true)
      ) {
        out.push(g);
        if (out.length >= limit) break;
      }
    }
    return out;
  }

  /** The gate agent picked a search result and pressed "Ingiza". */
  async admitManual(guestId: string): Promise<ScanOutcome> {
    const guest = this.byId.get(guestId);
    if (!guest) return { kind: 'deny', reason: 'not_found' };
    return this.admit(guest, guest.partySizeAllowed, 'search', 'search');
  }

  /** Let an already-admitted guest in again, with a reason. Committee and owner only (§6.2). */
  async override(guestId: string, reason: string): Promise<ScanOutcome> {
    if (this.o.role === 'gate') throw new Error('Only committee or owner can override');
    if (reason.trim().length < 3) throw new Error('A reason is required');
    const guest = this.byId.get(guestId);
    if (!guest) return { kind: 'deny', reason: 'not_found' };
    await this.record(guest, 'manual_ok', {
      partyAdmitted: guest.partySizeAllowed,
      override: true,
      reason: reason.trim(),
    });
    return { kind: 'admit', guest, partyAdmitted: guest.partySizeAllowed, via: 'search' };
  }

  // ---- numbers for the header

  async stats() {
    const ids = new Set([...this.server.keys(), ...this.local.keys()]);
    return {
      admitted: ids.size,
      total: this.bundle?.guests.length ?? 0,
      pending: (await this.store.pendingScans(1_000_000)).length,
    };
  }

  // ---- sync

  /** Pushes pending scans in batches. Never throws: a failure schedules a retry with backoff. */
  async sync(api: GateApi): Promise<SyncReport> {
    let sent = 0;
    try {
      for (;;) {
        const batch = await this.store.pendingScans(BATCH);
        if (batch.length === 0) break;
        const res = await api.sync(this.o.deviceId, batch);
        await this.store.applyResults(
          res.results.filter((r): r is typeof r & { clientId: string } => !!r.clientId),
        );
        this.merge(res.admitted);
        await this.store.replaceAdmissions(res.admitted);
        await this.reconcile();
        sent += batch.length;
      }
      if (sent === 0) {
        const { admitted } = await api.admitted();
        this.merge(admitted);
        await this.store.replaceAdmissions(admitted);
        await this.reconcile();
      }
      this.failures = 0;
      this.nextRetryAt = 0;
      await this.store.setKv('lastSyncAt', this.now().toISOString());
      return { sent, pending: (await this.store.pendingScans(1_000_000)).length };
    } catch (e) {
      this.failures++;
      // 5 s, 10 s, 20 s … capped at 5 minutes (§7.6: retry with backoff)
      this.nextRetryAt = this.now().getTime() + Math.min(300_000, 5_000 * 2 ** (this.failures - 1));
      return {
        sent,
        pending: (await this.store.pendingScans(1_000_000)).length,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  /** For a timer: syncs only when the backoff has elapsed. */
  async syncIfDue(api: GateApi): Promise<SyncReport | null> {
    if (this.now().getTime() < this.nextRetryAt) return null;
    return this.sync(api);
  }

  /**
   * A scan this device reported as an admission can lose to an earlier scan on another device. Once
   * the server's list says so, correct this device's own record to `duplicate`.
   */
  private async reconcile() {
    const fix: { clientId: string; result: ScanResult }[] = [];
    for (const s of await this.store.scans()) {
      if (!s.synced || s.override || !s.guestId) continue;
      if (s.result !== 'ok' && s.result !== 'manual_ok') continue;
      const a = this.server.get(s.guestId);
      if (
        a &&
        (a.scannedAt < s.scannedAt ||
          (a.scannedAt === s.scannedAt && a.deviceId !== this.o.deviceId))
      )
        fix.push({ clientId: s.clientId, result: 'duplicate' });
    }
    if (fix.length) await this.store.applyResults(fix);
  }

  private merge(list: Admission[]) {
    this.server = new Map(list.map((a) => [a.guestId, a]));
    // Anything the server now knows about is no longer an unsynced local claim.
    for (const [id, l] of this.local) {
      const s = this.server.get(id);
      if (s && s.scannedAt <= l.scannedAt) this.local.delete(id);
    }
  }

  /** Re-downloads the bundle when it changed (a reissue bumps a token version → old QR dies). */
  async refreshBundle(api: GateApi): Promise<boolean> {
    const saved = await this.store.loadBundle();
    const r = await api.bundle(saved?.etag ?? null);
    if ('notModified' in r) return false;
    await this.installBundle(r.bundle, r.etag);
    return true;
  }

  get backoffUntil(): number {
    return this.nextRetryAt;
  }
}
