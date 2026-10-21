import type { MemberRole } from '@harusi/schemas';

export type MockNetwork = 'online' | 'slow' | 'offline';
export type PayOutcome = 'success' | 'declined' | 'timeout' | 'duplicate_webhook';

export interface MockControlsState {
  role: MemberRole;
  network: MockNetwork;
  /** 0, 0.1 or 0.3 — share of repository calls that fail with `server`. */
  failureRate: number;
  payOutcome: PayOutcome;
  /** Guests pay through us from the card. Off like the API's default: guests pay the hosts (ADR 043). */
  guestPayments: boolean;
  /** Pending offline writes (labels for the sync sheet). */
  pending: { id: string; label: string; at: string }[];
  lastSyncAt: string | null;
}

const STORAGE_KEY = 'harusi.mock.controls.v1';

const defaults: MockControlsState = {
  role: 'owner',
  network: 'online',
  failureRate: 0,
  payOutcome: 'success',
  guestPayments: false,
  pending: [],
  lastSyncAt: null,
};

type Listener = (s: MockControlsState) => void;

/** Dev-panel controls shared by the mock layer and the UI (network banner, sync indicator). */
export class MockControls {
  private state: MockControlsState;
  private listeners = new Set<Listener>();

  constructor(private storage: Storage | null) {
    let loaded: Partial<MockControlsState> = {};
    try {
      const raw = storage?.getItem(STORAGE_KEY);
      if (raw) loaded = JSON.parse(raw) as Partial<MockControlsState>;
    } catch {
      // ignore corrupt or blocked storage
    }
    this.state = { ...defaults, ...loaded };
  }

  get(): MockControlsState {
    return this.state;
  }

  set(patch: Partial<MockControlsState>): void {
    this.state = { ...this.state, ...patch };
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // storage full or blocked: controls still work for this session
    }
    for (const l of this.listeners) l(this.state);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  reset(): void {
    this.set({ ...defaults });
  }
}
