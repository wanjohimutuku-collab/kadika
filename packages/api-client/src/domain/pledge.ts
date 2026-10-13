import type { PledgeStatus } from '@harusi/schemas';
import type { PledgeSummary } from '../types';

/** Derives pledge status/balance from the pledged amount and the sum of successful payments. */
export function summarizePledge(amountTzs: number, paidTzs: number, waived = false): PledgeSummary {
  const amount = Math.max(0, Math.round(amountTzs));
  const paid = Math.max(0, Math.round(paidTzs));
  let status: PledgeStatus;
  if (waived) status = 'waived';
  else if (paid <= 0) status = 'pledged';
  else if (paid < amount) status = 'partial';
  else status = 'paid';
  return {
    amountTzs: amount,
    paidTzs: paid,
    balanceTzs: waived ? 0 : Math.max(0, amount - paid),
    status,
  };
}

export interface PledgeTotals {
  pledgedTzs: number;
  collectedTzs: number;
  outstandingTzs: number;
  overpaidTzs: number;
  guestsPaid: number;
  guestsPartial: number;
  guestsUnpaid: number;
}

/**
 * Totals across pledges. `collectedTzs` counts every successful payment, including payments from
 * guests without a pledge; overpayment above a pledge is reported separately, never as negative balance.
 */
export function pledgeTotals(
  pledges: (PledgeSummary | null)[],
  unpledgedPaymentsTzs = 0,
): PledgeTotals {
  const t: PledgeTotals = {
    pledgedTzs: 0,
    collectedTzs: unpledgedPaymentsTzs,
    outstandingTzs: 0,
    overpaidTzs: 0,
    guestsPaid: 0,
    guestsPartial: 0,
    guestsUnpaid: 0,
  };
  for (const p of pledges) {
    if (!p) continue;
    t.pledgedTzs += p.amountTzs;
    t.collectedTzs += p.paidTzs;
    t.outstandingTzs += p.balanceTzs;
    t.overpaidTzs += Math.max(0, p.paidTzs - p.amountTzs);
    if (p.status === 'paid' || p.status === 'waived') t.guestsPaid += 1;
    else if (p.status === 'partial') t.guestsPartial += 1;
    else t.guestsUnpaid += 1;
  }
  return t;
}

/** Progress 0–1 towards a target, clamped. */
export function progress(collected: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(1, Math.max(0, collected / target));
}
