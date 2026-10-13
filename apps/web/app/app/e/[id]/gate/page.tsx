'use client';

import { use, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  DoorOpen,
  Info,
  Search,
  ShieldOff,
  XCircle,
} from 'lucide-react';
import { matchesSearch, type Guest, type ScanEntry } from '@harusi/api-client';
import type { Locale } from '@harusi/i18n';
import { PageHeader } from '@/components/console/page-header';
import { QueryState } from '@/components/console/query-state';
import { GuestStatusPill } from '@/components/console/status';
import { Button } from '@/components/ui/button';
import {
  Avatar,
  Banner,
  Card,
  EmptyState,
  KpiTile,
  Skeleton,
  StatusPill,
  type Tone,
} from '@/components/ui/display';
import { BarChart } from '@/components/ui/data';
import { BottomSheet } from '@/components/ui/overlay';
import { TextField } from '@/components/ui/form';
import { Stepper } from '@/components/ui/stepper';
import { useToast } from '@/components/ui/toast';
import { getRepository } from '@/lib/repo';
import { eventScopedKeys, qk } from '@/lib/queries';
import { formatClock, formatDateTimeShort } from '@/lib/format';

const RESULT_TONE: Record<ScanEntry['result'], Tone> = {
  ok: 'success',
  manual_ok: 'success',
  duplicate: 'warning',
  invalid_sig: 'danger',
  wrong_event: 'danger',
  not_found: 'danger',
  manual_denied: 'danger',
};

function ResultPill({ result }: { result: ScanEntry['result'] }) {
  const t = useTranslations('gate.result');
  const icon =
    result === 'ok' || result === 'manual_ok' ? (
      <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
    ) : result === 'duplicate' ? (
      <AlertTriangle className="size-4 text-warning" aria-hidden="true" />
    ) : (
      <XCircle className="size-4 text-danger" aria-hidden="true" />
    );
  return (
    <StatusPill tone={RESULT_TONE[result]} icon={icon}>
      {t(result)}
    </StatusPill>
  );
}

export default function GatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('gate');
  const tc = useTranslations('common');
  const tf = useTranslations('guestForm');
  const ts = useTranslations('states');
  const locale = useLocale() as Locale;
  const toast = useToast();
  const queryClient = useQueryClient();
  const overview = useQuery({
    queryKey: qk.gate(id),
    queryFn: () => getRepository().getGateOverview(id),
    refetchInterval: 5000,
  });
  const scans = useQuery({
    queryKey: qk.scans(id),
    queryFn: () => getRepository().listScans(id),
    refetchInterval: 5000,
  });
  const guests = useQuery({
    queryKey: qk.guests(id),
    queryFn: () => getRepository().listGuests(id),
  });
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Guest | null>(null);
  const [party, setParty] = useState(1);
  const [reason, setReason] = useState('');
  const [outcome, setOutcome] = useState<{
    kind: 'ok' | 'duplicate';
    entry: ScanEntry;
    first?: ScanEntry;
  } | null>(null);

  const results = useMemo(
    () =>
      q.trim().length >= 2
        ? (guests.data ?? []).filter((g) => matchesSearch(g, q)).slice(0, 12)
        : [],
    [guests.data, q],
  );

  const admit = useMutation({
    mutationFn: () => getRepository().manualCheckIn(id, picked!.id, { partySize: party, reason }),
    onSuccess: async (entry) => {
      const first =
        entry.result === 'duplicate'
          ? (scans.data ?? [])
              .filter(
                (s) =>
                  s.guestId === entry.guestId && (s.result === 'ok' || s.result === 'manual_ok'),
              )
              .at(-1)
          : undefined;
      setOutcome({ kind: entry.result === 'duplicate' ? 'duplicate' : 'ok', entry, first });
      setPicked(null);
      setQ('');
      setReason('');
      await Promise.all(
        [...eventScopedKeys(id), qk.guest(entry.guestId ?? '')].map((k) =>
          queryClient.invalidateQueries({ queryKey: k }),
        ),
      );
    },
    onError: () => toast({ tone: 'error', title: ts('errorTitle') }),
  });

  const choose = (g: Guest) => {
    setPicked(g);
    setParty(g.rsvpPartySize && g.rsvpPartySize > 0 ? g.rsvpPartySize : g.partySizeAllowed);
  };

  return (
    <>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <Banner tone="info" className="mb-4">
        {t('scannerNote')}
      </Banner>
      <QueryState
        query={overview}
        skeleton={
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        }
      >
        {(o) => (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-live="polite">
              <KpiTile
                label={t('admitted')}
                value={t('admittedOf', { admitted: o.admittedGuests, expected: o.expectedGuests })}
                sub={t('people', { count: o.admittedPeople })}
                tone="success"
                icon={<DoorOpen className="size-4" />}
              />
              <KpiTile
                label={t('duplicates')}
                value={o.duplicates}
                tone="warning"
                icon={<AlertTriangle className="size-4" />}
              />
              <KpiTile
                label={t('invalid')}
                value={o.invalid}
                tone="danger"
                icon={<XCircle className="size-4" />}
              />
              <KpiTile label={t('manual')} value={o.manual} />
            </div>
            {o.duplicates > 0 ? (
              <Banner tone="warning" title={t('duplicateAlert', { count: o.duplicates })} />
            ) : null}

            <Card title={t('manualCheckIn')} titleId="mc-h">
              <p className="mb-3 text-sm text-muted">{t('manualHelp')}</p>
              <label className="relative block">
                <span className="sr-only">{t('search')}</span>
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t('search')}
                  className="min-h-14 w-full rounded-input border border-border bg-surface pr-3 pl-10 text-lg"
                  data-testid="gate-search"
                />
              </label>
              {q.trim().length >= 2 ? (
                results.length ? (
                  <ul className="mt-2 flex flex-col divide-y divide-border">
                    {results.map((g) => (
                      <li key={g.id}>
                        <button
                          type="button"
                          onClick={() => choose(g)}
                          className="flex min-h-16 w-full items-center gap-3 px-1 text-left hover:bg-bg"
                          data-testid="gate-result"
                        >
                          <Avatar name={g.displayName} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">{g.displayName}</span>
                            <span className="text-sm text-muted">
                              {g.shortCode} · {g.groupLabel || '—'}
                              {g.phoneE164 ? ` · …${g.phoneE164.slice(-4)}` : ''}
                            </span>
                          </span>
                          <GuestStatusPill guest={g} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-muted">{t('noMatch')}</p>
                )
              ) : null}
            </Card>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Card title={t('arrivals')} titleId="ar-h">
                {o.arrivalsByHour.length ? (
                  <BarChart
                    hideCaption
                    caption={t('arrivals')}
                    data={o.arrivalsByHour.map((a) => ({ label: a.hour, value: a.count }))}
                  />
                ) : (
                  <p className="text-muted">{t('arrivalsEmpty')}</p>
                )}
              </Card>
              <Card title={t('perGate')} titleId="pg-h">
                {o.perGate.length ? (
                  <table className="w-full text-left">
                    <thead className="text-sm text-muted">
                      <tr>
                        <th scope="col" className="py-1 font-semibold">
                          {t('col.gate')}
                        </th>
                        <th scope="col" className="py-1 text-right font-semibold">
                          {t('result.ok')}
                        </th>
                        <th scope="col" className="py-1 text-right font-semibold">
                          {t('duplicates')}
                        </th>
                        <th scope="col" className="py-1 text-right font-semibold">
                          {t('invalid')}
                        </th>
                        <th scope="col" className="py-1 text-right font-semibold">
                          {t('manual')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="tabular">
                      {o.perGate.map((g) => (
                        <tr key={g.gateName} className="border-t border-border">
                          <th scope="row" className="py-2 font-medium">
                            {g.gateName}
                          </th>
                          <td className="text-right">{g.ok}</td>
                          <td className="text-right">{g.duplicate}</td>
                          <td className="text-right">{g.invalid}</td>
                          <td className="text-right">{g.manual}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-muted">{t('logEmpty')}</p>
                )}
              </Card>
            </div>

            <Card title={t('log')} titleId="log-h">
              <QueryState
                query={scans}
                skeleton={<Skeleton lines={6} />}
                isEmpty={(d) => d.length === 0}
                empty={<EmptyState icon={<DoorOpen className="size-7" />} title={t('logEmpty')} />}
              >
                {(list) => (
                  <div
                    className="overflow-x-auto"
                    data-testid="scan-log"
                    role="region"
                    aria-label={t('log')}
                    tabIndex={0}
                  >
                    <table className="w-full min-w-[640px] text-left">
                      <thead className="text-sm text-muted">
                        <tr>
                          {(
                            ['time', 'guest', 'result', 'people', 'gate', 'device', 'by'] as const
                          ).map((c) => (
                            <th key={c} scope="col" className="px-2 py-2 font-semibold">
                              {t(`col.${c}`)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {list.slice(0, 100).map((s) => (
                          <tr key={s.id} className="border-t border-border">
                            <td className="tabular px-2 py-2 whitespace-nowrap">
                              {formatDateTimeShort(s.scannedAt, locale)}
                            </td>
                            <td className="px-2 py-2">
                              {s.guestName ?? (
                                <span className="text-muted">{t('unknownGuest')}</span>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              <ResultPill result={s.result} />
                            </td>
                            <td className="tabular px-2 py-2">{s.partyAdmitted}</td>
                            <td className="px-2 py-2">{s.gateName}</td>
                            <td className="px-2 py-2 text-sm text-muted">{s.deviceName}</td>
                            <td className="px-2 py-2 text-sm">{s.scannedBy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </QueryState>
            </Card>

            <Card title={t('revoked')} titleId="rv-h">
              <p className="mb-2 text-sm text-muted">{t('revokedHelp')}</p>
              {o.revoked.length ? (
                <ul className="flex flex-col divide-y divide-border">
                  {o.revoked.map((r) => (
                    <li key={r.guestId} className="flex items-center gap-3 py-2">
                      <ShieldOff className="size-5 text-danger" aria-hidden="true" />
                      <span className="flex-1">
                        {r.guestName} · <span className="font-mono">{r.shortCode}</span> · v
                        {r.tokenVersion - 1} → v{r.tokenVersion}
                      </span>
                      <span className="text-sm text-muted">
                        {formatDateTimeShort(r.revokedAt, locale)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted">{t('revokedEmpty')}</p>
              )}
            </Card>
          </div>
        )}
      </QueryState>

      <BottomSheet
        open={!!picked}
        onOpenChange={(o) => !o && setPicked(null)}
        title={picked ? t('confirmTitle', { name: picked.displayName }) : ''}
        closeLabel={tc('close')}
        footer={
          <Button
            size="lg"
            onClick={() => admit.mutate()}
            loading={admit.isPending}
            data-testid="gate-admit"
          >
            {t('admit')}
          </Button>
        }
      >
        {picked ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Avatar name={picked.displayName} size={48} />
              <div>
                <p className="text-xl font-semibold">{picked.displayName}</p>
                <p className="text-muted">
                  <span className="font-mono">{picked.shortCode}</span> · {picked.groupLabel || '—'}
                </p>
              </div>
            </div>
            {picked.status === 'declined' ? <Banner tone="warning" title={t('declined')} /> : null}
            {picked.checkedInAt ? (
              <Banner tone="warning" title={t('alreadyIn')}>
                {formatClock(picked.checkedInAt)}
              </Banner>
            ) : null}
            <Stepper
              value={party}
              min={1}
              max={picked.partySizeAllowed}
              onChange={setParty}
              label={t('partyToAdmit')}
              decreaseLabel={tf('decrease')}
              increaseLabel={tf('increase')}
            />
            <TextField
              label={t('reason')}
              hint={t('reasonHint')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        ) : null}
      </BottomSheet>

      {/* Result overlay: colour + icon + word, never colour alone (§17.5, §17.12). */}
      <BottomSheet
        open={!!outcome}
        onOpenChange={(o) => !o && setOutcome(null)}
        title={
          outcome?.kind === 'ok'
            ? t('admitted_', {
                name: outcome.entry.guestName ?? '',
                count: outcome.entry.partyAdmitted,
              })
            : t('alreadyIn')
        }
        closeLabel={tc('close')}
      >
        {outcome ? (
          <div
            className={
              outcome.kind === 'ok'
                ? 'flex flex-col items-center gap-2 rounded-card bg-success/10 p-6 text-center'
                : 'flex flex-col items-center gap-2 rounded-card bg-warning/15 p-6 text-center'
            }
            data-testid={`gate-outcome-${outcome.kind}`}
          >
            {outcome.kind === 'ok' ? (
              <CheckCircle2 className="size-14 text-success" aria-hidden="true" />
            ) : (
              <AlertTriangle className="size-14 text-warning" aria-hidden="true" />
            )}
            <p className="text-3xl font-bold">{outcome.entry.guestName}</p>
            {outcome.kind === 'ok' ? (
              <p className="text-xl">{t('people', { count: outcome.entry.partyAdmitted })}</p>
            ) : (
              <p className="flex items-center gap-2 text-lg">
                <Info className="size-5" aria-hidden="true" />
                {outcome.first
                  ? t('alreadyInDetail', {
                      name: outcome.entry.guestName ?? '',
                      time: formatClock(outcome.first.scannedAt),
                      gate: outcome.first.gateName,
                    })
                  : t('alreadyIn')}
              </p>
            )}
            <Button className="mt-3" onClick={() => setOutcome(null)}>
              {tc('done')}
            </Button>
          </div>
        ) : null}
      </BottomSheet>
    </>
  );
}
