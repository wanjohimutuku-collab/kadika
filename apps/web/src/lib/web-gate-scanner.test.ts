import { describe, expect, it } from 'vitest';
import { createSeedState } from '@harusi/api-client/mock';
import {
  appendWebAdmission,
  buildWebAttendanceSnapshot,
  derivePinVaultKey,
  exportWebVaultEnvelope,
  getOrCreateWebVaultKey,
  loadWebAdmissions,
  matchScannedGuest,
  openWebJson,
  parseScannedGatePayload,
  saveAndVerifyWebVault,
  sealWebJson,
  vaultStorageKey,
  verifyStoredWebVault,
  verifyWebAttendanceSnapshot,
  type ScannerGuest,
  type StorageLike,
  type WebAdmissionRecord,
} from './web-gate-scanner';

function createMemoryStorage(): StorageLike & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    getItem(key) {
      return store.get(key) ?? null;
    },
    setItem(key, value) {
      store.set(key, value);
    },
    removeItem(key) {
      store.delete(key);
    },
  };
}

function toBase64Url(obj: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');
}

function seedGuests(): { eventId: string; eventTitle: string; guests: ScannerGuest[] } {
  const state = createSeedState();
  const ev = state.events[0]!;
  return {
    eventId: ev.id,
    eventTitle: ev.title,
    guests: state.guests
      .filter((g) => g.eventId === ev.id)
      .map((g) => ({
        id: g.id,
        eventId: g.eventId,
        cardKind: g.cardKind,
        displayName: g.displayName,
        phoneE164: g.phoneE164,
        groupLabel: g.groupLabel,
        partySizeAllowed: g.partySizeAllowed,
        shortCode: g.shortCode,
        status: g.status,
        rsvpPartySize: g.rsvpPartySize,
        checkedInAt: g.checkedInAt,
        partyAdmitted: g.partyAdmitted,
        token: g.token,
      })),
  };
}

describe('web-gate-scanner payload parsing & guest matching', () => {
  it('normalizes lowercase and unhyphenated short codes', () => {
    const parsed = parseScannedGatePayload('kh 4823');
    expect(parsed.shortCode).toBe('KH-4823');
  });

  it('extracts card token from full URL and k1 claims', () => {
    const fromUrl = parseScannedGatePayload('https://harusipass.co.tz/c/tok_demo_99?code=KH-4823');
    expect(fromUrl.token).toBe('tok_demo_99');
    expect(fromUrl.shortCode).toBe('KH-4823');

    const k1 = `k1.${toBase64Url({ sub: 'g-42', c: 'UR-8766' })}.sig123`;
    const fromK1 = parseScannedGatePayload(k1);
    expect(fromK1.guestId).toBe('g-42');
    expect(fromK1.shortCode).toBe('UR-8766');
    expect(fromK1.token).toBe(k1);
  });

  it('matches invitees, detects duplicates, and blocks contribution-only cards', () => {
    const { guests } = seedGuests();
    const pending = guests.find(
      (g) => g.cardKind === 'invitation' && g.status !== 'checked_in' && !g.checkedInAt,
    );
    expect(pending).toBeDefined();

    const byToken = matchScannedGuest(guests, pending!.token!);
    expect(byToken.kind).toBe('ok');
    if (byToken.kind === 'ok') {
      expect(byToken.guest.id).toBe(pending!.id);
    }

    const byCode = matchScannedGuest(guests, pending!.shortCode.toLowerCase());
    expect(byCode.kind).toBe('ok');

    const withCheckedIn = guests.map((g) =>
      g.id === pending!.id ? { ...g, status: 'checked_in' as const } : g,
    );
    expect(matchScannedGuest(withCheckedIn, pending!.shortCode).kind).toBe('duplicate');

    const contrib = guests.find((g) => g.cardKind === 'contribution');
    if (contrib) {
      expect(matchScannedGuest(guests, contrib.shortCode).kind).toBe('contribution_only');
    }

    expect(matchScannedGuest(guests, 'ZZ-9999').kind).toBe('not_found');
  });
});

describe('web-gate-scanner encrypted vault & offline verification', () => {
  it('seals and opens JSON via CTR-SHA256 + HMAC-SHA256 and rejects tampered ciphertext or keys', () => {
    const storage = createMemoryStorage();
    const key = getOrCreateWebVaultKey(storage);
    expect(key).toHaveLength(32);

    const sealed = sealWebJson({ ok: true, count: 4 }, key);
    expect(sealed.startsWith('ksweb:v1:')).toBe(true);
    expect(openWebJson<{ ok: boolean; count: number }>(sealed, key)).toEqual({
      ok: true,
      count: 4,
    });

    const wrongKey = new Uint8Array(32).fill(9);
    expect(openWebJson(sealed, wrongKey)).toBeNull();

    const altered = sealed.slice(0, -4) + 'ffff';
    expect(openWebJson(altered, key)).toBeNull();
  });

  it('builds, persists, and locally verifies an encrypted hash-chain attendance vault', () => {
    const storage = createMemoryStorage();
    const key = getOrCreateWebVaultKey(storage);
    const { eventId, eventTitle, guests } = seedGuests();
    const sample = guests.filter((g) => g.cardKind === 'invitation').slice(0, 2);

    let records: WebAdmissionRecord[] = [];
    records = appendWebAdmission(records, {
      id: 'scan-1',
      eventId,
      guestId: sample[0]!.id,
      displayName: sample[0]!.displayName,
      shortCode: sample[0]!.shortCode,
      partyAdmitted: 2,
      scannedAt: '2026-11-14T15:00:00.000Z',
      gateName: 'Main Gate',
      method: 'qr',
      rawCredential: sample[0]!.token ?? sample[0]!.shortCode,
    });
    records = appendWebAdmission(records, {
      id: 'scan-2',
      eventId,
      guestId: sample[1]!.id,
      displayName: sample[1]!.displayName,
      shortCode: sample[1]!.shortCode,
      partyAdmitted: 1,
      scannedAt: '2026-11-14T15:02:00.000Z',
      gateName: 'Main Gate',
      method: 'code',
      rawCredential: sample[1]!.shortCode,
    });

    const snapshot = buildWebAttendanceSnapshot(eventId, eventTitle, 'LANGO8', records);
    const verification = saveAndVerifyWebVault(storage, key, snapshot);

    expect(verification.valid).toBe(true);
    expect(verification.reason).toBeNull();
    expect(verification.recordCount).toBe(2);
    expect(verification.totalPeople).toBe(3);
    expect(verification.chainDigest).toBe(records[1]!.entryHash);

    const hydrated = loadWebAdmissions(storage, key, eventId);
    expect(hydrated).toHaveLength(2);
    expect(hydrated[1]!.shortCode).toBe(sample[1]!.shortCode);

    // Tamper stored sealed vault directly in localStorage -> offline verification fails.
    const rawKey = vaultStorageKey(eventId);
    const rawSealed = storage.getItem(rawKey)!;
    storage.setItem(rawKey, rawSealed.replace('"alg":"CTR-SHA256-HMAC-SHA256"', '"alg":"NONE"'));
    const tampered = verifyStoredWebVault(storage, key, eventId);
    expect(tampered.valid).toBe(false);
    expect(tampered.reason).toBeTruthy();

    // Tamper snapshot partyAdmitted -> hash-chain verification catches modification.
    const alteredSnapshot = {
      ...snapshot,
      records: [{ ...snapshot.records[0]!, partyAdmitted: 9 }, snapshot.records[1]!],
    };
    const chainCheck = verifyWebAttendanceSnapshot(alteredSnapshot);
    expect(chainCheck.valid).toBe(false);
    expect(chainCheck.reason).toContain('Modified record signature');
  });

  it('derives deterministic PIN vault keys without storing raw keys in storage and exports .ksenc', () => {
    const storage = createMemoryStorage();
    const pinKey1 = derivePinVaultKey('UR8766:123456', storage);
    const pinKey2 = derivePinVaultKey('UR8766:123456', storage);
    const wrongPinKey = derivePinVaultKey('UR8766:999999', storage);

    expect(pinKey1).toHaveLength(32);
    expect(Buffer.from(pinKey1).equals(Buffer.from(pinKey2))).toBe(true);
    expect(Buffer.from(pinKey1).equals(Buffer.from(wrongPinKey))).toBe(false);
    expect(storage.getItem('harusi.web.gate.vault-key.v1')).toBeNull();
    expect(storage.getItem('harusi.web.gate.vault-salt.v1')).toMatch(/^[0-9a-f]{32}$/);

    const snapshot = buildWebAttendanceSnapshot('evt-pin', 'Pin Event', 'UR8766', []);
    saveAndVerifyWebVault(storage, pinKey1, snapshot);
    expect(exportWebVaultEnvelope(storage, 'evt-pin')?.startsWith('ksweb:v1:')).toBe(true);
    expect(verifyStoredWebVault(storage, pinKey2, 'evt-pin').valid).toBe(true);
    expect(verifyStoredWebVault(storage, wrongPinKey, 'evt-pin').valid).toBe(false);
  });
});
