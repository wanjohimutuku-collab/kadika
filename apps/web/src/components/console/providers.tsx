'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { isRepositoryError } from '@harusi/api-client';
import { ToastProvider } from '@/components/ui/toast';

export function ConsoleProviders({ children }: { children: ReactNode }) {
  const t = useTranslations('common');
  const [client] = useState(
    () =>
      new QueryClient({
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
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <ToastProvider closeLabel={t('close')}>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
