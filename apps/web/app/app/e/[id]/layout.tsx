'use client';

import { use, type ReactNode } from 'react';
import { ConsoleShell } from '@/components/console/shell';
import { ErrorState } from '@/components/console/query-state';
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
  return (
    <ConsoleShell eventId={id} event={event.data}>
      {event.isError ? (
        <ErrorState error={event.error} onRetry={() => void event.refetch()} />
      ) : (
        children
      )}
    </ConsoleShell>
  );
}
