'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, Search } from 'lucide-react';
import type { OpsLookupResult } from '@harusi/api-client';
import { OpsPage, DataTable, Td, Th, AccountStatus } from '@/components/ops/ops-ui';
import { Button } from '@/components/ui/button';
import { Banner, Card } from '@/components/ui/display';
import { TextField } from '@/components/ui/form';
import { ConfirmSheet } from '@/components/ui/overlay';
import { useToast } from '@/components/ui/toast';
import { getRepository } from '@/lib/repo';
import { OPS_ALL } from '@/lib/queries';
import { formatPhone, formatTzs } from '@/lib/format';
import { maskPhone } from '@harusi/schemas/phone';

type RevealTarget = { kind: 'guest' | 'organizer'; id: string; name: string };

export default function SupportPage() {
  const t = useTranslations('ops.support');
  const to = useTranslations('ops.organizers');
  const tpay = useTranslations('ops.payments');
  const tc = useTranslations('common');
  const ts = useTranslations('states');
  const tst = useTranslations('status');
  const toast = useToast();
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [short, setShort] = useState(false);
  const [result, setResult] = useState<OpsLookupResult | null>(null);
  const [target, setTarget] = useState<RevealTarget | null>(null);
  const [reason, setReason] = useState('');
  const [revealed, setRevealed] = useState<Record<string, string>>({});

  const search = useMutation({
    mutationFn: (query: string) => getRepository().opsLookup(query),
    onSuccess: async (r) => {
      setResult(r);
      await queryClient.invalidateQueries({ queryKey: OPS_ALL });
    },
    onError: () => toast({ tone: 'error', title: ts('errorTitle') }),
  });
  const reveal = useMutation({
    mutationFn: () =>
      getRepository().opsRevealPhone({ kind: target!.kind, id: target!.id }, reason),
    onSuccess: async (r) => {
      setRevealed((m) => ({ ...m, [target!.id]: r.phoneE164 }));
      toast({ tone: 'success', title: t('revealed', { phone: formatPhone(r.phoneE164) }) });
      setTarget(null);
      setReason('');
      await queryClient.invalidateQueries({ queryKey: OPS_ALL });
    },
    onError: () => toast({ tone: 'error', title: ts('errorTitle') }),
  });

  const none =
    result && !result.organizers.length && !result.guests.length && !result.payments.length;
  return (
    <OpsPage title={t('title')} subtitle={t('intro')}>
      <form
        className="mb-5 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim().length < 3) return setShort(true);
          setShort(false);
          search.mutate(q);
        }}
      >
        <TextField
          wrapperClassName="flex-1"
          label={t('searchLabel')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          error={short ? t('tooShort') : undefined}
          data-testid="ops-search"
        />
        <Button
          type="submit"
          icon={<Search className="size-4" aria-hidden="true" />}
          loading={search.isPending}
        >
          {t('search')}
        </Button>
      </form>

      {none ? <Banner tone="info">{t('none')}</Banner> : null}
      {result ? (
        <div className="flex flex-col gap-5" data-testid="ops-results">
          {result.organizers.length ? (
            <Card title={t('organizers')} titleId="so-h">
              <ul className="flex flex-col divide-y divide-border">
                {result.organizers.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center gap-3 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{o.name}</span>
                      <span className="text-sm text-muted">
                        {revealed[o.id] ? formatPhone(revealed[o.id]) : maskPhone(o.phoneE164)}
                      </span>
                    </span>
                    <AccountStatus status={o.status} label={to(`status.${o.status}`)} />
                    {!revealed[o.id] ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Eye className="size-4" aria-hidden="true" />}
                        onClick={() => setTarget({ kind: 'organizer', id: o.id, name: o.name })}
                      >
                        {to('reveal')}
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
          {result.guests.length ? (
            <Card title={t('guests')} titleId="sg-h">
              <ul className="flex flex-col divide-y divide-border">
                {result.guests.map((g) => (
                  <li key={g.guestId} className="flex flex-wrap items-center gap-3 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{g.displayName}</span>
                      <span className="text-sm text-muted">
                        {g.coupleNames} · <span className="font-mono">{g.shortCode}</span> ·{' '}
                        {g.phoneMasked
                          ? revealed[g.guestId]
                            ? formatPhone(revealed[g.guestId])
                            : g.phoneMasked
                          : '—'}{' '}
                        · {tst(g.status)}
                      </span>
                    </span>
                    {g.phoneMasked && !revealed[g.guestId] ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Eye className="size-4" aria-hidden="true" />}
                        onClick={() =>
                          setTarget({ kind: 'guest', id: g.guestId, name: g.displayName })
                        }
                      >
                        {to('reveal')}
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
          {result.payments.length ? (
            <Card title={t('payments')} titleId="sp-h">
              <DataTable
                label={t('payments')}
                minWidth={560}
                head={
                  <tr>
                    <Th>{tpay('col.reference')}</Th>
                    <Th>{tpay('col.guest')}</Th>
                    <Th right>{tpay('col.amount')}</Th>
                  </tr>
                }
              >
                {result.payments.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <Td>
                      <span className="font-mono text-sm">{p.reference}</span>
                    </Td>
                    <Td>
                      {p.guestName} · {p.coupleNames}
                    </Td>
                    <Td right>{formatTzs(p.amountTzs)}</Td>
                  </tr>
                ))}
              </DataTable>
            </Card>
          ) : null}
        </div>
      ) : null}

      <ConfirmSheet
        open={!!target}
        onOpenChange={(o) => {
          if (!o) {
            setTarget(null);
            setReason('');
          }
        }}
        tone="primary"
        title={target ? t('revealTitle', { name: target.name }) : ''}
        consequence={
          <div className="flex flex-col gap-3">
            <p>{t('revealBody')}</p>
            <TextField
              label={to('reason')}
              hint={to('reasonHint')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              data-testid="reveal-reason"
            />
          </div>
        }
        confirmLabel={t('revealConfirm')}
        cancelLabel={tc('cancel')}
        closeLabel={tc('close')}
        loading={reveal.isPending}
        onConfirm={() => {
          if (reason.trim().length >= 5) reveal.mutate();
        }}
      />
    </OpsPage>
  );
}
