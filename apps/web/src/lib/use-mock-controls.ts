'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import type { MockControlsState } from '@harusi/api-client/mock';
import { getMock } from './repo';

const fallback: MockControlsState = {
  role: 'owner',
  network: 'online',
  failureRate: 0,
  payOutcome: 'success',
  guestPayments: false,
  pending: [],
  lastSyncAt: null,
};

export function useMockControls(): MockControlsState {
  return useSyncExternalStore(
    (cb) => getMock()?.controls.subscribe(cb) ?? (() => {}),
    () => getMock()?.controls.get() ?? fallback,
    () => fallback,
  );
}

/** Effective connectivity: the browser's own signal combined with the dev-panel network toggle. */
export function useNetworkStatus(): {
  online: boolean;
  slow: boolean;
  pending: number;
  lastSyncAt: string | null;
} {
  const c = useMockControls();
  const [browserOnline, setBrowserOnline] = useState(true);
  useEffect(() => {
    const update = () => setBrowserOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return {
    online: browserOnline && c.network !== 'offline',
    slow: c.network === 'slow',
    pending: c.pending.length,
    lastSyncAt: c.lastSyncAt,
  };
}
