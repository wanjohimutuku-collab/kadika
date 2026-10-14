import { useState } from 'react';
import { router } from 'expo-router';
import { normalizeTzPhone } from '@harusi/schemas/phone';
import { getRepository } from '../../src/lib/repo';
import { useT } from '../../src/lib/i18n';
import { Banner, Button, Field, Screen, Txt } from '../../src/ui/kit';

export default function Phone() {
  const t = useT();
  const [raw, setRaw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const p = normalizeTzPhone(raw);
    if (!p.ok) return setError(t(`validation.phone.${p.error}`));
    setError(null);
    setBusy(true);
    try {
      await getRepository().requestOtp(p.e164);
      router.push({ pathname: '/otp', params: { phone: p.e164 } });
    } catch (e) {
      const code = (e as { code?: string }).code;
      setError(
        code === 'rate_limited'
          ? t('auth.rateLimited', { seconds: 30 })
          : code === 'offline'
            ? t('states.offlineBanner')
            : t('states.errorBody'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen footer={<Button label={t('auth.sendCode')} loading={busy} onPress={submit} />}>
      <Txt size={24} bold>
        {t('auth.title')}
      </Txt>
      <Txt>{t('auth.subtitle')}</Txt>
      <Field
        label={t('auth.phone')}
        hint={t('auth.phoneHint')}
        value={raw}
        onChangeText={setRaw}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        error={error}
        onSubmitEditing={submit}
      />
      <Banner text={t('auth.trust')} />
    </Screen>
  );
}
