import { and, desc, eq, inArray, isNotNull, isNull, ne, sql } from 'drizzle-orm';
import { eventPurchases, events, guests, newId, referralRewards, users } from '@harusi/db';
import { occasionOf, type Currency } from '@harusi/schemas';
import type { SignupAttribution } from '@harusi/api-client';
import type { Deps } from '../context';

/** Unambiguous uppercase alphabet for referral codes (drops 0/O/1/I). */
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/** Generates an 8-character referral code prefixed with `KS` (e.g. `KS7M4P9Q`). */
export function generateReferralCode(): string {
  let out = 'KS';
  for (let i = 0; i < 6; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]!;
  }
  return out;
}

/**
 * Resolves whether the discreet Kadi Sasa referral link should appear on guest cards for this event.
 * Default is OFF for corporate events and ON for personal/wedding/community events; an explicit
 * host preference in `showReferralFooter` always wins.
 */
export function shouldShowReferralFooter(event: {
  kind: string;
  showReferralFooter?: boolean | null;
}): boolean {
  if (event.showReferralFooter !== null && event.showReferralFooter !== undefined) {
    return event.showReferralFooter;
  }
  return occasionOf(event.kind) !== 'corporate';
}

function cleanTag(raw: string | null | undefined, max = 64): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  // Strip any query/fragment/whitespace/PII-looking characters.
  const cleaned = trimmed.replace(/[^a-z0-9._-]/g, '').slice(0, max);
  return cleaned || null;
}

function cleanHost(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim().toLowerCase();
  if (!t) return null;
  try {
    const u = t.includes('://') ? new URL(t) : new URL(`https://${t}`);
    return u.hostname.replace(/^www\./, '').slice(0, 80) || null;
  } catch {
    const hostOnly = t.split('/')[0]?.split('?')[0]?.replace(/^www\./, '').slice(0, 80);
    return hostOnly || null;
  }
}

function cleanReferralCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 24);
  return cleaned || null;
}

/**
 * Ensures the given user has a unique `referralCode`, generating and persisting one if absent.
 */
export async function ensureUserReferralCode(db: Deps['db'], userId: string): Promise<string | null> {
  const [existing] = await db
    .select({ referralCode: users.referralCode })
    .from(users)
    .where(eq(users.id, userId));
  if (!existing) return null;
  if (existing.referralCode) return existing.referralCode;

  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate = generateReferralCode();
    try {
      const [updated] = await db
        .update(users)
        .set({ referralCode: candidate })
        .where(and(eq(users.id, userId), isNull(users.referralCode)))
        .returning({ referralCode: users.referralCode });
      if (updated?.referralCode) return updated.referralCode;
      const [reread] = await db
        .select({ referralCode: users.referralCode })
        .from(users)
        .where(eq(users.id, userId));
      if (reread?.referralCode) return reread.referralCode;
    } catch {
      // Unique index collision: retry with a new random code.
    }
  }
  return null;
}

/**
 * Host referral attribution and automated free-card reward crediting (Prompt 8 & 9).
 * Reward size (`referralRewardCards`) and qualification threshold (`referralMinPaidCards`)
 * come from config and are never hard-coded.
 */
export class ReferralService {
  constructor(private deps: Deps) {}

  async attachAttributionOnSignup(
    userId: string,
    attribution?: SignupAttribution,
  ): Promise<{ referred: boolean; referrerUserId: string | null }> {
    await ensureUserReferralCode(this.deps.db, userId);

    const utmSource = cleanTag(attribution?.utmSource);
    const utmMedium = cleanTag(attribution?.utmMedium);
    const utmCampaign = cleanTag(attribution?.utmCampaign);
    const referrerHost = cleanHost(attribution?.referrerHost);
    const refCode = cleanReferralCode(attribution?.referralCode);

    let referrerUserId: string | null = null;
    let resolvedCode: string | null = refCode;

    if (refCode) {
      const [referrer] = await this.deps.db
        .select({ id: users.id, referralCode: users.referralCode })
        .from(users)
        .where(and(eq(users.referralCode, refCode), isNull(users.deletedAt)));
      if (referrer && referrer.id !== userId) {
        referrerUserId = referrer.id;
        resolvedCode = referrer.referralCode ?? refCode;
      }
    }

    if (utmSource || utmMedium || utmCampaign || referrerHost || referrerUserId) {
      await this.deps.db
        .update(users)
        .set({
          ...(utmSource ? { signupUtmSource: utmSource } : {}),
          ...(utmMedium ? { signupUtmMedium: utmMedium } : {}),
          ...(utmCampaign ? { signupUtmCampaign: utmCampaign } : {}),
          ...(referrerHost ? { signupReferrerHost: referrerHost } : {}),
          ...(referrerUserId ? { referredByUserId: referrerUserId, signupReferralCode: resolvedCode } : {}),
        })
        .where(eq(users.id, userId));
    }

    return { referred: referrerUserId !== null, referrerUserId };
  }

  /**
   * Checks whether `referredUserId` has both purchased at least `referralMinPaidCards` paid cards
   * and generated at least `referralMinPaidCards` cards across their non-deleted events. If so,
   * credits the referrer once with `referralRewardCards` (or marks it `pending_event` until the
   * referrer creates an event).
   */
  async evaluateAndAwardReferral(referredUserId: string): Promise<{ awarded: boolean; status?: 'credited' | 'pending_event' }> {
    const minPaid = this.deps.config.referralMinPaidCards;
    const rewardCards = this.deps.config.referralRewardCards;
    if (rewardCards <= 0) return { awarded: false };

    const [referred] = await this.deps.db
      .select({
        id: users.id,
        referredByUserId: users.referredByUserId,
      })
      .from(users)
      .where(eq(users.id, referredUserId));
    if (!referred?.referredByUserId || referred.referredByUserId === referredUserId) {
      return { awarded: false };
    }

    const [existingReward] = await this.deps.db
      .select({ id: referralRewards.id })
      .from(referralRewards)
      .where(eq(referralRewards.referredUserId, referredUserId));
    if (existingReward) return { awarded: false };

    const ownedEvents = await this.deps.db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.ownerId, referredUserId), isNull(events.deletedAt)));
    if (!ownedEvents.length) return { awarded: false };
    const eventIds = ownedEvents.map((e) => e.id);

    const [paidRow] = await this.deps.db
      .select({ n: sql<number>`coalesce(sum(${eventPurchases.cards}), 0)::int` })
      .from(eventPurchases)
      .where(
        and(
          inArray(eventPurchases.eventId, eventIds),
          eq(eventPurchases.status, 'paid'),
          eq(eventPurchases.kind, 'cards'),
          ne(eventPurchases.method, 'grant'),
        ),
      );
    const paidCardsPurchased = paidRow?.n ?? 0;
    if (paidCardsPurchased < minPaid) return { awarded: false };

    const [generatedRow] = await this.deps.db
      .select({ n: sql<number>`count(*)::int` })
      .from(guests)
      .where(
        and(
          inArray(guests.eventId, eventIds),
          isNull(guests.deletedAt),
          isNotNull(guests.cardGeneratedAt),
        ),
      );
    const cardsGenerated = generatedRow?.n ?? 0;
    if (cardsGenerated < minPaid) return { awarded: false };

    const now = this.deps.now();
    const rewardId = newId();
    const [inserted] = await this.deps.db
      .insert(referralRewards)
      .values({
        id: rewardId,
        referrerUserId: referred.referredByUserId,
        referredUserId,
        cardsAwarded: rewardCards,
        status: 'pending_event',
      })
      .onConflictDoNothing({ target: referralRewards.referredUserId })
      .returning();
    if (!inserted) return { awarded: false };

    const [targetEvent] = await this.deps.db
      .select({ id: events.id, currency: events.currency })
      .from(events)
      .where(
        and(
          eq(events.ownerId, referred.referredByUserId),
          isNull(events.deletedAt),
          eq(events.product, 'cards'),
          inArray(events.status, ['active', 'draft']),
        ),
      )
      .orderBy(desc(events.createdAt))
      .limit(1);

    if (!targetEvent) {
      return { awarded: true, status: 'pending_event' };
    }

    await this.creditRewardToEvent(inserted.id, targetEvent.id, targetEvent.currency, rewardCards, now);
    return { awarded: true, status: 'credited' };
  }

  /**
   * When a referrer creates a new `cards` event, automatically applies any pending referral rewards
   * earned before they had an active event.
   */
  async applyPendingReferralRewardsToNewEvent(
    userId: string,
    eventId: string,
    currency: Currency,
  ): Promise<number> {
    const pending = await this.deps.db
      .select()
      .from(referralRewards)
      .where(
        and(
          eq(referralRewards.referrerUserId, userId),
          eq(referralRewards.status, 'pending_event'),
        ),
      );
    if (!pending.length) return 0;

    const now = this.deps.now();
    let totalCredited = 0;
    for (const r of pending) {
      await this.creditRewardToEvent(r.id, eventId, currency, r.cardsAwarded, now);
      totalCredited += r.cardsAwarded;
    }
    return totalCredited;
  }

  private async creditRewardToEvent(
    rewardId: string,
    eventId: string,
    currency: Currency,
    cardsAwarded: number,
    now: Date,
  ): Promise<void> {
    await this.deps.db.insert(eventPurchases).values({
      id: newId(),
      eventId,
      kind: 'grant',
      label: 'Zawadi ya rufaa / Referral reward',
      cards: cardsAwarded,
      messages: 0,
      amount: 0,
      currency,
      status: 'paid',
      method: 'grant',
      note: `referral:${rewardId}`,
      paidAt: now,
    });
    await this.deps.db
      .update(referralRewards)
      .set({
        status: 'credited',
        creditedEventId: eventId,
        creditedAt: now,
        updatedAt: now,
      })
      .where(eq(referralRewards.id, rewardId));
  }
}
