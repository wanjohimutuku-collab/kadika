import type { WeddingEvent } from '@harusi/api-client';
import { allowsDonations } from '@harusi/schemas';

export type NextKey =
  'import' | 'addInvites' | 'failed' | 'send' | 'remind' | 'pledges' | 'gate' | 'past' | 'done';

export type NextStepStats = Pick<
  WeddingEvent['stats'],
  | 'invited'
  | 'sent'
  | 'confirmed'
  | 'declined'
  | 'failedMessages'
  | 'guestsWithBalance'
  | 'contributionGuests'
>;

/**
 * The one action the overview suggests. `s.invited` counts invitation-card guests only; contribution-card
 * guests are separate, so an event with only those is not "empty". Once the event is over (days < 0) the
 * invitation steps no longer make sense: only unpaid contributions remain worth chasing, else the report.
 */
export function nextStep(
  eventId: string,
  s: NextStepStats,
  days: number,
  eventKind?: string | null,
  pledgesEnabled?: boolean | null,
): { key: NextKey; count: number; href: string } {
  const base = `/app/e/${eventId}`;
  const showDonations = eventKind !== undefined ? allowsDonations(eventKind, pledgesEnabled) : true;
  if (days < 0) {
    if (showDonations && s.guestsWithBalance > 0)
      return { key: 'pledges', count: s.guestsWithBalance, href: `${base}/pledges?tab=unpaid` };
    return { key: 'past', count: 0, href: `${base}/reports` };
  }
  const unsent = s.invited - s.sent;
  const noReply = s.sent - s.confirmed - s.declined;
  if (s.invited === 0)
    return showDonations && s.contributionGuests > 0
      ? { key: 'addInvites', count: 0, href: `${base}/guests/new` }
      : { key: 'import', count: 0, href: `${base}/guests/import` };
  if (s.failedMessages > 0)
    return { key: 'failed', count: s.failedMessages, href: `${base}/guests?filter=failed` };
  if (unsent > 0) return { key: 'send', count: unsent, href: `${base}/send` };
  if (noReply > 0 && days <= 21)
    return { key: 'remind', count: noReply, href: `${base}/send?kind=reminder` };
  if (showDonations && s.guestsWithBalance > 0)
    return { key: 'pledges', count: s.guestsWithBalance, href: `${base}/pledges?tab=unpaid` };
  if (days <= 7) return { key: 'gate', count: 0, href: `${base}/gate` };
  return { key: 'done', count: 0, href: `${base}/reports` };
}
