#!/usr/bin/env node
/**
 * Load test (Phase 7, §13): 1,000 concurrent guest-card views and 20 gate devices syncing at once.
 *
 *   API_URL=https://api.staging.example.com TOKEN=<owner access token> node scripts/load-test.mjs
 *
 * It creates its own event and guests, so run it against staging, never production. Numbers from
 * the in-memory dev server (PGlite, one connection) only prove the script works: judge capacity on
 * the real Postgres + Redis deployment. Exit code 1 if a threshold is missed.
 */
const API = process.env.API_URL ?? 'http://localhost:3001';
const TOKEN = process.env.TOKEN;
const GUESTS = Number(process.env.GUESTS ?? 1000);
const DEVICES = Number(process.env.DEVICES ?? 20);
const P95_CARD_MS = Number(process.env.P95_CARD_MS ?? 1500);
if (!TOKEN) {
  console.error('Set TOKEN to an owner access token (sign in, then copy the access token).');
  process.exit(2);
}

const auth = { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' };
const call = async (method, path, body, headers = auth) => {
  const res = await fetch(API + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  return { status: res.status, json, text };
};
const pct = (xs, p) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor((p / 100) * xs.length))] ?? 0;
const timed = async (fn) => { const t = performance.now(); const r = await fn(); return { r, ms: performance.now() - t }; };
const report = (name, ms, errors) =>
  console.log(`${name.padEnd(26)} n=${String(ms.length).padStart(5)}  p50=${pct(ms, 50).toFixed(0)}ms  p95=${pct(ms, 95).toFixed(0)}ms  p99=${pct(ms, 99).toFixed(0)}ms  errors=${errors}`);

console.log(`API ${API}: ${GUESTS} guests, ${DEVICES} gate devices`);
const ev = (await call('POST', '/v1/events', { title: `Load test ${Date.now()}`, coupleNames: 'Load & Test', dateStart: '2027-06-01T10:00:00+03:00' })).json;
if (!ev?.id) { console.error('could not create the event', ev); process.exit(2); }

// guests, 100 per import call (the import response carries no card links)
for (let i = 0; i < GUESTS; i += 100) {
  const batch = Array.from({ length: Math.min(100, GUESTS - i) }, (_, k) => `Mgeni ${i + k + 1},07${String(40_000_000 + i + k).padStart(8, '0')}`);
  const r = await call('POST', `/v1/events/${ev.id}/guests/import`, { csv: ['Jina,Simu', ...batch].join('\n') });
  if (r.status !== 200) { console.error('import failed', r.status, r.text.slice(0, 200)); process.exit(2); }
}
// card links are only returned when a card is created or reissued, so reissue every guest to get one
const list = [];
for (let cursor = ''; ; ) {
  const r = await call('GET', `/v1/events/${ev.id}/guests?limit=200${cursor ? `&cursor=${cursor}` : ''}`);
  list.push(...r.json.items);
  if (!r.json.nextCursor) break;
  cursor = r.json.nextCursor;
}
const tokens = [];
for (let i = 0; i < list.length; i += 25) {
  const chunk = list.slice(i, i + 25);
  const rs = await Promise.all(chunk.map((g) => call('POST', `/v1/guests/${g.id}/reissue`, undefined, { ...auth, 'idempotency-key': `lt-${g.id}`.slice(0, 60) })));
  for (const r of rs) if (r.json?.cardToken) tokens.push(r.json.cardToken);
}
console.log(`prepared ${tokens.length} card links`);

// 1) card views: all at once
const views = await Promise.all(tokens.slice(0, GUESTS).map((t) => timed(() => call('GET', `/v1/c/${t}`, undefined, {}))));
const viewErr = views.filter((v) => v.r.status !== 200 && v.r.status !== 429).length;
const limited = views.filter((v) => v.r.status === 429).length;
report('card views (concurrent)', views.map((v) => v.ms), viewErr);
if (limited) console.log(`  (${limited} answered 429: the per-IP limiter is working; raise it or spread the source IPs for a fair test)`);

// 2) gate devices: join the bundle and sync scans at the same time
const link = (await call('POST', `/v1/events/${ev.id}/gate-links`)).json;
const gateOne = async (n) => {
  const join = await call('POST', '/v1/gate/join', { code: link.code, pin: link.pin, deviceId: `load-device-${String(n).padStart(3, '0')}-aaaa`, deviceName: `L${n}` }, { 'content-type': 'application/json' });
  if (!join.json?.accessToken) return { ms: [], err: 1 };
  const h = { authorization: `Bearer ${join.json.accessToken}`, 'content-type': 'application/json' };
  const ms = [];
  let err = 0;
  const b = await timed(() => call('GET', `/v1/events/${ev.id}/gate/bundle`, undefined, h));
  ms.push(b.ms); if (b.r.status !== 200) err++;
  const mine = list.filter((_, i) => i % DEVICES === n).slice(0, 50);
  const scans = mine.map((g, i) => ({ clientId: `ld-${n}-${i}-${Date.now()}`, guestId: g.id, result: 'ok', partyAdmitted: 1, scannedAt: new Date().toISOString(), offline: true }));
  const s = await timed(() => call('POST', `/v1/events/${ev.id}/gate/scans/sync`, { deviceId: `load-device-${String(n).padStart(3, '0')}-aaaa`, scans }, h));
  ms.push(s.ms); if (s.r.status !== 200) err++;
  return { ms, err };
};
const devs = await Promise.all(Array.from({ length: DEVICES }, (_, n) => gateOne(n)));
report('gate bundle + sync', devs.flatMap((d) => d.ms), devs.reduce((n, d) => n + d.err, 0));

const stats = (await call('GET', `/v1/events/${ev.id}/invitations/stats`)).json;
const expectedAdmitted = Math.min(list.length, DEVICES * 50);
console.log(`checked in after the run: ${stats?.byStatus?.checked_in ?? 0} (expected ${expectedAdmitted})`);

const ok = viewErr === 0 && pct(views.map((v) => v.ms), 95) <= P95_CARD_MS && devs.every((d) => d.err === 0) && (stats?.byStatus?.checked_in ?? 0) === expectedAdmitted;
console.log(ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
