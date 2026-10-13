import type { Locale } from '@harusi/i18n';
import {
  formatDate,
  formatDateShort,
  formatDateTimeShort,
  formatTime,
  formatTzs,
} from '@/lib/format';

/** `TZS 1,200,000` with tabular figures. */
export function CurrencyText({ amount, className }: { amount: number; className?: string }) {
  return (
    <span className={['tabular whitespace-nowrap', className].filter(Boolean).join(' ')}>
      {formatTzs(amount)}
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
