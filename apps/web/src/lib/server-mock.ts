import 'server-only';
import { createSeedState, MockRepository } from '@harusi/api-client/mock';
import type { CardView } from '@harusi/api-client';

let cached: { day: string; repo: MockRepository } | null = null;

/**
 * Mock mode only: the server renders the guest card from the deterministic seed so the first paint
 * (names, date, venue) needs no client JS; the browser then reconciles with its local mock state.
 */
function serverRepo(): MockRepository {
  const state = createSeedState();
  if (!cached || cached.day !== state.seedDay)
    cached = { day: state.seedDay, repo: new MockRepository({ initialState: state }) };
  return cached.repo;
}

export function peekCardOnServer(token: string): CardView {
  return serverRepo().peekCard(token);
}

export function peekShortCodeOnServer(code: string): string | null {
  return serverRepo().peekShortCode(code);
}
