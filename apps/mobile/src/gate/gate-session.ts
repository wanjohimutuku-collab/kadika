import { secureGet, secureSet } from '../lib/storage';

const KEY = 'harusi.gate.session.v1';
export interface GateSession {
  token: string;
  expiresAt: string;
  eventId: string;
  eventName: string;
}

export async function loadGateSession(): Promise<GateSession | null> {
  const raw = await secureGet(KEY);
  try {
    const s = raw ? (JSON.parse(raw) as GateSession) : null;
    return s && new Date(s.expiresAt).getTime() > Date.now() ? s : null;
  } catch {
    return null;
  }
}
export const saveGateSession = (s: GateSession) => secureSet(KEY, JSON.stringify(s));
export const clearGateSession = () => secureSet(KEY, null);
