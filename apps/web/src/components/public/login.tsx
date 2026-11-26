'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  ArrowUpRight,
  Briefcase,
  Check,
  Gift,
  Heart,
  Lock,
  MessageSquare,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { isRepositoryError } from '@harusi/api-client';
import { countryOfE164, SIGN_IN_COUNTRIES, type Country } from '@harusi/schemas/country';
import { parsePhone } from '@/lib/country';
import type { Locale } from '@harusi/i18n';
import { SiteLink as Link } from '@/components/site/site-link';
import { Button, Spinner } from '@/components/ui/button';
import { Banner } from '@/components/ui/display';
import { QrBlock } from '@/components/ui/qr-block';
import { OtpField, PhoneField, Select, TextField, type OtpStatus } from '@/components/ui/form';
import { cn } from '@/lib/cn';
import { formatClock, formatPhone } from '@/lib/format';
import { getRepository } from '@/lib/repo';
import { clearAttribution, readAttribution } from '@/lib/attribution';
import { USE_MOCKS } from '@/lib/env';
import { useBrand } from '@/components/brand/brand-provider';
import { AuthCard, AuthShell } from '@/components/public/auth-shell';
import { countryHintFor } from '@/lib/signin-country';
import {
  confirmPhoneCode,
  FirebasePhoneError,
  hasPendingCode,
  loadAuthConfig,
  prepareFirebaseSignIn,
  startPhoneSignIn,
  type PhoneSignInError,
} from '@/lib/firebase-phone';

const PHONE_KEY = 'harusi.login.phone';
/** How the pending code was sent (`sms` or `firebase`), so the code page checks it the same way. */
const CHANNEL_KEY = 'harusi.login.channel';
const DRAFT_NAME_KEY = 'harusi.login.draftName';
const OCCASION_KEY = 'harusi.login.occasion';
const MODE_KEY = 'harusi.login.mode';

type OccasionKey = 'wedding' | 'sendoff' | 'birthday' | 'corporate';

const OCCASIONS: ReadonlyArray<{
  id: OccasionKey;
  labelKey: 'occasionWedding' | 'occasionSendoff' | 'occasionBirthday' | 'occasionCorporate';
  icon: typeof Heart;
}> = [
  { id: 'wedding', labelKey: 'occasionWedding', icon: Heart },
  { id: 'sendoff', labelKey: 'occasionSendoff', icon: Sparkles },
  { id: 'birthday', labelKey: 'occasionBirthday', icon: Gift },
  { id: 'corporate', labelKey: 'occasionCorporate', icon: Briefcase },
];

/** True when `phone` gets our own SMS code: SMS sign-in, or a country the API keeps on SMS (Tanzania). */
async function usesOwnSms(phone: string): Promise<boolean> {
  if (USE_MOCKS) return true;
  const cfg = await loadAuthConfig().catch(() => null);
  if (!cfg) return false;
  if (cfg.otpProvider === 'sms') return true;
  const country = countryOfE164(phone);
  return !!country && (cfg.smsCountries ?? []).includes(country);
}

/**
 * Sends the sign-in code. Tanzanian numbers (the API's `smsCountries`) get our own SMS code through
 * NextSMS; other numbers go through Firebase Phone Auth (ADR 048). Mock mode always uses the mock SMS
 * flow so E2E and Storybook work without Firebase.
 */
async function sendCode(
  phone: string,
  recaptcha: HTMLElement | null,
  locale: string,
): Promise<'firebase' | 'sms'> {
  if (await usesOwnSms(phone)) {
    try {
      await getRepository().requestOtp(phone, { language: locale === 'en' ? 'en' : 'sw' });
    } catch (err) {
      // A code already on its way still counts as sent: the code page takes it from here.
      if (isRepositoryError(err) && err.code === 'rate_limited')
        sessionStorage.setItem(CHANNEL_KEY, 'sms');
      throw err;
    }
    sessionStorage.setItem(CHANNEL_KEY, 'sms');
    return 'sms';
  }
  if (!recaptcha) throw new FirebasePhoneError('failed');
  const via = await startPhoneSignIn(phone, recaptcha, locale);
  sessionStorage.setItem(CHANNEL_KEY, via);
  return via;
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
            : reason === 'undeliverable'
              ? t('smsUndeliverable')
              : reason === 'blocked'
                ? t('signInBlocked')
                : reason === 'timeout'
                  ? t('sendTimedOut')
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
  const paramMode =
    params.get('mode') === 'signup' || Boolean(params.get('tier')) ? 'signup' : 'login';
  const [mode, setMode] = useState<'login' | 'signup'>(paramMode);
  const [draftName, setDraftName] = useState('');
  const [occasion, setOccasion] = useState<OccasionKey>('wedding');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState<Country | 'OTHER'>('TZ');
  const [anyCountry, setAnyCountry] = useState(false);
  const tcm = useTranslations('common');
  const brand = useBrand().brand.businessName;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const locale = useLocale();
  const recaptcha = useRef<HTMLDivElement>(null);
  const firebaseMessage = useFirebaseMessage();

  useEffect(() => {
    setMode(paramMode);
  }, [paramMode]);

  useEffect(() => {
    void loadAuthConfig()
      .then((cfg) => {
        if (cfg.otpProvider === 'firebase' && cfg.anyCountry) {
          setAnyCountry(true);
        }
        if (cfg.otpProvider === 'firebase') void prepareFirebaseSignIn().catch(() => undefined);
      })
      .catch(() => undefined);
  }, []);

  const occasionLabel = t(OCCASIONS.find((o) => o.id === occasion)?.labelKey ?? 'occasionWedding');

  return (
    <AuthShell
      mode={mode}
      previewName={mode === 'signup' ? draftName : undefined}
      previewOccasion={occasionLabel}
    >
      <AuthCard>
        <div
          role="tablist"
          aria-label={brand}
          className="mb-5 grid grid-cols-2 rounded-full border border-[#e3e8ee] bg-[#f6f9fc] p-1"
        >
          {(
            [
              { id: 'login', label: t('tabLogin') },
              { id: 'signup', label: t('tabSignup') },
            ] as const
          ).map((tab) => {
            const active = mode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setMode(tab.id);
                  setError(null);
                }}
                className={cn(
                  'min-h-10 rounded-full px-3 text-sm font-semibold transition-all duration-200',
                  active
                    ? 'bg-white text-[#0a2640] shadow-xs ring-1 ring-[#e3e8ee]'
                    : 'text-[#494d59] hover:text-[#5469d4]',
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {mode === 'login' ? (
          <p className="mb-1 text-xs font-semibold tracking-[0.16em] text-[#3b4cc0] uppercase">
            {t('loginWelcome')}
          </p>
        ) : null}
        <h1 className="text-[28px] leading-[1.15] font-bold tracking-[-0.02em] text-[#0a2640] sm:text-[32px]">
          {mode === 'signup' ? t('signupHeading') : t('title', { brand })}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[#494d59]">
          {mode === 'signup' ? t('signupSubtitle') : t('loginSubtitle')}
        </p>

        {USE_MOCKS ? (
          <Banner tone="info" className="mt-4">
            {t('mockPhoneHint')} {t('staffHint', { brand })}
          </Banner>
        ) : null}

        <form
          noValidate
          className="mt-6 flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = anyCountry
              ? parsePhone(phone, country === 'OTHER' ? 'TZ' : country, SIGN_IN_COUNTRIES, true)
              : parsePhone(phone, country as Country, SIGN_IN_COUNTRIES);
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
                // A local number read under the wrong country (0797… is Kenyan, not Tanzanian) fails
                // delivery, and under reCAPTCHA ENFORCE is refused as likely SMS fraud (ADR 060).
                const hint = countryHintFor(err.reason, phone, country);
                if (hint?.kind === 'switch') {
                  setCountry(hint.country);
                  setError(t('smsTryCountry', { country: tcm(`countries.${hint.country}`) }));
                } else if (hint?.kind === 'suggest') {
                  setError(
                    t('signInBlockedTryCountry', { country: tcm(`countries.${hint.country}`) }),
                  );
                } else {
                  setError(firebaseMessage(err.reason));
                }
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
            sessionStorage.setItem(MODE_KEY, mode);
            sessionStorage.setItem(OCCASION_KEY, occasion);
            const trimmedName = draftName.trim();
            if (mode === 'signup' && trimmedName) {
              sessionStorage.setItem(DRAFT_NAME_KEY, trimmedName);
            } else {
              sessionStorage.removeItem(DRAFT_NAME_KEY);
            }
            // Keep `next` only when the visitor came from a protected page; staff without one land on /ops.
            const next = params.get('next');
            router.push(
              next ? `/login/otp?next=${encodeURIComponent(safeNext(next))}` : '/login/otp',
            );
          }}
        >
          {mode === 'signup' ? (
            <>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-[#0a2640]">{t('occasionLabel')}</span>
                <div className="flex flex-wrap gap-2">
                  {OCCASIONS.map((item) => {
                    const Icon = item.icon;
                    const active = occasion === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setOccasion(item.id)}
                        className={cn(
                          'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                          active
                            ? 'border-[#5469d4] bg-[#eef2ff] text-[#3b4cc0]'
                            : 'border-[#e3e8ee] bg-white text-[#494d59] hover:border-[#5469d4]/40 hover:text-[#0a2640]',
                        )}
                      >
                        <Icon className="size-3.5" aria-hidden="true" />
                        <span>{t(item.labelKey)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <TextField
                label={t('signupNameLabel')}
                placeholder={t('signupNamePlaceholder')}
                autoComplete="name"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                name="name"
              />
            </>
          ) : null}

          {/* Kenyan numbers sign in even while the Kenya product is off. */}
          <Select
            label={tcm('country')}
            value={country}
            onChange={(e) => setCountry(e.target.value as Country | 'OTHER')}
            options={[
              ...SIGN_IN_COUNTRIES.map((c) => ({
                value: c,
                label: tcm(`countries.${c}`),
              })),
              ...(anyCountry ? [{ value: 'OTHER', label: tcm('otherCountry') }] : []),
            ]}
          />
          {country === 'OTHER' ? (
            <TextField
              label={t('phone')}
              hint={t('phoneHint')}
              prefix="+"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone.startsWith('+') ? phone.slice(1) : phone}
              onChange={(e) => setPhone(`+${e.target.value.replace(/[^\d]/g, '')}`)}
              error={error ?? undefined}
              name="phone"
              autoFocus={mode === 'login'}
            />
          ) : (
            <PhoneField
              country={country}
              label={t('phone')}
              hint={t('phoneHint')}
              value={phone}
              onChange={setPhone}
              error={error ?? undefined}
              name="phone"
              autoFocus={mode === 'login'}
            />
          )}
          <Button
            type="submit"
            size="lg"
            block
            loading={busy}
            className="qw-btn-primary rounded-full! border-0!"
            data-testid="send-code"
          >
            {mode === 'signup' ? t('signupCta') : t('loginCta')}
          </Button>
          {/* Invisible reCAPTCHA for Firebase Phone Auth (ADR 048); empty otherwise. */}
          <div ref={recaptcha} />
        </form>
      </AuthCard>

      <div className="flex flex-col gap-2.5 px-1">
        <p className="flex items-start gap-2 text-sm text-[#494d59]">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#5469d4]" aria-hidden="true" />
          <span>{t('trust')}</span>
        </p>
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-[#494d59]">
          <span>{t('guestPrompt')}</span>
          <Link
            href="/k"
            className="inline-flex items-center gap-1 font-semibold text-[#5469d4] underline-offset-4 hover:underline"
          >
            <span>{t('guestAction')}</span>
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </p>
      </div>
    </AuthShell>
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
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [draftName, setDraftName] = useState('');
  const [occasion, setOccasion] = useState<OccasionKey>('wedding');

  useEffect(() => {
    const p = sessionStorage.getItem(PHONE_KEY);
    if (!p) {
      router.replace('/login');
      return;
    }
    setPhone(p);
    setHost(window.location.host);
    setMode(sessionStorage.getItem(MODE_KEY) === 'signup' ? 'signup' : 'login');
    setDraftName(sessionStorage.getItem(DRAFT_NAME_KEY) ?? '');
    const storedOccasion = sessionStorage.getItem(OCCASION_KEY);
    if (
      storedOccasion === 'wedding' ||
      storedOccasion === 'sendoff' ||
      storedOccasion === 'birthday' ||
      storedOccasion === 'corporate'
    ) {
      setOccasion(storedOccasion);
    }
    if (USE_MOCKS || sessionStorage.getItem(CHANNEL_KEY) === 'sms') return;
    // The Firebase code lives in this tab only: after a reload the visitor asks for a new one.
    if (!hasPendingCode(p)) router.replace('/login');
    else setFirebase(true);
  }, [router]);

  const occasionLabel = t(OCCASIONS.find((o) => o.id === occasion)?.labelKey ?? 'occasionWedding');
  const firstName = draftName.trim().split(/\s+/)[0] ?? '';

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
      const attribution = readAttribution();
      const session = firebase
        ? await getRepository().signInWithFirebase(await confirmPhoneCode(value), attribution)
        : await getRepository().verifyOtp(phone, value, attribution);
      sessionStorage.removeItem(PHONE_KEY);
      sessionStorage.removeItem(CHANNEL_KEY);
      sessionStorage.removeItem(DRAFT_NAME_KEY);
      sessionStorage.removeItem(OCCASION_KEY);
      sessionStorage.removeItem(MODE_KEY);
      clearAttribution();
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
        const savedName = draftName.trim();
        if (savedName.length >= 2) {
          try {
            await getRepository().updateProfile({ name: savedName });
            router.replace(safeNext(params.get('next')));
            return;
          } catch {
            setName(savedName);
          }
        }
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
      <AuthShell
        testId="second-factor"
        mode={mode}
        previewName={mode === 'signup' ? draftName : undefined}
        previewOccasion={occasionLabel}
      >
        <AuthCard className="flex flex-col gap-5">
          {enrolment.status === 'none' ? (
            <>
              <h1 className="text-[28px] leading-tight font-bold text-[#0a2640]">
                {t('secondFactorTitle')}
              </h1>
              <p className="text-[#494d59]">{t('secondFactorBody')}</p>
            </>
          ) : (
            <>
              <h1 className="text-[28px] leading-tight font-bold text-[#0a2640]">
                {t('enrolTitle')}
              </h1>
              <p className="text-[#494d59]">{t('enrolBody')}</p>
              {enrolment.status === 'loading' ? (
                <p className="text-[#494d59]" role="status">
                  {t('enrolLoading')}
                </p>
              ) : (
                <div className="flex flex-col items-center gap-3" data-testid="totp-enrol">
                  <QrBlock payload={enrolment.url} alt={t('enrolQrAlt')} size={220} />
                  <p className="text-sm text-[#494d59]">{t('enrolSecretLabel')}</p>
                  <code className="break-all rounded-input border border-[#e3e8ee] bg-[#f6f9fc] px-3 py-2 text-center font-mono text-base tracking-wider text-[#0a2640]">
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
              className="qw-btn-primary rounded-full! border-0!"
              disabled={code.length !== 6 || locked}
            >
              {t('verify')}
            </Button>
          </form>
        </AuthCard>
      </AuthShell>
    );
  }

  if (needsName) {
    return (
      <AuthShell mode={mode} previewName={name.trim() || draftName} previewOccasion={occasionLabel}>
        <AuthCard className="flex flex-col gap-5">
          <div>
            <h1 className="text-[28px] leading-tight font-bold text-[#0a2640]">{t('nameTitle')}</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-[#494d59]">{t('nameSubtitle')}</p>
          </div>
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
            <Button
              type="submit"
              size="lg"
              block
              loading={busy}
              className="qw-btn-primary rounded-full! border-0!"
              disabled={name.trim().length < 2}
            >
              {t('continue')}
            </Button>
          </form>
        </AuthCard>
      </AuthShell>
    );
  }

  const status: OtpStatus = verified ? 'success' : busy ? 'busy' : error ? 'error' : 'idle';
  const timer = `${Math.floor(resendIn / 60)}:${String(resendIn % 60).padStart(2, '0')}`;

  return (
    <AuthShell
      mode={mode}
      previewName={mode === 'signup' ? draftName : undefined}
      previewOccasion={occasionLabel}
    >
      <AuthCard>
        <div
          key={verified ? 'ok' : 'wait'}
          className={cn(
            'mb-5 grid size-12 place-items-center rounded-full',
            verified ? 'otp-done bg-success/15 text-success' : 'bg-[#eef2ff] text-[#5469d4]',
          )}
          aria-hidden="true"
        >
          {verified ? (
            <Check className="size-6" strokeWidth={2.5} />
          ) : (
            <MessageSquare className="size-6" />
          )}
        </div>
        <h1 className="text-[28px] leading-tight font-bold tracking-[-0.02em] text-[#0a2640] sm:text-[32px]">
          {firstName ? t('otpHeadingNamed', { name: firstName }) : t('otpHeading')}
        </h1>
        {phone ? (
          <p className="mt-1.5 text-[#494d59]">
            {t.rich('otpSentTo', {
              phone: formatPhone(phone),
              b: (chunks) => (
                <strong className="tabular font-semibold text-[#0a2640]">{chunks}</strong>
              ),
            })}{' '}
            <button
              type="button"
              onClick={() => router.push('/login')}
              disabled={busy || verified}
              className="font-semibold text-[#5469d4] underline-offset-4 hover:underline disabled:opacity-50"
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
              <span className="fade-in flex items-center gap-2 text-[#5469d4]">
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
        <div className="mt-2 flex flex-wrap items-center gap-x-1 border-t border-[#e3e8ee] pt-4 text-sm">
          <span className="text-[#494d59]">{t('otpNoCode')}</span>
          {resendIn > 0 ? (
            <span className="tabular text-[#494d59]">{t('otpResendTimer', { time: timer })}</span>
          ) : (
            <button
              type="button"
              disabled={locked || verified}
              className="-mx-2 min-h-12 px-2 font-semibold text-[#5469d4] underline-offset-4 hover:underline disabled:opacity-50"
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
            <p role="status" className="fade-in w-full text-sm text-[#494d59]">
              {notice}
            </p>
          ) : null}
          <div ref={recaptcha} />
        </div>
      </AuthCard>
      <div className="flex flex-col gap-2 px-1 text-sm text-[#494d59]" lang={locale}>
        <p className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#5469d4]" aria-hidden="true" />
          {t('otpTrust')}
        </p>
        {host ? (
          <p className="flex items-start gap-2">
            <Lock className="mt-0.5 size-4 shrink-0 text-[#5469d4]" aria-hidden="true" />
            {t('otpSecure', { host })}
          </p>
        ) : null}
      </div>
    </AuthShell>
  );
}
