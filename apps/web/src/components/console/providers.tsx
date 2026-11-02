'use client';

import { useState, type ReactNode } from 'react';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { isRepositoryError } from '@harusi/api-client';
import { ToastProvider } from '@/components/ui/toast';
import { qk } from '@/lib/queries';

export function ConsoleProviders({ children }: { children: ReactNode }) {
  const t = useTranslations('common');
  const [client] = useState(() => {
    const qc: QueryClient = new QueryClient({
      // A refused token means the session ended (expired, signed out elsewhere). The session query is
      // cached forever, so ask again: the shells send the user to /login instead of showing 401s.
      queryCache: new QueryCache({
        onError: (err, query) => {
          if (
            isRepositoryError(err) &&
            err.code === 'unauthorized' &&
            query.queryKey[0] !== qk.session[0]
          )
            void qc.invalidateQueries({ queryKey: qk.session });
        },
      }),
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          refetchOnWindowFocus: false,
          retry: (count, err) =>
            count < 1 &&
            !(
              isRepositoryError(err) &&
              ['unauthorized', 'forbidden', 'not_found'].includes(err.code)
            ),
        },
        mutations: { retry: false },
      },
    });
    return qc;
  });
  return (
    <QueryClientProvider client={client}>
      <ToastProvider closeLabel={t('close')}>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
