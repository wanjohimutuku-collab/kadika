export type ScanResult =
  'ok' | 'duplicate' | 'invalid_sig' | 'wrong_event' | 'not_found' | 'manual_ok' | 'manual_denied';

export interface BundleGuest {
  id: string;
  guestShort: string;
  displayName: string;
  shortCode: string;
  groupLabel: string | null;
  partySizeAllowed: number;
  phoneLast4: string | null;
  tokenVersion: number;
}

export interface Bundle {
  event: { id: string; coupleNames: string; dateStart: string; venueName: string | null };
  publicKey: string;
  guests: BundleGuest[];
}

export interface Admission {
  guestId: string;
  scannedAt: string;
  deviceId: string;
  partyAdmitted: number;
}

export interface LocalScan {
  clientId: string;
  guestId: string | null;
  result: ScanResult;
  partyAdmitted: number;
  scannedAt: string;
  offline: boolean;
  override?: boolean;
  reason?: string | null;
  synced: boolean;
}

/** Persistence for a gate device. SQLite on the phone, memory in tests and in the web preview. */
export interface GateStore {
  saveBundle(bundle: Bundle, etag: string | null): Promise<void>;
  loadBundle(): Promise<{ bundle: Bundle; etag: string | null } | null>;
  /** The server's admission list; scans still waiting to sync keep counting on top of it. */
  replaceAdmissions(list: Admission[]): Promise<void>;
  admissions(): Promise<Admission[]>;
  addScan(scan: LocalScan): Promise<void>;
  scans(): Promise<LocalScan[]>;
  pendingScans(limit: number): Promise<LocalScan[]>;
  applyResults(results: { clientId: string; result: ScanResult }[]): Promise<void>;
  getKv(key: string): Promise<string | null>;
  setKv(key: string, value: string): Promise<void>;
}

/** What the server returns from the sync endpoint. */
export interface SyncResponse {
  accepted: number;
  replayed: number;
  results: { clientId: string | null; result: ScanResult; partyAdmitted: number }[];
  admitted: Admission[];
}

/** The calls a gate device makes to the API. The mobile app wires these to `fetch`. */
export interface GateApi {
  sync(deviceId: string, scans: LocalScan[]): Promise<SyncResponse>;
  bundle(
    etag: string | null,
  ): Promise<{ notModified: true } | { bundle: Bundle; etag: string | null }>;
  admitted(): Promise<{ admitted: Admission[] }>;
}

export type DenyReason = 'tampered' | 'wrong_event' | 'revoked' | 'malformed' | 'not_found';

export type ScanOutcome =
  | { kind: 'admit'; guest: BundleGuest; partyAdmitted: number; via: 'qr' | 'code' | 'search' }
  | {
      kind: 'duplicate';
      guest: BundleGuest;
      first: { at: string; deviceId: string; partyAdmitted: number };
    }
  | { kind: 'deny'; reason: DenyReason; guest?: BundleGuest };
