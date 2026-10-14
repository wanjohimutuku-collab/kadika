'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { FileClock } from 'lucide-react';
import type { Locale } from '@harusi/i18n';
import { QueryState } from '@/components/console/query-state';
import { DataTable, OpsPage, Td, Th } from '@/components/ops/ops-ui';
import { EmptyState, Skeleton } from '@/components/ui/display';
import { getRepository } from '@/lib/repo';
import { qk } from '@/lib/queries';
import { formatDateTimeShort } from '@/lib/format';

export default function AuditPage() {
  const t = useTranslations('ops.audit');
  const locale = useLocale() as Locale;
  const list = useQuery({
    queryKey: qk.ops('audit'),
    queryFn: () => getRepository().opsListAudit(),
  });
  return (
    <OpsPage title={t('title')} subtitle={t('intro')}>
      <QueryState
        query={list}
        skeleton={<Skeleton className="h-48" />}
        isEmpty={(d) => d.length === 0}
        empty={<EmptyState icon={<FileClock className="size-7" />} title={t('empty')} />}
      >
        {(rows) => (
          <DataTable
            label={t('title')}
            minWidth={720}
            head={
              <tr>
                <Th>{t('col.time')}</Th>
                <Th>{t('col.actor')}</Th>
                <Th>{t('col.action')}</Th>
                <Th>{t('col.target')}</Th>
                <Th>{t('col.details')}</Th>
              </tr>
            }
          >
            {rows.map((a) => (
              <tr key={a.id} className="border-t border-border" data-testid="audit-row">
                <Td muted>{formatDateTimeShort(a.at, locale)}</Td>
                <Td>{a.actorName}</Td>
                <Td>{t(`action.${a.action}`)}</Td>
                <Td>{a.target}</Td>
                <Td muted wrap>
                  {a.details}
                </Td>
              </tr>
            ))}
          </DataTable>
        )}
      </QueryState>
    </OpsPage>
  );
}
