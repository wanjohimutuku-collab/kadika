'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useLocale } from 'next-intl';
import { createSeedState } from '@harusi/api-client/mock';
import { KeyRound, QrCode, ShieldCheck } from 'lucide-react';
import type { ScannerGuest } from '@/lib/web-gate-scanner';
import { MobileGateScanner } from './mobile-scanner';

export interface GateJoinScannerProps {
  code: string;
  brandName: string;
}

/**
 * Mobile-browser gate launch card for `/gate-join/<code>`. Lets an agent sign in with the host PIN
 * and scan QR passes or enter short codes right from their phone's browser with local encrypted vault storage.
 */
export function GateJoinScanner({ code, brandName }: GateJoinScannerProps) {
  const locale = useLocale();
  const sw = locale.startsWith('sw');

  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  const seedSession = useMemo(() => {
    const seed = createSeedState();
    const ev = seed.events[0]!;
    const guests: ScannerGuest[] = seed.guests
      .filter((g) => g.eventId === ev.id)
      .map((g) => ({
        id: g.id,
        eventId: g.eventId,
        cardKind: g.cardKind,
        displayName: g.displayName,
        phoneE164: g.phoneE164,
        groupLabel: g.groupLabel,
        partySizeAllowed: g.partySizeAllowed,
        shortCode: g.shortCode,
        status: g.status,
        rsvpPartySize: g.rsvpPartySize,
        checkedInAt: g.checkedInAt,
        partyAdmitted: g.partyAdmitted,
        token: g.token,
      }));
    return {
      eventId: `${ev.id}-${code || 'DEMO'}`,
      eventTitle: ev.title,
      guests,
    };
  }, [code]);

  const handleLaunch = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = pin.replace(/\D/g, '');
    if (cleaned.length < 4) {
      setPinError(
        sw
          ? 'Weka PIN yenye tarakimu 4 hadi 6 kutoka kwa mwenye hafla (au tumia PIN ya mfano 123456).'
          : 'Enter the 4–6 digit host PIN (or tap Use Demo PIN: 123456).',
      );
      return;
    }
    setPinError(null);
    setScannerOpen(true);
  };

  return (
    <>
      <section
        aria-label={sw ? 'Skani moja kwa moja kwenye kivinjari cha simu' : 'Mobile browser scanner'}
        className="flex flex-col gap-3 rounded-card border border-[#1FE086]/35 bg-[#0B0E11] p-5 text-[#F3F5F7] shadow-lg"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#1FE086] uppercase">
              <QrCode className="size-3.5" aria-hidden="true" />
              {sw ? 'Skani Hapa Kwenye Simu' : 'Scan in Mobile Browser'}
            </p>
            <h2 className="mt-1 text-lg font-bold text-white">
              {sw ? 'Anza kukagua wageni bila kupakua' : 'Start scanning immediately'}
            </h2>
            <p className="mt-0.5 text-xs text-[#9AA4B2]">
              {sw
                ? 'Weka PIN uliyopewa na mwenye harusi; kisha skani QR au weka namba ya kadi. Rekodi zinahifadhiwa kwa usimbaji.'
                : 'Enter the gate PIN from the hosts, then scan guest QR passes or enter short codes with offline encrypted verification.'}
            </p>
          </div>
          <ShieldCheck className="size-6 shrink-0 text-[#1FE086]" aria-hidden="true" />
        </div>

        <form onSubmit={handleLaunch} className="flex flex-col gap-2.5">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-[#C2CBD6]">
            <span className="inline-flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5">
                <KeyRound className="size-3.5 text-[#1FE086]" aria-hidden="true" />
                {sw ? 'PIN ya Lango (tarakimu 4–6)' : 'Gate PIN (4–6 digits)'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setPin('123456');
                  setPinError(null);
                }}
                className="font-mono text-[11px] font-semibold text-[#1FE086] underline-offset-2 hover:underline"
              >
                {sw ? 'Tumia mfano: 123456' : 'Use demo: 123456'}
              </button>
            </span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                if (pinError) setPinError(null);
              }}
              placeholder="••••••"
              data-testid="gate-join-pin-input"
              className="h-12 w-full rounded-input border border-white/15 bg-[#171C22] px-4 text-center font-mono text-xl font-bold tracking-[0.35em] text-white outline-none focus:border-[#1FE086]"
            />
          </label>

          {pinError ? (
            <p className="text-xs font-medium text-amber-300" role="alert">
              {pinError}
            </p>
          ) : null}

          <button
            type="submit"
            data-testid="gate-join-web-scan"
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-input bg-[#1FE086] px-5 text-sm font-bold text-[#05140C] transition hover:brightness-105 active:scale-[0.99]"
          >
            <QrCode className="size-4" aria-hidden="true" />
            <span>{sw ? 'Skani hapa kwenye Simu' : 'Scan in Mobile Browser'}</span>
          </button>
        </form>
      </section>

      <MobileGateScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        eventId={seedSession.eventId}
        eventTitle={seedSession.eventTitle}
        brandName={brandName}
        linkCode={code}
        guests={seedSession.guests}
        vaultPassphrase={pin.trim() ? `${code}:${pin.trim()}` : undefined}
        locale={locale}
      />
    </>
  );
}
