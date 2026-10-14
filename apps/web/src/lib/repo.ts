import { createHttpRepository, type Repository } from '@harusi/api-client';
import { MockControls, MockRepository } from '@harusi/api-client/mock';
import { USE_MOCKS } from './env';

declare global {
  interface Window {
    __harusiMock?: MockRepository;
  }
}

let mock: MockRepository | null = null;
let http: Repository | null = null;

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Browser-side mock singleton (state persisted in localStorage). */
export function getMock(): MockRepository | null {
  if (!USE_MOCKS || typeof window === 'undefined') return null;
  if (!mock) {
    const s = storage();
    mock = new MockRepository({
      storage: s,
      controls: new MockControls(s),
      latency: true,
      baseUrl: window.location.origin,
    });
    // Test hook: e2e flips dev-panel controls (failure rate, network) at runtime without reloading.
    window.__harusiMock = mock;
  }
  return mock;
}

/** The single entry point for data. Swapping to the real API is this function only (docs/ui/HANDOFF.md). */
export function getRepository(): Repository {
  const m = getMock();
  if (m) return m;
  return (http ??= createHttpRepository(process.env.NEXT_PUBLIC_API_URL ?? '/api'));
}

export function newIdempotencyKey(): string {
  const c = typeof crypto !== 'undefined' ? crypto : null;
  return c?.randomUUID ? c.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
