'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ScanLine } from 'lucide-react';
import { eventScopedKeys, qk } from '@/lib/queries';
import { getRepository } from '@/lib/repo';
import { MobileGateScanner } from './mobile-scanner';

/**
 * Organizer / committee trigger button rendered inside `/app/e/[id]/gate` that launches the
 * mobile-optimized fullscreen QR gate scanner synced with the event repository and local encrypted vault.
 */
export function ConsoleMobileScannerButton() {
  const params = useParams<{ id: string }>();
  const eventId = params?.id ?? '';
  const locale = useLocale();
  const sw = locale.startsWith('sw');
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);

  const eventQuery = useQuery({
    queryKey: qk.event(eventId),
    queryFn: () => getRepository().getEvent(eventId),
    enabled: Boolean(eventId),
  });

  const guestsQuery = useQuery({
    queryKey: qk.guests(eventId),
    queryFn: () => getRepository().listGuests(eventId),
    enabled: Boolean(eventId) && open,
  });

  if (!eventId) return null;

  return (
    <>
      <button
        type="button"
        data-testid="gate-open-mobile-scanner"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-input bg-[#0B0E11] px-4 text-sm font-bold text-[#1FE086] ring-1 ring-[#1FE086]/45 transition hover:bg-[#141A21] sm:w-auto"
      >
        <ScanLine className="size-4" aria-hidden="true" />
        <span>{sw ? 'Fungua Skana ya Simu' : 'Open Mobile Camera Scanner'}</span>
      </button>

      <MobileGateScanner
        open={open}
        onClose={() => setOpen(false)}
        eventId={eventId}
        eventTitle={eventQuery.data?.title ?? (sw ? 'Ukaguzi wa Lango' : 'Gate Check-in')}
        guests={guestsQuery.data ?? []}
        locale={locale}
        onCommitAdmission={async ({ guest, partySize, method }) => {
          const reasonByMethod = {
            qr: 'Mobile web QR scan',
            code: 'Mobile web short code',
            manual: 'Mobile web guest search',
            demo: 'Mobile web demo scan',
          } as const;
          await getRepository().manualCheckIn(eventId, guest.id, {
            partySize,
            reason: reasonByMethod[method],
          });
          await Promise.all(
            eventScopedKeys(eventId).map((queryKey) => qc.invalidateQueries({ queryKey })),
          );
        }}
      />
    </>
  );
}
