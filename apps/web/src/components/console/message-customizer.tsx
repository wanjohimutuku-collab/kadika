'use client';

import { useRef, useState } from 'react';
import { Check, Edit3, HelpCircle, RotateCcw, Save, Sparkles } from 'lucide-react';
import type { Locale } from '@harusi/i18n';
import { TEMPLATE_VARS, type TemplateVar } from '@harusi/schemas';
import { Button } from '@/components/ui/button';

export interface AttributeTag {
  tag: string;
  label: string;
  description: string;
}

export const SWAHILI_TAGS: AttributeTag[] = [
  { tag: '{mgeni}', label: 'Mgeni', description: 'Jina kamili la mgeni aliyealikwa' },
  { tag: '{wenyeji}', label: 'Wenyeji', description: 'Majina ya wanandoa au waandaaji' },
  { tag: '{tarehe}', label: 'Tarehe', description: 'Tarehe ya sherehe au tukio' },
  { tag: '{muda}', label: 'Muda', description: 'Muda au saa ya kuanza sherehe' },
  { tag: '{ukumbi}', label: 'Ukumbi', description: 'Jina la ukumbi na eneo la sherehe' },
  { tag: '{kiungo}', label: 'Kiungo cha Kadi', description: 'Link ya kufungua kadi ya kidijitali mtandaoni' },
  { tag: '{kadi}', label: 'Msimbo wa Kadi', description: 'Msimbo mfupi wa uthibitisho mlangoni (mfano KH-4826)' },
  { tag: '{mavazi}', label: 'Mavazi', description: 'Mavazi rasmi yaliyoelekezwa' },
  { tag: '{mtumaji}', label: 'Mtumaji', description: 'Kamati au familia inayotuma mwaliko' },
  { tag: '{simu}', label: 'Simu', description: 'Namba ya simu ya kamati kwa mawasiliano' },
];

export const ENGLISH_TAGS: AttributeTag[] = [
  { tag: '{guest}', label: 'Guest', description: 'Full name of the invited guest' },
  { tag: '{hosts}', label: 'Hosts', description: 'Names of the couple or hosts' },
  { tag: '{date}', label: 'Date', description: 'Date of the celebration or event' },
  { tag: '{time}', label: 'Time', description: 'Start time of the celebration' },
  { tag: '{venue}', label: 'Venue', description: 'Celebration hall or venue name' },
  { tag: '{link}', label: 'Card Link', description: 'Link to open digital card online' },
  { tag: '{code}', label: 'Card Code', description: 'Short entry verification code (e.g. KH-4826)' },
  { tag: '{dress}', label: 'Dress Code', description: 'Official dress code instructions' },
  { tag: '{sender}', label: 'Sender', description: 'Organising committee or family' },
  { tag: '{phone}', label: 'Phone', description: 'Committee contact phone number' },
];

export interface MessageCustomizerProps {
  channelName: string;
  value: string;
  defaultValue: string;
  onChange: (val: string) => void;
  onSave?: () => Promise<void> | void;
  isSaving?: boolean;
  locale: Locale;
}

/**
 * Interactive message editor allowing full customization of WhatsApp and SMS messages.
 * Includes 1-click attribute chips to insert dynamic placeholders at the cursor position,
 * live character count, link validation, and reset to default.
 */
export function MessageCustomizer({
  channelName,
  value,
  defaultValue,
  onChange,
  onSave,
  isSaving,
  locale,
}: MessageCustomizerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const tags = locale === 'sw' ? SWAHILI_TAGS : ENGLISH_TAGS;

  const handleInsertTag = (tag: string) => {
    const el = textareaRef.current;
    if (!el) {
      onChange(value ? `${value} ${tag}` : tag);
      return;
    }

    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + tag + value.slice(end);
    onChange(next);

    // Re-focus and position caret immediately after inserted tag
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + tag.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleReset = () => {
    onChange(defaultValue);
  };

  const handleSave = async () => {
    if (!onSave) return;
    await onSave();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const hasLinkTag =
    value.includes('{kiungo}') ||
    value.includes('{link}') ||
    value.includes('{linki}') ||
    value.includes('http://') ||
    value.includes('https://');

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-xs"
      data-testid="message-customizer"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Edit3 className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink">
              {locale === 'sw'
                ? `Hariri Ujumbe wa ${channelName}`
                : `Edit ${channelName} Message`}
            </h3>
            <p className="text-xs text-muted">
              {locale === 'sw'
                ? 'Tumia vitufe vya sifa kuingiza taarifa za mgeni moja kwa moja'
                : 'Use attribute chips to dynamically insert guest information'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-muted hover:bg-ink/5 hover:text-ink"
            title={locale === 'sw' ? 'Rudisha ujumbe wa asili' : 'Reset to default message'}
          >
            <RotateCcw className="size-3.5" />
            <span>{locale === 'sw' ? 'Rudisha Asili' : 'Reset'}</span>
          </button>
          {onSave ? (
            <Button
              size="sm"
              variant="secondary"
              icon={savedSuccess ? <Check className="size-3.5 text-success" /> : <Save className="size-3.5" />}
              onClick={handleSave}
              loading={isSaving}
            >
              {savedSuccess
                ? locale === 'sw'
                  ? 'Imehifadhiwa!'
                  : 'Saved!'
                : locale === 'sw'
                  ? 'Hifadhi Ujumbe'
                  : 'Save Message'}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Attribute Chips Toolbar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-medium text-muted">
          <span className="flex items-center gap-1">
            <Sparkles className="size-3 text-primary" />
            <span>{locale === 'sw' ? 'Bofya sifa kuingiza kwenye ujumbe:' : 'Click attribute to insert:'}</span>
          </span>
          <span className="text-[11px] opacity-80">
            {locale === 'sw' ? 'Inaingizwa pale mshale ulipo' : 'Inserts at cursor position'}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <button
              key={t.tag}
              type="button"
              onClick={() => handleInsertTag(t.tag)}
              title={t.description}
              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 hover:border-primary active:scale-95"
            >
              <span>+</span>
              <span>{t.tag}</span>
              <span className="text-[10px] opacity-75 font-normal">({t.label})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Text Area */}
      <div className="space-y-1.5">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="w-full rounded-xl border border-border bg-surface p-3 font-mono text-xs leading-relaxed text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder={
            locale === 'sw'
              ? 'Andika ujumbe wako hapa… Tumia {mgeni}, {tarehe}, {ukumbi}, {kiungo} n.k.'
              : 'Write your custom message here… Use {guest}, {date}, {venue}, {link} etc.'
          }
          data-testid="message-textarea"
        />

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            {!hasLinkTag ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                <HelpCircle className="size-3.5" />
                {locale === 'sw'
                  ? 'Kumbuka kuweka {kiungo} ili mgeni apate link ya kadi mtandaoni.'
                  : 'Remember to include {link} so guests can open their card online.'}
              </span>
            ) : null}
          </div>
          <span className="text-muted tabular">
            {value.length} {locale === 'sw' ? 'herufi' : 'chars'}
          </span>
        </div>
      </div>
    </div>
  );
}
