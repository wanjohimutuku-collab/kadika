'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { OpsEvent } from '@harusi/api-client';
import type { Locale } from '@harusi/i18n';
import { QueryState } from '@/components/console/query-state';
import { DataTable, OpsPage, Td, Th, useStaffCan } from '@/components/ops/ops-ui';
import { Button } from '@/components/ui/button';
import { Banner, Skeleton, StatusPill } from '@/components/ui/display';
import { useToast } from '@/components/ui/toast';
import { getRepository } from '@/lib/repo';
import { OPS_ALL, qk } from '@/lib/queries';
import { formatDateShort, formatTzs } from '@/lib/format';

export default function OpsEventsPage() {
  const t = useTranslations('ops.events');
  const te = useTranslations('events');
  const ts = useTranslations('states');
  const locale = useLocale() as Locale;
  const toast = useToast();
  const canPlan = useStaffCan('plan');
  const queryClient = useQueryClient();
  const list = useQuery({
    queryKey: qk.ops('events'),
    queryFn: () => getRepository().opsListEvents(),
  });
  const setPlan = useMutation({
    mutationFn: ({ e, plan }: { e: OpsEvent; plan: 'free' | 'paid' }) =>
      getRepository().opsSetEventPlan(e.id, plan),
    onSuccess: async (e) => {
      toast({ tone: 'success', title: t('planChanged', { name: e.coupleNames }) });
      await queryClient.invalidateQueries({ queryKey: OPS_ALL });
    },
    onError: () => toast({ tone: 'error', title: ts('errorTitle') }),
  });
  return (
    <OpsPage title={t('title')}>
      <Banner tone="info" className="mb-4">
        {t('billingNote')}
      </Banner>
      <QueryState query={list} skeleton={<Skeleton className="h-64" />}>
        {(rows) => (
          <DataTable
            label={t('title')}
            minWidth={1000}
            head={
              <tr>
                <Th>{t('col.event')}</Th>
                <Th>{t('col.owner')}</Th>
                <Th>{t('col.date')}</Th>
                <Th>{t('col.status')}</Th>
                <Th>{t('col.plan')}</Th>
                <Th right>{t('col.guests')}</Th>
                <Th right>{t('col.sent')}</Th>
                <Th right>{t('col.failed')}</Th>
                <Th right>{t('col.collected')}</Th>
                <Th right>{t('col.smsCost')}</Th>
                <Th>{''}</Th>
              </tr>
            }
          >
            {rows.map((e) => (
              <tr key={e.id} className="border-t border-border" data-testid="ops-event-row">
                <Td>
                  <span className="font-medium">{e.coupleNames}</span>
                </Td>
                <Td muted>{e.ownerName}</Td>
                <Td muted>{formatDateShort(e.dateStart, locale)}</Td>
                <Td>
                  <StatusPill
                    tone={
                      e.status === 'active'
                        ? 'success'
                        : e.status === 'completed'
                          ? 'info'
                          : 'neutral'
                    }
                  >
                    {te(`statusPill.${e.status}`)}
                  </StatusPill>
                </Td>
                <Td>
                  <StatusPill tone={e.plan === 'paid' ? 'primary' : 'neutral'}>
                    {t(`plan.${e.plan}`)}
                  </StatusPill>
                </Td>
                <Td right>{e.guests}</Td>
                <Td right>{e.sent}</Td>
                <Td right>{e.failedMessages}</Td>
                <Td right>{formatTzs(e.collected)}</Td>
                <Td right>{formatTzs(e.smsCost)}</Td>
                <Td>
                  {canPlan ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setPlan.mutate({ e, plan: e.plan === 'paid' ? 'free' : 'paid' })
                      }
                      loading={setPlan.isPending && setPlan.variables?.e.id === e.id}
                    >
                      {e.plan === 'paid' ? t('markFree') : t('markPaid')}
                    </Button>
                  ) : null}
                </Td>
              </tr>
            ))}
          </DataTable>
        )}
      </QueryState>
    </OpsPage>
  );
}
