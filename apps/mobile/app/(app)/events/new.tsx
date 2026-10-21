import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import {
  defaultEventTitle,
  eventInputSchema,
  eventKindLabel,
  eventKindSuggestions,
  hostNames,
} from '@harusi/schemas';
import { COUNTRIES, type Country } from '@harusi/schemas/country';
import { KENYA_ENABLED } from '../../../src/lib/country';
import { useCreateEvent } from '../../../src/lib/queries';
import { useLocale, useT } from '../../../src/lib/i18n';
import { AppHeader } from '../../../src/ui/header';
import { Button, Chip, Field, Screen, Segmented, Txt } from '../../../src/ui/kit';

const THEMES = ['emerald-gold', 'navy-silver', 'terracotta', 'rose-sage'] as const;

/** Date as `YYYY-MM-DD` and time as `HH:MM`, in East Africa Time (UTC+3: Dar es Salaam and Nairobi). */
function toIso(date: string, time: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const tm = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m || !tm) return null;
  return `${m[1]}-${m[2]}-${m[3]}T${tm[1]!.padStart(2, '0')}:${tm[2]}:00+03:00`;
}

export default function NewEvent() {
  const t = useT();
  const { locale } = useLocale();
  const create = useCreateEvent();
  const [country, setCountry] = useState<Country>('TZ');
  // the event type starts as the first suggestion in the language of the screen (Wedding / Harusi)
  const [kind, setKind] = useState<string>(eventKindSuggestions(locale)[0]!);
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('15:00');
  const [venue, setVenue] = useState('');
  const [dress, setDress] = useState('');
  const [theme, setTheme] = useState<(typeof THEMES)[number]>('emerald-gold');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState(false);

  const submit = async () => {
    const iso = toIso(date, time);
    const parsed = eventInputSchema.safeParse({
      title: defaultEventTitle(kind, hostNames(a, b), locale),
      eventKind: kind,
      country,
      partnerA: a,
      partnerB: b,
      dateStart: iso ?? '',
      venueName: venue,
      dressCode: dress,
      languageDefault: locale,
      themeId: theme,
    });
    if (!parsed.success) {
      const e: Record<string, string> = {};
      for (const i of parsed.error.issues) {
        const k = String(i.path[0]);
        const [ns, key] = i.message.split('.');
        e[k] = ns && key ? t(`validation.${i.message}`) : t('validation.generic');
      }
      return setErrors(e);
    }
    setErrors({});
    setFailed(false);
    try {
      const ev = await create.mutateAsync(parsed.data as never);
      router.replace(`/event/${ev.id}`);
    } catch {
      setFailed(true);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title={t('events.new')} onBack={() => router.back()} />
      <Screen
        footer={<Button label={t('common.save')} loading={create.isPending} onPress={submit} />}
      >
        {KENYA_ENABLED ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {COUNTRIES.map((c) => (
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
          label={t('wizard.kind')}
          hint={t('wizard.kindHint')}
          value={kind}
          onChangeText={setKind}
          maxLength={40}
          error={errors.eventKind}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {eventKindSuggestions(locale).map((k) => (
            <Chip
              key={k}
              label={k}
              active={eventKindLabel(kind, locale) === k}
              onPress={() => setKind(k)}
            />
          ))}
        </View>
        <Field label={t('wizard.hostA')} value={a} onChangeText={setA} error={errors.partnerA} />
        <Field label={t('wizard.hostB')} value={b} onChangeText={setB} error={errors.partnerB} />
        <Field
          label={t('wizard.date')}
          hint={`${t('wizard.dateHint')} — 2027-03-20`}
          value={date}
          onChangeText={setDate}
          keyboardType="numbers-and-punctuation"
          error={errors.dateStart}
        />
        <Field
          label={`${t('wizard.date')} (HH:MM)`}
          value={time}
          onChangeText={setTime}
          keyboardType="numbers-and-punctuation"
        />
        <Field
          label={t('wizard.venueName')}
          value={venue}
          onChangeText={setVenue}
          error={errors.venueName}
        />
        <Field label={t('wizard.dressCode')} value={dress} onChangeText={setDress} />
        <Txt size={14} bold>
          {t('wizard.theme')}
        </Txt>
        <Segmented
          value={theme}
          onChange={setTheme}
          options={THEMES.map((v) => ({ value: v, label: t(`wizard.themes.${v}`) }))}
        />
        {failed ? <Txt color="#B3261E">{t('states.errorBody')}</Txt> : null}
      </Screen>
    </View>
  );
}
