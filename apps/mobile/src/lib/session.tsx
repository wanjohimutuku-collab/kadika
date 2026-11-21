import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Session } from '@harusi/api-client';
import { getAccessToken, getRepository, loadTokens, onTokensCleared } from './repo';
import { store } from './storage';

const SESSION_CACHE_KEY = 'harusi.session.cache.v1';

async function readCachedSession(): Promise<Session | null> {
  const raw = await store.get(SESSION_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

interface Ctx {
  ready: boolean;
  session: Session | null;
  /** Re-reads the session after login. */
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}
const SessionContext = createContext<Ctx>({
  ready: false,
  session: null,
  refresh: async () => undefined,
  signOut: async () => undefined,
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const qc = useQueryClient();

  const refresh = useCallback(async () => {
    try {
      const next = await getRepository().getSession();
      setSession(next);
      if (next) await store.set(SESSION_CACHE_KEY, JSON.stringify(next));
      else await store.remove(SESSION_CACHE_KEY);
    } catch {
      // offline with a saved token: stay signed in and let queries show cached data
      if (!getAccessToken()) {
        setSession(null);
        return;
      }
      const cached = await readCachedSession();
      setSession((s) => s ?? cached);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onTokensCleared(() => {
      void store.remove(SESSION_CACHE_KEY);
      qc.clear();
      setSession(null);
    });
    void (async () => {
      await loadTokens();
      await refresh();
      setReady(true);
    })();
    return unsubscribe;
  }, [qc, refresh]);

  const signOut = useCallback(async () => {
    await getRepository()
      .signOut()
      .catch(() => undefined);
    await store.remove(SESSION_CACHE_KEY);
    qc.clear();
    setSession(null);
  }, [qc]);

  return (
    <SessionContext.Provider value={{ ready, session, refresh, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);
