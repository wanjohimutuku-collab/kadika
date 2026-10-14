import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import { GateEngine, MemoryGateStore, type GateRole, type GateStore } from '@harusi/gate';
import { useOnline } from '../lib/network';
import { getDeviceId } from './device';
import { makeGateApi } from './api';
import { SqliteGateStore } from './sqlite-store';

export type GateState = 'opening' | 'downloading' | 'ready' | 'failed';
export interface GateStats {
  admitted: number;
  total: number;
  pending: number;
}

interface Opts {
  eventId: string;
  role: GateRole;
  token: () => string | null;
  refresh?: () => Promise<void>;
}

/**
 * Runs one gate device: opens the local database, downloads the bundle once (first run needs the
 * network, §17.5), then keeps syncing in the background. Scanning never waits for any of this.
 */
export function useGate({ eventId, role, token, refresh }: Opts) {
  const online = useOnline();
  const [state, setState] = useState<GateState>('opening');
  const [stats, setStats] = useState<GateStats>({ admitted: 0, total: 0, pending: 0 });
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncError, setSyncError] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const engine = useRef<GateEngine | null>(null);
  const api = useRef(makeGateApi(eventId, { token, refresh }));
  const store = useRef<GateStore | null>(null);

  const refreshStats = useCallback(async () => {
    if (engine.current) setStats(await engine.current.stats());
  }, []);

  const download = useCallback(async () => {
    const e = engine.current;
    if (!e || !store.current) return;
    setState('downloading');
    try {
      const b = await api.current.bundle(null);
      if ('bundle' in b) await e.installBundle(b.bundle, b.etag);
      const { admitted } = await api.current.admitted();
      await store.current.replaceAdmissions(admitted);
      await e.load();
      await refreshStats();
      setState('ready');
    } catch {
      setState('failed');
    }
  }, [refreshStats]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const id = await getDeviceId();
      const s: GateStore =
        Platform.OS === 'web' ? new MemoryGateStore() : await SqliteGateStore.open(eventId);
      if (!alive) return;
      setDeviceId(id);
      store.current = s;
      // Hermes has no global crypto.randomUUID, so the engine gets expo-crypto's
      engine.current = new GateEngine(s, { deviceId: id, role, uuid: () => Crypto.randomUUID() });
      if (await engine.current.load()) {
        await refreshStats();
        setLastSync(await s.getKv('lastSyncAt'));
        setState('ready'); // the saved bundle is enough: works fully offline
      } else await download();
    })();
    return () => {
      alive = false;
    };
  }, [eventId, role, download, refreshStats]);

  const syncNow = useCallback(async () => {
    const e = engine.current;
    if (!e || state !== 'ready') return;
    const r = await e.sync(api.current);
    setSyncError(!!r.error);
    if (!r.error) setLastSync(await store.current!.getKv('lastSyncAt'));
    await refreshStats();
  }, [state, refreshStats]);

  // background: retry with backoff while online, and pick up reissues from a fresh bundle
  useEffect(() => {
    if (state !== 'ready' || !online) return;
    const tick = async () => {
      const e = engine.current;
      if (!e) return;
      const r = await e.syncIfDue(api.current);
      if (r) {
        setSyncError(!!r.error);
        if (!r.error) setLastSync(await store.current!.getKv('lastSyncAt'));
        await refreshStats();
      }
    };
    void tick();
    const a = setInterval(tick, 15_000);
    const b = setInterval(
      () => void engine.current?.refreshBundle(api.current).catch(() => false),
      120_000,
    );
    return () => {
      clearInterval(a);
      clearInterval(b);
    };
  }, [state, online, refreshStats]);

  return {
    state,
    engine,
    stats,
    refreshStats,
    lastSync,
    syncError,
    syncNow,
    retryDownload: download,
    deviceId,
    online,
  };
}
