import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router, useGlobalSearchParams } from 'expo-router';
import {
  buildPreview,
  guessMapping,
  parsePastedList,
  summarizePreview,
} from '@harusi/schemas/import';
import { useGuests, useImportGuests } from '../../../../../src/lib/queries';
import { useT } from '../../../../../src/lib/i18n';
import { useColors } from '../../../../../src/lib/theme';
import { AppHeader } from '../../../../../src/ui/header';
import { Banner, Button, Field, Row, Screen, Txt } from '../../../../../src/ui/kit';
import { useRef } from 'react';

/** Three steps (§17.4): choose source → preview → confirm. Nothing is saved until the last step. */
export default function Import() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const t = useT();
  const c = useColors();
  const existing = useGuests(id);
  const imp = useImportGuests(id);
  const [step, setStep] = useState<1 | 2>(1);
  const [text, setText] = useState('');
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const key = useRef(
    `import-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
  );

  const rows = useMemo(() => parsePastedList(text), [text]);
  const preview = useMemo(() => {
    if (rows.length === 0) return [];
    const { mapping, hasHeader } = guessMapping(rows[0]!);
    return buildPreview(rows, mapping, {
      hasHeader,
      existingPhones: (existing.data ?? []).map((g) => g.phoneE164).filter((p): p is string => !!p),
      existingNames: (existing.data ?? []).map((g) => g.displayName),
    });
  }, [rows, existing.data]);
  const summary = summarizePreview(preview);

  const confirm = async () => {
    setFailed(false);
    try {
      const r = await imp.mutateAsync({
        key: key.current!,
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
        ) : (
          <>
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
