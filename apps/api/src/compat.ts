/**
 * Deprecated money field names (ADR 025, Phase 1b). The API used `*Tzs` names for amounts that are
 * really in the event's currency; they were renamed to currency-neutral names. Installed mobile apps
 * and cached web bundles still send and read the old names, so for one release:
 *  - responses carry the old name next to the new one (same value);
 *  - request bodies may use the old name where the new one is absent.
 * Delete this file, its middleware and its test to end the compatibility window.
 */

/** New name → deprecated name. */
export const LEGACY_MONEY_KEYS: Readonly<Record<string, string>> = {
  amount: 'amountTzs',
  paid: 'paidTzs',
  balance: 'balanceTzs',
  pledged: 'pledgedTzs',
  collected: 'collectedTzs',
  targetAmount: 'targetTzs',
  outstanding: 'outstandingTzs',
  overpaid: 'overpaidTzs',
  newBalance: 'newBalanceTzs',
  pledgeAmount: 'pledgeAmountTzs',
  unpledgedPayments: 'unpledgedPaymentsTzs',
  contributionTarget: 'contributionTargetTzs',
  cost: 'costTzs',
  estimatedSmsCost: 'estimatedSmsCostTzs',
  smsCost: 'smsCostTzs',
  smsCost30d: 'smsCostTzs30d',
};

const OLD_TO_NEW = Object.fromEntries(Object.entries(LEGACY_MONEY_KEYS).map(([n, o]) => [o, n]));

const isPlain = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof Date);

/** Adds the deprecated name beside every new money name that holds a number or null. */
export function withLegacyAliases(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withLegacyAliases);
  if (!isPlain(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = withLegacyAliases(v);
    const old = LEGACY_MONEY_KEYS[k];
    if (old && (typeof v === 'number' || v === null) && !(old in value)) out[old] = v;
  }
  return out;
}

/** Maps deprecated names in a request body to the new ones (the new name wins when both appear). */
export function fromLegacyKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(fromLegacyKeys);
  if (!isPlain(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    const neu = OLD_TO_NEW[k];
    if (neu && !(neu in value)) out[neu] = fromLegacyKeys(v);
    else if (!neu) out[k] = fromLegacyKeys(v);
  }
  return out;
}
