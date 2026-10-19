/**
 * Small pieces of the guest checkout (ADR 036) that are plain logic, so they can be tested and shared:
 * guessing the mobile network from the number, and the one-tap amounts.
 */
import { onlinePaymentLimits, type Country } from './country';

export type DetectedNetwork = 'mpesa' | 'mixx' | 'airtel' | 'halopesa';

/**
 * Tanzanian mobile prefixes (the two digits after +255) that belong to one network. Only prefixes whose
 * owner is certain are listed: Vodacom (M-Pesa) 74 75 76, Mixx by Yas 65 67 71, Airtel 68 69 78, Halotel
 * (HaloPesa) 61 62. Others (TTCL, Zantel and the rest) give no suggestion. Numbers can move between
 * networks, so this is a hint the guest can always change, never a rule.
 */
const TZ_PREFIX: Readonly<Record<string, DetectedNetwork>> = {
  '74': 'mpesa',
  '75': 'mpesa',
  '76': 'mpesa',
  '65': 'mixx',
  '67': 'mixx',
  '71': 'mixx',
  '68': 'airtel',
  '69': 'airtel',
  '78': 'airtel',
  '61': 'halopesa',
  '62': 'halopesa',
};

/**
 * The network a number most likely belongs to, or null when unsure. Kenya is never guessed: Safaricom
 * and Airtel ranges overlap there, and there are only two to choose from.
 */
export function detectNetwork(e164: string | null | undefined): DetectedNetwork | null {
  const m = /^\+255(\d{2})\d{7}$/.exec(e164 ?? '');
  return (m && TZ_PREFIX[m[1]!]) || null;
}

/** One-tap amounts per currency, in whole units. The guest's own balance is offered separately. */
const PRESETS: Record<Country, readonly number[]> = {
  TZ: [10_000, 20_000, 50_000, 100_000],
  KE: [500, 1_000, 2_000, 5_000],
};

/**
 * Amounts to offer as buttons: the open balance first (if any), then the presets, all within the country's
 * online payment limits, without repeats, at most `max` of them.
 */
export function quickAmounts(country: Country, balance?: number | null, max = 4): number[] {
  const { min, max: top } = onlinePaymentLimits(country);
  const out: number[] = [];
  const add = (n: number) => {
    if (Number.isInteger(n) && n >= min && n <= top && !out.includes(n)) out.push(n);
  };
  if (balance && balance > 0) add(balance);
  for (const p of PRESETS[country]) add(p);
  return out.slice(0, max);
}
