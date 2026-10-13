'use client';

import { Suspense, use, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, Download, HandCoins, Plus } from 'lucide-react';
import { progress, type Guest } from '@harusi/api-client';
import type { Locale } from '@harusi/i18n';
import { PageHeader } from '@/components/console/page-header';
import { QueryState } from '@/components/console/query-state';
import { RecordPaymentSheet } from '@/components/console/record-payment';
import { Button } from '@/components/ui/button';
import {
  Avatar,
  Banner,
  Card,
  EmptyState,
  KpiTile,
  Ring,
  Skeleton,
  StatusPill,
  type Tone,
} from '@/components/ui/display';
import { BarChart } from '@/components/ui/data';
import { Switch, TabPanel, Tabs } from '@/components/ui/navigation';
import { ConfirmSheet } from '@/components/ui/overlay';
import { useToast } from '@/components/ui/toast';
import { getRepository } from '@/lib/repo';
import { eventScopedKeys, qk, useEvent, useSession } from '@/lib/queries';
import { formatDateShort, formatDateTimeShort, formatTzs, formatTzsCompact } from '@/lib/format';
import { downloadBlob } from '@/lib/download';

type Tab = 'all' | 'paid' | 'partial' | 'unpaid' | 'history';
const STATUS_TONE: Record<string, Tone> = {
  pledged: 'warning',
  partial: 'info',
  paid: 'success',
  waived: 'neutral',
};

function PledgesInner({ id }: { id: string }) {
  const t = useTranslations('pledges');
  const tp = useTranslations('pay');
  const tc = useTranslations('common');
  const ts = useTranslations('states');
  const tr = useTranslations('reports');
  const locale = useLocale() as Locale;
  const params = useSearchParams();
  const toast = useToast();
  const queryClient = useQueryClient();
  const session = useSession();
  const event = useEvent(id);
  const guests = useQuery({
    queryKey: qk.guests(id),
    queryFn: () => getRepository().listGuests(id, { sort: { by: 'balance', dir: 'desc' } }),
  });
  const payments = useQuery({
    queryKey: qk.payments(id),
    queryFn: () => getRepository().listPayments(id),
  });
  const report = useQuery({
    queryKey: qk.report(id),
    queryFn: () => getRepository().getReport(id),
  });
  const [tab, setTab] = useState<Tab>(
    (['all', 'paid', 'partial', 'unpaid', 'history'] as const).includes(params.get('tab') as Tab)
      ? (params.get('tab') as Tab)
      : 'all',
  );
  const [payOpen, setPayOpen] = useState(false);
  const [payFor, setPayFor] = useState<Guest | undefined>(undefined);
  const [remindIds, setRemindIds] = useState<Set<string>>(new Set());
  const [remindOpen, setRemindOpen] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);

  const pledged = useMemo(
    () => (guests.data ?? []).filter((g) => g.pledge && g.pledge.amountTzs > 0),
    [guests.data],
  );
  const lists: Record<Exclude<Tab, 'history'>, Guest[]> = useMemo(
    () => ({
      all: pledged,
      paid: pledged.filter((g) => g.pledge!.status === 'paid' || g.pledge!.status === 'waived'),
      partial: pledged.filter((g) => g.pledge!.status === 'partial'),
      unpaid: pledged.filter((g) => g.pledge!.status === 'pledged'),
    }),
    [pledged],
  );

  const invalidate = () =>
    Promise.all(eventScopedKeys(id).map((k) => queryClient.invalidateQueries({ queryKey: k })));
  const remind = useMutation({
    mutationFn: () => getRepository().sendPledgeReminders(id, [...remindIds]),
    onSuccess: (r) => {
      setRemindOpen(false);
      setRemindIds(new Set());
      toast({ tone: 'success', title: t('reminded', { count: r.queued }) });
    },
    onError: () => toast({ tone: 'error', title: ts('errorTitle') }),
  });
  const policy = useMutation({
    mutationFn: (v: boolean) => getRepository().updateEvent(id, { requirePledgeBeforeCard: v }),
    onSuccess: async () => {
      setPolicyOpen(false);
      toast({ tone: 'success', title: t('policySaved') });
      await queryClient.invalidateQueries({ queryKey: qk.event(id) });
    },
    onError: () => toast({ tone: 'error', title: ts('rolledBack') }),
  });
  const exportCsv = useMutation({
    mutationFn: () => getRepository().exportCsv(id, 'pledges'),
    onSuccess: (b) => downloadBlob(b, 'michango.csv'),
  });

  if (session.data?.role === 'gate') return <Banner tone="warning">{ts('permissionTitle')}</Banner>;

  return (
    <QueryState query={event} skeleton={<Skeleton className="h-96" />}>
      {(e) => {
        const target = e.contributionTargetTzs;
        const collected = e.stats.collectedTzs;
        const pct = progress(collected, target);
        const weekly = (report.data?.collectionsByWeek ?? []).slice(-8).map((w) => ({
          label: formatDateShort(`${w.week}T09:00:00Z`, locale).split(' ').slice(0, 2).join(' '),
          value: w.amountTzs,
        }));
        return (
          <>
            <PageHeader
              title={t('title')}
              actions={
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Download className="size-4" aria-hidden="true" />}
                    onClick={() => exportCsv.mutate()}
                  >
                    {t('export')}
                  </Button>
                  <Button
                    size="sm"
                    icon={<Plus className="size-4" aria-hidden="true" />}
                    onClick={() => {
                      setPayFor(undefined);
                      setPayOpen(true);
                    }}
                    data-testid="record-payment-open"
                  >
                    {t('record')}
                  </Button>
                </>
              }
            />
            <Card>
              <div className="flex flex-col items-center gap-5 sm:flex-row">
                <Ring value={pct} label={t('ofTarget', { pct: Math.round(pct * 100) })}>
                  <span className="tabular text-2xl font-bold">{Math.round(pct * 100)}%</span>
                  <span className="text-xs text-muted">{t('target')}</span>
                </Ring>
                <div className="grid w-full flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
                  <KpiTile label={t('target')} value={formatTzsCompact(target)} />
                  <KpiTile
                    label={t('collected')}
                    value={formatTzsCompact(collected)}
                    tone="success"
                    icon={<HandCoins className="size-4" />}
                  />
                  <KpiTile label={t('pledged')} value={formatTzsCompact(e.stats.pledgedTzs)} />
                  <KpiTile
                    label={t('balance')}
                    value={formatTzsCompact(Math.max(0, e.stats.pledgedTzs - collected))}
                    sub={t('count', { count: e.stats.guestsWithBalance })}
                    tone="warning"
                  />
                </div>
              </div>
            </Card>

            <div className="mt-4">
              <Tabs
                label={t('title')}
                value={tab}
                onValueChange={(v) => setTab(v as Tab)}
                items={[
                  { value: 'all', label: t('tabs.all'), count: lists.all.length },
                  { value: 'paid', label: t('tabs.paid'), count: lists.paid.length },
                  { value: 'partial', label: t('tabs.partial'), count: lists.partial.length },
                  { value: 'unpaid', label: t('tabs.unpaid'), count: lists.unpaid.length },
                  { value: 'history', label: t('tabs.history'), count: payments.data?.length },
                ]}
              >
                {(['all', 'paid', 'partial', 'unpaid'] as const).map((k) => (
                  <TabPanel key={k} value={k} className="pt-3">
                    {guests.isPending ? (
                      <Skeleton lines={6} />
                    ) : lists[k].length === 0 ? (
                      <EmptyState icon={<HandCoins className="size-7" />} title={t('empty')} />
                    ) : (
                      <>
                        {k !== 'paid' ? (
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setRemindIds(
                                  new Set(
                                    lists[k]
                                      .filter((g) => g.pledge!.balanceTzs > 0 && g.phoneE164)
                                      .map((g) => g.id),
                                  ),
                                )
                              }
                            >
                              {t('selectAll')}
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={<BellRing className="size-4" aria-hidden="true" />}
                              disabled={!remindIds.size}
                              onClick={() => setRemindOpen(true)}
                            >
                              {t('remind')} {remindIds.size ? `(${remindIds.size})` : ''}
                            </Button>
                          </div>
                        ) : null}
                        <ul className="flex flex-col divide-y divide-border rounded-card border border-border bg-surface">
                          {lists[k].slice(0, 200).map((g) => (
                            <li key={g.id} className="flex min-h-16 items-center gap-3 px-3 py-2">
                              {k !== 'paid' && g.pledge!.balanceTzs > 0 ? (
                                <input
                                  type="checkbox"
                                  className="size-5 accent-[var(--hp-primary)]"
                                  aria-label={t('selectForReminder', { name: g.displayName })}
                                  checked={remindIds.has(g.id)}
                                  disabled={!g.phoneE164}
                                  onChange={() =>
                                    setRemindIds((s) => {
                                      const n = new Set(s);
                                      if (n.has(g.id)) n.delete(g.id);
                                      else n.add(g.id);
                                      return n;
                                    })
                                  }
                                />
                              ) : null}
                              <Avatar name={g.displayName} size={36} />
                              <div className="min-w-0 flex-1">
                                <Link
                                  href={`/app/e/${id}/guests/${g.id}`}
                                  className="block truncate font-medium hover:underline"
                                >
                                  {g.displayName}
                                </Link>
                                <p className="tabular text-sm text-muted">
                                  {formatTzs(g.pledge!.paidTzs)} / {formatTzs(g.pledge!.amountTzs)}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <StatusPill tone={STATUS_TONE[g.pledge!.status]}>
                                  {t(`status.${g.pledge!.status}`)}
                                </StatusPill>
                                {g.pledge!.balanceTzs > 0 ? (
                                  <button
                                    type="button"
                                    className="min-h-10 text-sm font-semibold text-primary underline-offset-2 hover:underline"
                                    onClick={() => {
                                      setPayFor(g);
                                      setPayOpen(true);
                                    }}
                                  >
                                    {t('record')}
                                  </button>
                                ) : null}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </TabPanel>
                ))}
                <TabPanel value="history" className="pt-3">
                  <QueryState
                    query={payments}
                    skeleton={<Skeleton lines={6} />}
                    isEmpty={(d) => d.length === 0}
                    empty={
                      <EmptyState
                        icon={<HandCoins className="size-7" />}
                        title={t('historyEmpty')}
                      />
                    }
                  >
                    {(list) => (
                      <>
                        <BarChart
                          caption={tr('collections')}
                          data={weekly}
                          formatValue={(n) => formatTzsCompact(n).replace('TZS ', '')}
                        />
                        <ul
                          className="mt-3 flex flex-col divide-y divide-border rounded-card border border-border bg-surface"
                          data-testid="payment-history"
                        >
                          {list.slice(0, 150).map((p) => (
                            <li
                              key={p.id}
                              className="flex items-center justify-between gap-3 px-3 py-2"
                            >
                              <div className="min-w-0">
                                <p className="truncate font-medium">{p.guestName}</p>
                                <p className="text-sm text-muted">
                                  {formatDateTimeShort(p.paidAt, locale)} ·{' '}
                                  {tp(`providers.${p.method}`)} · {p.reference}
                                  {p.recordedBy
                                    ? ` · ${t('recordedBy', { name: p.recordedBy })}`
                                    : ''}
                                </p>
                              </div>
                              <span className="tabular font-semibold">
                                {formatTzs(p.amountTzs)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </QueryState>
                </TabPanel>
              </Tabs>
            </div>

            <Card className="mt-5">
              <Switch
                checked={e.requirePledgeBeforeCard}
                onCheckedChange={(v) => (v ? setPolicyOpen(true) : policy.mutate(false))}
                label={t('policy')}
                description={t('policyHelp')}
                disabled={session.data?.role !== 'owner'}
              />
            </Card>

            <RecordPaymentSheet
              eventId={id}
              open={payOpen}
              onOpenChange={setPayOpen}
              preselected={payFor}
              onSaved={invalidate}
              key={payFor?.id ?? 'any'}
            />
            <ConfirmSheet
              open={remindOpen}
              onOpenChange={setRemindOpen}
              tone="primary"
              title={t('remindTitle', { count: remindIds.size })}
              consequence={t('remindBody')}
              confirmLabel={t('remind')}
              cancelLabel={tc('cancel')}
              closeLabel={tc('close')}
              loading={remind.isPending}
              onConfirm={() => remind.mutate()}
            />
            <ConfirmSheet
              open={policyOpen}
              onOpenChange={setPolicyOpen}
              title={t('policyOnTitle')}
              consequence={t('policyOnBody')}
              confirmLabel={t('policyOn')}
              cancelLabel={tc('cancel')}
              closeLabel={tc('close')}
              loading={policy.isPending}
              onConfirm={() => policy.mutate(true)}
            />
          </>
        );
      }}
    </QueryState>
  );
}

export default function PledgesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense>
      <PledgesInner id={id} />
    </Suspense>
  );
}
