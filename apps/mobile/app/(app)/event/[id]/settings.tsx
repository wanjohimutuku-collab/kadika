import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, useGlobalSearchParams } from 'expo-router';
import { useEvent, useUpdateEvent } from '../../../../src/lib/queries';
import { useLocale, useT } from '../../../../src/lib/i18n';
import { parsePhone, useEventLocale } from '../../../../src/lib/country';
import { AppHeader } from '../../../../src/ui/header';
import { Banner, Button, Field, Screen, Segmented, Txt } from '../../../../src/ui/kit';

export default function Settings() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const t = useT();
  const { locale, setLocale } = useLocale();
  const q = useEvent(id);
  const { country } = useEventLocale(id);
  const update = useUpdateEvent(id);
  const [sender, setSender] = useState('');
  const [phone, setPhone] = useState('');
  const [greeting, setGreeting] = useState('');
  const [msg, setMsg] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!q.data) return;
    setSender(q.data.senderName);
    setPhone(q.data.committeePhone);
    setGreeting(q.data.greeting);
  }, [q.data]);

  const save = async () => {
    let committeePhone = '';
    if (phone.trim()) {
      const p = parsePhone(phone, country);
      if (!p.ok) return setErr(t(`validation.phone.${p.error}`));
      committeePhone = p.e164;
    }
    setErr(null);
    try {
      await update.mutateAsync({
        senderName: sender.trim(),
        committeePhone,
        greeting: greeting.trim(),
      });
      setMsg({ tone: 'success', text: t('settings.saved') });
    } catch {
      setMsg({ tone: 'danger', text: t('states.errorBody') });
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title={t('settings.title')} onBack={() => router.back()} />
      <Screen
        footer={<Button label={t('settings.save')} loading={update.isPending} onPress={save} />}
      >
        {msg ? <Banner tone={msg.tone} text={msg.text} /> : null}
        <Txt bold size={20}>
          {t('settings.trust')}
        </Txt>
        <Field
          label={t('settings.senderName')}
          hint={t('settings.senderHint')}
          value={sender}
          onChangeText={setSender}
        />
        <Field
          label={t('settings.committeePhone')}
          hint={t('settings.committeeHint')}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          error={err}
        />
        <Field label={t('wizard.titleHint')} value={greeting} onChangeText={setGreeting} />
        <Txt bold size={20}>
          {t('settings.language')}
        </Txt>
        <Segmented
          value={locale}
          onChange={setLocale}
          options={[
            { value: 'sw', label: t('common.languageName.sw') },
            { value: 'en', label: t('common.languageName.en') },
          ]}
        />
        <Txt size={14}>{t('settings.timezoneValue')}</Txt>
      </Screen>
    </View>
  );
}
