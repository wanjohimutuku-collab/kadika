'use client';

import { use, type ReactNode } from 'react';
import { ConsoleShell } from '@/components/console/shell';
import { ErrorState } from '@/components/console/query-state';
import { CountryMessages } from '@/components/console/country-messages';
import { EventLocaleProvider } from '@/lib/country';
import { useEvent } from '@/lib/queries';

export default function EventLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const event = useEvent(id);
  const country = event.data?.country ?? 'TZ';
  return (
    // The country's wording covers the shell too (the nav says "Contributions" for Kenya, ADR 028).
    <CountryMessages country={country}>
      <ConsoleShell eventId={id} event={event.data}>
        {event.isError ? (
          <ErrorState error={event.error} onRetry={() => void event.refetch()} />
        ) : (
          <EventLocaleProvider country={country} currency={event.data?.currency ?? 'TZS'}>
            {children}
          </EventLocaleProvider>
        )}
      </ConsoleShell>
    </CountryMessages>
  );
}
