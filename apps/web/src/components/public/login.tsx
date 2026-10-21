'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ShieldCheck } from 'lucide-react';
import { isRepositoryError } from '@harusi/api-client';
import { COUNTRIES, type Country } from '@harusi/schemas/country';
import { ALLOWED_COUNTRIES, KENYA_ENABLED, parsePhone } from '@/lib/country';
import type { Locale } from '@harusi/i18n';
import { Button } from '@/components/ui/button';
import { Banner } from '@/components/ui/display';
import { QrBlock } from '@/components/ui/qr-block';
import { OtpField, PhoneField, Select, TextField } from '@/components/ui/form';
import { formatClock, formatPhone } from '@/lib/format';
import { getRepository } from '@/lib/repo';
import { USE_MOCKS } from '@/lib/env';

const PHONE_KEY = 'harusi.login.phone';

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
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-10">
      <h1 className="text-3xl font-semibold">{t('title')}</h1>
      <p className="text-muted">{t('subtitle')}</p>
      {USE_MOCKS ? (
        <Banner tone="info">
          {t('mockPhoneHint')} {t('staffHint')}
        </Banner>
      ) : null}
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = parsePhone(phone, country);
          if (!r.ok) {
            setError(tv(`phone.${r.error}`));
            return;
          }
          setBusy(true);
          setError(null);
          try {
            await getRepository().requestOtp(r.e164);
          } catch (err) {
            if (isRepositoryError(err) && err.code === 'rate_limited') {
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
        {KENYA_ENABLED ? (
          <Select
            label={tcm('country')}
            value={country}
            onChange={(e) => setCountry(e.target.value as Country)}
            options={COUNTRIES.filter((c) => ALLOWED_COUNTRIES.includes(c)).map((c) => ({
              value: c,
              label: tcm(`countries.${c}`),
            }))}
          />
        ) : null}
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
  const ts = useTranslations('states');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const params = useSearchParams();
  const [phone, setPhone] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(30);
  const [notice, setNotice] = useState<string | null>(null);
  const [needsName, setNeedsName] = useState(false);
  const [secondFactor, setSecondFactor] = useState(false);
  /** Staff without an authenticator yet (ADR 040): the secret to scan, once it has loaded. */
  const [enrolment, setEnrolment] = useState<
    { status: 'none' } | { status: 'loading' } | { status: 'ready'; secret: string; url: string }
  >({ status: 'none' });
  const [name, setName] = useState('');

  useEffect(() => {
    const p = sessionStorage.getItem(PHONE_KEY);
    if (!p) router.replace('/login');
    else setPhone(p);
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
      const session = await getRepository().verifyOtp(phone, value);
      sessionStorage.removeItem(PHONE_KEY);
      if (session.needsSecondFactor) {
        // Staff accounts need a second factor before any data is available.
        setSecondFactor(true);
        setCode('');
        setBusy(false);
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
        setBusy(false);
        return;
      }
      router.replace(
        session.user.roleGlobal === 'admin' && !params.get('next')
          ? '/ops'
          : safeNext(params.get('next')),
      );
    } catch (err) {
      setCode('');
      if (isRepositoryError(err) && err.code === 'locked') {
        setLocked(true);
        setError(
          t('locked', {
            time: formatClock(String(err.details?.until ?? new Date().toISOString())),
          }),
        );
      } else if (isRepositoryError(err) && err.code === 'validation') {
        setError(t('wrongCode', { attempts: Number(err.details?.attemptsLeft ?? 0) }));
      } else if (isRepositoryError(err) && err.code === 'forbidden') {
        setError(t('suspended'));
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

  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-10">
      <h1 className="text-3xl font-semibold">{t('otpTitle')}</h1>
      {phone ? <p>{t('otpSent', { phone: formatPhone(phone) })}</p> : null}
      {USE_MOCKS ? <Banner tone="info">{t('mockHint')}</Banner> : null}
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void verify(code);
        }}
      >
        <OtpField
          value={code}
          onChange={setCode}
          onComplete={(v) => void verify(v)}
          label={t('otpLabel')}
          cellLabel={(i) => t('otpCell', { n: i + 1 })}
          error={error ?? undefined}
          disabled={locked || busy}
        />
        <Button
          type="submit"
          size="lg"
          block
          loading={busy}
          loadingLabel={t('verifying')}
          disabled={code.length !== 6 || locked}
          data-testid="verify-otp"
        >
          {t('verify')}
        </Button>
      </form>
      <div className="flex flex-col items-start gap-2">
        <Button
          variant="ghost"
          disabled={resendIn > 0 || locked}
          onClick={async () => {
            if (!phone) return;
            try {
              await getRepository().requestOtp(phone);
              setNotice(t('resent'));
              setResendIn(30);
            } catch (err) {
              if (isRepositoryError(err) && err.code === 'rate_limited')
                setResendIn(Number(err.details?.retryAfterSeconds ?? 30));
              else setNotice(ts('errorBody'));
            }
          }}
        >
          {resendIn > 0 ? t('resendIn', { seconds: resendIn }) : t('resend')}
        </Button>
        {notice ? (
          <p role="status" className="text-sm text-muted">
            {notice}
          </p>
        ) : null}
        <Button variant="ghost" onClick={() => router.push('/login')}>
          {t('changePhone')}
        </Button>
      </div>
      <p className="flex items-start gap-2 text-sm text-muted" lang={locale}>
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
        {t('trust')}
      </p>
    </main>
  );
}
