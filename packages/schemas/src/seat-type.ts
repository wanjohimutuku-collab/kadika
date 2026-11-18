/**
 * Card type by seats: a Single (S) card admits 1 guest, a Double (D) card admits 2. It is not stored
 * apart: it is the guest's `partySizeAllowed`, so the gate's admit limit and RSVP party size follow it.
 * Cards for more than 2 people (families) keep their number and have no letter.
 */
export type SeatType = 'S' | 'D';

export const MAX_SEATS = 10;

export function seatType(partySizeAllowed: number): SeatType | null {
  if (partySizeAllowed <= 1) return 'S';
  if (partySizeAllowed === 2) return 'D';
  return null;
}

export function seatsFor(type: SeatType): number {
  return type === 'D' ? 2 : 1;
}

const SINGLE = /^(s|single|mmoja|moja)$/i;
const DOUBLE = /^(d|double|wawili|mbili|couple)$/i;

/** Seats from an import cell: "S"/"D", the words in English or Swahili, or a number (capped). */
export function parseSeatType(raw: string): number | null {
  const v = raw.trim();
  if (!v) return null;
  if (SINGLE.test(v)) return 1;
  if (DOUBLE.test(v)) return 2;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, MAX_SEATS) : null;
}
