'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquareText, Search } from 'lucide-react';
import type { OpsSmsCustomer } from '@harusi/schemas/sms';
import type { Locale } from '@harusi/i18n';
import { QueryState } from '@/components/console/query-state';
import { DataTable, OpsPage, Td, Th, useStaffCan } from '@/components/ops/ops-ui';
import { Button } from '@/components/ui/button';
import { EmptyState, KpiTile, Skeleton, StatusPill } from '@/components/ui/display';
import { TextField } from '@/components/ui/form';
import { SegmentedControl } from '@/components/ui/navigation';
import { BottomSheet } from '@/components/ui/overlay';
import { useToast } from '@/components/ui/toast';
import { getRepository } from '@/lib/repo';
import { OPS_ALL, qk } from '@/lib/queries';
import { formatNumber, formatRelative } from '@/lib/format';

/** Fewer SMS than this left counts as running low. */
const LOW = 50;
type Filter = 'all' | 'low' | 'active';

/**
 * Wateja wa SMS (ADR 055): customers who bought SMS reminders only. Same staff panel, same packs and
 * prices (/ops/billing); here staff see each customer's contacts, sends and credits and can add SMS
 * with a reason (the `plan` permission, as for any grant).
 */
export default function OpsSmsPage() {
  const t = useTranslations('ops.sms');
  const ts = useTranslations('states');
  const tc = useTranslations('common');
  const locale = useLocale() as Locale;
  const toast = useToast();
  const queryClient = useQueryClient();
  const canGrant = useStaffCan('plan');
  const list = useQuery({
    queryKey: qk.ops('sms-customers'),
    queryFn: () => getRepository().opsListSmsCustomers(),
  });
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [granting, setGranting] = useState<OpsSmsCustomer | null>(null);
  const [amount, setAmount] = useState('100');
  const [note, setNote] = useState('');
  const n = Math.max(0, Math.floor(Number(amount) || 0));

  const grant = useMutation({
    mutationFn: () =>
      getRepository().opsGrantCredit(granting!.eventId, {
        cards: 0,
        messages: n,
        note: note.trim(),
      }),
    onSuccess: async () => {
      toast({ tone: 'success', title: t('granted', { count: formatNumber(n) }) });
      setGranting(null);
      setNote('');
      await queryClient.invalidateQueries({ queryKey: OPS_ALL });
    },
    onError: () => toast({ tone: 'error', title: ts('errorTitle') }),
  });

  const rows = useMemo(() => {
    const all = list.data ?? [];
    const needle = q.trim().toLowerCase();
    return all.filter(
      (c) =>
        (filter === 'all' ||
          (filter === 'low' && c.remaining < LOW) ||
          (filter === 'active' && c.smsSent30d > 0)) &&
        (!needle ||
          c.title.toLowerCase().includes(needle) ||
          c.ownerName.toLowerCase().includes(needle)),
    );
  }, [list.data, filter, q]);

  return (
    <OpsPage title={t('title')} subtitle={t('subtitle')}>
      <BottomSheet
        open={!!granting}
        onOpenChange={(o) => !o && setGranting(null)}
        closeLabel={tc('close')}
        title={granting ? t('grantTitle', { name: granting.title }) : ''}
        footer={
          <Button
            className="w-full"
            disabled={note.trim().length < 3 || n < 1}
            loading={grant.isPending}
            onClick={() => grant.mutate()}
          >
            {t('grantSave')}
          </Button>
        }
      >
        <TextField
          label={t('grantAmount')}
          type="number"
          inputMode="numeric"
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <TextField
          wrapperClassName="mt-3"
          label={t('grantNote')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </BottomSheet>

      <QueryState query={list} skeleton={<Skeleton className="h-64" />}>
        {(all) => {
          const sent30 = all.reduce((s, c) => s + c.smsSent30d, 0);
          const left = all.reduce((s, c) => s + c.remaining, 0);
          const low = all.filter((c) => c.remaining < LOW).length;
          return (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <KpiTile label={t('customers')} value={formatNumber(all.length)} />
                <KpiTile label={t('sent30')} value={formatNumber(sent30)} />
                <KpiTile label={t('remaining')} value={formatNumber(left)} />
                <KpiTile
                  label={t('low')}
                  value={formatNumber(low)}
                  tone={low ? 'warning' : 'neutral'}
                />
              </div>
              {all.length === 0 ? (
                <EmptyState icon={<MessageSquareText className="size-7" />} title={t('empty')} />
              ) : (
                <>
                  <div className="flex flex-wrap items-end gap-3">
                    <SegmentedControl<Filter>
                      label={t('title')}
                      value={filter}
                      onChange={setFilter}
                      options={[
                        { value: 'all', label: t('filterAll') },
                        { value: 'low', label: t('filterLow') },
                        { value: 'active', label: t('filterActive') },
                      ]}
                    />
                    <TextField
                      label={t('search')}
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      prefix={<Search className="size-4" aria-hidden="true" />}
                      wrapperClassName="min-w-56 flex-1"
                    />
                  </div>
                  <DataTable
                    label={t('title')}
                    minWidth={880}
                    head={
                      <tr>
                        <Th>{t('colCustomer')}</Th>
                        <Th right>{t('colContacts')}</Th>
                        <Th right>{t('colSent')}</Th>
                        <Th right>{t('colCredits')}</Th>
                        <Th>{t('colLast')}</Th>
                        <Th>{''}</Th>
                      </tr>
                    }
                  >
                    {rows.map((c) => (
                      <tr
                        key={c.eventId}
                        className="border-t border-border"
                        data-testid="ops-sms-row"
                      >
                        <Td wrap>
                          <span className="block font-medium">{c.title}</span>
                          <span className="block text-sm text-muted">
                            {c.ownerName} · {c.ownerPhone}
                          </span>
                        </Td>
                        <Td right>{formatNumber(c.contacts)}</Td>
                        <Td right>
                          {formatNumber(c.smsSent)}
                          {c.scheduled ? (
                            <span className="block text-sm text-muted">
                              {t('scheduled', { count: c.scheduled })}
                            </span>
                          ) : null}
                        </Td>
                        <Td right>
                          <span className="inline-flex items-center gap-2">
                            {c.remaining < LOW ? (
                              <StatusPill tone="warning">{t('lowBadge')}</StatusPill>
                            ) : null}
                            {formatNumber(c.remaining)} / {formatNumber(c.allowance)}
                          </span>
                        </Td>
                        <Td muted>
                          {c.lastSentAt ? formatRelative(c.lastSentAt, locale) : t('never')}
                        </Td>
                        <Td>
                          {canGrant ? (
                            <Button size="sm" variant="ghost" onClick={() => setGranting(c)}>
                              {t('grant')}
                            </Button>
                          ) : null}
                        </Td>
                      </tr>
                    ))}
                  </DataTable>
                </>
              )}
            </div>
          );
        }}
      </QueryState>
    </OpsPage>
  );
}
