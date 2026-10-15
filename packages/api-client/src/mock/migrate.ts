/**
 * The demo backend keeps its state in the browser. State saved before Phase 1b (ADR 025) uses the
 * old `*Tzs` money names; this renames them so a returning visitor's demo data keeps working.
 */
const RENAMES: Readonly<Record<string, string>> = {
  amountTzs: 'amount',
  paidTzs: 'paid',
  balanceTzs: 'balance',
  pledgedTzs: 'pledged',
  collectedTzs: 'collected',
  targetTzs: 'targetAmount',
  outstandingTzs: 'outstanding',
  overpaidTzs: 'overpaid',
  newBalanceTzs: 'newBalance',
  pledgeAmountTzs: 'pledgeAmount',
  unpledgedPaymentsTzs: 'unpledgedPayments',
  contributionTargetTzs: 'contributionTarget',
  costTzs: 'cost',
  estimatedSmsCostTzs: 'estimatedSmsCost',
  smsCostTzs: 'smsCost',
  smsCostTzs30d: 'smsCost30d',
};

import type { MockState } from './state';

export function renameLegacyMoneyKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(renameLegacyMoneyKeys);
  if (typeof value !== 'object' || value === null) return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) out[RENAMES[k] ?? k] = renameLegacyMoneyKeys(v);
  return out;
}

/** Gives events `cardContent` and guests `cardKind` (ADR 029) and stamps the current state version. */
export function addCardFields(state: MockState): MockState {
  return {
    ...state,
    version: 5,
    events: state.events.map((e) => ({ ...e, cardContent: e.cardContent ?? {} })),
    guests: state.guests.map((g) => ({ ...g, cardKind: g.cardKind ?? 'invitation' })),
  };
}
