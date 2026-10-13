'use client';

import { useId, type ReactNode } from 'react';
import { Minus, Plus } from 'lucide-react';

export interface StepperProps {
  value: number;
  min?: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
  decreaseLabel: string;
  increaseLabel: string;
  disabled?: boolean;
  hint?: ReactNode;
}

export function Stepper({
  value,
  min = 1,
  max,
  onChange,
  label,
  decreaseLabel,
  increaseLabel,
  disabled,
  hint,
}: StepperProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <span id={`${id}-l`} className="text-sm font-semibold">
        {label}
      </span>
      <div className="flex items-center gap-2" role="group" aria-labelledby={`${id}-l`}>
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={disabled || value <= min}
          aria-label={decreaseLabel}
          className="flex size-12 items-center justify-center rounded-full border border-border bg-surface text-ink disabled:opacity-40"
        >
          <Minus className="size-5" aria-hidden="true" />
        </button>
        <output
          aria-live="polite"
          aria-labelledby={`${id}-l`}
          className="tabular min-w-12 text-center text-2xl font-bold"
        >
          {value}
        </output>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={disabled || value >= max}
          aria-label={increaseLabel}
          className="flex size-12 items-center justify-center rounded-full border border-border bg-surface text-ink disabled:opacity-40"
        >
          <Plus className="size-5" aria-hidden="true" />
        </button>
      </div>
      {hint ? <p className="text-sm text-muted">{hint}</p> : null}
    </div>
  );
}
