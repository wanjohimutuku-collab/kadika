'use client';

import { use, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Download, FileDown, Heart } from 'lucide-react';
import type { Locale } from '@harusi/i18n';
import { PageHeader } from '@/components/console/page-header';
import { QueryState } from '@/components/console/query-state';
import { Button } from '@/components/ui/button';
import { Banner, Card, KpiTile, ProgressBar, Skeleton } from '@/components/ui/display';
import { BarChart, FunnelBar } from '@/components/ui/data';
import { Textarea } from '@/components/ui/form';
import { ConfirmSheet } from '@/components/ui/overlay';
import { useToast } from '@/components/ui/toast';
import { getRepository, newIdempotencyKey } from '@/lib/repo';
import { qk, useEvent, useSession, useEventCurrency } from '@/lib/queries';
import { formatDateShort, formatMoney, formatMoneyCompact } from '@/lib/format';
import { downloadBlob } from '@/lib/download';
import { useQuotaToast } from '@/components/console/quota';

export default function ReportsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('reports');
  const to = useTranslations('overview');
  const tch = useTranslations('channel');
  const tc = useTranslations('common');
  const ts = useTranslations('states');
  const locale = useLocale() as Locale;
  const toast = useToast();
  const quota = useQuotaToast(id);
  const session = useSession();
  const event = useEvent(id);
  const cur = useEventCurrency(id);
  const report = useQuery({
    queryKey: qk.report(id),
    queryFn: () => getRepository().getReport(id),
  });
  const [thanks, setThanks] = useState('');
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (event.data && !thanks) setThanks(t('thankYouDefault', { couple: event.data.coupleNames }));
  }, [event.data, thanks, t]);

  const exportCsv = useMutation({
    mutationFn: (kind: 'report' | 'guests' | 'payments' | 'scans') =>
      getRepository().exportCsv(id, kind),
    onSuccess: (b, kind) => downloadBlob(b, `ripoti-${kind}.csv`),
    onError: () => toast({ tone: 'error', title: ts('errorTitle') }),
  });
  const exportPdf = useMutation({
    mutationFn: () =>
      getRepository().requestCardsPdf(id, { format: 'A5', layout: 'single', guestIds: [] }),
    onSuccess: (b) => downloadBlob(b, 'ripoti.pdf'),
  });
  const sendThanks = useMutation({
    mutationFn: () =>
      getRepository().sendInvitations(id, {
        audience: { kind: 'all' },
        channel: 'auto',
        whatsappFallbackToSms: true,
        scheduleAt: null,
        kind: 'thank_you',
        idempotencyKey: newIdempotencyKey(),
        body: thanks,
      }),
    onSuccess: () => {
      setConfirm(false);
      toast({ tone: 'success', title: t('thankYouSent') });
    },
    onError: (e) => quota(e) || toast({ tone: 'error', title: ts('errorTitle') }),
  });

  return (
    <QueryState query={report} skeleton={<Skeleton className="h-96" />}>
      {(r) => {
        const s = r.stats;
        const passed = event.data ? Date.parse(event.data.dateStart) < Date.now() : false;
        const thanksAudience = s.confirmed + s.attended;
        return (
          <>
            <PageHeader
              title={t('title')}
              actions={
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Download className="size-4" aria-hidden="true" />}
                    onClick={() => exportCsv.mutate('report')}
                  >
                    {t('exportCsv')}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<FileDown className="size-4" aria-hidden="true" />}
                    onClick={() => exportPdf.mutate()}
                  >
                    {t('exportPdf')}
                  </Button>
                </>
              }
            />
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Card title={t('funnel')} titleId="fn-h">
                <FunnelBar
                  caption={t('funnel')}
                  stages={(
                    ['created', 'sent', 'delivered', 'opened', 'confirmed', 'checked_in'] as const
                  ).map((k) => ({
                    key: k,
                    label: to(`funnel.${k}`),
                    count: k === 'created' ? s.invited : k === 'checked_in' ? s.attended : s[k],
                  }))}
                />
              </Card>
              <Card title={t('headcount')} titleId="hc-h">
                <div className="flex flex-col gap-3">
                  <p className="text-lg font-semibold">
                    {t('forecast', { count: r.headcountForecast })}
                  </p>
                  <ProgressBar
                    value={r.headcountTarget ? r.headcountForecast / r.headcountTarget : 0}
                    label={t('headcount')}
                    valueText={`${r.headcountForecast} / ${r.headcountTarget}`}
                  />
                  <p className="text-muted">{t('capacity', { count: r.headcountTarget })}</p>
                  <p className="text-muted">{t('attended', { count: s.headcountAttended })}</p>
                </div>
              </Card>
            </div>

            <Card title={t('channels')} titleId="cp-h" className="mt-5">
              <div
                className="overflow-x-auto"
                role="region"
                aria-label={t('channels')}
                tabIndex={0}
              >
                <table className="w-full min-w-[520px] text-left">
                  <thead className="text-sm text-muted">
                    <tr>
                      {(
                        ['channel', 'sent', 'delivered', 'opened', 'confirmed', 'rate'] as const
                      ).map((c) => (
                        <th key={c} scope="col" className="px-2 py-2 font-semibold">
                          {t(`col.${c}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="tabular">
                    {r.channels.map((c) => (
                      <tr key={c.channel} className="border-t border-border">
                        <th scope="row" className="px-2 py-2 font-medium">
                          {tch(c.channel)}
                        </th>
                        <td className="px-2 py-2">{c.sent}</td>
                        <td className="px-2 py-2">{c.delivered}</td>
                        <td className="px-2 py-2">{c.opened}</td>
                        <td className="px-2 py-2">{c.confirmed}</td>
                        <td className="px-2 py-2 font-semibold">
                          {c.sent ? Math.round((c.confirmed / c.sent) * 100) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {session.data?.role !== 'gate' ? (
              <Card title={t('reconciliation')} titleId="rc-h" className="mt-5">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <KpiTile
                    label={t('rec.pledged')}
                    value={formatMoneyCompact(r.pledgeReconciliation.pledged, cur)}
                  />
                  <KpiTile
                    label={t('rec.collected')}
                    value={formatMoneyCompact(r.pledgeReconciliation.collected, cur)}
                    tone="success"
                  />
                  <KpiTile
                    label={t('rec.outstanding')}
                    value={formatMoneyCompact(r.pledgeReconciliation.outstanding, cur)}
                    tone="warning"
                  />
                  <KpiTile
                    label={t('rec.overpaid')}
                    value={formatMoney(r.pledgeReconciliation.overpaid, cur)}
                  />
                </div>
                <p className="mt-3 text-sm text-muted">
                  {t('rec.guestsPaid')}: {r.pledgeReconciliation.guestsPaid} ·{' '}
                  {t('rec.guestsPartial')}: {r.pledgeReconciliation.guestsPartial} ·{' '}
                  {t('rec.guestsUnpaid')}: {r.pledgeReconciliation.guestsUnpaid}
                </p>
                {r.collectionsByWeek.length ? (
                  <div className="mt-4">
                    <BarChart
                      hideCaption
                      caption={t('collections')}
                      data={r.collectionsByWeek.slice(-10).map((w) => ({
                        label: formatDateShort(`${w.week}T09:00:00Z`, locale)
                          .split(' ')
                          .slice(0, 2)
                          .join(' '),
                        value: w.amount,
                      }))}
                      formatValue={(n) => formatMoneyCompact(n, cur).replace(`${cur} `, '')}
                    />
                  </div>
                ) : null}
              </Card>
            ) : null}

            {r.arrivalsByHour.length ? (
              <Card title={t('arrivals')} titleId="av-h" className="mt-5">
                <BarChart
                  hideCaption
                  caption={t('arrivals')}
                  data={r.arrivalsByHour.map((a) => ({ label: a.hour, value: a.count }))}
                />
              </Card>
            ) : null}

            <Card title={t('postEvent')} titleId="pe-h" className="mt-5">
              {passed ? (
                <div className="flex flex-col gap-3">
                  <Textarea
                    label={t('thankYou')}
                    rows={3}
                    value={thanks}
                    onChange={(e) => setThanks(e.target.value)}
                  />
                  <p className="text-sm text-muted">
                    {t('thankYouAudience', { count: thanksAudience })}
                  </p>
                  <Button
                    className="self-start"
                    icon={<Heart className="size-4" aria-hidden="true" />}
                    disabled={!thanks.trim()}
                    onClick={() => setConfirm(true)}
                  >
                    {t('sendThankYou')}
                  </Button>
                </div>
              ) : (
                <Banner tone="info">{t('notYet')}</Banner>
              )}
            </Card>

            <ConfirmSheet
              open={confirm}
              onOpenChange={setConfirm}
              tone="primary"
              title={t('sendThankYou')}
              consequence={t('thankYouAudience', { count: thanksAudience })}
              confirmLabel={t('sendThankYou')}
              cancelLabel={tc('cancel')}
              closeLabel={tc('close')}
              loading={sendThanks.isPending}
              onConfirm={() => sendThanks.mutate()}
            />
          </>
        );
      }}
    </QueryState>
  );
}
