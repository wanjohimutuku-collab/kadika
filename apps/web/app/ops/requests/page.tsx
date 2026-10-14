'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import type { DataRequest } from '@harusi/api-client';
import type { Locale } from '@harusi/i18n';
import { QueryState } from '@/components/console/query-state';
import { DataTable, OpsPage, Td, Th } from '@/components/ops/ops-ui';
import { Button } from '@/components/ui/button';
import { Banner, EmptyState, Skeleton, StatusPill } from '@/components/ui/display';
import { Textarea } from '@/components/ui/form';
import { BottomSheet } from '@/components/ui/overlay';
import { useToast } from '@/components/ui/toast';
import { getRepository } from '@/lib/repo';
import { OPS_ALL, qk } from '@/lib/queries';
import { formatDateShort } from '@/lib/format';

export default function RequestsPage() {
  const t = useTranslations('ops.requests');
  const tc = useTranslations('common');
  const ts = useTranslations('states');
  const locale = useLocale() as Locale;
  const toast = useToast();
  const queryClient = useQueryClient();
  const list = useQuery({
    queryKey: qk.ops('requests'),
    queryFn: () => getRepository().opsListDataRequests(),
  });
  const [target, setTarget] = useState<DataRequest | null>(null);
  const [note, setNote] = useState('');
  const resolve = useMutation({
    mutationFn: (status: 'done' | 'rejected') =>
      getRepository().opsResolveDataRequest(target!.id, status, note),
    onSuccess: async () => {
      toast({ tone: 'success', title: t('resolved') });
      setTarget(null);
      setNote('');
      await queryClient.invalidateQueries({ queryKey: OPS_ALL });
    },
    onError: () => toast({ tone: 'error', title: ts('errorTitle') }),
  });
  return (
    <OpsPage title={t('title')} subtitle={t('sla')}>
      <QueryState
        query={list}
        skeleton={<Skeleton className="h-48" />}
        isEmpty={(d) => d.length === 0}
        empty={<EmptyState icon={<ShieldCheck className="size-7" />} title={t('empty')} />}
      >
        {(rows) => (
          <DataTable
            label={t('title')}
            minWidth={760}
            head={
              <tr>
                <Th>{t('col.customer')}</Th>
                <Th>{t('col.kind')}</Th>
                <Th>{t('col.requested')}</Th>
                <Th>{t('col.status')}</Th>
                <Th>{t('col.note')}</Th>
                <Th>{''}</Th>
              </tr>
            }
          >
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border" data-testid="request-row">
                <Td>
                  <span className="font-medium">{r.userName}</span>
                  <span className="block text-sm text-muted">{r.phoneE164}</span>
                </Td>
                <Td>{t(`kind.${r.kind}`)}</Td>
                <Td muted>{formatDateShort(r.requestedAt, locale)}</Td>
                <Td>
                  <StatusPill
                    tone={
                      r.status === 'open' ? 'warning' : r.status === 'done' ? 'success' : 'neutral'
                    }
                  >
                    {t(`status.${r.status}`)}
                  </StatusPill>
                </Td>
                <Td muted wrap>
                  {r.note || '—'}
                </Td>
                <Td>
                  {r.status === 'open' ? (
                    <Button size="sm" onClick={() => setTarget(r)}>
                      {t('resolve')}
                    </Button>
                  ) : null}
                </Td>
              </tr>
            ))}
          </DataTable>
        )}
      </QueryState>
      <BottomSheet
        open={!!target}
        onOpenChange={(o) => {
          if (!o) {
            setTarget(null);
            setNote('');
          }
        }}
        title={target ? t('resolveTitle', { name: target.userName }) : ''}
        closeLabel={tc('close')}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => resolve.mutate('rejected')}
              loading={resolve.isPending && resolve.variables === 'rejected'}
            >
              {t('reject')}
            </Button>
            <Button
              variant={target?.kind === 'deletion' ? 'danger' : 'primary'}
              onClick={() => resolve.mutate('done')}
              loading={resolve.isPending && resolve.variables === 'done'}
              data-testid="request-done"
            >
              {t('markDone')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {target?.kind === 'deletion' ? (
            <Banner tone="warning">{t('deletionWarning')}</Banner>
          ) : null}
          <Textarea
            label={t('note')}
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </BottomSheet>
    </OpsPage>
  );
}
