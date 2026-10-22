import { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { formatPhone } from '@harusi/schemas/phone';
import type { Session } from '@harusi/api-client';
import { getRepository } from '../../src/lib/repo';
import { useSession } from '../../src/lib/session';
import {
  confirmPhoneCode,
  FirebasePhoneError,
  onAutoVerified,
  startPhoneSignIn,
} from '../../src/lib/firebase-phone';
import { useLocale, useT } from '../../src/lib/i18n';
import { Banner, Button, Field, Screen, Txt } from '../../src/ui/kit';

export default function Otp() {
  const t = useT();
  const { phone, via } = useLocalSearchParams<{ phone: string; via?: string }>();
  /** Firebase sent the code (ADR 048): it checks it, then the API trades the ID token. */
  const firebase = via === 'firebase';
  const { locale } = useLocale();
  const signingIn = useRef(false);
  const { refresh } = useSession();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [needName, setNeedName] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(30);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  /** Our session from the SMS code or from a Firebase ID token; one attempt at a time. */
  const complete = async (proof: () => Promise<Session>) => {
    if (signingIn.current) return;
    signingIn.current = true;
    setError(null);
    setBusy(true);
    try {
      const s = await proof();
      if (!s.user.name?.trim() || s.user.name === s.user.phoneE164) return setNeedName(true);
      await refresh();
      router.replace('/events');
    } catch (e) {
      const err = e as { code?: string; details?: { attemptsLeft?: number } };
      const reason = e instanceof FirebasePhoneError ? e.reason : null;
      setError(
        reason === 'wrong_code'
          ? t('auth.wrongCodeRetry')
          : reason === 'expired'
            ? t('auth.codeExpired')
            : reason === 'too_many'
              ? t('auth.tooManyRequests')
              : reason
                ? t('states.errorBody')
                : err.code === 'locked' || err.code === 'rate_limited'
                  ? t('auth.rateLimited', { seconds: 60 })
                  : err.code === 'offline'
                    ? t('states.offlineBanner')
                    : t('auth.wrongCode', { attempts: err.details?.attemptsLeft ?? 4 }),
      );
    } finally {
      signingIn.current = false;
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(code)) return setError(t('validation.otp.invalid'));
    await complete(async () =>
      firebase
        ? getRepository().signInWithFirebase(await confirmPhoneCode(code))
        : getRepository().verifyOtp(phone!, code),
    );
  };

  // Android may verify the number without the code being typed (Firebase only).
  useEffect(() => {
    if (!firebase) return;
    let stop: (() => void) | undefined;
    let gone = false;
    void onAutoVerified((idToken) => {
      void complete(() => getRepository().signInWithFirebase(idToken));
    }).then((unsubscribe) => (gone ? unsubscribe() : (stop = unsubscribe)));
    return () => {
      gone = true;
      stop?.();
    };
  }, [firebase]);

  const saveName = async () => {
    if (name.trim().length < 2) return setError(t('validation.name.too_short'));
    setBusy(true);
    try {
      await getRepository().updateProfile({ name: name.trim() });
      await refresh();
      router.replace('/events');
    } catch {
      setError(t('states.errorBody'));
    } finally {
      setBusy(false);
    }
  };

  if (needName)
    return (
      <Screen footer={<Button label={t('auth.continue')} loading={busy} onPress={saveName} />}>
        <Txt size={24} bold>
          {t('auth.nameTitle')}
        </Txt>
        <Field
          label={t('auth.nameLabel')}
          value={name}
          onChangeText={setName}
          autoComplete="name"
          error={error}
        />
      </Screen>
    );

  return (
    <Screen
      footer={
        <Button
          label={busy ? t('auth.verifying') : t('auth.verify')}
          loading={busy}
          onPress={verify}
        />
      }
    >
      <Txt size={24} bold>
        {t('auth.otpTitle')}
      </Txt>
      <Txt>{t('auth.otpSent', { phone: formatPhone(phone ?? '', 'TZ') })}</Txt>
      <Field
        label={t('auth.otpLabel')}
        value={code}
        onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        autoComplete="sms-otp"
        textContentType="oneTimeCode"
        maxLength={6}
        error={error}
        onSubmitEditing={verify}
      />
      <Button
        variant="ghost"
        label={wait > 0 ? t('auth.resendIn', { seconds: wait }) : t('auth.resend')}
        disabled={wait > 0}
        onPress={async () => {
          if (firebase) await startPhoneSignIn(phone!, locale, true).catch(() => undefined);
          else
            await getRepository()
              .requestOtp(phone!)
              .catch(() => undefined);
          setWait(30);
        }}
      />
      <Button variant="ghost" label={t('auth.changePhone')} onPress={() => router.back()} />
      <Banner text={t('auth.trust')} />
    </Screen>
  );
}
