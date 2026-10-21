'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Smartphone } from 'lucide-react';
import type { PurchaseView } from '@harusi/api-client';
import { detectNetwork } from '@harusi/schemas/checkout';
import { paymentMethodsFor, type MobileMoneyMethodId } from '@harusi/schemas/country';
import type { Currency } from '@harusi/schemas/country';
import { Button } from '@/components/ui/button';
import { Banner } from '@/components/ui/display';
import { PhoneField } from '@/components/ui/form';
import { SegmentedControl } from '@/components/ui/navigation';
import { BottomSheet } from '@/components/ui/overlay';
import { useToast } from '@/components/ui/toast';
import { getRepository } from '@/lib/repo';
import { qk, useEventCountry } from '@/lib/queries';
import { formatMoney } from '@/lib/format';

const NETWORK_LABEL: Record<MobileMoneyMethodId, string> = {
  mpesa: 'M-Pesa',
  mixx: 'Mixx by Yas',
  airtel: 'Airtel Money',
  halopesa: 'HaloPesa',
};

/** What the host is about to buy (ADR 042). */
export interface BuyItem {
  order: { cards: number } | { packKey: string };
  title: string;
  detail: string;
  amount: number;
}

/**
 * Paying for cards or reminders: by phone (a mobile-money prompt, then a short wait while the host
 * approves it) or by bank or cash (an order staff confirm). Shared by the Plan page and the welcome
 * flow after creating an event.
 */
export function BuySheet({
  eventId,
  item,
  currency,
  mobilePayAvailable,
  onClose,
  onPaid,
}: {
  eventId: string;
  item: BuyItem | null;
  currency: Currency;
  mobilePayAvailable: boolean;
  onClose: () => void;
  /** Called once the order is paid, or placed for staff to confirm (`manual`). */
  onPaid?: (p: PurchaseView) => void;
}) {
  const t = useTranslations('billing');
  const ts = useTranslations('states');
  const tc = useTranslations('common');
  const toast = useToast();
  const queryClient = useQueryClient();
  const country = useEventCountry(eventId);
  const networks = paymentMethodsFor(country);
  const [method, setMethod] = useState<'mobile' | 'manual'>(
    mobilePayAvailable ? 'mobile' : 'manual',
  );
  const [phone, setPhone] = useState('');
  const [e164, setE164] = useState<string | null>(null);
  const [network, setNetwork] = useState<MobileMoneyMethodId | null>(null);
  const [waiting, setWaiting] = useState<PurchaseView | null>(null);
  const [key, setKey] = useState(() => crypto.randomUUID());

  useEffect(() => setMethod(mobilePayAvailable ? 'mobile' : 'manual'), [mobilePayAvailable]);
  useEffect(() => {
    const guess = detectNetwork(e164);
    if (guess && networks.includes(guess)) setNetwork(guess);
  }, [e164, networks]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: qk.billing(eventId) });
  const done = async (p: PurchaseView) => {
    await refresh();
    onPaid?.(p);
  };
  const order = useMutation({
    mutationFn: () =>
      getRepository().orderBilling(
        eventId,
        method === 'mobile'
          ? { ...item!.order, method, phoneE164: e164!, mobileMethod: network! }
          : { ...item!.order, method },
        key,
      ),
    onSuccess: async (p) => {
      onClose();
      setKey(crypto.randomUUID());
      if (p.status === 'pending' && p.method === 'mobile') {
        setWaiting(p);
        return;
      }
      toast({ tone: 'success', title: p.status === 'paid' ? t('paidToast') : t('manualToast') });
      await done(p);
    },
    onError: () => toast({ tone: 'error', title: ts('errorTitle') }),
  });

  // While the host approves the prompt on their phone, check every few seconds for up to 90 s.
  useEffect(() => {
    if (!waiting) return;
    const started = Date.now();
    const timer = setInterval(async () => {
      const p = await getRepository()
        .getPurchase(eventId, waiting.id)
        .catch(() => null);
      if (p && p.status !== 'pending') {
        setWaiting(null);
        if (p.status === 'paid') {
          toast({ tone: 'success', title: t('paidToast') });
          await done(p);
        } else {
          toast({ tone: 'error', title: t('failedToast') });
          await refresh();
        }
      } else if (Date.now() - started > 90_000) {
        setWaiting(null);
        toast({ tone: 'info', title: t('slowToast') });
        await refresh();
      }
    }, 3_000);
    return () => clearInterval(timer);
    // One poll per waiting order: re-running on every render would restart the 90 s window.
  }, [waiting?.id]);

  const canPay = method === 'manual' || (!!e164 && !!network);

  return (
    <>
      <BottomSheet
        open={!!item}
        onOpenChange={(o) => !o && onClose()}
        closeLabel={tc('close')}
        title={item ? t('buyTitle', { item: item.title }) : ''}
        description={item ? `${item.detail} · ${formatMoney(item.amount, currency)}` : ''}
        footer={
          <Button
            className="w-full"
            size="lg"
            disabled={!canPay}
            loading={order.isPending}
            onClick={() => order.mutate()}
            data-testid="buy-submit"
          >
            {method === 'mobile'
              ? t('payNow', { amount: formatMoney(item?.amount ?? 0, currency) })
              : t('orderManual')}
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          {mobilePayAvailable ? (
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
        <div className="flex items-center gap-3" role="status" aria-busy="true">
          <Smartphone className="size-8 text-primary" aria-hidden="true" />
          <p>{waiting ? formatMoney(waiting.amount, waiting.currency) : ''}</p>
        </div>
      </BottomSheet>
    </>
  );
}
