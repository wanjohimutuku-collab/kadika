'use client';

/**
 * Clickable placeholder chips (`{firstName}`, `{venue}`, …) for SMS template editors.
 * Clicking a chip inserts its `{token}` at the textarea's caret and keeps focus there.
 */

import type { RefObject } from 'react';
import type { Locale } from '@harusi/i18n';
import { TEMPLATE_VAR_META, type TemplateVar } from '@harusi/schemas/card-content';
import { Chip } from '@/components/ui/display';

/** Insert `token` at the textarea's caret, or append it, and focus with the caret after it. */
export function insertAt(
  ref: RefObject<HTMLTextAreaElement | null>,
  current: string,
  token: string,
  onChange: (v: string) => void,
) {
  const el = ref.current;
  if (!el) {
    onChange(current + token);
    return;
  }
  const start = el.selectionStart ?? current.length;
  const end = el.selectionEnd ?? current.length;
  const next = current.slice(0, start) + token + current.slice(end);
  onChange(next);
  requestAnimationFrame(() => {
    el.focus();
    const pos = start + token.length;
    el.setSelectionRange(pos, pos);
  });
}

export function TemplateVarChips({
  vars,
  locale,
  label,
  hint,
  textareaRef,
  value,
  onChange,
}: {
  vars: readonly TemplateVar[];
  locale: Locale;
  label: string;
  hint: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-2">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
        {label} · <span className="font-normal normal-case">{hint}</span>
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={hint}>
        {vars.map((name) => (
          <Chip
            key={name}
            onClick={() => insertAt(textareaRef, value, `{${name}}`, onChange)}
            className="!min-h-9 !px-3 !text-xs"
          >
            <span className="font-mono">{`{${name}}`}</span>
            <span className="pl-1 text-muted">{TEMPLATE_VAR_META[name][locale]}</span>
          </Chip>
        ))}
      </div>
    </div>
  );
}
