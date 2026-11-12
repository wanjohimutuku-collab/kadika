import {
  cookieSessionTokenStore,
  createHttpRepository,
  memoryTokenStore,
  webRefreshLock,
  webStorageTokenStore,
  type Repository,
} from '@harusi/api-client';
import { MockControls, MockRepository } from '@harusi/api-client/mock';
import { USE_MOCKS } from './env';

declare global {
  interface Window {
    __harusiMock?: MockRepository;
  }
}

/**
 * Cookie sessions (security review M-05): the refresh token stays in an HttpOnly cookie on the API and
 * nothing a script could steal is kept in localStorage. Off unless the build sets it, because the API
 * must be on the same site as this app (`api.` and `app.` of one domain) for the cookie to be sent.
 */
const COOKIE_SESSION = process.env.NEXT_PUBLIC_COOKIE_SESSION === '1';

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
  // Real API (Phase 1: auth, events, members, guests). Tokens live in localStorage, or with
  // NEXT_PUBLIC_COOKIE_SESSION=1 in memory plus an HttpOnly cookie; unimplemented
  // methods reject with `not_implemented` until their phases land (docs/ui/HANDOFF.md).
  const store = storage();
  return (http ??= createHttpRepository(
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
    {
      tokens: COOKIE_SESSION
        ? cookieSessionTokenStore(store)
        : store
          ? webStorageTokenStore(store)
          : memoryTokenStore(),
      cookieSession: COOKIE_SESSION,
      // Tabs share the tokens in localStorage; only one may refresh them at a time.
      refreshLock: webRefreshLock(),
    },
  ));
}

export function newIdempotencyKey(): string {
  const c = typeof crypto !== 'undefined' ? crypto : null;
  return c?.randomUUID ? c.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
