import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import {
  GateEngine,
  MemoryGateStore,
  type Bundle,
  type BundleGuest,
  type GateRole,
  type GateStore,
} from '@harusi/gate';
import { useOnline } from '../lib/network';
import { getDeviceId } from './device';
import { makeGateApi } from './api';
import {
  buildDemoBundle,
  DEMO_EVENT_ID,
  getDemoEventKeyPair,
  LEGACY_DEMO_PUBLIC_KEY,
} from './demo-bundle';
import { ENCRYPTED_ATTENDANCE_KV, SqliteGateStore } from './sqlite-store';
import {
  buildAttendanceSnapshot,
  isEncryptedEnvelope,
  openJson,
  sealJson,
  verifyEncryptedAttendance,
  type LocalVerifyReport,
} from './encrypted-vault';
import {
  getOrCreateVaultKey,
  randomVaultBytes,
  readEncryptedAttendanceFile,
  writeEncryptedAttendanceFile,
} from './vault-key';

const SCANNED_TOKENS_KV = 'scanned_tokens_v1';

export type GateState = 'opening' | 'downloading' | 'ready' | 'failed';
export interface GateStats {
  admitted: number;
  total: number;
  pending: number;
  admittedPeople: number;
  totalPeople: number;
}

interface Opts {
  eventId: string;
  eventName?: string;
  role: GateRole;
  token: () => string | null;
  refresh?: () => Promise<void>;
}

/**
 * Runs one gate device: opens the local database, downloads the bundle once (first run needs the
 * network, §17.5), then keeps syncing in the background. Scanning never waits for any of this.
 */
export function useGate({ eventId, eventName, role, token, refresh }: Opts) {
  const online = useOnline();
  const [state, setState] = useState<GateState>('opening');
  const [event, setEvent] = useState<Bundle['event'] | null>(null);
  const [stats, setStats] = useState<GateStats>({
    admitted: 0,
    total: 0,
    pending: 0,
    admittedPeople: 0,
    totalPeople: 0,
  });
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncError, setSyncError] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [vaultReport, setVaultReport] = useState<LocalVerifyReport | null>(null);
  const [vaultBusy, setVaultBusy] = useState(false);
  const engine = useRef<GateEngine | null>(null);
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const api = useRef(makeGateApi(eventId, { token: () => tokenRef.current(), refresh }));
  const store = useRef<GateStore | null>(null);
  const deviceIdRef = useRef('');
  const scannedTokensRef = useRef<Record<string, string>>({});
  const guestsByShort = useRef(new Map<string, BundleGuest>());

  const persistAndVerifyVault = useCallback(
    async (bundle: Bundle): Promise<LocalVerifyReport | null> => {
      const s = store.current;
      if (!s) return null;
      try {
        const key = await getOrCreateVaultKey();
        const [admissions, scans] = await Promise.all([s.admissions(), s.scans()]);
        const snapshot = buildAttendanceSnapshot({
          bundle,
          admissions,
          scans,
          deviceId: deviceIdRef.current || 'local-device',
          scannedTokens: scannedTokensRef.current,
        });
        const envelope = sealJson(snapshot, key, randomVaultBytes(16));
        await s.setKv(ENCRYPTED_ATTENDANCE_KV, envelope);
        const fileUri = await writeEncryptedAttendanceFile(eventId, envelope);
        const readBack = await readEncryptedAttendanceFile(eventId);
        const targetEnvelope = readBack.envelope ?? envelope;
        const report = verifyEncryptedAttendance(
          targetEnvelope,
          key,
          bundle,
          fileUri ?? readBack.uri,
        );
        setVaultReport(report);
        return report;
      } catch (err) {
        const failed: LocalVerifyReport = {
          ok: false,
          verifiedAt: new Date().toISOString(),
          recordCount: 0,
          peopleCount: 0,
          signaturesVerified: 0,
          chainDigest: '',
          fileUri: null,
          records: [],
          error: err instanceof Error ? err.message : 'vault_error',
        };
        setVaultReport(failed);
        return failed;
      }
    },
    [eventId],
  );

  const rememberSignedToken = useCallback(async (guestId: string, rawToken: string) => {
    const trimmed = rawToken.trim();
    if (!trimmed.startsWith('v1.')) return;
    scannedTokensRef.current = { ...scannedTokensRef.current, [guestId]: trimmed };
    const s = store.current;
    if (!s) return;
    try {
      const key = await getOrCreateVaultKey();
      const sealed = sealJson(scannedTokensRef.current, key, randomVaultBytes(16));
      await s.setKv(SCANNED_TOKENS_KV, sealed);
    } catch {
      // non-fatal: in-memory map remains intact for this session
    }
  }, []);

  const refreshStats = useCallback(async () => {
    if (!engine.current) return;
    const base = await engine.current.stats();
    const saved = store.current ? await store.current.loadBundle() : null;
    if (saved) {
      guestsByShort.current = new Map(saved.bundle.guests.map((g) => [g.guestShort, g]));
    }
    const totalPeople = saved
      ? saved.bundle.guests.reduce((sum, g) => sum + g.partySizeAllowed, 0)
      : 0;
    const admittedMap = new Map<string, number>();
    const validIds = new Set(saved?.bundle.guests.map((g) => g.id) ?? []);
    if (store.current) {
      for (const a of await store.current.admissions()) {
        if (validIds.size === 0 || validIds.has(a.guestId)) {
          admittedMap.set(a.guestId, a.partyAdmitted);
        }
      }
      for (const s of await store.current.scans()) {
        if (
          !s.synced &&
          !s.override &&
          s.guestId &&
          (validIds.size === 0 || validIds.has(s.guestId)) &&
          (s.result === 'ok' || s.result === 'manual_ok') &&
          !admittedMap.has(s.guestId)
        ) {
          admittedMap.set(s.guestId, s.partyAdmitted);
        }
      }
    }
    const admittedPeople = [...admittedMap.values()].reduce((sum, n) => sum + n, 0);
    setEvent(engine.current.event);
    setStats({ ...base, admittedPeople, totalPeople });
    if (saved) {
      await persistAndVerifyVault(saved.bundle);
    }
  }, [persistAndVerifyVault]);

  const findByGuestShort = useCallback(
    (guestShort: string): BundleGuest | null => guestsByShort.current.get(guestShort) ?? null,
    [],
  );

  const installDemo = useCallback(
    async (e: GateEngine) => {
      const demo = buildDemoBundle(eventId, eventName);
      await e.installBundle(demo, 'demo-etag');
      await e.load();
      await refreshStats();
      setState('ready');
    },
    [eventId, eventName, refreshStats],
  );

  const download = useCallback(async () => {
    const e = engine.current;
    if (!e || !store.current) return;
    setState('downloading');
    if (tokenRef.current() === 'mock-gate-token') {
      await installDemo(e);
      return;
    }
    try {
      const b = await api.current.bundle(null);
      if ('bundle' in b) await e.installBundle(b.bundle, b.etag);
      const { admitted } = await api.current.admitted();
      await store.current.replaceAdmissions(admitted);
      await e.load();
      await refreshStats();
      setState('ready');
    } catch {
      if (tokenRef.current() === 'mock-gate-token' || eventId === DEMO_EVENT_ID) {
        try {
          await installDemo(e);
          return;
        } catch {
          // fall through to failed state
        }
      }
      setState('failed');
    }
  }, [installDemo, refreshStats]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const id = await getDeviceId();
      const s: GateStore =
        Platform.OS === 'web' ? new MemoryGateStore() : await SqliteGateStore.open(eventId);
      if (!alive) return;
      deviceIdRef.current = id;
      setDeviceId(id);
      store.current = s;
      try {
        const rawTokens = await s.getKv(SCANNED_TOKENS_KV);
        if (rawTokens && isEncryptedEnvelope(rawTokens)) {
          scannedTokensRef.current = openJson<Record<string, string>>(
            rawTokens,
            await getOrCreateVaultKey(),
          );
        }
      } catch {
        scannedTokensRef.current = {};
      }
      // Hermes has no global crypto.randomUUID, so the engine gets expo-crypto's
      engine.current = new GateEngine(s, { deviceId: id, role, uuid: () => Crypto.randomUUID() });
      if (await engine.current.load()) {
        const existing = await s.loadBundle();
        if (existing && existing.bundle.publicKey === LEGACY_DEMO_PUBLIC_KEY) {
          const upgraded: Bundle = {
            ...existing.bundle,
            publicKey: getDemoEventKeyPair(existing.bundle.event.id).publicKey,
          };
          await engine.current.installBundle(upgraded, existing.etag);
        }
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
    if (tokenRef.current() === 'mock-gate-token') {
      setSyncError(false);
      await refreshStats();
      return;
    }
    const r = await e.sync(api.current);
    setSyncError(!!r.error);
    if (!r.error) setLastSync(await store.current!.getKv('lastSyncAt'));
    await refreshStats();
  }, [state, refreshStats]);

  // background: retry with backoff while online, and pick up reissues from a fresh bundle
  useEffect(() => {
    if (state !== 'ready' || !online || tokenRef.current() === 'mock-gate-token') return;
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

  const saveEncryptedAttendance = useCallback(async (): Promise<LocalVerifyReport | null> => {
    const s = store.current;
    if (!s) return null;
    setVaultBusy(true);
    try {
      const saved = await s.loadBundle();
      if (!saved) return null;
      return await persistAndVerifyVault(saved.bundle);
    } finally {
      setVaultBusy(false);
    }
  }, [persistAndVerifyVault]);

  const verifyLocalAttendance = useCallback(async (): Promise<LocalVerifyReport | null> => {
    const s = store.current;
    if (!s) return null;
    setVaultBusy(true);
    try {
      const saved = await s.loadBundle();
      if (!saved) return null;
      const key = await getOrCreateVaultKey();
      const file = await readEncryptedAttendanceFile(eventId);
      const kvEnvelope = await s.getKv(ENCRYPTED_ATTENDANCE_KV);
      const envelope = file.envelope ?? kvEnvelope;
      if (!envelope) {
        return await persistAndVerifyVault(saved.bundle);
      }
      const report = verifyEncryptedAttendance(envelope, key, saved.bundle, file.uri);
      setVaultReport(report);
      return report;
    } finally {
      setVaultBusy(false);
    }
  }, [eventId, persistAndVerifyVault]);

  const exportEncryptedEnvelope = useCallback(async (): Promise<{
    envelope: string;
    fileUri: string | null;
  } | null> => {
    const s = store.current;
    if (!s) return null;
    const saved = await s.loadBundle();
    if (saved) {
      await persistAndVerifyVault(saved.bundle);
    }
    const file = await readEncryptedAttendanceFile(eventId);
    const kvEnvelope = await s.getKv(ENCRYPTED_ATTENDANCE_KV);
    const envelope = file.envelope ?? kvEnvelope;
    return envelope ? { envelope, fileUri: file.uri } : null;
  }, [eventId, persistAndVerifyVault]);

  return {
    state,
    event,
    engine,
    stats,
    refreshStats,
    findByGuestShort,
    lastSync,
    syncError,
    syncNow,
    retryDownload: download,
    deviceId,
    online,
    vaultReport,
    vaultBusy,
    rememberSignedToken,
    saveEncryptedAttendance,
    verifyLocalAttendance,
    exportEncryptedEnvelope,
  };
}
