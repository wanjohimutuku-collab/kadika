'use client';

import { useLocale } from 'next-intl';
import { eventKindLabel, eventKindSuggestions } from '@harusi/schemas';
import { cn } from '@/lib/cn';

/** One-tap choice of the three card categories (wedding, engagement, send-off); the text field stays for others. */
export function KindChips({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (kind: string) => void;
  label: string;
}) {
  const locale = useLocale() as 'sw' | 'en';
  const current = value.trim() ? eventKindLabel(value, locale).toLowerCase() : '';
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2" data-testid="kind-chips">
      {eventKindSuggestions(locale).map((k) => {
        const active = current === k.toLowerCase();
        return (
          <button
            key={k}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(k)}
            className={cn(
              'min-h-12 rounded-full border px-4 text-base font-semibold',
              active
                ? 'border-primary bg-primary text-on-primary'
                : 'border-border bg-surface text-ink',
            )}
          >
            {k}
          </button>
        );
      })}
    </div>
  );
}
