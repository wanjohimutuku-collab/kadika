import { describe, expect, it } from 'vitest';
import { generateEventKeyPair, shortId, signQrToken } from '@harusi/crypto';
import { GateEngine } from './engine';
import { MemoryGateStore } from './memory-store';
import type { Bundle, GateApi } from './types';

function makeFixture() {
  const keys = generateEventKeyPair();
  const otherKeys = generateEventKeyPair();
  const eventId = '0192f1a0-7c3e-7a11-9b2c-5e8d4a6f0001';
  const otherEventId = '0192f1a0-7c3e-7a11-9b2c-5e8d4a6f0002';
  const guest1Id = '0192f1a0-7c3e-7a11-9b2c-5e8d4a6f4821';
  const guest2Id = '0192f1a0-7c3e-7a11-9b2c-5e8d4a6f4826';

  const bundle: Bundle = {
    event: {
      id: eventId,
      coupleNames: 'Asha & Juma',
      dateStart: '2026-11-20T16:00:00.000Z',
      venueName: 'Serena Hall',
    },
    publicKey: keys.publicKey,
    guests: [
      {
        id: guest1Id,
        guestShort: shortId(guest1Id),
        displayName: 'Juma Bakari',
        shortCode: 'KH-4821',
        groupLabel: 'Marafiki',
        partySizeAllowed: 2,
        phoneLast4: '5678',
        tokenVersion: 1,
      },
      {
        id: guest2Id,
        guestShort: shortId(guest2Id),
        displayName: 'Mwanaidi Salim',
        shortCode: 'KH-4826',
        groupLabel: 'Familia',
        partySizeAllowed: 3,
        phoneLast4: '1234',
        tokenVersion: 1,
      },
    ],
  };

  return { keys, otherKeys, eventId, otherEventId, guest1Id, guest2Id, bundle };
}

describe('GateEngine offline scanning', () => {
  it('verifies signed QR offline, detects duplicates, and survives reload', async () => {
    const { keys, eventId, guest1Id, bundle } = makeFixture();
    const store = new MemoryGateStore();
    let seq = 0;
    let clock = new Date('2026-11-20T16:05:00.000Z').getTime();

    const engine = new GateEngine(store, {
      deviceId: 'dev-1',
      role: 'gate',
      now: () => new Date((clock += 1000)),
      uuid: () => `c-${++seq}`,
    });
    await engine.installBundle(bundle, 'etag-1');

    const token = signQrToken(
      { eventId, guestId: guest1Id, partySize: 2, version: 1 },
      keys.privateKey,
    );

    const first = await engine.scanQr(token);
    expect(first.kind).toBe('admit');
    if (first.kind === 'admit') {
      expect(first.guest.id).toBe(guest1Id);
      expect(first.partyAdmitted).toBe(2);
    }

    const dup = await engine.scanQr(token);
    expect(dup.kind).toBe('duplicate');

    // Simulate cold restart offline with a fresh GateEngine reading the same store
    const restarted = new GateEngine(store, {
      deviceId: 'dev-1',
      role: 'gate',
      now: () => new Date((clock += 1000)),
      uuid: () => `c-${++seq}`,
    });
    expect(await restarted.load()).toBe(true);
    const dupAfterRestart = await restarted.scanQr(token);
    expect(dupAfterRestart.kind).toBe('duplicate');

    const stats = await restarted.stats();
    expect(stats.admitted).toBe(1);
    expect(stats.pending).toBe(3);
  });

  it('rejects tampered, mock-signed, wrong-event, and revoked QR tokens', async () => {
    const { keys, otherKeys, eventId, otherEventId, guest1Id, guest2Id, bundle } = makeFixture();
    const store = new MemoryGateStore();
    const engine = new GateEngine(store, { deviceId: 'dev-1', role: 'gate' });
    await engine.installBundle(bundle, 'etag-1');

    const valid = signQrToken(
      { eventId, guestId: guest1Id, partySize: 2, version: 1 },
      keys.privateKey,
    );
    const parts = valid.split('.');
    parts[5] = (parts[5]![0] === 'A' ? 'B' : 'A') + parts[5]!.slice(1);
    const tampered = parts.join('.');

    expect(await engine.scanQr(tampered)).toEqual({ kind: 'deny', reason: 'tampered' });

    const mockPayload = `v1.${shortId(eventId)}.${shortId(guest1Id)}.2.1.MOCKSIG`;
    expect(await engine.scanQr(mockPayload)).toEqual({ kind: 'deny', reason: 'malformed' });

    const wrongEvent = signQrToken(
      { eventId: otherEventId, guestId: guest1Id, partySize: 2, version: 1 },
      otherKeys.privateKey,
    );
    expect(await engine.scanQr(wrongEvent)).toEqual({ kind: 'deny', reason: 'wrong_event' });

    // Reissue guest2 (tokenVersion: 2) -> old v1 QR must be denied as revoked
    const oldToken = signQrToken(
      { eventId, guestId: guest2Id, partySize: 3, version: 1 },
      keys.privateKey,
    );
    const updatedBundle: Bundle = {
      ...bundle,
      guests: bundle.guests.map((g) => (g.id === guest2Id ? { ...g, tokenVersion: 2 } : g)),
    };
    const api: GateApi = {
      async sync() {
        return { accepted: 0, replayed: 0, results: [], admitted: [] };
      },
      async bundle() {
        return { bundle: updatedBundle, etag: 'etag-2' };
      },
      async admitted() {
        return { admitted: [] };
      },
    };
    expect(await engine.refreshBundle(api)).toBe(true);
    expect(await engine.scanQr(oldToken)).toEqual({ kind: 'deny', reason: 'revoked' });
  });

  it('enforces gate role restriction on override and supports offline code/search', async () => {
    const { guest2Id, bundle } = makeFixture();
    const store = new MemoryGateStore();
    const gateEngine = new GateEngine(store, { deviceId: 'dev-1', role: 'gate' });
    await gateEngine.installBundle(bundle, 'etag-1');

    const codeRes = await gateEngine.scanCode('kh 4826');
    expect(codeRes.kind).toBe('admit');
    expect(await gateEngine.scanCode('KH-4826')).toMatchObject({ kind: 'duplicate' });
    expect(gateEngine.search('1234').map((g) => g.id)).toEqual([guest2Id]);

    await expect(gateEngine.override(guest2Id, 'VIP guest')).rejects.toThrow();

    const ownerEngine = new GateEngine(store, { deviceId: 'dev-1', role: 'owner' });
    await ownerEngine.load();
    const ov = await ownerEngine.override(guest2Id, 'VIP guest');
    expect(ov.kind).toBe('admit');
  });

  it('admits a guest from a partial SMS screen on a feature or disposable phone', async () => {
    const { guest1Id, guest2Id, bundle } = makeFixture();
    const store = new MemoryGateStore();
    const gateEngine = new GateEngine(store, { deviceId: 'dev-1', role: 'gate' });
    await gateEngine.installBundle(bundle, 'etag-1');

    // Only the opening greeting + name fits on the feature phone screen (code at the bottom is off-screen)
    const topOnly = await gateEngine.scanCode(
      'Habari Juma Bakari, unaalikwa kwenye harusi ya Asha & Juma tarehe 20 Nov...',
    );
    expect(topOnly).toMatchObject({ kind: 'admit', guest: { id: guest1Id } });

    // Only the bottom clipped digits fit on the screen after scrolling
    const bottomClipped = await gateEngine.scanCode('...k.sasa.tz/s/x mba: -4826');
    expect(bottomClipped).toMatchObject({ kind: 'admit', guest: { id: guest2Id } });
  });
});
