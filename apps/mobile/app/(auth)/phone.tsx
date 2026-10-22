import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { COUNTRIES, type Country } from '@harusi/schemas/country';
import { getRepository } from '../../src/lib/repo';
import { ALLOWED_COUNTRIES, KENYA_ENABLED, parsePhone } from '../../src/lib/country';
import { FirebasePhoneError, loadAuthConfig, startPhoneSignIn } from '../../src/lib/firebase-phone';
import { useLocale, useT } from '../../src/lib/i18n';
import { Banner, Button, Chip, Field, Screen, Txt } from '../../src/ui/kit';

export default function Phone() {
  const t = useT();
  const { locale } = useLocale();
  const [raw, setRaw] = useState('');
  const [country, setCountry] = useState<Country>('TZ');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const p = parsePhone(raw, country);
    if (!p.ok) return setError(t(`validation.phone.${p.error}`));
    setError(null);
    setBusy(true);
    try {
      // Firebase Phone Auth or our own SMS code, as the API says (ADR 048).
      const firebase = (await loadAuthConfig()).otpProvider === 'firebase';
      if (firebase) await startPhoneSignIn(p.e164, locale);
      else await getRepository().requestOtp(p.e164);
      router.push({
        pathname: '/otp',
        params: { phone: p.e164, ...(firebase ? { via: 'firebase' } : {}) },
      });
    } catch (e) {
      const code = (e as { code?: string }).code;
      const reason = e instanceof FirebasePhoneError ? e.reason : null;
      setError(
        reason === 'update_app'
          ? t('auth.updateApp')
          : reason === 'invalid_phone'
            ? t('validation.phone.invalid_chars')
            : reason === 'too_many'
              ? t('auth.tooManyRequests')
              : code === 'rate_limited'
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
      {KENYA_ENABLED ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {COUNTRIES.filter((c) => ALLOWED_COUNTRIES.includes(c)).map((c) => (
            <Chip
              key={c}
              label={t(`common.countries.${c}`)}
              active={country === c}
              onPress={() => setCountry(c)}
            />
          ))}
        </View>
      ) : null}
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
