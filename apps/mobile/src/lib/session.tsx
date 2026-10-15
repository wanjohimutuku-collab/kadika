import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Session } from '@harusi/api-client';
import { getRepository, loadTokens } from './repo';

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
      setSession(await getRepository().getSession());
    } catch {
      // offline with a saved token: stay signed in and let queries show cached data
      setSession((s) => s);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await loadTokens();
      await refresh();
      setReady(true);
    })();
  }, [refresh]);

  const signOut = useCallback(async () => {
    await getRepository()
      .signOut()
      .catch(() => undefined);
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
