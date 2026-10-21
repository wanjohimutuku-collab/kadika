'use client';

import { CARD_KINDS, type CardKind } from '@harusi/schemas';
import { cn } from '@/lib/cn';

/**
 * Invitation card or contribution card (ADR 029, 040): one choice for a guest, or for a whole imported list.
 * Radio cards rather than a segmented control because each option reads as a short sentence.
 */
export function CardKindPicker({
  value,
  onChange,
  legend,
  help,
  labels,
  name,
  testId,
}: {
  value: CardKind;
  onChange: (kind: CardKind) => void;
  legend: string;
  help: string;
  labels: Record<CardKind, string>;
  name: string;
  testId?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2" data-testid={testId}>
      <legend className="mb-1 font-semibold">{legend}</legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {CARD_KINDS.map((k) => (
          <label
            key={k}
            className={cn(
              'flex min-h-14 cursor-pointer items-center gap-3 rounded-card border-2 p-3',
              value === k ? 'border-primary bg-primary/5' : 'border-border',
            )}
          >
            <input
              type="radio"
              name={name}
              value={k}
              className="size-5 accent-[var(--hp-primary)]"
              checked={value === k}
              onChange={() => onChange(k)}
            />
            <span className="font-medium">{labels[k]}</span>
          </label>
        ))}
      </div>
      <p className="text-sm text-muted">{help}</p>
    </fieldset>
  );
}
