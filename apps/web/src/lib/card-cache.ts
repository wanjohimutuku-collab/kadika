import type { CardView } from '@harusi/api-client';

const key = (token: string) => `harusi.card.${token}`;

/** Last successful card view, so the QR and code render offline (§7.3). */
export function readCachedCard(token: string): { view: CardView; savedAt: string } | null {
  try {
    const raw = localStorage.getItem(key(token));
    return raw ? (JSON.parse(raw) as { view: CardView; savedAt: string }) : null;
  } catch {
    return null;
  }
}

export function writeCachedCard(view: CardView): void {
  try {
    localStorage.setItem(
      key(view.token),
      JSON.stringify({ view, savedAt: new Date().toISOString() }),
    );
  } catch {
    // storage blocked or full — offline copy is best effort
  }
}

export interface PendingRsvp {
  attending: boolean;
  partySize: number;
  idempotencyKey: string;
  at: string;
}

const outboxKey = (token: string) => `harusi.card.outbox.${token}`;

/**
 * Durable RSVP outbox: the answer is stored before the request goes out and replayed on the next
 * load if the request never completed (tab closed, reload, offline). Replays are idempotent.
 */
export function readPendingRsvp(token: string): PendingRsvp | null {
  try {
    const raw = localStorage.getItem(outboxKey(token));
    return raw ? (JSON.parse(raw) as PendingRsvp) : null;
  } catch {
    return null;
  }
}

export function writePendingRsvp(token: string, p: PendingRsvp): void {
  try {
    localStorage.setItem(outboxKey(token), JSON.stringify(p));
  } catch {
    // best effort
  }
}

export function clearPendingRsvp(token: string): void {
  try {
    localStorage.removeItem(outboxKey(token));
  } catch {
    // ignore
  }
}
