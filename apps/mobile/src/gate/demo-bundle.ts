import { createSeedState } from '@harusi/api-client/mock';
import { ed, generateEventKeyPair, shortId, signQrToken } from '@harusi/crypto';
import type { Bundle, BundleGuest } from '@harusi/gate';

export const DEMO_EVENT_ID = '0192f1a0-7c3e-7a11-9b2c-5e8d4a6f0001';
export const LEGACY_DEMO_PUBLIC_KEY = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

const HEX8 = /^[0-9a-f]{8}$/;

/** Derives a deterministic Ed25519 keypair from `eventId` so offline demo scans use real signatures. */
export function getDemoEventKeyPair(eventId: string) {
  const msg = new TextEncoder().encode(`harusi.demo.eventKey.v1:${eventId}`);
  const digest = ed.etc.sha512Sync!(msg);
  return generateEventKeyPair(() => digest.slice(0, 32));
}

/** Signs a valid offline QR token (`v1.<ev8>.<gu8>.<party>.<ver>.<sig>`) for a demo guest. */
export function signDemoGuestQr(
  eventId: string,
  guest: Pick<BundleGuest, 'id' | 'partySizeAllowed' | 'tokenVersion'>,
  privateKeyHex?: string,
): string {
  const key = privateKeyHex ?? getDemoEventKeyPair(eventId).privateKey;
  return signQrToken(
    {
      eventId,
      guestId: guest.id,
      partySize: Math.max(1, Math.min(99, Math.trunc(guest.partySizeAllowed) || 1)),
      version: Math.max(1, Math.trunc(guest.tokenVersion) || 1),
    },
    key,
  );
}

/** Returns true when both IDs have 8-char hex suffixes compatible with v1 QR tokens. */
export function canSignQrToken(eventId: string, guestId: string): boolean {
  return HEX8.test(shortId(eventId)) && HEX8.test(shortId(guestId));
}

/**
 * Deterministic fallback bundle matching the seeded web mock data (`Asha & Juma`), used when
 * the gate agent joins via a host link generated in web mock mode or while offline.
 */
export function buildDemoBundle(eventId: string = DEMO_EVENT_ID, eventName?: string): Bundle {
  const seed = createSeedState();
  const ev = seed.events.find((e) => e.id === eventId) ?? seed.events[0]!;
  const guests: BundleGuest[] = seed.guests
    .filter((g) => g.eventId === ev.id && !g.deletedAt && g.cardKind === 'invitation')
    .map((g) => ({
      id: g.id,
      guestShort: shortId(g.id),
      displayName: g.displayName,
      shortCode: g.shortCode,
      groupLabel: g.groupLabel || null,
      partySizeAllowed: g.partySizeAllowed,
      phoneLast4: g.phoneE164 ? g.phoneE164.slice(-4) : null,
      tokenVersion: g.tokenVersion,
    }));

  const ensureSample = (sample: BundleGuest) => {
    if (!guests.some((g) => g.shortCode === sample.shortCode)) {
      guests.unshift(sample);
    }
  };

  ensureSample({
    id: '0192f1a0-7c3e-7a11-9b2c-5e8d4a6f4821',
    guestShort: shortId('0192f1a0-7c3e-7a11-9b2c-5e8d4a6f4821'),
    displayName: 'Juma Bakari',
    shortCode: 'KH-4821',
    groupLabel: 'Marafiki',
    partySizeAllowed: 2,
    phoneLast4: '5678',
    tokenVersion: 1,
  });

  ensureSample({
    id: '0192f1a0-7c3e-7a11-9b2c-5e8d4a6f4826',
    guestShort: shortId('0192f1a0-7c3e-7a11-9b2c-5e8d4a6f4826'),
    displayName: 'Mwanaidi Salim',
    shortCode: 'KH-4826',
    groupLabel: 'Familia ya Bibi Harusi',
    partySizeAllowed: 2,
    phoneLast4: '1234',
    tokenVersion: 1,
  });

  const { publicKey } = getDemoEventKeyPair(eventId);

  return {
    event: {
      id: eventId,
      coupleNames: eventName ?? `${ev.partnerA} & ${ev.partnerB}`,
      dateStart: ev.dateStart,
      venueName: ev.venueName,
    },
    publicKey,
    guests,
  };
}
