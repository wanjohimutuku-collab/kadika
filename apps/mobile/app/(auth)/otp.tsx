import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { formatPhone } from '@harusi/schemas/phone';
import { getRepository } from '../../src/lib/repo';
import { useSession } from '../../src/lib/session';
import { useT } from '../../src/lib/i18n';
import { Banner, Button, Field, Screen, Txt } from '../../src/ui/kit';

export default function Otp() {
  const t = useT();
  const { phone } = useLocalSearchParams<{ phone: string }>();
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

  const verify = async () => {
    if (!/^\d{6}$/.test(code)) return setError(t('validation.otp.invalid'));
    setError(null);
    setBusy(true);
    try {
      const s = await getRepository().verifyOtp(phone!, code);
      if (!s.user.name?.trim() || s.user.name === s.user.phoneE164) return setNeedName(true);
      await refresh();
      router.replace('/events');
    } catch (e) {
      const err = e as { code?: string; details?: { attemptsLeft?: number } };
      setError(
        err.code === 'locked' || err.code === 'rate_limited'
          ? t('auth.rateLimited', { seconds: 60 })
          : err.code === 'offline'
            ? t('states.offlineBanner')
            : t('auth.wrongCode', { attempts: err.details?.attemptsLeft ?? 4 }),
      );
    } finally {
      setBusy(false);
    }
  };

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
