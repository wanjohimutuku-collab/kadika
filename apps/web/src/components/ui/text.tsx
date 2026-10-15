import type { Locale } from '@harusi/i18n';
import { useCurrency } from '@/lib/country';
import {
  formatDate,
  formatDateShort,
  formatDateTimeShort,
  formatTime,
  formatMoney,
} from '@/lib/format';

/** `TZS 1,200,000` with tabular figures, in the open event's currency. */
export function CurrencyText({ amount, className }: { amount: number; className?: string }) {
  const currency = useCurrency();
  return (
    <span className={['tabular whitespace-nowrap', className].filter(Boolean).join(' ')}>
      {formatMoney(amount, currency)}
    </span>
  );
}

/** Date in Africa/Dar_es_Salaam with Swahili month names; machine-readable via <time>. */
export function DateText({
  iso,
  locale,
  variant = 'long',
  className,
}: {
  iso: string;
  locale: Locale;
  variant?: 'long' | 'short' | 'datetime' | 'time';
  className?: string;
}) {
  const text =
    variant === 'short'
      ? formatDateShort(iso, locale)
      : variant === 'datetime'
        ? formatDateTimeShort(iso, locale)
        : variant === 'time'
          ? formatTime(iso, locale)
          : formatDate(iso, locale);
  return (
    <time dateTime={iso} className={className}>
      {text}
    </time>
  );
}
