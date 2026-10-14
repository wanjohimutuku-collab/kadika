import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import * as Crypto from 'expo-crypto';
import {
  ed,
  generateEventKeyPair,
  verifyQrToken,
  shortId,
  signQrToken,
  toHex,
} from '@harusi/crypto';
import { GateEngine, type Bundle, type BundleGuest, type ScanOutcome } from '@harusi/gate';
import { SqliteGateStore } from '../../src/gate/sqlite-store';
import { Screen, Txt } from '../../src/ui/kit';

/**
 * Developer check that runs the real gate engine on the real device database (expo-sqlite) and
 * Hermes crypto: 200 mixed scans offline, then a "restart" (close and reopen the database) and a
 * check that nothing was lost. Open it at /dev/gate-selftest. Not linked from the app.
 */
export default function GateSelfTest() {
  const [lines, setLines] = useState<string[]>(['running…']);
  useEffect(() => {
    // never runs in a release build unless a developer sets the flag to time a production bundle
    if (!__DEV__ && process.env.EXPO_PUBLIC_GATE_SELFTEST !== '1') return;
    void run()
      .then((r) => {
        console.log(`GATE_SELFTEST: ${r.pass ? 'PASS' : 'FAIL'} ${JSON.stringify(r.lines)}`);
        setLines([r.pass ? 'PASS' : 'FAIL', ...r.lines]);
      })
      .catch((e) => {
        console.log(`GATE_SELFTEST: ERROR ${String(e)}`);
        setLines(['ERROR', String(e)]);
      });
  }, []);
  return (
    <Screen>
      <Txt size={20} bold>
        Gate self-test
      </Txt>
      {lines.map((l, i) => (
        <Text key={i} style={{ fontFamily: 'monospace' }}>
          {l}
        </Text>
      ))}
    </Screen>
  );
}

async function run(): Promise<{ pass: boolean; lines: string[] }> {
  const lines: string[] = [];
  const rb = (n: number) => Crypto.getRandomBytes(n);
  const keys = generateEventKeyPair(rb);
  const other = generateEventKeyPair(rb);
  const eventId = Crypto.randomUUID();
  const otherEventId = Crypto.randomUUID();
  const guests: BundleGuest[] = Array.from({ length: 100 }, (_, i) => {
    const id = Crypto.randomUUID();
    return {
      id,
      guestShort: shortId(id),
      displayName: `Mgeni ${i + 1}`,
      shortCode: `AB-${2000 + i}`,
      groupLabel: null,
      partySizeAllowed: 2,
      phoneLast4: String(1000 + i),
      tokenVersion: 1,
    };
  });
  const bundle: Bundle = {
    event: {
      id: eventId,
      coupleNames: 'Test',
      dateStart: new Date().toISOString(),
      venueName: null,
    },
    publicKey: keys.publicKey,
    guests,
  };
  const qr = (g: BundleGuest) =>
    signQrToken({ eventId, guestId: g.id, partySize: 2, version: 1 }, keys.privateKey);
  const forge = (t: string) => {
    const p = t.split('.');
    p[5] = (p[5]![0] === 'A' ? 'B' : 'A') + p[5]!.slice(1);
    return p.join('.');
  };
  const foreign = signQrToken(
    { eventId: otherEventId, guestId: guests[0]!.id, partySize: 2, version: 1 },
    other.privateKey,
  );

  const name = `selftest-${Date.now()}`;
  let store = await SqliteGateStore.open(name);
  let n = 0;
  const mk = (s: Awaited<ReturnType<typeof SqliteGateStore.open>>) =>
    new GateEngine(s, {
      deviceId: 'selftest-device',
      role: 'gate',
      uuid: () => `selftest-${Date.now()}-${++n}`,
    });
  let engine = mk(store);
  await engine.installBundle(bundle, 'etag-1');
  const tally: Record<string, number> = {};
  const bump = (o: ScanOutcome) => {
    const k = o.kind === 'deny' ? `deny:${o.reason}` : o.kind;
    tally[k] = (tally[k] ?? 0) + 1;
  };
  // sign everything first: a real scan only verifies, so signing must not count towards the timing
  const valid = guests.map(qr);
  const forged = valid.slice(0, 30).map(forge);
  const t0 = Date.now();
  for (const t of valid) bump(await engine.scanQr(t));
  for (const t of valid.slice(0, 50)) bump(await engine.scanQr(t));
  for (const t of forged) bump(await engine.scanQr(t));
  for (let i = 0; i < 10; i++) bump(await engine.scanQr(foreign));
  for (let i = 0; i < 10; i++) bump(await engine.scanCode(`ZZ-${2000 + i}`));
  const ms = Date.now() - t0;
  const want = {
    admit: 100,
    duplicate: 50,
    'deny:tampered': 30,
    'deny:wrong_event': 10,
    'deny:not_found': 10,
  };
  const okTally =
    JSON.stringify(Object.entries(tally).sort()) === JSON.stringify(Object.entries(want).sort());
  lines.push(
    `200 scans in ${ms} ms (${Math.round(ms / 200)} ms each): ${okTally ? 'results correct' : `WRONG ${JSON.stringify(tally)}`}`,
  );

  // where does a scan's time go? verify alone, and one database insert alone
  const v0 = Date.now();
  for (const t of valid.slice(0, 20))
    verifyQrToken(t, {
      eventId,
      publicKey: keys.publicKey,
      lookupGuest: (sh) => {
        const g = guests.find((x) => x.guestShort === sh);
        return g ? { guestId: g.id, currentVersion: 1 } : null;
      },
    });
  const verifyMs = (Date.now() - v0) / 20;
  const w0 = Date.now();
  for (let i = 0; i < 20; i++)
    await store.addScan({
      clientId: `probe-${i}-${Date.now()}`,
      guestId: null,
      result: 'not_found',
      partyAdmitted: 0,
      scannedAt: new Date().toISOString(),
      offline: true,
      synced: true,
    });
  const writeMs = (Date.now() - w0) / 20;
  lines.push(
    `verify only: ${verifyMs.toFixed(1)} ms · one SQLite insert: ${writeMs.toFixed(1)} ms`,
  );

  // "restart": a brand-new engine and database handle on the same file
  store = await SqliteGateStore.open(name);
  engine = mk(store);
  const loaded = await engine.load();
  const stats = await engine.stats();
  const again = await engine.scanQr(qr(guests[7]!));
  const persisted =
    loaded && stats.pending === 200 && stats.admitted === 100 && again.kind === 'duplicate';
  lines.push(
    `after restart: loaded=${loaded} pending=${stats.pending} admitted=${stats.admitted} rescan=${again.kind} ${persisted ? 'OK' : 'WRONG'}`,
  );
  lines.push(`ed25519 on Hermes: ${toHex(ed.getPublicKey(rb(32))).length === 64 ? 'OK' : 'WRONG'}`);
  return { pass: okTally && persisted, lines };
}
