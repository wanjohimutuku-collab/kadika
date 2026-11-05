'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Check, Lock, MessageSquare, ShieldCheck } from 'lucide-react';
import { isRepositoryError } from '@harusi/api-client';
import { SIGN_IN_COUNTRIES, type Country } from '@harusi/schemas/country';
import { parsePhone } from '@/lib/country';
import type { Locale } from '@harusi/i18n';
import { Button, Spinner } from '@/components/ui/button';
import { Banner } from '@/components/ui/display';
import { QrBlock } from '@/components/ui/qr-block';
import { OtpField, PhoneField, Select, TextField, type OtpStatus } from '@/components/ui/form';
import { cn } from '@/lib/cn';
import { formatClock, formatPhone } from '@/lib/format';
import { getRepository } from '@/lib/repo';
import { USE_MOCKS } from '@/lib/env';
import { useBrand } from '@/components/brand/brand-provider';
import {
  clearSmsFallback,
  confirmPhoneCode,
  FirebasePhoneError,
  hasPendingCode,
  loadAuthConfig,
  smsLanguage,
  startPhoneSignIn,
  usesSmsFallback,
  type PhoneSignInError,
} from '@/lib/firebase-phone';

const PHONE_KEY = 'harusi.login.phone';

/**
 * Sends the code through whichever provider the API names (ADR 048). Says who checks it: Firebase, or
 * our API (the SMS flow, or Firebase refused to send and our own SMS code went instead).
 */
async function sendCode(
  phone: string,
  recaptcha: HTMLElement | null,
  locale: string,
): Promise<'firebase' | 'sms'> {
  const cfg = await loadAuthConfig();
  if (cfg.otpProvider === 'firebase') {
    if (!recaptcha) throw new FirebasePhoneError('failed');
    return startPhoneSignIn(phone, recaptcha, locale);
  }
  await getRepository().requestOtp(phone, { language: smsLanguage(locale) });
  return 'sms';
}

function useFirebaseMessage() {
  const t = useTranslations('auth');
  const ts = useTranslations('states');
  const tv = useTranslations('validation');
  return (reason: PhoneSignInError) =>
    reason === 'invalid_phone'
      ? tv('phone.invalid_chars')
      : reason === 'wrong_code'
        ? t('wrongCodeRetry')
        : reason === 'expired'
          ? t('codeExpired')
          : reason === 'too_many'
            ? t('tooManyRequests')
            : ts('errorBody');
}

function safeNext(next: string | null): string {
  return next && (next.startsWith('/app') || next.startsWith('/ops')) ? next : '/app';
}

export function LoginPhone() {
  const t = useTranslations('auth');
  const tv = useTranslations('validation');
  const ts = useTranslations('states');
  const router = useRouter();
  const params = useSearchParams();
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState<Country>('TZ');
  const tcm = useTranslations('common');
  const brand = useBrand().brand.businessName;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const locale = useLocale();
  const recaptcha = useRef<HTMLDivElement>(null);
  const firebaseMessage = useFirebaseMessage();
  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-10">
      <h1 className="text-3xl font-semibold">{t('title', { brand })}</h1>
      <p className="text-muted">{t('subtitle')}</p>
      {USE_MOCKS ? (
        <Banner tone="info">
          {t('mockPhoneHint')} {t('staffHint', { brand })}
        </Banner>
      ) : null}
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = parsePhone(phone, country, SIGN_IN_COUNTRIES);
          if (!r.ok) {
            setError(tv(`phone.${r.error}`));
            return;
          }
          setBusy(true);
          setError(null);
          try {
            await sendCode(r.e164, recaptcha.current, locale);
          } catch (err) {
            if (err instanceof FirebasePhoneError) {
              setError(firebaseMessage(err.reason));
              setBusy(false);
              return;
            } else if (isRepositoryError(err) && err.code === 'rate_limited') {
              // A code was already sent recently: continue to the code screen.
            } else if (isRepositoryError(err) && err.code === 'locked') {
              setError(
                t('locked', {
                  time: formatClock(String(err.details?.until ?? new Date().toISOString())),
                }),
              );
              setBusy(false);
              return;
            } else {
              setError(
                isRepositoryError(err) && err.code === 'offline'
                  ? ts('offlineBanner')
                  : ts('errorBody'),
              );
              setBusy(false);
              return;
            }
          }
          sessionStorage.setItem(PHONE_KEY, r.e164);
          // Keep `next` only when the visitor came from a protected page; staff without one land on /ops.
          const next = params.get('next');
          router.push(
            next ? `/login/otp?next=${encodeURIComponent(safeNext(next))}` : '/login/otp',
          );
        }}
      >
        {/* Kenyan numbers sign in even while the Kenya product is off. */}
        <Select
          label={tcm('country')}
          value={country}
          onChange={(e) => setCountry(e.target.value as Country)}
          options={SIGN_IN_COUNTRIES.map((c) => ({
            value: c,
            label: tcm(`countries.${c}`),
          }))}
        />
        <PhoneField
          country={country}
          label={t('phone')}
          hint={t('phoneHint')}
          value={phone}
          onChange={setPhone}
          error={error ?? undefined}
          name="phone"
          autoFocus
        />
        <Button type="submit" size="lg" block loading={busy} data-testid="send-code">
          {t('sendCode')}
        </Button>
        {/* Invisible reCAPTCHA for Firebase Phone Auth (ADR 048); empty otherwise. */}
        <div ref={recaptcha} />
      </form>
      <p className="flex items-start gap-2 text-sm text-muted">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
        {t('trust')}
      </p>
    </main>
  );
}

export function LoginOtp() {
  const t = useTranslations('auth');
  const brandName = useBrand().brand.businessName;
  const ts = useTranslations('states');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const params = useSearchParams();
  const [phone, setPhone] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  /** The code was accepted: the cells turn green while the next page loads. */
  const [verified, setVerified] = useState(false);
  /** Shown under the card so the visitor can check the address (P7); read after mount. */
  const [host, setHost] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(30);
  const [notice, setNotice] = useState<string | null>(null);
  const [needsName, setNeedsName] = useState(false);
  const [secondFactor, setSecondFactor] = useState(false);
  /** Staff without an authenticator yet (ADR 040): the secret to scan, once it has loaded. */
  const [enrolment, setEnrolment] = useState<
    { status: 'none' } | { status: 'loading' } | { status: 'ready'; secret: string; url: string }
  >({ status: 'none' });
  const [name, setName] = useState('');
  const recaptcha = useRef<HTMLDivElement>(null);
  const firebaseMessage = useFirebaseMessage();
  /** Firebase sent the code (ADR 048): it checks it, then the API trades the ID token. */
  const [firebase, setFirebase] = useState(false);

  useEffect(() => {
    const p = sessionStorage.getItem(PHONE_KEY);
    if (!p) {
      router.replace('/login');
      return;
    }
    setPhone(p);
    setHost(window.location.host);
    void loadAuthConfig().then((cfg) => {
      // Our own SMS code (Firebase refused to send) is checked by our API, as in the SMS flow.
      if (cfg.otpProvider !== 'firebase' || usesSmsFallback(p)) return;
      // The Firebase code lives in this tab only: after a reload the visitor asks for a new one.
      if (!hasPendingCode(p)) router.replace('/login');
      else setFirebase(true);
    });
  }, [router]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  const verify = async (value: string) => {
    if (!phone || value.length !== 6 || locked) return;
    setBusy(true);
    setError(null);
    try {
      const session = firebase
        ? await getRepository().signInWithFirebase(await confirmPhoneCode(value))
        : await getRepository().verifyOtp(phone, value);
      sessionStorage.removeItem(PHONE_KEY);
      clearSmsFallback();
      // The cells turn green before the next step, so the visitor sees the code was accepted.
      setBusy(false);
      setVerified(true);
      if (session.needsSecondFactor || !session.user.name) {
        await new Promise((r) => setTimeout(r, 600));
        setVerified(false);
      }
      if (session.needsSecondFactor) {
        // Staff accounts need a second factor before any data is available.
        setSecondFactor(true);
        setCode('');
        if (session.secondFactorEnrolled === false) {
          setEnrolment({ status: 'loading' });
          try {
            const e = await getRepository().startStaffEnrolment();
            setEnrolment({ status: 'ready', secret: e.secret, url: e.otpauthUrl });
          } catch {
            setEnrolment({ status: 'none' });
            setError(ts('errorBody'));
          }
        }
        return;
      }
      if (!session.user.name) {
        setNeedsName(true);
        return;
      }
      router.replace(
        session.user.roleGlobal === 'admin' && !params.get('next')
          ? '/ops'
          : safeNext(params.get('next')),
      );
    } catch (err) {
      setCode('');
      if (err instanceof FirebasePhoneError) {
        setError(firebaseMessage(err.reason));
      } else if (isRepositoryError(err) && err.code === 'locked') {
        setLocked(true);
        setError(
          t('locked', {
            time: formatClock(String(err.details?.until ?? new Date().toISOString())),
          }),
        );
      } else if (isRepositoryError(err) && err.code === 'validation') {
        setError(t('wrongCode', { attempts: Number(err.details?.attemptsLeft ?? 0) }));
      } else if (isRepositoryError(err) && err.code === 'forbidden') {
        setError(t('suspended', { brand: brandName }));
      } else {
        setError(
          isRepositoryError(err) && err.code === 'offline' ? ts('offlineBanner') : ts('errorBody'),
        );
      }
      setBusy(false);
    }
  };

  const verifyStaff = async (value: string) => {
    if (value.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      await getRepository().verifyStaffSecondFactor(value);
      router.replace(params.get('next') ? safeNext(params.get('next')) : '/ops');
    } catch (err) {
      setCode('');
      if (isRepositoryError(err) && err.code === 'locked') {
        setLocked(true);
        setError(
          t('staffLocked', {
            time: formatClock(String(err.details?.until ?? new Date().toISOString())),
          }),
        );
      } else if (isRepositoryError(err) && err.code === 'unauthorized') {
        setError(t('staffExpired'));
      } else if (isRepositoryError(err) && typeof err.details?.attemptsLeft === 'number') {
        setError(t('staffWrongCode', { attempts: err.details.attemptsLeft }));
      } else if (isRepositoryError(err) && err.code === 'offline') {
        setError(ts('offlineBanner'));
      } else {
        setError(t('wrongStaffCode'));
      }
      setBusy(false);
    }
  };

  if (secondFactor) {
    return (
      <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-10" data-testid="second-factor">
        {enrolment.status === 'none' ? (
          <>
            <h1 className="text-3xl font-semibold">{t('secondFactorTitle')}</h1>
            <p>{t('secondFactorBody')}</p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-semibold">{t('enrolTitle')}</h1>
            <p>{t('enrolBody')}</p>
            {enrolment.status === 'loading' ? (
              <p className="text-muted" role="status">
                {t('enrolLoading')}
              </p>
            ) : (
              <div className="flex flex-col items-center gap-3" data-testid="totp-enrol">
                <QrBlock payload={enrolment.url} alt={t('enrolQrAlt')} size={220} />
                <p className="text-sm text-muted">{t('enrolSecretLabel')}</p>
                <code className="break-all rounded-input border border-border bg-surface px-3 py-2 text-center font-mono text-base tracking-wider">
                  {enrolment.secret.replace(/(.{4})/g, '$1 ').trim()}
                </code>
              </div>
            )}
          </>
        )}
        {USE_MOCKS ? <Banner tone="info">{t('secondFactorMock')}</Banner> : null}
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void verifyStaff(code);
          }}
        >
          <OtpField
            value={code}
            onChange={setCode}
            onComplete={(v) => void verifyStaff(v)}
            label={t('secondFactorLabel')}
            cellLabel={(i) => t('otpCell', { n: i + 1 })}
            error={error ?? undefined}
            status={busy ? 'busy' : error ? 'error' : 'idle'}
            disabled={busy || locked || enrolment.status === 'loading'}
          />
          <Button
            type="submit"
            size="lg"
            block
            loading={busy}
            disabled={code.length !== 6 || locked}
          >
            {t('verify')}
          </Button>
        </form>
      </main>
    );
  }

  if (needsName) {
    return (
      <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-10">
        <h1 className="text-3xl font-semibold">{t('nameTitle')}</h1>
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (name.trim().length < 2) return;
            setBusy(true);
            await getRepository().updateProfile({ name });
            router.replace(safeNext(params.get('next')));
          }}
        >
          <TextField
            label={t('nameLabel')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            autoFocus
          />
          <Button type="submit" size="lg" block loading={busy} disabled={name.trim().length < 2}>
            {t('continue')}
          </Button>
        </form>
      </main>
    );
  }

  const status: OtpStatus = verified ? 'success' : busy ? 'busy' : error ? 'error' : 'idle';
  const timer = `${Math.floor(resendIn / 60)}:${String(resendIn % 60).padStart(2, '0')}`;

  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-10 sm:py-16">
      <section className="rounded-card border border-border bg-surface p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_16px_40px_-20px_rgb(15_92_77/0.25)] sm:p-8">
        <div
          key={verified ? 'ok' : 'wait'}
          className={cn(
            'mb-5 grid size-12 place-items-center rounded-full',
            verified ? 'otp-done bg-success/15 text-success' : 'bg-primary/10 text-primary',
          )}
          aria-hidden="true"
        >
          {verified ? (
            <Check className="size-6" strokeWidth={2.5} />
          ) : (
            <MessageSquare className="size-6" />
          )}
        </div>
        <h1 className="text-2xl font-semibold sm:text-3xl">{t('otpHeading')}</h1>
        {phone ? (
          <p className="mt-1.5 text-muted">
            {t.rich('otpSentTo', {
              phone: formatPhone(phone),
              b: (chunks) => <strong className="tabular font-semibold text-ink">{chunks}</strong>,
            })}{' '}
            <button
              type="button"
              onClick={() => router.push('/login')}
              disabled={busy || verified}
              className="font-semibold text-primary underline-offset-4 hover:underline disabled:opacity-50"
            >
              {t('otpEdit')}
            </button>
          </p>
        ) : (
          <div className="skeleton mt-2 h-5 w-3/4 rounded" aria-hidden="true" />
        )}
        {USE_MOCKS ? (
          <Banner tone="info" className="mt-4">
            {t('mockHint')}
          </Banner>
        ) : null}
        <form
          noValidate
          className="mt-6"
          onSubmit={(e) => {
            e.preventDefault();
            void verify(code);
          }}
        >
          {/* Fills itself from the SMS where the phone allows and checks on the sixth digit. */}
          <OtpField
            value={code}
            onChange={(v) => {
              setCode(v);
              if (error && !locked) setError(null);
            }}
            onComplete={(v) => void verify(v)}
            label={t('otpLabel')}
            hideLabel
            cellLabel={(i) => t('otpCell', { n: i + 1 })}
            error={error ?? undefined}
            status={status}
            disabled={locked || busy || verified}
            autoFocus
          />
          <p
            role="status"
            aria-live="polite"
            className="mt-3 flex min-h-6 items-center gap-2 text-sm font-medium"
            data-testid="otp-status"
          >
            {busy ? (
              <span className="fade-in flex items-center gap-2 text-primary">
                <Spinner className="size-4" />
                {t('verifying')}
              </span>
            ) : verified ? (
              <span className="fade-in flex items-center gap-2 text-success">
                <Check className="size-4" strokeWidth={2.5} aria-hidden="true" />
                {t('otpVerified')}
              </span>
            ) : null}
          </p>
        </form>
        <div className="mt-2 flex flex-wrap items-center gap-x-1 border-t border-border pt-4 text-sm">
          <span className="text-muted">{t('otpNoCode')}</span>
          {resendIn > 0 ? (
            <span className="tabular text-muted">{t('otpResendTimer', { time: timer })}</span>
          ) : (
            <button
              type="button"
              disabled={locked || verified}
              className="-mx-2 min-h-12 px-2 font-semibold text-primary underline-offset-4 hover:underline disabled:opacity-50"
              onClick={async () => {
                if (!phone) return;
                setNotice(null);
                try {
                  setFirebase((await sendCode(phone, recaptcha.current, locale)) === 'firebase');
                  setNotice(t('resent'));
                  setResendIn(30);
                } catch (err) {
                  if (err instanceof FirebasePhoneError) setNotice(firebaseMessage(err.reason));
                  else if (isRepositoryError(err) && err.code === 'rate_limited')
                    setResendIn(Number(err.details?.retryAfterSeconds ?? 30));
                  else setNotice(ts('errorBody'));
                }
              }}
            >
              {t('resend')}
            </button>
          )}
          {notice ? (
            <p role="status" className="fade-in w-full text-sm text-muted">
              {notice}
            </p>
          ) : null}
          <div ref={recaptcha} />
        </div>
      </section>
      <div className="flex flex-col gap-2 px-1 text-sm text-muted" lang={locale}>
        <p className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
          {t('otpTrust')}
        </p>
        {host ? (
          <p className="flex items-start gap-2">
            <Lock className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
            {t('otpSecure', { host })}
          </p>
        ) : null}
      </div>
    </main>
  );
}
