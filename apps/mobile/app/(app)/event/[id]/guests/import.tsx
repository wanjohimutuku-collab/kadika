import { useMemo, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import { router, useGlobalSearchParams } from 'expo-router';
import { CARD_KINDS, type CardKind } from '@harusi/schemas';
import {
  buildPreview,
  contactsToRows,
  guessMapping,
  parsePastedList,
  summarizePreview,
} from '@harusi/schemas/import';
import { useGuests, useImportGuests } from '../../../../../src/lib/queries';
import { useT } from '../../../../../src/lib/i18n';
import { useColors } from '../../../../../src/lib/theme';
import { AppHeader } from '../../../../../src/ui/header';
import { Banner, Button, Field, Row, Screen, Segmented, Txt } from '../../../../../src/ui/kit';
import { ContactsPicker } from '../../../../../src/ui/contacts-picker';
import {
  askForMoreContacts,
  readDeviceContacts,
  type DeviceContacts,
} from '../../../../../src/lib/device-contacts';

type Source = 'paste' | 'contacts';

/**
 * Three steps (§17.4): choose source → preview → confirm. Nothing is saved until the last step. The
 * phone's contacts (ADR 051) are read on the phone; only the people picked reach the preview and the API.
 */
export default function Import() {
  const { id, card } = useGlobalSearchParams<{ id: string; card?: string }>();
  const t = useT();
  const c = useColors();
  const existing = useGuests(id);
  const imp = useImportGuests(id);
  const [step, setStep] = useState<1 | 2>(1);
  // the whole list is one card type: invitation cards, or contribution cards when it came from that link
  const [cardKind, setCardKind] = useState<CardKind>(
    card === 'contribution' ? 'contribution' : 'invitation',
  );
  const [text, setText] = useState('');
  const [source, setSource] = useState<Source>('paste');
  const [device, setDevice] = useState<DeviceContacts | null>(null);
  const [reading, setReading] = useState(false);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const key = useRef(
    `import-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
  );

  const contacts = device?.status === 'ok' ? device.contacts : [];
  const rows = useMemo(
    () =>
      source === 'contacts'
        ? contactsToRows([...picked].sort((a, b) => a - b).map((i) => contacts[i]!))
        : parsePastedList(text),
    [source, picked, contacts, text],
  );
  const preview = useMemo(() => {
    if (rows.length === 0) return [];
    // contacts are always name, phone: a contact called "Mgeni …" must not be read as a header row
    const { mapping, hasHeader } =
      source === 'contacts'
        ? { mapping: ['name', 'phone'] as const, hasHeader: false }
        : guessMapping(rows[0]!);
    return buildPreview(rows, [...mapping], {
      hasHeader,
      existingPhones: (existing.data ?? []).map((g) => g.phoneE164).filter((p): p is string => !!p),
      existingNames: (existing.data ?? []).map((g) => g.displayName),
    });
  }, [rows, source, existing.data]);
  const summary = summarizePreview(preview);

  // the contacts list scrolls by itself (FlatList), so the screen must not
  const listing = step === 1 && source === 'contacts' && device?.status === 'ok';

  const readContacts = async () => {
    setReading(true);
    try {
      setDevice(await readDeviceContacts());
    } catch {
      setDevice({ status: 'unavailable' });
    } finally {
      setReading(false);
    }
  };

  const confirm = async () => {
    setFailed(false);
    try {
      const r = await imp.mutateAsync({
        key: key.current!,
        cardKind,
        rows: preview
          .filter((p) => p.include)
          .map((p) => ({
            displayName: p.displayName,
            phoneRaw: p.phoneRaw,
            groupLabel: p.groupLabel,
            partySizeAllowed: p.partySizeAllowed,
            hasSmartphone: p.hasSmartphone,
            inviteChannelPref: p.inviteChannelPref,
          })),
      });
      setResult(r);
    } catch {
      setFailed(true);
    }
  };

  if (result)
    return (
      <View style={{ flex: 1 }}>
        <AppHeader title={t('guests.addImport')} />
        <Screen
          footer={
            <Button
              label={t('common.done')}
              onPress={() => router.replace(`/event/${id}/guests`)}
            />
          }
        >
          <Banner
            tone="success"
            text={`${t('import.done', { count: result.created })}${result.skipped ? ` · ${t('import.doneSkipped', { count: result.skipped })}` : ''}`}
          />
          {cardKind === 'contribution' ? (
            <Button
              variant="secondary"
              icon="send"
              label={t('import.goSendContribution')}
              onPress={() => router.replace(`/event/${id}/send?card=contribution`)}
            />
          ) : null}
        </Screen>
      </View>
    );

  return (
    <View style={{ flex: 1 }}>
      <AppHeader
        title={t('guests.addImport')}
        onBack={() => (step === 2 ? setStep(1) : router.back())}
      />
      <Screen
        scroll={!listing}
        footer={
          step === 1 ? (
            <Button
              label={t('common.next')}
              disabled={rows.length === 0}
              onPress={() => setStep(2)}
            />
          ) : (
            <Button
              label={t('import.confirm', { count: summary.valid })}
              disabled={summary.valid === 0}
              loading={imp.isPending}
              onPress={confirm}
            />
          )
        }
      >
        {step === 1 ? (
          <>
            <Txt size={14} bold>
              {t('import.cardKind')}
            </Txt>
            <Segmented<CardKind>
              value={cardKind}
              onChange={setCardKind}
              options={CARD_KINDS.map((k) => ({ value: k, label: t(`guestForm.cardKinds.${k}`) }))}
            />
            {listing ? null : <Txt size={14}>{t('guestForm.cardKindHelp')}</Txt>}
            <Segmented<Source>
              value={source}
              onChange={setSource}
              options={[
                { value: 'paste', label: t('import.sourcePaste') },
                { value: 'contacts', label: t('import.sourceContacts') },
              ]}
            />
            {source === 'paste' ? (
              <>
                <Txt>{t('import.pasteHint')}</Txt>
                <Field
                  label={t('import.pasteLabel')}
                  value={text}
                  onChangeText={setText}
                  multiline
                  numberOfLines={8}
                  autoCapitalize="none"
                  style={{ minHeight: 160, textAlignVertical: 'top' } as never}
                />
              </>
            ) : device?.status === 'ok' ? (
              <>
                {device.limited ? (
                  <>
                    <Banner tone="info" text={t('contacts.limited')} />
                    <Button
                      variant="ghost"
                      icon="plus"
                      label={t('contacts.read')}
                      onPress={async () => {
                        await askForMoreContacts();
                        await readContacts();
                      }}
                    />
                  </>
                ) : null}
                <ContactsPicker
                  contacts={device.contacts}
                  picked={picked}
                  onChange={setPicked}
                  query={query}
                  onQuery={setQuery}
                />
              </>
            ) : device?.status === 'denied' ? (
              <>
                <Banner
                  tone="warning"
                  text={`${t('states.permContacts')}. ${t('contacts.permPhone')}`}
                />
                <Button
                  label={device.canAskAgain ? t('contacts.read') : t('states.openSettings')}
                  onPress={() =>
                    device.canAskAgain ? void readContacts() : void Linking.openSettings()
                  }
                />
                <Button
                  variant="secondary"
                  label={t('import.sourcePaste')}
                  onPress={() => setSource('paste')}
                />
              </>
            ) : device?.status === 'unavailable' ? (
              <>
                <Banner tone="warning" text={t('contacts.permPhone')} />
                <Button
                  variant="secondary"
                  label={t('import.sourcePaste')}
                  onPress={() => setSource('paste')}
                />
              </>
            ) : (
              <>
                <Banner tone="info" text={t('contacts.privacy')} />
                <Txt>{t('contacts.readHelp')}</Txt>
                <Button
                  icon="guests"
                  label={reading ? t('contacts.loading') : t('contacts.read')}
                  loading={reading}
                  onPress={readContacts}
                />
              </>
            )}
          </>
        ) : (
          <>
            {cardKind === 'contribution' ? <Txt>{t('import.confirmContribution')}</Txt> : null}
            <Txt size={14}>{t('import.nothingSaved')}</Txt>
            <Txt
              bold
            >{`${t('import.summary.valid')}: ${summary.valid} · ${t('import.summary.invalid')}: ${summary.invalid} · ${t('import.summary.duplicates')}: ${summary.duplicates}`}</Txt>
            {failed ? <Banner tone="danger" text={t('states.errorBody')} /> : null}
            {preview.map((p) => (
              <Row key={p.index}>
                <View style={{ flex: 1 }}>
                  <Txt bold>{p.displayName || '—'}</Txt>
                  <Txt
                    size={14}
                    color={
                      p.issues.some((i) => i.kind !== 'duplicate')
                        ? c.danger
                        : p.issues.length
                          ? c.warning
                          : c.muted
                    }
                  >
                    {p.phoneRaw || t('guests.noPhone')}
                    {p.issues.length
                      ? ` · ${p.issues.map((i) => (i.kind === 'phone' ? t(`validation.phone.${i.error}`) : i.kind === 'name' ? t('validation.name.too_short') : t(i.of === 'file' ? 'import.issue.duplicateFile' : 'import.issue.duplicateExisting', { row: (i.otherRow ?? 0) + 1 }))).join(', ')}`
                      : ''}
                  </Txt>
                </View>
              </Row>
            ))}
          </>
        )}
      </Screen>
    </View>
  );
}
