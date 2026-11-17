import { describe, expect, it } from 'vitest';
import { verifyQrToken } from '@harusi/crypto';
import type { Admission, Bundle, LocalScan } from '@harusi/gate';
import {
  buildDemoBundle,
  DEMO_EVENT_ID,
  getDemoEventKeyPair,
  signDemoGuestQr,
} from '../demo-bundle';
import {
  buildAttendanceSnapshot,
  openJson,
  sealJson,
  verifyEncryptedAttendance,
} from '../encrypted-vault';

const TEST_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const TEST_NONCE = new Uint8Array(16).fill(7);

describe('encrypted attending vault', () => {
  it('seals and opens encrypted JSON and rejects tampered ciphertext or MAC', () => {
    const payload = { hello: 'karibu', count: 42, guests: ['Asha', 'Juma'] };
    const envelope = sealJson(payload, TEST_KEY, TEST_NONCE);

    expect(envelope.startsWith('ksenc:v1:')).toBe(true);
    expect(envelope).not.toContain('karibu');
    expect(openJson<typeof payload>(envelope, TEST_KEY)).toEqual(payload);

    // Flip one hex character at the end of the MAC tag
    const lastChar = envelope.slice(-1);
    const flippedMac = `${envelope.slice(0, -1)}${lastChar === 'a' ? 'b' : 'a'}`;
    expect(() => openJson(flippedMac, TEST_KEY)).toThrow('tampered_mac');

    // Corrupt a character in the ciphertext body (between first and second dot)
    const firstDot = envelope.indexOf('.');
    const secondDot = envelope.indexOf('.', firstDot + 1);
    const cipherMid = firstDot + 2;
    const orig = envelope[cipherMid]!;
    const tamperedCipher =
      envelope.slice(0, cipherMid) + (orig === 'A' ? 'B' : 'A') + envelope.slice(cipherMid + 1);
    expect(secondDot).toBeGreaterThan(firstDot);
    expect(() => openJson(tamperedCipher, TEST_KEY)).toThrow('tampered_mac');
  });

  it('builds a demo bundle with a real deterministic Ed25519 keypair and verifiable guest tokens', () => {
    const bundle = buildDemoBundle(DEMO_EVENT_ID);
    expect(bundle.publicKey).toMatch(/^[0-9a-f]{64}$/);
    expect(bundle.publicKey).toBe(getDemoEventKeyPair(DEMO_EVENT_ID).publicKey);

    const guest = bundle.guests[0]!;
    const qrToken = signDemoGuestQr(bundle.event.id, guest);
    const verified = verifyQrToken(qrToken, {
      eventId: bundle.event.id,
      publicKey: bundle.publicKey,
      lookupGuest: (short) =>
        short === guest.guestShort
          ? { guestId: guest.id, currentVersion: guest.tokenVersion }
          : null,
    });
    expect(verified.ok).toBe(true);
    if (verified.ok) {
      expect(verified.claims.guestId).toBe(guest.id);
    }
  });

  it('saves encrypted attending snapshot and verifies hashes + Ed25519 signatures locally offline', () => {
    const bundle: Bundle = buildDemoBundle(DEMO_EVENT_ID);
    const g1 = bundle.guests[0]!;
    const g2 = bundle.guests[1]!;

    const admissions: Admission[] = [
      {
        guestId: g1.id,
        scannedAt: '2026-11-14T08:00:00.000Z',
        deviceId: 'device-a',
        partyAdmitted: g1.partySizeAllowed,
      },
    ];
    const scans: LocalScan[] = [
      {
        clientId: 'scan-2',
        guestId: g2.id,
        result: 'ok',
        partyAdmitted: g2.partySizeAllowed,
        scannedAt: '2026-11-14T08:05:00.000Z',
        offline: true,
        synced: false,
      },
    ];

    const snapshot = buildAttendanceSnapshot({
      bundle,
      admissions,
      scans,
      deviceId: 'device-a',
      savedAt: '2026-11-14T08:06:00.000Z',
    });

    expect(snapshot.admittedCount).toBe(2);
    expect(snapshot.admittedPeople).toBe(g1.partySizeAllowed + g2.partySizeAllowed);
    expect(snapshot.chainDigest).toMatch(/^[0-9a-f]{64}$/);

    const envelope = sealJson(snapshot, TEST_KEY, TEST_NONCE);
    const report = verifyEncryptedAttendance(
      envelope,
      TEST_KEY,
      bundle,
      'file:///docs/kadi-attending-test.ksenc',
    );

    expect(report.ok).toBe(true);
    expect(report.recordCount).toBe(2);
    expect(report.peopleCount).toBe(g1.partySizeAllowed + g2.partySizeAllowed);
    expect(report.signaturesVerified).toBe(2);
    expect(report.chainDigest).toBe(snapshot.chainDigest);
    expect(report.fileUri).toBe('file:///docs/kadi-attending-test.ksenc');

    // Modifying a guest's partyAdmitted inside the snapshot before sealing must fail hash-chain verification
    const mutated = {
      ...snapshot,
      records: snapshot.records.map((r, i) => (i === 0 ? { ...r, partyAdmitted: 9 } : r)),
    };
    const mutatedEnvelope = sealJson(mutated, TEST_KEY, TEST_NONCE);
    const badReport = verifyEncryptedAttendance(mutatedEnvelope, TEST_KEY, bundle);
    expect(badReport.ok).toBe(false);
    expect(badReport.error).toBe('hash_chain_mismatch');
  });
});
