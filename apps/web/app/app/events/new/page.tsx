'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, ImagePlus } from 'lucide-react';
import {
  defaultEventTitle,
  eventInputSchema,
  eventKindSuggestions,
  hostNames,
  type EventInput,
} from '@harusi/schemas';
import type { Locale } from '@harusi/i18n';
import {
  contrastRatio,
  lightColors,
  themeContrastIssues,
  themeIds,
  themes,
  type ThemeId,
} from '@harusi/ui-tokens';
import { ConsoleShell } from '@/components/console/shell';
import { PageHeader } from '@/components/console/page-header';
import { CardPreview } from '@/components/console/card-preview';
import { Button } from '@/components/ui/button';
import { Banner } from '@/components/ui/display';
import { COUNTRIES, currencyOf } from '@harusi/schemas/country';
import { Select, TextField } from '@/components/ui/form';
import { KindChips } from '@/components/console/kind-chips';
import { KENYA_ENABLED } from '@/lib/country';
import { useToast } from '@/components/ui/toast';
import { getRepository } from '@/lib/repo';
import { qk } from '@/lib/queries';
import { useFieldError } from '@/lib/use-field-error';
import { fromLocalInput } from '@/lib/format';
import { cn } from '@/lib/cn';

const DRAFT_KEY = 'harusi.draft.event';
const STEPS = ['names', 'venue', 'style', 'review'] as const;
type Step = (typeof STEPS)[number];
const STEP_FIELDS: Record<Step, (keyof EventInput)[]> = {
  names: [
    'country',
    'eventKind',
    'partnerA',
    'partnerB',
    'title',
    'dateStart',
    'rsvpDeadline',
    'contributionTarget',
  ],
  venue: ['venueName', 'venueMapUrl', 'dressCode', 'languageDefault'],
  style: ['themeId', 'coverGradient'],
  review: [],
};

// Mock "cover photos": soft gradients until uploads exist (§17.2 allows an optional cover photo).
const COVERS = [
  { id: 'theme', value: '' },
  { id: 'sunset', value: 'linear-gradient(160deg,#7A3E2B 0%,#C2703D 45%,#E8B66B 100%)' },
  { id: 'garden', value: 'linear-gradient(160deg,#20402F 0%,#3F6E4E 50%,#A9C48E 100%)' },
] as const;

const EMPTY: EventInput = {
  title: '',
  eventKind: 'Wedding',
  country: 'TZ',
  partnerA: '',
  partnerB: '',
  dateStart: '',
  venueName: '',
  venueMapUrl: '',
  dressCode: '',
  languageDefault: 'en',
  themeId: 'emerald-gold',
  coverGradient: '',
  rsvpDeadline: '',
  contributionTarget: 0,
};

function readDraft(): { values: EventInput; step: Step } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as { values: EventInput; step: Step }) : null;
  } catch {
    return null;
  }
}

export default function NewEventPage() {
  const t = useTranslations('wizard');
  const tc = useTranslations('common');
  const tl = useTranslations('common.languageName');
  const locale = useLocale() as Locale;
  const fieldError = useFieldError();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('names');
  const [restored, setRestored] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  // the event type starts as the first suggestion in the language of the screen (Wedding / Harusi)
  const empty = useMemo<EventInput>(
    () => ({ ...EMPTY, eventKind: eventKindSuggestions(locale)[0] }),
    [locale],
  );
  const form = useForm<EventInput>({
    resolver: zodResolver(eventInputSchema),
    defaultValues: empty,
    mode: 'onTouched',
  });
  const { register, control, formState, trigger, setValue, reset, handleSubmit } = form;
  const values = useWatch({ control }) as EventInput;

  // Restore + autosave the draft on this device.
  useEffect(() => {
    const d = readDraft();
    if (d && (d.values.partnerA || d.values.partnerB || d.values.venueName)) {
      reset({ ...empty, ...d.values });
      setStep(d.step);
      setRestored(true);
    }
  }, [reset, empty]);
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ values, step }));
      } catch {
        // ignore
      }
    }, 400);
    return () => clearTimeout(id);
  }, [values, step]);

  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  // Default title follows the names until the user edits it.
  const titleTouched = formState.dirtyFields.title;
  useEffect(() => {
    if (!titleTouched && (values.partnerA || values.partnerB))
      setValue(
        'title',
        defaultEventTitle(values.eventKind, hostNames(values.partnerA, values.partnerB), locale),
      );
  }, [values.eventKind, values.partnerA, values.partnerB, titleTouched, setValue, locale]);

  const create = useMutation({
    mutationFn: (input: EventInput) =>
      getRepository().createEvent({
        ...input,
        dateStart: fromLocalInput(input.dateStart),
        rsvpDeadline: input.rsvpDeadline ? fromLocalInput(`${input.rsvpDeadline}T23:59`) : '',
      }),
    onSuccess: async (ev) => {
      localStorage.removeItem(DRAFT_KEY);
      await queryClient.invalidateQueries({ queryKey: qk.events });
      toast({ tone: 'success', title: t('created') });
      // ADR 042: show the host their card being put together, then offer cards to buy.
      router.push(`/app/e/${ev.id}/karibu`);
    },
    onError: () => toast({ tone: 'error', title: tc('retry') }),
  });

  const idx = STEPS.indexOf(step);
  const go = async (dir: 1 | -1) => {
    if (dir === 1 && !(await trigger(STEP_FIELDS[step]))) return;
    setStep(STEPS[Math.max(0, Math.min(STEPS.length - 1, idx + dir))]!);
  };

  const issues = useMemo(
    () => themeContrastIssues(themes[(values.themeId ?? 'emerald-gold') as ThemeId]),
    [values.themeId],
  );
  const preview = {
    ...values,
    dateStart: values.dateStart ? fromLocalInput(values.dateStart) : '',
  } as EventInput;

  return (
    <ConsoleShell>
      <PageHeader
        title={t('title')}
        subtitle={t('stepOf', { current: idx + 1, total: STEPS.length })}
        back={
          <Link
            href="/app"
            className="inline-flex min-h-10 items-center gap-1.5 self-start font-semibold text-primary"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
            {tc('back')}
          </Link>
        }
      />
      <ol
        className="mb-5 grid grid-cols-4 gap-1.5"
        aria-label={t('stepOf', { current: idx + 1, total: STEPS.length })}
      >
        {STEPS.map((s, i) => (
          <li
            key={s}
            aria-current={s === step ? 'step' : undefined}
            className="flex flex-col gap-1"
          >
            <span className={cn('h-1.5 rounded-full', i <= idx ? 'bg-primary' : 'bg-border')} />
            <span
              className={cn('hidden text-sm sm:block', s === step ? 'font-semibold' : 'text-muted')}
            >
              {t(`steps.${s}`)}
            </span>
          </li>
        ))}
      </ol>
      {restored ? (
        <Banner
          tone="info"
          className="mb-4"
          action={
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                localStorage.removeItem(DRAFT_KEY);
                reset(empty);
                setStep('names');
                setRestored(false);
              }}
            >
              {t('discardDraft')}
            </Button>
          }
        >
          {t('draftRestored')}
        </Banner>
      ) : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <form
          noValidate
          onSubmit={(e) => {
            // Enter in a field moves forward; only the explicit "Unda harusi" button creates the event.
            e.preventDefault();
            if (step !== 'review') void go(1);
          }}
          className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4 md:p-6"
          data-testid="event-wizard"
        >
          <h2 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">
            {t(`steps.${step}`)}
          </h2>

          {step === 'names' ? (
            <>
              {KENYA_ENABLED ? (
                <Select
                  label={tc('country')}
                  {...register('country')}
                  options={COUNTRIES.map((c) => ({ value: c, label: tc(`countries.${c}`) }))}
                />
              ) : null}
              <KindChips
                label={t('kind')}
                value={values.eventKind ?? ''}
                onChange={(k) =>
                  setValue('eventKind', k, { shouldDirty: true, shouldValidate: true })
                }
              />
              <TextField
                label={t('kind')}
                hint={t('kindHint')}
                list="event-kind-suggestions"
                maxLength={40}
                autoComplete="off"
                {...register('eventKind')}
                error={fieldError(formState.errors.eventKind)}
              />
              <datalist id="event-kind-suggestions">
                {eventKindSuggestions(locale).map((k) => (
                  <option key={k} value={k} />
                ))}
              </datalist>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField
                  label={t('hostA')}
                  autoComplete="off"
                  {...register('partnerA')}
                  error={fieldError(formState.errors.partnerA)}
                />
                <TextField
                  label={t('hostB')}
                  optionalLabel={tc('optional')}
                  autoComplete="off"
                  {...register('partnerB')}
                  error={fieldError(formState.errors.partnerB)}
                />
              </div>
              <TextField
                label={t('eventTitle')}
                hint={t('titleHint')}
                {...register('title')}
                error={fieldError(formState.errors.title)}
              />
              <TextField
                label={t('date')}
                type="datetime-local"
                hint={t('dateHint')}
                {...register('dateStart')}
                error={fieldError(formState.errors.dateStart)}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField
                  label={t('rsvpDeadline')}
                  type="date"
                  optionalLabel={tc('optional')}
                  {...register('rsvpDeadline')}
                />
                <TextField
                  label={t('target')}
                  inputMode="numeric"
                  prefix={currencyOf(values.country ?? 'TZ')}
                  optionalLabel={tc('optional')}
                  {...register('contributionTarget')}
                  error={fieldError(formState.errors.contributionTarget)}
                />
              </div>
            </>
          ) : null}

          {step === 'venue' ? (
            <>
              <TextField
                label={t('venueName')}
                {...register('venueName')}
                error={fieldError(formState.errors.venueName)}
              />
              <TextField
                label={t('venueMap')}
                type="url"
                inputMode="url"
                hint={t('venueMapHint')}
                optionalLabel={tc('optional')}
                {...register('venueMapUrl')}
                error={fieldError(formState.errors.venueMapUrl)}
              />
              <TextField
                label={t('dressCode')}
                optionalLabel={tc('optional')}
                {...register('dressCode')}
              />
              <Select
                label={t('language')}
                {...register('languageDefault')}
                options={[
                  { value: 'sw', label: tl('sw') },
                  { value: 'en', label: tl('en') },
                ]}
              />
            </>
          ) : null}

          {step === 'style' ? (
            <>
              <fieldset>
                <legend className="mb-2 text-sm font-semibold">{t('theme')}</legend>
                <div className="grid grid-cols-2 gap-3">
                  {themeIds.map((id) => {
                    const th = themes[id];
                    const selected = values.themeId === id;
                    return (
                      <label
                        key={id}
                        className={cn(
                          'flex cursor-pointer flex-col gap-2 rounded-card border-2 p-3',
                          selected ? 'border-primary' : 'border-border',
                        )}
                      >
                        <input
                          type="radio"
                          value={id}
                          {...register('themeId')}
                          className="sr-only"
                        />
                        <span
                          className="flex h-12 overflow-hidden rounded-input"
                          aria-hidden="true"
                        >
                          <span className="flex-[2]" style={{ background: th.primary }} />
                          <span className="flex-1" style={{ background: th.accent }} />
                          <span className="flex-1" style={{ background: lightColors.bg }} />
                        </span>
                        <span className="flex items-center justify-between gap-2 font-medium">
                          {t(`themes.${id}`)}
                          {selected ? (
                            <Check className="size-5 text-primary" aria-hidden="true" />
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              <p
                className={cn(
                  'text-sm font-medium',
                  issues.length ? 'text-danger' : 'text-success',
                )}
                role="status"
              >
                {issues.length ? t('contrastFail') : t('contrastOk')} (
                {contrastRatio(
                  themes[(values.themeId ?? 'emerald-gold') as ThemeId].onPrimary,
                  themes[(values.themeId ?? 'emerald-gold') as ThemeId].primary,
                ).toFixed(1)}
                :1)
              </p>
              <fieldset>
                <legend className="mb-2 text-sm font-semibold">{t('cover')}</legend>
                <div className="grid grid-cols-3 gap-2">
                  {COVERS.map((c) => (
                    <label
                      key={c.id}
                      className={cn(
                        'flex cursor-pointer flex-col items-center gap-1 rounded-card border-2 p-2 text-sm',
                        values.coverGradient === c.value ? 'border-primary' : 'border-border',
                      )}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        checked={values.coverGradient === c.value}
                        onChange={() => setValue('coverGradient', c.value, { shouldDirty: true })}
                      />
                      <span
                        className="flex h-12 w-full items-center justify-center rounded-input text-white"
                        style={{
                          background:
                            c.value ||
                            themes[(values.themeId ?? 'emerald-gold') as ThemeId].primary,
                        }}
                        aria-hidden="true"
                      >
                        {c.id !== 'theme' ? <ImagePlus className="size-5" /> : null}
                      </span>
                      {c.id === 'theme'
                        ? t('coverNone')
                        : c.id === 'sunset'
                          ? t('coverSunset')
                          : t('coverGarden')}
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-sm text-muted">{t('coverHint')}</p>
              </fieldset>
            </>
          ) : null}

          {step === 'review' ? (
            <dl className="flex flex-col divide-y divide-border">
              {(
                [
                  ['names', t('kind'), values.eventKind || '—'],
                  ['names', t('hostA'), values.partnerA],
                  ['names', t('hostB'), values.partnerB || '—'],
                  ['names', t('date'), values.dateStart?.replace('T', ' ')],
                  ['venue', t('venueName'), values.venueName],
                  ['venue', t('dressCode'), values.dressCode || '—'],
                  [
                    'style',
                    t('theme'),
                    t(`themes.${(values.themeId ?? 'emerald-gold') as ThemeId}`),
                  ],
                ] as const
              ).map(([s, label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <dt className="text-sm text-muted">{label}</dt>
                    <dd className="font-medium">{value}</dd>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep(s)}>
                    {t('reviewEdit')}
                  </Button>
                </div>
              ))}
            </dl>
          ) : null}

          <p className="text-sm text-muted">{t('draftSaved')}</p>
          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-between">
            <Button variant="secondary" onClick={() => void go(-1)} disabled={idx === 0}>
              {tc('back')}
            </Button>
            {step === 'review' ? (
              <Button
                key="create"
                loading={create.isPending}
                disabled={issues.length > 0}
                onClick={handleSubmit((v) => create.mutate(v))}
                data-testid="wizard-create"
              >
                {t('create')}
              </Button>
            ) : (
              <Button key="next" onClick={() => void go(1)} data-testid="wizard-next">
                {tc('next')}
              </Button>
            )}
          </div>
        </form>
        <aside className="hidden lg:block" aria-label={t('preview')}>
          <p className="mb-3 text-sm font-semibold text-muted">{t('preview')}</p>
          <CardPreview
            data={{
              ...preview,
              dressCode: values.dressCode ?? '',
              themeId: values.themeId ?? 'emerald-gold',
              coverGradient: values.coverGradient ?? '',
              venueName: values.venueName ?? '',
              eventKind: values.eventKind ?? '',
              partnerA: values.partnerA ?? '',
              partnerB: values.partnerB ?? '',
              dateStart: preview.dateStart,
            }}
          />
        </aside>
      </div>
    </ConsoleShell>
  );
}
