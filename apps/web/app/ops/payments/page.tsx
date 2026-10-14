'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import type { Locale } from '@harusi/i18n';
import { QueryState } from '@/components/console/query-state';
import { DataTable, OpsPage, Td, Th } from '@/components/ops/ops-ui';
import { Banner, EmptyState, Skeleton, StatusPill } from '@/components/ui/display';
import { CreditCard } from 'lucide-react';
import { getRepository } from '@/lib/repo';
import { qk } from '@/lib/queries';
import { formatDateTimeShort, formatTzs } from '@/lib/format';

export default function OpsPaymentsPage() {
  const t = useTranslations('ops.payments');
  const tp = useTranslations('pay.providers');
  const locale = useLocale() as Locale;
  const list = useQuery({
    queryKey: qk.ops('payments'),
    queryFn: () => getRepository().opsListPayments(),
  });
  return (
    <OpsPage title={t('title')}>
      <Banner tone="info" className="mb-4">
        {t('note')}
      </Banner>
      <QueryState
        query={list}
        skeleton={<Skeleton className="h-64" />}
        isEmpty={(d) => d.length === 0}
        empty={<EmptyState icon={<CreditCard className="size-7" />} title={t('empty')} />}
      >
        {(rows) => (
          <DataTable
            label={t('title')}
            minWidth={820}
            head={
              <tr>
                <Th>{t('col.date')}</Th>
                <Th>{t('col.event')}</Th>
                <Th>{t('col.guest')}</Th>
                <Th right>{t('col.amount')}</Th>
                <Th>{t('col.method')}</Th>
                <Th>{t('col.reference')}</Th>
                <Th>{t('col.status')}</Th>
              </tr>
            }
          >
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <Td muted>{formatDateTimeShort(p.paidAt, locale)}</Td>
                <Td>{p.coupleNames}</Td>
                <Td>{p.guestName}</Td>
                <Td right>{formatTzs(p.amountTzs)}</Td>
                <Td>{tp(p.method)}</Td>
                <Td>
                  <span className="font-mono text-sm">{p.reference}</span>
                </Td>
                <Td>
                  <StatusPill
                    tone={
                      p.status === 'success'
                        ? 'success'
                        : p.status === 'failed'
                          ? 'danger'
                          : 'warning'
                    }
                  >
                    {p.status}
                  </StatusPill>
                </Td>
              </tr>
            ))}
          </DataTable>
        )}
      </QueryState>
    </OpsPage>
  );
}
