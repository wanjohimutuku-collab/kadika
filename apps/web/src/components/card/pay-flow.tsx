'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, CheckCircle2, Clock, ShieldCheck, XCircle } from 'lucide-react';
import type { CardView, PaymentStart, PaymentStatusView } from '@harusi/api-client';
import type { PaymentMethod } from '@harusi/schemas';
import { onlinePaymentLimits, paymentMethodsFor } from '@harusi/schemas/country';
import { detectNetwork, quickAmounts } from '@harusi/schemas/checkout';
import { parsePhone } from '@/lib/country';
import type { Locale } from '@harusi/i18n';
import { BrandMark } from '@/components/brand/brand-provider';
import { Button, buttonClasses } from '@/components/ui/button';
import { Banner, Skeleton } from '@/components/ui/display';
import { PhoneField, TextField } from '@/components/ui/form';
import { formatDateTimeShort, formatMoney, formatPhone } from '@/lib/format';
import { themeStyle } from '@/lib/theme';
import { readCachedCard } from '@/lib/card-cache';
import { cn } from '@/lib/cn';

const WAIT_SECONDS = 60;

type Step =
  | { kind: 'form' }
  | { kind: 'waiting'; start: PaymentStart }
  | { kind: 'result'; status: PaymentStatusView }
  | { kind: 'timeout'; start: PaymentStart };

const loadRepo = () => import('@/lib/repo');

export function PayFlow({ token }: { token: string }) {
  const t = useTranslations('pay');
  const tv = useTranslations('validation');
  const tc = useTranslations('common');
  const ts = useTranslations('states');
  const locale = useLocale() as Locale;
  const [card, setCard] = useState<CardView | null>(null);
  const currency = card?.event?.currency ?? 'TZS';
  const country = card?.event?.country ?? 'TZ';
  const minAmount = onlinePaymentLimits(country).min;
  const [loadError, setLoadError] = useState(false);
  const [step, setStep] = useState<Step>({ kind: 'form' });
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('mpesa');
  const [changeNetwork, setChangeNetwork] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string; phone?: string; submit?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [seconds, setSeconds] = useState(WAIT_SECONDS);
  const [checking, setChecking] = useState(false);
  const [notYet, setNotYet] = useState(false);
  const idem = useRef<string>('');
  const heading = useRef<HTMLHeadingElement>(null);

  const loadCard = useCallback(async () => {
    setLoadError(false);
    try {
      const { getRepository } = await loadRepo();
      const v = await getRepository().getCard(token);
      setCard(v);
      // A suggested amount on the card links here with `?amount=`; otherwise offer the open balance.
      const asked = Number(new URLSearchParams(window.location.search).get('amount'));
      if (Number.isInteger(asked) && asked > 0) setAmount(String(asked));
      else if (v.pledge?.balance) setAmount(String(v.pledge.balance));
    } catch {
      const cached = readCachedCard(token);
      if (cached) setCard(cached.view);
      setLoadError(true);
    }
  }, [token]);

  useEffect(() => {
    void loadCard();
  }, [loadCard]);

  useEffect(() => {
    heading.current?.focus();
  }, [step.kind]);

  const check = useCallback(async (reference: string, manual: boolean) => {
    if (manual) setChecking(true);
    try {
      const { getRepository } = await loadRepo();
      const s = await getRepository().getPaymentStatus(reference);
      if (s.status === 'success' || s.status === 'failed') setStep({ kind: 'result', status: s });
      else if (manual) setNotYet(true);
      return s;
    } catch {
      if (manual) setNotYet(true);
      return null;
    } finally {
      if (manual) setChecking(false);
    }
  }, []);

  // Poll every 2 s while waiting; time out after 60 s (§17.6).
  useEffect(() => {
    if (step.kind !== 'waiting') return;
    setSeconds(WAIT_SECONDS);
    setNotYet(false);
    const started = Date.now();
    const tick = setInterval(() => {
      const left = Math.max(0, WAIT_SECONDS - Math.floor((Date.now() - started) / 1000));
      setSeconds(left);
      if (left === 0) {
        clearInterval(tick);
        setStep({ kind: 'timeout', start: step.start });
      }
    }, 1000);
    const poll = setInterval(() => void check(step.start.reference, false), 2000);
    // The PIN is entered in the phone's own prompt, often in another app: when the guest comes back,
    // ask straight away rather than waiting for the next tick.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check(step.start.reference, false);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [step, check]);

  // The network is guessed from the number (never for Kenya); the guest can always change it.
  const parsedPhone = useMemo(() => parsePhone(phone, country), [phone, country]);
  const guessed = parsedPhone.ok ? detectNetwork(parsedPhone.e164) : null;
  const detected = guessed && paymentMethodsFor(country).includes(guessed) ? guessed : null;
  const chosen: PaymentMethod = !changeNetwork && detected ? detected : method;
  const amountN = Number(amount.replace(/[^\d]/g, ''));
  const amountOk = Number.isInteger(amountN) && amountN >= minAmount;

  const submit = async () => {
    const next: typeof errors = {};
    const n = Number(amount.replace(/[^\d]/g, ''));
    if (!amount.trim() || !Number.isFinite(n)) next.amount = tv('amount.invalid');
    else if (n < minAmount)
      next.amount = tv('amount.min', {
        min: formatMoney(minAmount, currency).replace(`${currency} `, ''),
      });
    const p = parsePhone(phone, country);
    if (!p.ok) next.phone = tv(`phone.${p.error}`);
    setErrors(next);
    if (next.amount || next.phone || !p.ok) return;
    setSubmitting(true);
    try {
      const { getRepository, newIdempotencyKey } = await loadRepo();
      idem.current ||= newIdempotencyKey();
      const start = await getRepository().startPayment(
        token,
        { amount: n, phoneE164: p.e164, method: chosen },
        idem.current,
      );
      idem.current = '';
      setStep({ kind: 'waiting', start });
    } catch (e) {
      const offline = (e as { code?: string })?.code === 'offline';
      setErrors({ submit: offline ? ts('offlineBanner') : ts('errorBody') });
    } finally {
      setSubmitting(false);
    }
  };

  const back = (
    <a
      href={`/c/${token}`}
      className="inline-flex min-h-12 items-center gap-2 font-semibold text-primary"
    >
      <ArrowLeft className="size-5" aria-hidden="true" />
      {t('back')}
    </a>
  );

  if (!card) {
    return (
      <main className="mx-auto flex max-w-lg flex-col gap-4 p-4" aria-busy="true">
        {loadError ? (
          <Banner
            tone="error"
            title={ts('errorTitle')}
            action={
              <Button size="sm" variant="secondary" onClick={loadCard}>
                {tc('retry')}
              </Button>
            }
          />
        ) : (
          <>
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-48" />
          </>
        )}
      </main>
    );
  }

  const providerName = (m: PaymentMethod) => t(`providers.${m}`);

  return (
    <div style={themeStyle(card.event?.themeId, card.event?.palette)} className="min-h-dvh bg-bg">
      <main
        className="mx-auto flex max-w-lg flex-col gap-4 bg-surface p-5 md:my-6 md:rounded-2xl md:border md:border-border"
        data-testid="pay-flow"
      >
        <div className="flex items-center justify-between gap-3">
          {back}
          <BrandMark className="text-base" logoClassName="max-h-8" />
        </div>
        {card.state !== 'ok' || !card.event?.pledgesEnabled ? (
          <Banner tone="warning">{t('noPledges')}</Banner>
        ) : step.kind === 'form' ? (
          <form
            noValidate
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold outline-none">
              {t('title')}
            </h1>
            {card.event ? <p className="text-muted">{card.event.coupleNames}</p> : null}
            <TextField
              label={t('amount')}
              inputMode="numeric"
              prefix={currency}
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d,]/g, ''))}
              hint={
                card.pledge?.balance
                  ? t('amountHelp', { balance: formatMoney(card.pledge.balance, currency) })
                  : undefined
              }
              error={errors.amount}
              name="amount"
              enterKeyHint="next"
            />
            <div className="-mt-2 flex flex-col gap-1.5">
              <span className="text-sm font-semibold">{t('quick')}</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="pay-quick">
                {quickAmounts(country, card.pledge?.balance).map((n) => {
                  const isBalance = n === card.pledge?.balance;
                  return (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={amountN === n}
                      onClick={() => {
                        setAmount(String(n));
                        setErrors((e) => ({ ...e, amount: undefined }));
                      }}
                      className={cn(
                        'flex min-h-12 flex-col items-center justify-center rounded-input border-2 px-2 text-sm font-semibold tabular',
                        amountN === n ? 'border-primary bg-primary/6' : 'border-border',
                      )}
                    >
                      {formatMoney(n, currency).replace(`${currency} `, '')}
                      {isBalance ? (
                        <span className="text-xs font-normal text-muted">{t('useBalance')}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
            <PhoneField
              country={country}
              label={t('phone')}
              value={phone}
              onChange={setPhone}
              hint={t('phoneHelp')}
              error={errors.phone}
              name="phone"
            />
            {detected && !changeNetwork ? (
              <div
                className="flex items-center justify-between gap-3 rounded-input bg-primary/6 px-3 py-2"
                data-testid="pay-network-detected"
              >
                <p className="text-sm">
                  {t('networkDetected', { provider: providerName(detected) })}
                </p>
                <button
                  type="button"
                  className="min-h-10 shrink-0 px-2 text-sm font-semibold text-primary underline"
                  onClick={() => {
                    setMethod(detected);
                    setChangeNetwork(true);
                  }}
                >
                  {t('networkChange')}
                </button>
              </div>
            ) : (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-sm font-semibold">{t('provider')}</legend>
                <div className="grid grid-cols-2 gap-2">
                  {paymentMethodsFor(country).map((m) => (
                    <label
                      key={m}
                      className={cn(
                        'flex min-h-14 cursor-pointer items-center gap-2 rounded-input border-2 px-3 font-semibold',
                        method === m ? 'border-primary bg-primary/6' : 'border-border',
                      )}
                    >
                      <input
                        type="radio"
                        name="method"
                        value={m}
                        checked={method === m}
                        onChange={() => setMethod(m)}
                        className="size-5 accent-[var(--hp-primary)]"
                      />
                      {providerName(m)}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <p className="flex items-start gap-2 text-sm text-muted">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
              {t('safety')}
            </p>
            {errors.submit ? (
              <Banner tone="error" live="assertive">
                {errors.submit}
              </Banner>
            ) : null}
            <div className="sticky bottom-0 -mx-5 -mb-5 border-t border-border bg-surface/95 px-5 py-3 backdrop-blur md:static md:mx-0 md:mb-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
              <Button type="submit" size="lg" block loading={submitting} data-testid="pay-submit">
                {amountOk
                  ? t('submitAmount', { amount: formatMoney(amountN, currency) })
                  : t('submit')}
              </Button>
            </div>
          </form>
        ) : step.kind === 'waiting' ? (
          <section
            className="flex flex-col items-center gap-4 py-4 text-center"
            aria-live="polite"
            data-testid="pay-waiting"
          >
            <span
              className="flex size-16 items-center justify-center rounded-full bg-primary/10"
              aria-hidden="true"
            >
              <Clock className="size-8 text-primary" />
            </span>
            <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold outline-none">
              {t('waitingTitle')}
            </h1>
            <p>
              {t('waitingBody', {
                amount: formatMoney(step.start.amount, currency),
                phone: formatPhone(step.start.phoneE164),
                provider: providerName(step.start.method),
              })}
            </p>
            <p className="tabular text-lg font-semibold" aria-live="off">
              {t('countdown', { seconds })}
            </p>
            {notYet ? <Banner tone="warning">{t('notYet')}</Banner> : null}
            <Button
              variant="secondary"
              block
              onClick={() => void check(step.start.reference, true)}
              loading={checking}
              loadingLabel={t('checking')}
            >
              {t('iPaid')}
            </Button>
          </section>
        ) : step.kind === 'timeout' ? (
          <section
            className="flex flex-col items-center gap-4 py-4 text-center"
            data-testid="pay-timeout"
          >
            <Clock className="size-12 text-warning" aria-hidden="true" />
            <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold outline-none">
              {t('timeoutTitle')}
            </h1>
            <p>{t('timeoutBody')}</p>
            {notYet ? <Banner tone="warning">{t('notYet')}</Banner> : null}
            <Button
              block
              variant="secondary"
              onClick={() => void check(step.start.reference, true)}
              loading={checking}
              loadingLabel={t('checking')}
            >
              {t('iPaid')}
            </Button>
            <Button block onClick={() => setStep({ kind: 'form' })}>
              {t('tryAgain')}
            </Button>
          </section>
        ) : step.status.status === 'success' ? (
          <section className="flex flex-col gap-4 py-2" data-testid="pay-success">
            <div className="flex flex-col items-center gap-2 text-center">
              <CheckCircle2 className="size-14 text-success" aria-hidden="true" />
              <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold outline-none">
                {t('successTitle')}
              </h1>
              <p>{t('successBody', { amount: formatMoney(step.status.amount, currency) })}</p>
            </div>
            <dl className="grid grid-cols-1 gap-3 rounded-card border border-border p-4">
              <p className="font-semibold">{t('receipt')}</p>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">{t('reference')}</dt>
                <dd className="font-mono font-semibold" data-testid="pay-reference">
                  {step.status.reference}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">{t('method')}</dt>
                <dd>{providerName(step.status.method)}</dd>
              </div>
              {step.status.paidAt ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">{t('paidAt')}</dt>
                  <dd>{formatDateTimeShort(step.status.paidAt, locale)}</dd>
                </div>
              ) : null}
              {step.status.newBalance !== null ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">{t('newBalance')}</dt>
                  <dd className="font-semibold">{formatMoney(step.status.newBalance, currency)}</dd>
                </div>
              ) : null}
            </dl>
            {step.status.duplicateWebhook ? (
              <Banner tone="info">{t('duplicateNote')}</Banner>
            ) : null}
            <a href={`/c/${token}`} className={buttonClasses('primary', 'lg', 'w-full')}>
              {t('backToCard')}
            </a>
          </section>
        ) : (
          <section
            className="flex flex-col items-center gap-4 py-4 text-center"
            data-testid="pay-declined"
          >
            <XCircle className="size-14 text-danger" aria-hidden="true" />
            <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold outline-none">
              {t('declinedTitle')}
            </h1>
            <p>{t('declinedBody')}</p>
            <Button block onClick={() => setStep({ kind: 'form' })}>
              {t('tryAgain')}
            </Button>
            <a href={`/c/${token}`} className={buttonClasses('secondary', 'md', 'w-full')}>
              {t('backToCard')}
            </a>
          </section>
        )}
      </main>
    </div>
  );
}
