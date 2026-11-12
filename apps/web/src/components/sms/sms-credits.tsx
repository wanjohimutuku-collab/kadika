'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquareText, ShieldAlert } from 'lucide-react';
import type { PurchaseView } from '@harusi/api-client';
import type { Locale } from '@harusi/i18n';
import { PageHeader } from '@/components/console/page-header';
import { BuySheet, type BuyItem } from '@/components/console/buy-sheet';
import { QueryState } from '@/components/console/query-state';
import { Button } from '@/components/ui/button';
import {
  Card,
  EmptyState,
  KpiTile,
  ProgressBar,
  Skeleton,
  StatusPill,
} from '@/components/ui/display';
import { useToast } from '@/components/ui/toast';
import { getRepository } from '@/lib/repo';
import { qk, useSession } from '@/lib/queries';
import { formatDateShort, formatMoney, formatNumber } from '@/lib/format';

const STATUS_TONE = {
  pending: 'warning',
  paid: 'success',
  failed: 'danger',
  cancelled: 'neutral',
} as const;

/**
 * Vifurushi for an SMS-reminders-only customer (ADR 055): SMS left and the SMS packages staff price in
 * /ops/billing. No card bundles: this customer never generates a card.
 */
export function SmsCredits({ id }: { id: string }) {
  const t = useTranslations('sms.credits');
  const tb = useTranslations('billing');
  const tn = useTranslations('nav');
  const ts = useTranslations('states');
  const locale = useLocale() as Locale;
  const toast = useToast();
  const queryClient = useQueryClient();
  const session = useSession();
  const billing = useQuery({
    queryKey: qk.billing(id),
    queryFn: () => getRepository().getBilling(id),
  });
  const [item, setItem] = useState<BuyItem | null>(null);
  const cancel = useMutation({
    mutationFn: (p: PurchaseView) => getRepository().cancelPurchase(id, p.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.billing(id) }),
    onError: () => toast({ tone: 'error', title: ts('errorTitle') }),
  });

  if (session.data && session.data.role !== 'owner') {
    return <EmptyState icon={<ShieldAlert className="size-7" />} title={tn('ownerOnly')} />;
  }

  return (
    <>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <QueryState query={billing} skeleton={<Skeleton lines={8} />}>
        {(b) => {
          const all = b.allowance.messages;
          const used = b.used.messages;
          const share = all > 0 ? used / all : used > 0 ? 1 : 0;
          return (
            <div className="flex flex-col gap-5" data-testid="sms-credits">
              <Card>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-[200px_1fr] sm:items-center">
                  <KpiTile
                    label={t('left')}
                    tone="primary"
                    value={formatNumber(b.remaining.messages)}
                  />
                  <div className="flex flex-col gap-2">
                    <ProgressBar
                      value={share}
                      label={t('left')}
                      valueText={tb('usedOf', {
                        used: formatNumber(used),
                        all: formatNumber(all),
                      })}
                      tone={share >= 1 ? 'warning' : share >= 0.8 ? 'accent' : 'primary'}
                    />
                    <span className="tabular text-sm text-muted">
                      {tb('usedOf', { used: formatNumber(used), all: formatNumber(all) })}
                    </span>
                  </div>
                </div>
              </Card>

              <Card title={tb('packsTitle')} titleId="sms-packs">
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2" data-testid="sms-packs">
                  {b.packs.map((p) => {
                    const title = t('pack', { count: formatNumber(p.messages) });
                    return (
                      <li
                        key={p.key}
                        className="flex flex-col gap-3 rounded-card border border-border p-4"
                      >
                        <span className="flex items-center gap-2 text-lg font-semibold">
                          <MessageSquareText className="size-5 text-primary" aria-hidden="true" />
                          {title}
                        </span>
                        <span className="tabular text-2xl font-bold">
                          {formatMoney(p.amount, b.currency)}
                        </span>
                        <span className="text-sm text-muted">
                          {t('each', {
                            price: formatMoney(Math.round(p.amount / p.messages), b.currency),
                          })}
                        </span>
                        <Button
                          onClick={() =>
                            setItem({
                              order: { packKey: p.key },
                              title,
                              detail: title,
                              amount: p.amount,
                            })
                          }
                        >
                          {tb('buy')}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </Card>

              <Card title={tb('history')} titleId="sms-bill-hist">
                {b.purchases.length === 0 ? (
                  <p className="text-muted">{tb('historyEmpty')}</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-border">
                    {b.purchases.map((p) => (
                      <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">
                            {p.kind === 'grant'
                              ? tb('grant')
                              : t('pack', { count: formatNumber(p.adds.messages) })}
                          </p>
                          <p className="text-sm text-muted">
                            {formatDateShort(p.createdAt, locale)}
                            {p.kind === 'grant' ? '' : ` · ${formatMoney(p.amount, p.currency)}`}
                            {p.reference && p.status === 'pending' && p.method === 'manual'
                              ? ` · ${tb('reference', { ref: p.reference })}`
                              : ''}
                          </p>
                        </div>
                        <StatusPill tone={STATUS_TONE[p.status]}>
                          {tb(`status.${p.status}`)}
                        </StatusPill>
                        {p.status === 'pending' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            loading={cancel.isPending && cancel.variables?.id === p.id}
                            onClick={() => cancel.mutate(p)}
                          >
                            {tb('cancel')}
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          );
        }}
      </QueryState>
      <BuySheet
        eventId={id}
        item={item}
        currency={billing.data?.currency ?? 'TZS'}
        mobilePayAvailable={!!billing.data?.mobilePayAvailable}
        onClose={() => setItem(null)}
      />
    </>
  );
}
