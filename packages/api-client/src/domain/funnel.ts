import type { InvitationStatus } from '@harusi/schemas';

/** Order of invitation states (§5). `declined` sits at the same depth as `confirmed`. */
export const STATUS_RANK: Record<InvitationStatus, number> = {
  created: 0,
  queued: 1,
  sent: 2,
  delivered: 3,
  opened: 4,
  confirmed: 5,
  declined: 5,
  checked_in: 6,
};

export const FUNNEL_STAGES = [
  'created',
  'sent',
  'delivered',
  'opened',
  'confirmed',
  'checked_in',
] as const;
export type FunnelStage = (typeof FUNNEL_STAGES)[number];

/** Whether a guest in `status` has reached `stage` (declined guests never reach confirmed/attended). */
export function reached(status: InvitationStatus, stage: FunnelStage): boolean {
  if (status === 'declined' && (stage === 'confirmed' || stage === 'checked_in')) return false;
  return STATUS_RANK[status] >= STATUS_RANK[stage];
}

export function funnelCounts(statuses: InvitationStatus[]): Record<FunnelStage, number> {
  const out = Object.fromEntries(FUNNEL_STAGES.map((s) => [s, 0])) as Record<FunnelStage, number>;
  for (const st of statuses)
    for (const stage of FUNNEL_STAGES) if (reached(st, stage)) out[stage] += 1;
  return out;
}

/** Status after a new event, never moving backwards (e.g. a late "delivered" after "opened"). */
export function advanceStatus(current: InvitationStatus, next: InvitationStatus): InvitationStatus {
  if (next === 'confirmed' || next === 'declined') return current === 'checked_in' ? current : next;
  return STATUS_RANK[next] > STATUS_RANK[current] ? next : current;
}
