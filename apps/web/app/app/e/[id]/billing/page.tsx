'use client';

import { use, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, MessageCircle, MessageSquare, ShieldAlert } from 'lucide-react';
import type { EventBillingView, PurchaseView } from '@harusi/api-client';
import type { Locale } from '@harusi/i18n';
import { PageHeader } from '@/components/console/page-header';
import { BuySheet, type BuyItem } from '@/components/console/buy-sheet';
import { QueryState } from '@/components/console/query-state';
import { Button } from '@/components/ui/button';
import {
  Banner,
  Card,
  EmptyState,
  ProgressBar,
  Skeleton,
  StatusPill,
} from '@/components/ui/display';
import { TextField } from '@/components/ui/form';
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

/** Kifurushi (ADR 042): what the event may use, what it used, and buying more. Owner only. */
export default function BillingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('billing');
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
  const refresh = () => queryClient.invalidateQueries({ queryKey: qk.billing(id) });

  const cancel = useMutation({
    mutationFn: (p: PurchaseView) => getRepository().cancelPurchase(id, p.id),
    onSuccess: refresh,
    onError: () => toast({ tone: 'error', title: ts('errorTitle') }),
  });

  if (session.data && session.data.role !== 'owner') {
    return <EmptyState icon={<ShieldAlert className="size-7" />} title={tn('ownerOnly')} />;
  }

  return (
    <>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <QueryState query={billing} skeleton={<Skeleton lines={8} />}>
        {(b) => (
          <div className="flex flex-col gap-5">
            <Meters b={b} />
            <BuyCards b={b} onBuy={setItem} />
            <Packs b={b} onBuy={setItem} />
            <Card title={t('history')} titleId="bill-hist">
              {b.purchases.length === 0 ? (
                <p className="text-muted">{t('historyEmpty')}</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border" data-testid="purchases">
                  {b.purchases.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{p.label}</p>
                        <p className="text-sm text-muted">
                          {formatDateShort(p.createdAt, locale)} ·{' '}
                          {p.kind === 'grant' ? t('grant') : formatMoney(p.amount, p.currency)}
                          {p.reference && p.status === 'pending' && p.method === 'manual'
                            ? ` · ${t('reference', { ref: p.reference })}`
                            : ''}
                        </p>
                      </div>
                      <StatusPill tone={STATUS_TONE[p.status]}>
                        {t(`status.${p.status}`)}
                      </StatusPill>
                      {p.status === 'pending' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={cancel.isPending && cancel.variables?.id === p.id}
                          onClick={() => cancel.mutate(p)}
                        >
                          {t('cancel')}
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}
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

function Meters({ b }: { b: EventBillingView }) {
  const t = useTranslations('billing');
  const rows = [
    { key: 'cards' as const, icon: <CreditCard className="size-5" aria-hidden="true" /> },
    { key: 'messages' as const, icon: <MessageSquare className="size-5" aria-hidden="true" /> },
  ];
  const low = rows.filter((r) => b.allowance[r.key] > 0 && b.remaining[r.key] === 0);
  return (
    <Card title={t('allowanceTitle')} titleId="bill-allow">
      {low.length > 0 && b.enforced ? (
        <Banner tone="warning" className="mb-4" live="polite">
          {t('usedUp', { what: low.map((r) => t(`resource.${r.key}`)).join(', ') })}
        </Banner>
      ) : null}
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {rows.map((r) => {
          const used = b.used[r.key];
          const all = b.allowance[r.key];
          const share = all > 0 ? used / all : used > 0 ? 1 : 0;
          return (
            <li key={r.key} className="flex flex-col gap-2">
              <span className="flex items-center gap-2 font-semibold">
                {r.icon}
                {t(`resource.${r.key}`)}
              </span>
              <ProgressBar
                value={share}
                label={t(`resource.${r.key}`)}
                valueText={t('usedOf', { used: formatNumber(used), all: formatNumber(all) })}
                tone={share >= 1 ? 'warning' : share >= 0.8 ? 'accent' : 'primary'}
              />
              <span className="tabular text-sm text-muted">
                {t('usedOf', { used: formatNumber(used), all: formatNumber(all) })} ·{' '}
                {t('left', { n: formatNumber(b.remaining[r.key]) })}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-sm text-muted">
        {t('generatedNote', { per: b.messagesPerCard })}{' '}
        {t('freeNote', {
          cards: formatNumber(b.free.cards),
          messages: formatNumber(b.free.messages),
        })}
      </p>
    </Card>
  );
}

const MAX_ORDER = 10_000;

/** Price per card for `n` cards: the tier with the largest start not above `n`. */
const priceFor = (tiers: EventBillingView['cardTiers'], n: number) =>
  tiers.filter((x) => x.minCards <= Math.max(1, n)).at(-1)?.price ?? tiers[0]?.price ?? 0;

function BuyCards({ b, onBuy }: { b: EventBillingView; onBuy: (i: BuyItem) => void }) {
  const t = useTranslations('billing');
  // Suggest what the guest list still needs, beyond what is left.
  const need = Math.max(0, b.cardsToGenerate - b.remaining.cards);
  const [raw, setRaw] = useState(String(Math.max(need, 1)));
  const n = Math.min(MAX_ORDER, Math.max(0, Math.floor(Number(raw) || 0)));
  const each = priceFor(b.cardTiers, n);
  const total = n * each;
  const tiers = b.cardTiers;
  return (
    <Card title={t('buyCardsTitle')} titleId="bill-cards">
      <p className="mb-4 text-muted">{t('buyCardsIntro', { per: b.messagesPerCard })}</p>
      {need > 0 ? (
        <Banner tone="info" className="mb-4">
          {t('needCards', { n: formatNumber(b.cardsToGenerate), need: formatNumber(need) })}
        </Banner>
      ) : null}
      <ul className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3" data-testid="card-tiers">
        {tiers.map((x, i) => {
          const next = tiers[i + 1]?.minCards;
          const active = n >= x.minCards && (next === undefined || n < next);
          return (
            <li
              key={x.minCards}
              className="rounded-card border border-border p-3 data-[active=true]:border-primary data-[active=true]:bg-primary/5"
              data-active={active}
            >
              <p className="text-sm text-muted">
                {next === undefined
                  ? t('tierFrom', { from: formatNumber(x.minCards) })
                  : t('tierRange', {
                      from: formatNumber(x.minCards),
                      to: formatNumber(next - 1),
                    })}
              </p>
              <p className="tabular text-lg font-bold">
                {t('perCard', { price: formatMoney(x.price, b.currency) })}
              </p>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-end gap-3">
        <TextField
          label={t('howMany')}
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_ORDER}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          wrapperClassName="w-40"
        />
        <div className="min-w-0 flex-1">
          <p className="tabular text-2xl font-bold" data-testid="cards-total">
            {formatMoney(total, b.currency)}
          </p>
          <p className="text-sm text-muted">
            {t('orderDetail', {
              n: formatNumber(n),
              price: formatMoney(each, b.currency),
              credits: formatNumber(n * b.messagesPerCard),
            })}
          </p>
        </div>
        <Button
          disabled={n < 1}
          onClick={() =>
            onBuy({
              order: { cards: n },
              title: t('cards', { n: formatNumber(n) }),
              detail: t('orderDetail', {
                n: formatNumber(n),
                price: formatMoney(each, b.currency),
                credits: formatNumber(n * b.messagesPerCard),
              }),
              amount: total,
            })
          }
        >
          {t('buy')}
        </Button>
      </div>
    </Card>
  );
}

function Packs({ b, onBuy }: { b: EventBillingView; onBuy: (i: BuyItem) => void }) {
  const t = useTranslations('billing');
  if (b.packs.length === 0) return null;
  return (
    <Card title={t('packsTitle')} titleId="bill-packs">
      <p className="mb-4 text-muted">{t('packsIntro')}</p>
      <ul className="flex flex-col divide-y divide-border">
        {b.packs.map((p) => {
          const title = t('creditPack', { n: formatNumber(p.messages) });
          return (
            <li key={p.key} className="flex flex-wrap items-center gap-3 py-3">
              <MessageCircle className="size-5 text-muted" aria-hidden="true" />
              <span className="min-w-0 flex-1 font-medium">{title}</span>
              <span className="tabular font-semibold">{formatMoney(p.amount, b.currency)}</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  onBuy({ order: { packKey: p.key }, title, detail: title, amount: p.amount })
                }
              >
                {t('buy')}
              </Button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
