'use client';

/**
 * Per-event SMS template editor. Each template (invite, reminder, contribution, pledge reminder)
 * can be overridden per language with the organiser's own wording; chips below each textarea come
 * from `TEMPLATE_VAR_META` so every allowed placeholder is labelled in Swahili and English.
 */

import { useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { Locale } from '@harusi/i18n';
import {
  TEMPLATE_VARS,
  templateProblem,
  type CardContent,
  type TemplateKey,
  type TemplateVar,
} from '@harusi/schemas/card-content';
import { TemplateVarChips } from '@/components/console/template-var-chips';
import { Card } from '@/components/ui/display';
import { Tabs, TabPanel } from '@/components/ui/navigation';
import { Textarea } from '@/components/ui/form';

const TEMPLATE_KEYS: TemplateKey[] = [
  'inviteSms',
  'reminderSms',
  'contributionSms',
  'pledgeReminderSms',
];

interface Props {
  messages: CardContent['messages'] | undefined;
  onChange: (next: CardContent['messages']) => void;
}

export function MessageTemplatesEditor({ messages, onChange }: Props) {
  const t = useTranslations('settings.templates');
  const locale = useLocale() as Locale;
  const [key, setKey] = useState<TemplateKey>('inviteSms');

  const setText = (k: TemplateKey, lang: Locale, value: string) => {
    const prev = messages?.[k] ?? {};
    const trimmed = value.trimEnd();
    const nextPerKey = { ...prev, [lang]: trimmed || undefined };
    const empty = !nextPerKey.sw && !nextPerKey.en;
    const nextMessages = { ...(messages ?? {}) };
    if (empty) delete nextMessages[k];
    else nextMessages[k] = nextPerKey;
    onChange(Object.keys(nextMessages).length ? nextMessages : undefined);
  };

  return (
    <Card title={t('title')} titleId="tpl-h">
      <p className="mb-3 text-sm text-muted">{t('hint')}</p>
      <Tabs
        value={key}
        onValueChange={(v) => setKey(v as TemplateKey)}
        items={TEMPLATE_KEYS.map((k) => ({ value: k, label: t(k) }))}
        label={t('title')}
      >
        {TEMPLATE_KEYS.map((k) => (
          <TabPanel key={k} value={k} className="pt-4">
            <LanguageEditors
              templateKey={k}
              value={messages?.[k]}
              locale={locale}
              onChange={(lang, v) => setText(k, lang, v)}
              label={t(k)}
              labels={{
                sw: t('swahili'),
                en: t('english'),
                placeholders: t('placeholders'),
                insert: t('insert'),
                linkRequired: t('linkRequired'),
                unknown: (name: string) => t('unknownVar', { name }),
              }}
            />
          </TabPanel>
        ))}
      </Tabs>
    </Card>
  );
}

function LanguageEditors({
  templateKey,
  value,
  locale,
  onChange,
  label,
  labels,
}: {
  templateKey: TemplateKey;
  value: { sw?: string; en?: string } | undefined;
  locale: Locale;
  onChange: (lang: Locale, v: string) => void;
  label: string;
  labels: {
    sw: string;
    en: string;
    placeholders: string;
    insert: string;
    linkRequired: string;
    unknown: (name: string) => string;
  };
}) {
  const vars = TEMPLATE_VARS[templateKey];
  return (
    <div className="flex flex-col gap-5">
      {(['sw', 'en'] as const).map((lang) => (
        <TemplateField
          key={`${templateKey}-${lang}`}
          templateKey={templateKey}
          lang={lang}
          allowed={vars}
          value={value?.[lang] ?? ''}
          label={`${label} · ${lang === 'sw' ? labels.sw : labels.en}`}
          onChange={(v) => onChange(lang, v)}
          placeholdersLabel={labels.placeholders}
          insertLabel={labels.insert}
          linkRequiredLabel={labels.linkRequired}
          unknownLabel={labels.unknown}
          uiLocale={locale}
        />
      ))}
    </div>
  );
}

function TemplateField({
  templateKey,
  lang,
  allowed,
  value,
  label,
  onChange,
  placeholdersLabel,
  insertLabel,
  linkRequiredLabel,
  unknownLabel,
  uiLocale,
}: {
  templateKey: TemplateKey;
  lang: Locale;
  allowed: readonly TemplateVar[];
  value: string;
  label: string;
  onChange: (v: string) => void;
  placeholdersLabel: string;
  insertLabel: string;
  linkRequiredLabel: string;
  unknownLabel: (name: string) => string;
  uiLocale: Locale;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const problem = value ? templateProblem(templateKey, value) : null;
  const error = errorText(problem, linkRequiredLabel, unknownLabel);

  return (
    <div>
      <TemplateVarChips
        vars={allowed}
        locale={uiLocale}
        label={placeholdersLabel}
        hint={insertLabel}
        textareaRef={ref}
        value={value}
        onChange={onChange}
      />
      <Textarea
        ref={ref}
        label={label}
        value={value}
        onChange={(ev) => onChange(ev.target.value)}
        error={error}
        maxLength={480}
        placeholder={lang === 'sw' ? 'Karibu {guest}, …' : 'Hello {firstName}, …'}
      />
    </div>
  );
}

function errorText(
  problem: string | null,
  linkRequired: string,
  unknown: (name: string) => string,
): string | undefined {
  if (!problem) return undefined;
  if (problem === 'content.link_required') return linkRequired;
  if (problem.startsWith('content.placeholder_unknown:'))
    return unknown(problem.split(':')[1] ?? '');
  return problem;
}
