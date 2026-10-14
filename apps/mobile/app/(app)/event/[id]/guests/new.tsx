import { useState } from 'react';
import { View } from 'react-native';
import { router, useGlobalSearchParams } from 'expo-router';
import { normalizeTzPhone } from '@harusi/schemas/phone';
import { useCreateGuest } from '../../../../../src/lib/queries';
import { useLocale, useT } from '../../../../../src/lib/i18n';
import { AppHeader } from '../../../../../src/ui/header';
import { Banner, Button, Field, Screen, Stepper, Txt } from '../../../../../src/ui/kit';
import { Chip } from '../../../../../src/ui/kit';

export default function NewGuest() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const t = useT();
  const { locale } = useLocale();
  const create = useCreateGuest(id);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [group, setGroup] = useState('');
  const [party, setParty] = useState(1);
  const [smart, setSmart] = useState(true);
  const [errors, setErrors] = useState<{ name?: string; phone?: string; form?: string }>({});

  const save = async (another: boolean) => {
    const e: typeof errors = {};
    if (name.trim().length < 2) e.name = t('validation.name.too_short');
    let normalized = '';
    if (phone.trim()) {
      const p = normalizeTzPhone(phone);
      if (!p.ok) e.phone = t(`validation.phone.${p.error}`);
      else normalized = p.e164;
    }
    if (e.name || e.phone) return setErrors(e);
    setErrors({});
    try {
      await create.mutateAsync({
        displayName: name.trim(),
        phone: normalized || undefined,
        groupLabel: group.trim(),
        partySizeAllowed: party,
        inviteChannelPref: !normalized ? 'print' : smart ? 'whatsapp' : 'sms',
        hasSmartphone: smart,
        language: locale,
        notes: '',
      } as never);
      if (another) {
        setName('');
        setPhone('');
      } else router.back();
    } catch (err) {
      const code = (err as { code?: string }).code;
      setErrors({
        form: code === 'conflict' ? t('guestForm.duplicatePhone') : t('states.errorBody'),
      });
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title={t('guestForm.title')} onBack={() => router.back()} />
      <Screen
        footer={
          <View style={{ gap: 8 }}>
            <Button
              label={t('guestForm.save')}
              loading={create.isPending}
              onPress={() => save(false)}
            />
            <Button
              variant="secondary"
              label={t('guestForm.saveAndAdd')}
              onPress={() => save(true)}
            />
          </View>
        }
      >
        {errors.form ? <Banner tone="danger" text={errors.form} /> : null}
        <Field
          label={t('guestForm.name')}
          hint={t('guestForm.nameHint')}
          value={name}
          onChangeText={setName}
          error={errors.name}
        />
        <Field
          label={t('guestForm.phone')}
          hint={t('guestForm.phoneHint')}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          error={errors.phone}
        />
        <Field
          label={t('guestForm.group')}
          hint={t('guestForm.groupHint')}
          value={group}
          onChangeText={setGroup}
        />
        <Txt size={14} bold>
          {t('guestForm.party')}
        </Txt>
        <Stepper
          value={party}
          min={1}
          max={10}
          onChange={setParty}
          decLabel={t('guestForm.decrease')}
          incLabel={t('guestForm.increase')}
        />
        <Chip
          label={t('guestForm.noSmartphone')}
          active={!smart}
          onPress={() => setSmart(!smart)}
        />
        {!smart ? <Txt size={14}>{t('guestForm.noSmartphoneHelp')}</Txt> : null}
      </Screen>
    </View>
  );
}
