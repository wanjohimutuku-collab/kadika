'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, MessageCircle, MessageSquare, ShieldAlert, Smartphone } from 'lucide-react';
import type { EventBillingView, PurchaseView } from '@harusi/api-client';
import { suggestBundle } from '@harusi/schemas/billing';
import { detectNetwork } from '@harusi/schemas/checkout';
import { paymentMethodsFor, type MobileMoneyMethodId } from '@harusi/schemas/country';
import type { Locale } from '@harusi/i18n';
import { PageHeader } from '@/components/console/page-header';
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
import { PhoneField } from '@/components/ui/form';
import { SegmentedControl } from '@/components/ui/navigation';
import { BottomSheet } from '@/components/ui/overlay';
import { useToast } from '@/components/ui/toast';
import { getRepository } from '@/lib/repo';
import { qk, useEventCountry, useSession } from '@/lib/queries';
import { formatDateShort, formatMoney, formatNumber } from '@/lib/format';

const NETWORK_LABEL: Record<MobileMoneyMethodId, string> = {
  mpesa: 'M-Pesa',
  mixx: 'Mixx by Yas',
  airtel: 'Airtel Money',
  halopesa: 'HaloPesa',
};

type Item = { key: string; title: string; detail: string; amount: number };

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
  const tc = useTranslations('common');
  const locale = useLocale() as Locale;
  const toast = useToast();
  const queryClient = useQueryClient();
  const session = useSession();
  const country = useEventCountry(id);
  const billing = useQuery({
    queryKey: qk.billing(id),
    queryFn: () => getRepository().getBilling(id),
  });

  const [item, setItem] = useState<Item | null>(null);
  const [method, setMethod] = useState<'mobile' | 'manual'>('mobile');
  const [phone, setPhone] = useState('');
  const [e164, setE164] = useState<string | null>(null);
  const [network, setNetwork] = useState<MobileMoneyMethodId | null>(null);
  const [waiting, setWaiting] = useState<PurchaseView | null>(null);
  const [key, setKey] = useState(() => crypto.randomUUID());

  const networks = paymentMethodsFor(country);
  useEffect(() => {
    const guess = detectNetwork(e164);
    if (guess && networks.includes(guess)) setNetwork(guess);
  }, [e164, networks]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: qk.billing(id) });
  const order = useMutation({
    mutationFn: () =>
      getRepository().orderBilling(
        id,
        method === 'mobile'
          ? { itemKey: item!.key, method, phoneE164: e164!, mobileMethod: network! }
          : { itemKey: item!.key, method },
        key,
      ),
    onSuccess: async (p) => {
      setItem(null);
      setKey(crypto.randomUUID());
      if (p.status === 'pending' && p.method === 'mobile') setWaiting(p);
      else
        toast({
          tone: 'success',
          title: p.status === 'paid' ? t('paidToast') : t('manualToast'),
        });
      await refresh();
    },
    onError: () => toast({ tone: 'error', title: ts('errorTitle') }),
  });

  // While the host approves the prompt on their phone, check every few seconds for up to 90 s.
  useEffect(() => {
    if (!waiting) return;
    const started = Date.now();
    const timer = setInterval(async () => {
      const p = await getRepository()
        .getPurchase(id, waiting.id)
        .catch(() => null);
      if (p && p.status !== 'pending') {
        setWaiting(null);
        toast(
          p.status === 'paid'
            ? { tone: 'success', title: t('paidToast') }
            : { tone: 'error', title: t('failedToast') },
        );
        await refresh();
      } else if (Date.now() - started > 90_000) {
        setWaiting(null);
        toast({ tone: 'info', title: t('slowToast') });
        await refresh();
      }
    }, 3_000);
    return () => clearInterval(timer);
    // One poll per waiting order: re-running on every render would restart the 90 s window.
  }, [waiting?.id]);

  const cancel = useMutation({
    mutationFn: (p: PurchaseView) => getRepository().cancelPurchase(id, p.id),
    onSuccess: refresh,
    onError: () => toast({ tone: 'error', title: ts('errorTitle') }),
  });

  if (session.data && session.data.role !== 'owner') {
    return <EmptyState icon={<ShieldAlert className="size-7" />} title={tn('ownerOnly')} />;
  }

  const canPay = method === 'manual' || (!!e164 && !!network);

  return (
    <>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <QueryState query={billing} skeleton={<Skeleton lines={8} />}>
        {(b) => (
          <div className="flex flex-col gap-5">
            <Meters b={b} />
            <Bundles
              b={b}
              onBuy={(x) => {
                setMethod(b.mobilePayAvailable ? 'mobile' : 'manual');
                setItem(x);
              }}
            />
            <Packs
              b={b}
              onBuy={(x) => {
                setMethod(b.mobilePayAvailable ? 'mobile' : 'manual');
                setItem(x);
              }}
            />
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

      <BottomSheet
        open={!!item}
        onOpenChange={(o) => !o && setItem(null)}
        closeLabel={tc('close')}
        title={item ? t('buyTitle', { item: item.title }) : ''}
        description={
          item ? `${item.detail} · ${formatMoney(item.amount, billing.data?.currency)}` : ''
        }
        footer={
          <Button
            className="w-full"
            size="lg"
            disabled={!canPay}
            loading={order.isPending}
            onClick={() => order.mutate()}
          >
            {method === 'mobile'
              ? t('payNow', { amount: formatMoney(item?.amount ?? 0, billing.data?.currency) })
              : t('orderManual')}
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          {billing.data?.mobilePayAvailable ? (
            <SegmentedControl
              label={t('methodLabel')}
              value={method}
              onChange={setMethod}
              options={[
                { value: 'mobile', label: t('methodMobile') },
                { value: 'manual', label: t('methodManual') },
              ]}
            />
          ) : null}
          {method === 'mobile' ? (
            <>
              <PhoneField
                label={t('phone')}
                value={phone}
                onChange={setPhone}
                onE164={setE164}
                inputMode="tel"
                autoComplete="tel"
              />
              <fieldset className="flex flex-wrap gap-2">
                <legend className="mb-2 text-sm font-medium">{t('network')}</legend>
                {networks.map((n) => (
                  <Button
                    key={n}
                    variant={network === n ? 'primary' : 'secondary'}
                    size="sm"
                    aria-pressed={network === n}
                    onClick={() => setNetwork(n)}
                  >
                    {NETWORK_LABEL[n]}
                  </Button>
                ))}
              </fieldset>
              <p className="text-sm text-muted">{t('mobileHint')}</p>
            </>
          ) : (
            <Banner tone="info">{t('manualHint')}</Banner>
          )}
        </div>
      </BottomSheet>

      <BottomSheet
        open={!!waiting}
        onOpenChange={(o) => !o && setWaiting(null)}
        closeLabel={tc('close')}
        title={t('waitingTitle')}
        description={t('waitingBody')}
      >
        <div className="flex items-center gap-3">
          <Smartphone className="size-8 text-primary" aria-hidden="true" />
          <p>{waiting ? formatMoney(waiting.amount, waiting.currency) : ''}</p>
        </div>
      </BottomSheet>
    </>
  );
}

function Meters({ b }: { b: EventBillingView }) {
  const t = useTranslations('billing');
  const rows = [
    { key: 'cards' as const, icon: <CreditCard className="size-5" aria-hidden="true" /> },
    { key: 'sms' as const, icon: <MessageSquare className="size-5" aria-hidden="true" /> },
    { key: 'whatsapp' as const, icon: <MessageCircle className="size-5" aria-hidden="true" /> },
  ];
  const low = rows.filter((r) => b.allowance[r.key] > 0 && b.remaining[r.key] === 0);
  return (
    <Card title={t('allowanceTitle')} titleId="bill-allow">
      {low.length > 0 && b.enforced ? (
        <Banner tone="warning" className="mb-4" live="polite">
          {t('usedUp', { what: low.map((r) => t(`resource.${r.key}`)).join(', ') })}
        </Banner>
      ) : null}
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
        {t('freeNote', {
          cards: formatNumber(b.free.cards),
          sms: formatNumber(b.free.sms),
          whatsapp: formatNumber(b.free.whatsapp),
        })}
      </p>
    </Card>
  );
}

function Bundles({ b, onBuy }: { b: EventBillingView; onBuy: (i: Item) => void }) {
  const t = useTranslations('billing');
  const best = useMemo(
    () => suggestBundle(b, Math.max(1, b.used.cards - b.allowance.cards + 1))?.key,
    [b],
  );
  if (b.bundles.length === 0) return null;
  return (
    <Card title={t('bundlesTitle')} titleId="bill-bundles">
      <p className="mb-4 text-muted">{t('bundlesIntro')}</p>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[...b.bundles]
          .sort((x, y) => x.cards - y.cards)
          .map((x) => {
            const detail = t('bundleDetail', {
              sms: formatNumber(x.sms),
              whatsapp: formatNumber(x.whatsapp),
            });
            return (
              <li
                key={x.key}
                className="flex flex-col gap-2 rounded-card border border-border p-4 data-[best=true]:border-primary"
                data-best={x.key === best}
              >
                <p className="text-lg font-semibold">{t('cards', { n: formatNumber(x.cards) })}</p>
                <p className="text-sm text-muted">{detail}</p>
                <p className="tabular text-xl font-bold">{formatMoney(x.amount, b.currency)}</p>
                <Button
                  variant={x.key === best ? 'primary' : 'secondary'}
                  onClick={() =>
                    onBuy({
                      key: x.key,
                      title: t('cards', { n: formatNumber(x.cards) }),
                      detail,
                      amount: x.amount,
                    })
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

function Packs({ b, onBuy }: { b: EventBillingView; onBuy: (i: Item) => void }) {
  const t = useTranslations('billing');
  if (b.packs.length === 0) return null;
  return (
    <Card title={t('packsTitle')} titleId="bill-packs">
      <p className="mb-4 text-muted">{t('packsIntro')}</p>
      <ul className="flex flex-col divide-y divide-border">
        {b.packs.map((p) => {
          const title = t(p.channel === 'sms' ? 'smsPack' : 'whatsappPack', {
            n: formatNumber(p.messages),
          });
          return (
            <li key={p.key} className="flex flex-wrap items-center gap-3 py-3">
              {p.channel === 'sms' ? (
                <MessageSquare className="size-5 text-muted" aria-hidden="true" />
              ) : (
                <MessageCircle className="size-5 text-muted" aria-hidden="true" />
              )}
              <span className="min-w-0 flex-1 font-medium">{title}</span>
              <span className="tabular font-semibold">{formatMoney(p.amount, b.currency)}</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onBuy({ key: p.key, title, detail: title, amount: p.amount })}
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
