'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { RotateCcw } from 'lucide-react';
import {
  normalizeHex,
  themePalette,
  type PaletteKey,
  type PaletteOverrides,
} from '@harusi/ui-tokens/palette';
import type { ContrastIssue } from '@harusi/ui-tokens';
import { Button } from '@/components/ui/button';
import { Banner } from '@/components/ui/display';
import { cn } from '@/lib/cn';

const ORDER: PaletteKey[] = [
  'primary',
  'onPrimary',
  'accent',
  'pattern',
  'bg',
  'surface',
  'ink',
  'muted',
  'border',
];

/**
 * Colour customisation for the digital and print card: every palette key can be overridden on top
 * of the chosen style, with a live contrast report. Saving is blocked by the page while `issues`
 * is non-empty (the API enforces the same rule).
 */
export function PaletteEditor({
  themeId,
  overrides,
  onChange,
  issues,
}: {
  themeId: string;
  overrides: PaletteOverrides;
  onChange: (next: PaletteOverrides) => void;
  issues: ContrastIssue[];
}) {
  const t = useTranslations('cards');
  const base = themePalette(themeId);
  const custom = ORDER.filter((k) => overrides[k]).length;
  const label = (k: PaletteKey | 'success') => t(`swatch.${k}`);

  const set = (k: PaletteKey, hex: string) => onChange({ ...overrides, [k]: hex });
  const clear = (k: PaletteKey) => {
    const next = { ...overrides };
    delete next[k];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-4" data-testid="palette-editor">
      <p className="text-sm text-muted">{t('paletteHelp')}</p>
      <ul className="flex flex-col gap-3">
        {ORDER.map((k) => (
          <SwatchRow
            key={k}
            id={k}
            label={label(k)}
            value={overrides[k] ?? base[k]}
            changed={Boolean(overrides[k])}
            onPick={(hex) => (hex === base[k] ? clear(k) : set(k, hex))}
            onReset={() => clear(k)}
            hexLabel={t('paletteHex')}
            invalidText={t('paletteHexInvalid')}
            resetLabel={t('paletteReset')}
          />
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-muted">{t('paletteCustom', { n: custom })}</span>
        <Button
          variant="ghost"
          size="sm"
          disabled={custom === 0}
          icon={<RotateCcw className="size-4" aria-hidden="true" />}
          onClick={() => onChange({})}
          data-testid="palette-reset-all"
        >
          {t('paletteResetAll')}
        </Button>
      </div>
      {issues.length ? (
        <Banner tone="error" live="polite" title={t('paletteUnreadable')}>
          <ul className="list-disc pl-5" data-testid="palette-issues">
            {issues.map((i) => {
              const [a, b] = i.pair.split('/') as [PaletteKey | 'success', PaletteKey | 'success'];
              return (
                <li key={i.pair}>
                  {t('paletteIssue', { a: label(a), b: label(b), ratio: i.ratio.toFixed(1) })}
                </li>
              );
            })}
          </ul>
        </Banner>
      ) : (
        <p className="text-sm font-medium text-success" role="status">
          ✔ {t('paletteReadable')}
        </p>
      )}
      <p className="text-sm text-muted">{t('paletteQrNote')}</p>
      <p className="text-sm text-muted">{t('palettePrintNote')}</p>
    </div>
  );
}

function SwatchRow({
  id,
  label,
  value,
  changed,
  onPick,
  onReset,
  hexLabel,
  invalidText,
  resetLabel,
}: {
  id: string;
  label: string;
  value: string;
  changed: boolean;
  onPick: (hex: string) => void;
  onReset: () => void;
  hexLabel: string;
  invalidText: string;
  resetLabel: string;
}) {
  // The text box keeps what the user is typing; the colour only changes once it is a valid hex.
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? value;
  const invalid = draft !== null && normalizeHex(draft) === null;
  return (
    <li className="flex flex-wrap items-center gap-3">
      <input
        type="color"
        aria-label={label}
        value={value.toLowerCase()}
        onChange={(e) => {
          setDraft(null);
          onPick(e.target.value.toUpperCase());
        }}
        className="size-12 shrink-0 cursor-pointer rounded-input border border-border bg-surface p-1"
        data-testid={`palette-${id}`}
      />
      <div className="min-w-0 flex-1">
        <label htmlFor={`hex-${id}`} className="block text-sm font-medium">
          {label}
          {changed ? <span className="ml-2 text-xs text-accent">●</span> : null}
        </label>
        <input
          id={`hex-${id}`}
          aria-label={`${label} — ${hexLabel}`}
          aria-invalid={invalid}
          value={shown}
          maxLength={7}
          spellCheck={false}
          autoCapitalize="characters"
          onChange={(e) => {
            const v = e.target.value;
            setDraft(v);
            const hex = normalizeHex(v);
            if (hex) onPick(hex);
          }}
          onBlur={() => setDraft(null)}
          className={cn(
            'mt-1 min-h-10 w-32 rounded-input border bg-surface px-2 font-mono text-base uppercase',
            invalid ? 'border-danger' : 'border-border',
          )}
          data-testid={`palette-hex-${id}`}
        />
        {invalid ? <p className="text-xs text-danger">{invalidText}</p> : null}
      </div>
      {changed ? (
        <Button variant="ghost" size="sm" onClick={onReset} aria-label={`${label}: ${resetLabel}`}>
          {resetLabel}
        </Button>
      ) : null}
    </li>
  );
}
