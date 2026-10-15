'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import type { Locale } from '@harusi/i18n';
import { QueryState } from '@/components/console/query-state';
import { DataTable, OpsPage, Td, Th } from '@/components/ops/ops-ui';
import { BarChart } from '@/components/ui/data';
import { Banner, Card, Skeleton } from '@/components/ui/display';
import { getRepository } from '@/lib/repo';
import { qk } from '@/lib/queries';
import { formatDateShort, formatTzs } from '@/lib/format';

export default function UsagePage() {
  const t = useTranslations('ops.usage');
  const tch = useTranslations('channel');
  const locale = useLocale() as Locale;
  const usage = useQuery({ queryKey: qk.ops('usage'), queryFn: () => getRepository().opsUsage() });
  return (
    <OpsPage title={t('title')}>
      <QueryState query={usage} skeleton={<Skeleton className="h-96" />}>
        {(u) => (
          <div className="flex flex-col gap-5">
            <Banner tone="info">{t('assumption')}</Banner>
            <Card title={t('channels')} titleId="uc-h">
              <DataTable
                label={t('channels')}
                minWidth={480}
                head={
                  <tr>
                    <Th>{t('col.channel')}</Th>
                    <Th right>{t('col.sent')}</Th>
                    <Th right>{t('col.delivered')}</Th>
                    <Th right>{t('col.failed')}</Th>
                    <Th right>{t('col.cost')}</Th>
                  </tr>
                }
              >
                {u.byChannel.map((c) => (
                  <tr key={c.channel} className="border-t border-border">
                    <Td>
                      <span className="font-medium">{tch(c.channel)}</span>
                    </Td>
                    <Td right>{c.sent}</Td>
                    <Td right>{c.delivered}</Td>
                    <Td right>{c.failed}</Td>
                    <Td right>{formatTzs(c.cost)}</Td>
                  </tr>
                ))}
              </DataTable>
            </Card>
            <Card title={t('daily')} titleId="ud-h">
              {u.byDay.length ? (
                <BarChart
                  hideCaption
                  caption={t('daily')}
                  data={u.byDay.slice(-14).map((d) => ({
                    label: formatDateShort(`${d.day}T09:00:00Z`, locale)
                      .split(' ')
                      .slice(0, 2)
                      .join(' '),
                    value: d.whatsapp + d.sms + d.failed,
                  }))}
                />
              ) : null}
            </Card>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Card title={t('topEvents')} titleId="ut-h">
                <ul className="flex flex-col divide-y divide-border">
                  {u.topEvents.map((e) => (
                    <li key={e.eventId} className="flex items-center justify-between gap-3 py-2">
                      <span className="font-medium">{e.coupleNames}</span>
                      <span className="tabular text-sm text-muted">
                        {e.whatsapp + e.sms} · {e.failed} ✕ · {formatTzs(e.cost)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card title={t('reasons')} titleId="ur-h">
                <ul className="flex flex-col divide-y divide-border">
                  {u.failureReasons.map((r) => (
                    <li key={r.reason} className="flex items-center justify-between gap-3 py-2">
                      <span>
                        {t.has(`reason.${r.reason}` as never)
                          ? t(`reason.${r.reason}` as never)
                          : r.reason}
                      </span>
                      <span className="tabular font-semibold">{r.count}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        )}
      </QueryState>
    </OpsPage>
  );
}
