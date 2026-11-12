import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useGlobalSearchParams } from 'expo-router';
import { CARD_KINDS, type CardKind } from '@harusi/schemas';
import type { ContactLite } from '@harusi/schemas/import';
import { useCreateGuest } from '../../../../../src/lib/queries';
import { parsePhone, useEventLocale } from '../../../../../src/lib/country';
import { useLocale, useT } from '../../../../../src/lib/i18n';
import { readDeviceContacts } from '../../../../../src/lib/device-contacts';
import { AppHeader } from '../../../../../src/ui/header';
import {
  Banner,
  Button,
  Field,
  Screen,
  SearchBox,
  Segmented,
  Sheet,
  Stepper,
  Txt,
} from '../../../../../src/ui/kit';
import { Chip } from '../../../../../src/ui/kit';
import { useColors } from '../../../../../src/lib/theme';

export default function NewGuest() {
  const { id, card } = useGlobalSearchParams<{ id: string; card?: string }>();
  const t = useT();
  const { locale } = useLocale();
  const create = useCreateGuest(id);
  const { country } = useEventLocale(id);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [group, setGroup] = useState('');
  const [party, setParty] = useState(1);
  // links from the send screen and the import screen arrive with ?card=contribution
  const [cardKind, setCardKind] = useState<CardKind>(
    card === 'contribution' ? 'contribution' : 'invitation',
  );
  const [smart, setSmart] = useState(true);
  const [errors, setErrors] = useState<{ name?: string; phone?: string; form?: string }>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerContacts, setPickerContacts] = useState<ContactLite[] | null>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerBusy, setPickerBusy] = useState(false);
  const c = useColors();

  const openPicker = async () => {
    setPickerOpen(true);
    setPickerError(null);
    setPickerContacts(null);
    setPickerQuery('');
    setPickerBusy(true);
    const r = await readDeviceContacts();
    setPickerBusy(false);
    if (r.status === 'ok') setPickerContacts(r.contacts);
    else if (r.status === 'denied') setPickerError(t('contacts.permPhone'));
    else setPickerError(t('states.errorBody'));
  };

  const pickContact = (contact: ContactLite) => {
    setName(contact.name);
    const p = parsePhone(contact.phone, country);
    setPhone(p.ok ? p.e164 : contact.phone);
    setPickerOpen(false);
  };

  const visibleContacts = (pickerContacts ?? []).filter((contact) => {
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return true;
    const digits = q.replace(/\D/g, '');
    return (
      contact.name.toLowerCase().includes(q) ||
      (digits.length >= 3 && contact.phone.replace(/\D/g, '').includes(digits))
    );
  });

  const save = async (another: boolean) => {
    const e: typeof errors = {};
    if (name.trim().length < 2) e.name = t('validation.name.too_short');
    let normalized = '';
    if (phone.trim()) {
      const p = parsePhone(phone, country);
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
        partySizeAllowed: cardKind === 'contribution' ? 1 : party,
        cardKind,
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
        <Button
          variant="secondary"
          icon="plus"
          label={t('guestForm.prefill')}
          onPress={openPicker}
        />
        <Txt size={14} bold>
          {t('guestForm.cardKind')}
        </Txt>
        <Segmented<CardKind>
          value={cardKind}
          onChange={setCardKind}
          options={CARD_KINDS.map((k) => ({ value: k, label: t(`guestForm.cardKinds.${k}`) }))}
        />
        <Txt size={14}>{t('guestForm.cardKindHelp')}</Txt>
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
        {cardKind === 'invitation' ? (
          <>
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
          </>
        ) : null}
        <Chip
          label={t('guestForm.noSmartphone')}
          active={!smart}
          onPress={() => setSmart(!smart)}
        />
        {!smart ? <Txt size={14}>{t('guestForm.noSmartphoneHelp')}</Txt> : null}
      </Screen>
      <Sheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={t('guestForm.prefillTitle')}
      >
        {pickerError ? <Banner tone="warning" text={pickerError} /> : null}
        {pickerBusy ? <Txt color={c.muted}>{t('contacts.loading')}</Txt> : null}
        {pickerContacts && pickerContacts.length > 8 ? (
          <SearchBox
            label={t('contacts.search')}
            value={pickerQuery}
            onChangeText={setPickerQuery}
          />
        ) : null}
        {pickerContacts && visibleContacts.length === 0 ? (
          <Txt color={c.muted}>
            {pickerContacts.length ? t('contacts.noMatch') : t('contacts.empty')}
          </Txt>
        ) : null}
        {(pickerContacts ?? []).length > 0
          ? visibleContacts.map((contact, i) => (
              <Pressable
                key={`${contact.name}-${i}`}
                onPress={() => pickContact(contact)}
                accessibilityRole="button"
                accessibilityLabel={contact.name}
                style={{
                  minHeight: 56,
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderColor: c.border,
                }}
              >
                <Txt bold>{contact.name}</Txt>
                <Txt size={14} color={c.muted}>
                  {contact.phone || t('guests.noPhone')}
                </Txt>
              </Pressable>
            ))
          : null}
      </Sheet>
    </View>
  );
}
