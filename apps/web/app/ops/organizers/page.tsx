'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, RotateCcw } from 'lucide-react';
import type { OpsOrganizer } from '@harusi/api-client';
import type { Locale } from '@harusi/i18n';
import { QueryState } from '@/components/console/query-state';
import { AccountStatus, DataTable, OpsPage, Td, Th } from '@/components/ops/ops-ui';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/display';
import { TextField } from '@/components/ui/form';
import { ConfirmSheet } from '@/components/ui/overlay';
import { useToast } from '@/components/ui/toast';
import { getRepository } from '@/lib/repo';
import { OPS_ALL, qk } from '@/lib/queries';
import { formatDateShort, formatRelative } from '@/lib/format';
import { maskPhone } from '@harusi/schemas/phone';

export default function OrganizersPage() {
  const t = useTranslations('ops.organizers');
  const tc = useTranslations('common');
  const ts = useTranslations('states');
  const locale = useLocale() as Locale;
  const toast = useToast();
  const queryClient = useQueryClient();
  const list = useQuery({
    queryKey: qk.ops('organizers'),
    queryFn: () => getRepository().opsListOrganizers(),
  });
  const [q, setQ] = useState('');
  const [target, setTarget] = useState<OpsOrganizer | null>(null);
  const [reason, setReason] = useState('');
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const digits = s.replace(/\D/g, '').replace(/^0/, '');
    return (list.data ?? []).filter(
      (o) =>
        !s ||
        o.name.toLowerCase().includes(s) ||
        (digits.length >= 3 && o.phoneE164.includes(digits)),
    );
  }, [list.data, q]);

  const change = useMutation({
    mutationFn: ({ o, status }: { o: OpsOrganizer; status: 'active' | 'suspended' }) =>
      getRepository().opsSetUserStatus(o.id, status, reason || '—'),
    onSuccess: async (o) => {
      toast({
        tone: 'success',
        title:
          o.status === 'suspended'
            ? t('suspended_', { name: o.name })
            : t('reactivated', { name: o.name }),
      });
      setTarget(null);
      setReason('');
      await queryClient.invalidateQueries({ queryKey: OPS_ALL });
    },
    onError: () => toast({ tone: 'error', title: ts('errorTitle') }),
  });

  const suspending = target?.status === 'active';
  return (
    <OpsPage title={t('title')}>
      <label className="mb-4 block max-w-md">
        <span className="sr-only">{t('search')}</span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('search')}
          className="min-h-12 w-full rounded-input border border-border bg-surface px-3"
        />
      </label>
      <QueryState query={list} skeleton={<Skeleton className="h-64" />}>
        {() => (
          <DataTable
            label={t('title')}
            minWidth={900}
            head={
              <tr>
                <Th>{t('col.name')}</Th>
                <Th>{t('col.phone')}</Th>
                <Th>{t('col.status')}</Th>
                <Th right>{t('col.events')}</Th>
                <Th right>{t('col.guests')}</Th>
                <Th right>{t('col.messages')}</Th>
                <Th>{t('col.lastLogin')}</Th>
                <Th>{t('col.joined')}</Th>
                <Th>{''}</Th>
              </tr>
            }
          >
            {rows.map((o) => (
              <tr key={o.id} className="border-t border-border" data-testid="organizer-row">
                <Td wrap>
                  <span className="font-medium">{o.name}</span>
                  {o.suspendedReason ? (
                    <span className="block max-w-xs text-sm text-danger">{o.suspendedReason}</span>
                  ) : null}
                </Td>
                <Td muted>{maskPhone(o.phoneE164)}</Td>
                <Td>
                  <AccountStatus status={o.status} label={t(`status.${o.status}`)} />
                </Td>
                <Td right>{o.eventCount}</Td>
                <Td right>{o.guestCount}</Td>
                <Td right>{o.messagesSent}</Td>
                <Td muted>{o.lastLoginAt ? formatRelative(o.lastLoginAt, locale) : t('never')}</Td>
                <Td muted>{o.createdAt ? formatDateShort(o.createdAt, locale) : '—'}</Td>
                <Td>
                  <Button
                    size="sm"
                    variant={o.status === 'active' ? 'ghost' : 'secondary'}
                    icon={
                      o.status === 'active' ? (
                        <Ban className="size-4" aria-hidden="true" />
                      ) : (
                        <RotateCcw className="size-4" aria-hidden="true" />
                      )
                    }
                    onClick={() => setTarget(o)}
                  >
                    {o.status === 'active' ? t('suspend') : t('reactivate')}
                  </Button>
                </Td>
              </tr>
            ))}
          </DataTable>
        )}
      </QueryState>
      <ConfirmSheet
        open={!!target}
        onOpenChange={(o) => {
          if (!o) {
            setTarget(null);
            setReason('');
          }
        }}
        tone={suspending ? 'danger' : 'primary'}
        title={
          target
            ? suspending
              ? t('suspendTitle', { name: target.name })
              : t('reactivateTitle', { name: target.name })
            : ''
        }
        consequence={
          <div className="flex flex-col gap-3">
            {suspending ? <p>{t('suspendBody')}</p> : null}
            <TextField
              label={t('reason')}
              hint={t('reasonHint')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        }
        confirmLabel={suspending ? t('suspend') : t('reactivate')}
        cancelLabel={tc('cancel')}
        closeLabel={tc('close')}
        loading={change.isPending}
        onConfirm={() => {
          if (target && reason.trim().length >= 5)
            change.mutate({ o: target, status: suspending ? 'suspended' : 'active' });
        }}
      />
    </OpsPage>
  );
}
