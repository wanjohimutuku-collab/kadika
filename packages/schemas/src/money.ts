import type { Currency } from './country';

const NUMBER = new Intl.NumberFormat('en-US');

/** `TZS 1,200,000` / `KES 1,200,000` (§17.9 CurrencyText). Amounts are whole currency units. */
export function formatMoney(amount: number, currency: Currency = 'TZS'): string {
  return `${currency} ${NUMBER.format(Math.round(amount))}`;
}

/** `TZS 8.4M` / `TZS 450K` for tiles. */
export function formatMoneyCompact(amount: number, currency: Currency = 'TZS'): string {
  if (amount >= 1_000_000)
    return `${currency} ${(amount / 1_000_000).toFixed(amount >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (amount >= 10_000) return `${currency} ${Math.round(amount / 1000)}K`;
  return formatMoney(amount, currency);
}
