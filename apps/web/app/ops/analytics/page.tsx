'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { QueryState } from '@/components/console/query-state';
import { DataTable, OpsPage, Td, Th } from '@/components/ops/ops-ui';
import { Banner, Card, Skeleton } from '@/components/ui/display';
import { getRepository } from '@/lib/repo';
import { qk } from '@/lib/queries';

/**
 * First-party analytics summary (ADR 057). Staff-only. The page renders the "empty" banner
 * until real data exists: on a deploy where `ANALYTICS_ENABLED=0`, the API returns an empty
 * summary and we show the footnote as-is. No personal data is on this page by design.
 */
export default function AnalyticsPage() {
  const t = useTranslations('ops.analytics');
  const analytics = useQuery({
    queryKey: qk.ops('analytics'),
    queryFn: () => getRepository().opsAnalytics(30),
  });
  return (
    <OpsPage title={t('title')}>
      <QueryState query={analytics} skeleton={<Skeleton className="h-96" />}>
        {(a) => {
          const total = Object.values(a.totals).reduce((n, v) => n + v, 0);
          if (total === 0) return <Banner tone="info">{t('empty')}</Banner>;
          const pageViews = a.totals.page_view ?? 0;
          const startReg = a.totals.start_registration ?? 0;
          const doneReg = a.totals.complete_registration ?? 0;
          const createEv = a.totals.create_event ?? 0;
          const share = a.totals.share_invitation ?? 0;
          return (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Tile label={t('cards.pageViews')} value={pageViews} />
                <Tile label={t('cards.startRegistration')} value={startReg} />
                <Tile label={t('cards.completeRegistration')} value={doneReg} />
                <Tile label={t('cards.createEvent')} value={createEv} />
                <Tile label={t('cards.shareInvitation')} value={share} />
              </div>

              <Card title={t('daily')} titleId="ana-daily">
                <DataTable
                  label={t('daily')}
                  minWidth={360}
                  head={
                    <tr>
                      <Th>{t('col.day')}</Th>
                      <Th right>{t('col.pageViews')}</Th>
                      <Th right>{t('col.conversions')}</Th>
                    </tr>
                  }
                >
                  {a.byDay.map((d) => (
                    <tr key={d.day} className="border-t border-border">
                      <Td>{d.day}</Td>
                      <Td right>{d.pageViews}</Td>
                      <Td right>{d.conversions}</Td>
                    </tr>
                  ))}
                </DataTable>
              </Card>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Card title={t('edition')} titleId="ana-edition">
                  <DataTable
                    label={t('edition')}
                    minWidth={240}
                    head={
                      <tr>
                        <Th>{t('col.edition')}</Th>
                        <Th right>{t('col.pageViews')}</Th>
                      </tr>
                    }
                  >
                    {a.byEdition.map((e) => (
                      <tr key={e.edition} className="border-t border-border">
                        <Td>{e.edition}</Td>
                        <Td right>{e.pageViews}</Td>
                      </tr>
                    ))}
                  </DataTable>
                </Card>

                <Card title={t('source')} titleId="ana-source">
                  <DataTable
                    label={t('source')}
                    minWidth={240}
                    head={
                      <tr>
                        <Th>{t('col.source')}</Th>
                        <Th right>{t('col.pageViews')}</Th>
                      </tr>
                    }
                  >
                    {a.bySource.map((s) => (
                      <tr key={s.source} className="border-t border-border">
                        <Td>{sourceLabel(s.source, t)}</Td>
                        <Td right>{s.pageViews}</Td>
                      </tr>
                    ))}
                  </DataTable>
                </Card>
              </div>

              <p className="text-sm text-muted">{t('footnote')}</p>
            </div>
          );
        }}
      </QueryState>
    </OpsPage>
  );
}

/** Known source keys match the ADR 057 enum; anything else is rendered as-is. */
function sourceLabel(s: string, t: ReturnType<typeof useTranslations>): string {
  switch (s) {
    case 'direct':
      return t('sources.direct');
    case 'search':
      return t('sources.search');
    case 'social':
      return t('sources.social');
    case 'referral':
      return t('sources.referral');
    default:
      return s;
  }
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className="tabular mt-1 text-2xl font-semibold">{value.toLocaleString()}</div>
    </div>
  );
}
