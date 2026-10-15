'use client';

import { useState } from 'react';
import { CheckCircle2, CircleDashed, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { evaluateGates, type GateResult, type PilotMetrics } from '@harusi/schemas';
import { QueryState } from '@/components/console/query-state';
import { DataTable, OpsPage, Td, Th } from '@/components/ops/ops-ui';
import { Banner, Card, KpiTile, Skeleton } from '@/components/ui/display';
import { Select } from '@/components/ui/form';
import { KENYA_ENABLED } from '@/lib/country';
import { formatMoney } from '@/lib/format';
import { getRepository } from '@/lib/repo';
import { qk } from '@/lib/queries';

type CountryChoice = 'TZ' | 'KE' | 'all';

const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 1000) / 10}%`);
const secs = (v: number | null) => (v === null ? '—' : `${v} s`);

/** How a gate's number is shown: ratios as percentages, times in seconds, the rest as counts. */
function show(g: GateResult, v: number | null) {
  if (v === null) return '—';
  if (g.key === 'gateSpeed' || g.key === 'paymentSpeed') return secs(v);
  if (g.rule === 'max' && g.limit === 0) return String(v);
  return pct(v);
}

const STATUS_ICON = {
  met: <CheckCircle2 className="size-4 text-success" aria-hidden="true" />,
  not_met: <XCircle className="size-4 text-danger" aria-hidden="true" />,
  no_data: <CircleDashed className="size-4 text-muted" aria-hidden="true" />,
} as const;

export default function PilotPage() {
  const t = useTranslations('ops.pilot');
  const [country, setCountry] = useState<CountryChoice>(KENYA_ENABLED ? 'KE' : 'TZ');
  const [days, setDays] = useState(30);
  const q = useQuery({
    queryKey: [...qk.ops('pilot'), country, days],
    queryFn: () => getRepository().opsPilotMetrics({ country, days }),
  });
  return (
    <OpsPage title={t('title')} subtitle={t('intro')}>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Select
          label={t('country')}
          value={country}
          onChange={(e) => setCountry(e.target.value as CountryChoice)}
          options={[
            { value: 'TZ', label: 'Tanzania' },
            ...(KENYA_ENABLED ? [{ value: 'KE', label: 'Kenya' }] : []),
            ...(KENYA_ENABLED ? [{ value: 'all', label: t('all') }] : []),
          ]}
        />
        <Select
          label={t('period')}
          value={String(days)}
          onChange={(e) => setDays(Number(e.target.value))}
          options={[7, 30, 90].map((d) => ({ value: String(d), label: t('days', { days: d }) }))}
        />
      </div>
      {!KENYA_ENABLED ? <Banner tone="info">{t('untilFlag')}</Banner> : null}
      <QueryState query={q} skeleton={<Skeleton className="h-96" />}>
        {(m) => <Dashboard m={m} />}
      </QueryState>
    </OpsPage>
  );
}

function Dashboard({ m }: { m: PilotMetrics }) {
  const t = useTranslations('ops.pilot');
  const gates = evaluateGates(m);
  return (
    <div className="flex flex-col gap-5">
      <Banner tone="info">{t('assumption')}</Banner>
      <Card title={t('gates')} titleId="pg-h">
        <DataTable
          label={t('gates')}
          minWidth={640}
          head={
            <tr>
              <Th>{t('gateCol')}</Th>
              <Th right>{t('valueCol')}</Th>
              <Th>{t('targetCol')}</Th>
              <Th right>{t('sampleCol')}</Th>
              <Th>{t('statusCol')}</Th>
            </tr>
          }
        >
          {gates.map((g) => (
            <tr key={g.key} className="border-t border-border" data-testid={`gate-${g.key}`}>
              <Td>
                <span className="font-medium">{t(`gate.${g.key}` as never)}</span>
                <span className="block text-xs text-muted">
                  {g.blocking ? t('blocking') : t('watch')}
                </span>
              </Td>
              <Td right>{show(g, g.value)}</Td>
              <Td>{t(`rule.${g.rule}`, { limit: show(g, g.limit) })}</Td>
              <Td right>{g.sample}</Td>
              <Td>
                <span className="inline-flex items-center gap-1.5">
                  {STATUS_ICON[g.status]}
                  {t(`status.${g.status}`)}
                </span>
              </Td>
            </tr>
          ))}
        </DataTable>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiTile label={t('smsShare')} value={pct(m.smsPath.share)} />
        <KpiTile label={t('timeouts')} value={m.payments.timeouts} />
        <KpiTile label={t('late')} value={m.payments.lateSuccesses} />
        <KpiTile label={t('mismatch')} value={m.payments.amountMismatches} />
      </div>

      <Card title={t('sms')} titleId="ps-h">
        {m.smsByNetwork.length === 0 ? (
          <p className="text-muted">{t('smsEmpty')}</p>
        ) : (
          <DataTable
            label={t('sms')}
            minWidth={560}
            head={
              <tr>
                <Th>{t('operator')}</Th>
                <Th right>{t('total')}</Th>
                <Th right>{t('delivered')}</Th>
                <Th right>{t('failed')}</Th>
                <Th right>{t('inFlight')}</Th>
                <Th right>{t('rate')}</Th>
              </tr>
            }
          >
            {m.smsByNetwork.map((n) => (
              <tr key={n.network} className="border-t border-border">
                <Td>{n.label}</Td>
                <Td right>{n.total}</Td>
                <Td right>{n.delivered}</Td>
                <Td right>{n.failed}</Td>
                <Td right>{n.inFlight}</Td>
                <Td right>{pct(n.deliveryRate)}</Td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>

      <Card title={t('payments')} titleId="pp-h">
        <DataTable
          label={t('payments')}
          minWidth={480}
          head={
            <tr>
              <Th>{t('method')}</Th>
              <Th right>{t('started')}</Th>
              <Th right>{t('success')}</Th>
              <Th right>{t('rate')}</Th>
            </tr>
          }
        >
          {m.payments.byMethod.map((p) => (
            <tr key={p.method} className="border-t border-border">
              <Td>{p.method}</Td>
              <Td right>{p.started}</Td>
              <Td right>{p.success}</Td>
              <Td right>{pct(p.successRate)}</Td>
            </tr>
          ))}
        </DataTable>
        {m.payments.collected.length ? (
          <p className="mt-3 text-sm text-muted">
            {t('collected')}:{' '}
            {m.payments.collected
              .map((c) => formatMoney(c.amount, c.currency === 'KES' ? 'KES' : 'TZS'))
              .join(' · ')}
          </p>
        ) : null}
      </Card>
    </div>
  );
}
