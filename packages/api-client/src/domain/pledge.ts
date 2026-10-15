import type { PledgeStatus } from '@harusi/schemas';
import type { PledgeSummary } from '../types';

/** Derives pledge status/balance from the pledged amount and the sum of successful payments. */
export function summarizePledge(
  pledgedAmount: number,
  paidAmount: number,
  waived = false,
): PledgeSummary {
  const amount = Math.max(0, Math.round(pledgedAmount));
  const paid = Math.max(0, Math.round(paidAmount));
  let status: PledgeStatus;
  if (waived) status = 'waived';
  else if (paid <= 0) status = 'pledged';
  else if (paid < amount) status = 'partial';
  else status = 'paid';
  return {
    amount,
    paid,
    balance: waived ? 0 : Math.max(0, amount - paid),
    status,
  };
}

export interface PledgeTotals {
  pledged: number;
  collected: number;
  outstanding: number;
  overpaid: number;
  guestsPaid: number;
  guestsPartial: number;
  guestsUnpaid: number;
}

/**
 * Totals across pledges. `collected` counts every successful payment, including payments from
 * guests without a pledge; overpayment above a pledge is reported separately, never as negative balance.
 */
export function pledgeTotals(
  pledges: (PledgeSummary | null)[],
  unpledgedPayments = 0,
): PledgeTotals {
  const t: PledgeTotals = {
    pledged: 0,
    collected: unpledgedPayments,
    outstanding: 0,
    overpaid: 0,
    guestsPaid: 0,
    guestsPartial: 0,
    guestsUnpaid: 0,
  };
  for (const p of pledges) {
    if (!p) continue;
    t.pledged += p.amount;
    t.collected += p.paid;
    t.outstanding += p.balance;
    t.overpaid += Math.max(0, p.paid - p.amount);
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
