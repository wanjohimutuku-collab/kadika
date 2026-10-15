import { and, eq, isNull, sql } from 'drizzle-orm';
import { events, guests, invitations, payments, retiredCardTokens, signingKeys } from '@harusi/db';
import { hashGuestToken } from '@harusi/crypto';
import { signQrTokenFast as signQrToken } from '../qr-sign';
import type { Deps } from '../context';
import { ApiError } from '../errors';
import { decryptSecret } from '../crypto-at-rest';
import { pledgeSummaryOf, type PledgeSummary } from './pledges';

type Status = typeof invitations.$inferSelect.status;
const RANK: Record<Status, number> = {
  created: 0,
  queued: 1,
  sent: 2,
  delivered: 3,
  opened: 4,
  confirmed: 5,
  declined: 5,
  checked_in: 6,
};
const RSVP_GRACE_MS = 24 * 3_600_000;
const EVENT_OVER_MS = 12 * 3_600_000;

export interface CardView {
  state: 'ok' | 'reissued' | 'invalid';
  /** `contribution` cards ask for a contribution only: no RSVP, no QR, no admission. */
  cardKind: 'invitation' | 'contribution';
  event: {
    id: string;
    eventKind: string | null;
    coupleNames: string;
    dateStart: Date;
    venueName: string | null;
    venueMapUrl: string | null;
    dressCode: string | null;
    committeePhone: string | null;
    senderName: string | null;
    greeting: string | null;
    /** Organiser-written texts, labels and toggles (ADR 029). */
    cardContent: Record<string, unknown>;
    contributionTarget: number | null;
    brandTheme: Record<string, unknown> | null;
    pledgesEnabled: boolean;
    rsvpDeadline: Date | null;
    country: 'TZ' | 'KE';
    currency: 'TZS' | 'KES';
    timezone: string;
  } | null;
  guest: {
    displayName: string;
    partySizeAllowed: number;
    shortCode: string;
    groupLabel: string | null;
    language: 'sw' | 'en';
  } | null;
  /** Raised so far; only filled when the organiser shows progress on contribution cards. */
  contributionCollected: number | null;
  qrPayload: string | null;
  pledge: PledgeSummary | null;
  rsvp: { status: 'pending' | 'confirmed' | 'declined'; partySize: number | null };
  rsvpOpen: boolean;
  eventPassed: boolean;
}

const EMPTY = (state: 'reissued' | 'invalid'): CardView => ({
  state,
  cardKind: 'invitation',
  event: null,
  guest: null,
  contributionCollected: null,
  qrPayload: null,
  pledge: null,
  rsvp: { status: 'pending', partySize: null },
  rsvpOpen: false,
  eventPassed: false,
});

/**
 * The public guest card (§7.3): no login, addressed by the opaque card token. Only the hash is
 * stored; a reissue moves the old hash to `retired_card_tokens` so the old link says "replaced".
 */
export class CardService {
  constructor(private deps: Deps) {}

  private async find(token: string) {
    const hash = hashGuestToken(token);
    const [row] = await this.deps.db
      .select({ guest: guests, invitation: invitations, event: events })
      .from(invitations)
      .innerJoin(guests, eq(guests.id, invitations.guestId))
      .innerJoin(events, eq(events.id, guests.eventId))
      .where(and(eq(invitations.tokenHash, hash), isNull(guests.deletedAt)));
    return { hash, row };
  }

  private view(
    row: NonNullable<Awaited<ReturnType<CardService['find']>>['row']>,
    qrPayload: string,
    pledge: PledgeSummary | null = null,
    collected: number | null = null,
  ): CardView {
    const { guest, invitation, event } = row;
    const now = this.deps.now().getTime();
    const start = event.dateStart.getTime();
    const eventPassed = now > start + EVENT_OVER_MS;
    const deadlinePassed = event.rsvpDeadline
      ? now > event.rsvpDeadline.getTime() + RSVP_GRACE_MS
      : false;
    const answered: CardView['rsvp']['status'] =
      invitation.status === 'confirmed' || invitation.status === 'checked_in'
        ? 'confirmed'
        : invitation.status === 'declined'
          ? 'declined'
          : 'pending';
    const contribution = guest.cardKind === 'contribution';
    return {
      state: 'ok',
      cardKind: guest.cardKind,
      event: {
        id: event.id,
        eventKind: event.eventKind,
        coupleNames: event.coupleNames,
        dateStart: event.dateStart,
        venueName: event.venueName,
        venueMapUrl: event.venueMapUrl,
        dressCode: event.dressCode,
        committeePhone: event.committeePhone,
        senderName: event.senderName,
        greeting: event.greeting,
        cardContent: event.cardContent,
        contributionTarget: event.contributionTarget,
        brandTheme: event.brandTheme,
        pledgesEnabled: event.pledgesEnabled,
        rsvpDeadline: event.rsvpDeadline,
        country: event.country,
        currency: event.currency,
        timezone: event.timezone,
      },
      guest: {
        displayName: guest.displayName,
        partySizeAllowed: guest.partySizeAllowed,
        shortCode: guest.shortCode,
        groupLabel: guest.groupLabel,
        language: guest.language,
      },
      contributionCollected: collected,
      qrPayload,
      pledge,
      rsvp: { status: answered, partySize: invitation.rsvpPartySize },
      rsvpOpen:
        !contribution &&
        !eventPassed &&
        !deadlinePassed &&
        invitation.status !== 'checked_in' &&
        event.status !== 'archived',
      eventPassed,
    };
  }

  /** Total confirmed contributions for the event, but only if the organiser chose to show progress. */
  private async collectedFor(
    row: NonNullable<Awaited<ReturnType<CardService['find']>>['row']>,
  ): Promise<number | null> {
    const show = (row.event.cardContent as { contribution?: { show?: { progress?: boolean } } })
      .contribution?.show?.progress;
    if (!show || !row.event.contributionTarget) return null;
    const [r] = await this.deps.db
      .select({ n: sql<number>`coalesce(sum(${payments.amount}), 0)::int` })
      .from(payments)
      .innerJoin(guests, eq(guests.id, payments.guestId))
      .where(and(eq(guests.eventId, row.event.id), eq(payments.status, 'success')));
    return r?.n ?? 0;
  }

  /**
   * The signed QR for this guest. An Ed25519 signature is deterministic, so for one signing key,
   * guest, party size and token version it never changes: it is cached for ten minutes instead of
   * decrypting the event key and signing again on every card view (1,000 guests opening their cards
   * at once is the busy moment). A reissue bumps the version, so it gets a fresh entry at once.
   */
  private qrCache = new Map<string, { qr: string; expires: number }>();

  private async qr(
    row: NonNullable<Awaited<ReturnType<CardService['find']>>['row']>,
  ): Promise<string> {
    const now = this.deps.now().getTime();
    const cacheKey = `${row.event.signingKeyId}:${row.guest.id}:${row.guest.partySizeAllowed}:${row.guest.tokenVersion}`;
    const hit = this.qrCache.get(cacheKey);
    if (hit && hit.expires > now) return hit.qr;
    const [key] = await this.deps.db
      .select()
      .from(signingKeys)
      .where(and(eq(signingKeys.eventId, row.event.id), isNull(signingKeys.revokedAt)));
    if (!key) throw new ApiError('internal', 'Event has no signing key');
    const privateKey = await decryptSecret(key.privateKeyEncrypted, this.deps.config.keyEncSecret);
    const qr = signQrToken(
      {
        eventId: row.event.id,
        guestId: row.guest.id,
        partySize: row.guest.partySizeAllowed,
        version: row.guest.tokenVersion,
      },
      privateKey,
    );
    if (this.qrCache.size > 20_000) this.qrCache.clear();
    this.qrCache.set(cacheKey, { qr, expires: now + 10 * 60_000 });
    return qr;
  }

  /**
   * Read-only card for link-preview bots, the OG image and the PWA manifest: same data as `get`
   * but no QR and, above all, it never marks the invitation `opened`.
   */
  async preview(token: string): Promise<CardView> {
    const { row } = await this.find(token);
    return row
      ? this.view(
          row,
          '',
          await pledgeSummaryOf(this.deps.db, row.guest.id),
          await this.collectedFor(row),
        )
      : EMPTY('invalid');
  }

  /** Marks the invitation `opened` (never moves a status backwards) and returns the card. */
  async get(token: string): Promise<CardView> {
    const { hash, row } = await this.find(token);
    if (!row) {
      const [retired] = await this.deps.db
        .select({ id: retiredCardTokens.id })
        .from(retiredCardTokens)
        .where(eq(retiredCardTokens.tokenHash, hash));
      return EMPTY(retired ? 'reissued' : 'invalid');
    }
    if (RANK[row.invitation.status] < RANK.opened) {
      await this.deps.db
        .update(invitations)
        .set({ status: 'opened', openedAt: this.deps.now() })
        .where(eq(invitations.id, row.invitation.id));
      row.invitation.status = 'opened';
    }
    return this.view(
      row,
      row.guest.cardKind === 'contribution' ? '' : await this.qr(row),
      await pledgeSummaryOf(this.deps.db, row.guest.id),
      await this.collectedFor(row),
    );
  }

  /** Idempotent: answering the same way again changes nothing; a changed answer replaces the old one. */
  async rsvp(token: string, input: { attending: boolean; partySize: number }): Promise<CardView> {
    const { hash, row } = await this.find(token);
    if (!row) {
      const [retired] = await this.deps.db
        .select({ id: retiredCardTokens.id })
        .from(retiredCardTokens)
        .where(eq(retiredCardTokens.tokenHash, hash));
      throw new ApiError(
        retired ? 'conflict' : 'not_found',
        retired ? 'This card was replaced' : 'Invalid link',
        retired ? { reason: 'reissued' } : undefined,
      );
    }
    if (row.guest.cardKind === 'contribution')
      throw new ApiError('conflict', 'This card does not take replies', {
        reason: 'not_applicable',
      });
    const open = this.view(row, '').rsvpOpen;
    if (!open) throw new ApiError('conflict', 'Replies are closed', { reason: 'rsvp_closed' });
    const party = input.attending
      ? Math.max(1, Math.min(input.partySize, row.guest.partySizeAllowed))
      : 0;
    const status: Status = input.attending ? 'confirmed' : 'declined';
    if (row.invitation.status !== status || row.invitation.rsvpPartySize !== party) {
      await this.deps.db
        .update(invitations)
        .set({ status, rsvpPartySize: party, rsvpAt: this.deps.now() })
        .where(eq(invitations.id, row.invitation.id));
      row.invitation.status = status;
      row.invitation.rsvpPartySize = party;
    }
    return this.view(row, await this.qr(row), await pledgeSummaryOf(this.deps.db, row.guest.id));
  }
}
