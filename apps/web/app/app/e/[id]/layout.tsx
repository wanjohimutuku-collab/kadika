'use client';

import { use, useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ConsoleShell, smsRouteAllowed } from '@/components/console/shell';
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
  const pathname = usePathname();
  const router = useRouter();
  const country = event.data?.country ?? 'TZ';
  const product = event.data?.product ?? 'cards';
  // ADR 055: an SMS-reminders-only account has no cards, gate or guests screens, and a card event has
  // no SMS-only screens. A link or bookmark to the other kind lands on the overview instead.
  const wrongProduct = event.data
    ? product === 'sms'
      ? !smsRouteAllowed(id, pathname)
      : pathname.startsWith(`/app/e/${id}/sms/`)
    : false;
  useEffect(() => {
    if (wrongProduct) router.replace(`/app/e/${id}`);
  }, [wrongProduct, router, id]);
  return (
    // The country's wording covers the shell too (the nav says "Contributions" for Kenya, ADR 028).
    <CountryMessages country={country}>
      <ConsoleShell eventId={id} event={event.data}>
        {event.isError ? (
          <ErrorState error={event.error} onRetry={() => void event.refetch()} />
        ) : wrongProduct ? null : (
          <EventLocaleProvider country={country} currency={event.data?.currency ?? 'TZS'}>
            {children}
          </EventLocaleProvider>
        )}
      </ConsoleShell>
    </CountryMessages>
  );
}
