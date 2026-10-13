/**
 * Mock QR payload in the §6.1 format with a clearly fake signature. Real signing arrives with
 * `packages/crypto` (Phase 1); `QrBlock` renders any payload string unchanged.
 */
export const MOCK_SIGNATURE = 'MOCKSIG';

export function mockQrPayload(
  eventId: string,
  guestId: string,
  partySize: number,
  version: number,
): string {
  const short = (id: string) => id.replace(/-/g, '').slice(0, 8);
  return `v1.${short(eventId)}.${short(guestId)}.${partySize}.${version}.${MOCK_SIGNATURE}`;
}

export function isMockPayload(payload: string): boolean {
  return payload.endsWith(`.${MOCK_SIGNATURE}`);
}
