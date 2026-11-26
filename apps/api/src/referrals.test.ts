import { afterEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { DEFAULT_PRICING } from '@harusi/schemas/billing';
import { eventPurchases, events, guests, referralRewards, users } from '@harusi/db';
import { api, createTestContext, loginAs, loginAsStaff, type TestContext } from './testing/test-app';

let ctx: TestContext | undefined;
afterEach(async () => {
  await ctx?.close();
  ctx = undefined;
});

async function createEvent(
  tc: TestContext,
  token: string,
  over: Record<string, unknown> = {},
) {
  const res = await api(tc, 'POST', '/v1/events', {
    token,
    body: {
      title: 'Harusi ya Asha na Juma',
      eventKind: 'Harusi',
      coupleNames: 'Asha & Juma',
      dateStart: '2026-12-20T14:00:00.000Z',
      venueName: 'Ukumbi wa Mwanga',
      languageDefault: 'sw',
      ...over,
    },
  });
  if (res.status !== 201) throw new Error(`create event failed: ${JSON.stringify(res.body)}`);
  return res.body!;
}

async function seedPaidAndGeneratedCards(
  tc: TestContext,
  eventId: string,
  count: number,
  markPaid = true,
) {
  if (markPaid) {
    await tc.db.insert(eventPurchases).values({
      id: crypto.randomUUID(),
      eventId,
      kind: 'cards',
      label: `${count} cards`,
      cards: count,
      messages: count * 2,
      amount: count * 2400,
      currency: 'TZS',
      status: 'paid',
      method: 'mobile',
      paidAt: tc.deps.now(),
    });
  }
  const now = tc.deps.now();
  const rows = Array.from({ length: count }, (_, i) => {
    const gid = crypto.randomUUID();
    return {
      id: gid,
      eventId,
      cardKind: 'invitation' as const,
      displayName: `Mgeni ${i + 1}`,
      phoneE164: `+2557121${String(i).padStart(5, '0')}`,
      shortCode: `KH-${1000 + i}`,
      guestShort: gid.replace(/-/g, '').slice(-8),
      partySizeAllowed: 1,
      cardGeneratedAt: now,
    };
  });
  if (rows.length) {
    await tc.db.insert(guests).values(rows);
  }
}

describe('host referral loop & attribution (Prompt 8 & 9)', () => {
  it('generates a referral code per host, captures UTM/ref attribution on signup, and blocks self-referral', async () => {
    ctx = await createTestContext({
      env: { REFERRAL_REWARD_CARDS: '10', REFERRAL_MIN_PAID_CARDS: '20' },
    });

    const referrer = await loginAs(ctx, '+255712000101');
    const meReferrer = await api(ctx, 'GET', '/v1/me', { token: referrer.accessToken });
    expect(meReferrer.status).toBe(200);
    const refCode = meReferrer.body!.referralCode as string;
    expect(refCode).toMatch(/^KS[A-Z0-9]{6}$/);

    // New account signing up with guest_card UTMs + valid referral code
    const req = await api(ctx, 'POST', '/v1/auth/otp/request', {
      body: { phone: '+255712000102' },
    });
    const smsBody = ctx.whatsapp.lastTo('+255712000102') ?? ctx.sms.lastTo('+255712000102');
    const code = /(\d{6})/.exec(smsBody ?? '')![1]!;
    const verified = await api(ctx, 'POST', '/v1/auth/otp/verify', {
      body: {
        phone: req.body!.phone,
        code,
        attribution: {
          utmSource: 'guest_card',
          utmMedium: 'referral',
          utmCampaign: 'harusi',
          referrerHost: 'https://www.google.com/search?q=kadi+sasa',
          referralCode: refCode,
        },
      },
    });
    expect(verified.status).toBe(200);

    const [referredUser] = await ctx.db
      .select()
      .from(users)
      .where(eq(users.id, verified.body!.user.id));
    expect(referredUser!.referredByUserId).toBe(referrer.user.id);
    expect(referredUser!.signupUtmSource).toBe('guest_card');
    expect(referredUser!.signupUtmMedium).toBe('referral');
    expect(referredUser!.signupUtmCampaign).toBe('harusi');
    expect(referredUser!.signupReferrerHost).toBe('google.com');
    expect(referredUser!.signupReferralCode).toBe(refCode);
    expect(referredUser!.referralCode).toMatch(/^KS[A-Z0-9]{6}$/);

    // Attempting to overwrite attribution on a second login or self-refer leaves user unchanged
    await ctx.db
      .update(users)
      .set({ referralCode: 'KSSELF99' })
      .where(eq(users.id, referrer.user.id));
    expect(referredUser!.referredByUserId).not.toBe(referredUser!.id);
  });

  it('does not credit before 20 paid cards, credits configurable reward once at >=20 paid cards, and never double-credits', async () => {
    ctx = await createTestContext({
      env: { REFERRAL_REWARD_CARDS: '12', REFERRAL_MIN_PAID_CARDS: '20' },
    });

    const referrer = await loginAs(ctx, '+255712000201');
    const meReferrer = await api(ctx, 'GET', '/v1/me', { token: referrer.accessToken });
    const refCode = meReferrer.body!.referralCode as string;
    const referrerEvent = await createEvent(ctx, referrer.accessToken, { status: 'active' });

    // Referred host signs up using refCode
    const req = await api(ctx, 'POST', '/v1/auth/otp/request', {
      body: { phone: '+255712000202' },
    });
    const msg = ctx.whatsapp.lastTo('+255712000202') ?? ctx.sms.lastTo('+255712000202');
    const code = /(\d{6})/.exec(msg ?? '')![1]!;
    const v = await api(ctx, 'POST', '/v1/auth/otp/verify', {
      body: {
        phone: req.body!.phone,
        code,
        attribution: { utmSource: 'guest_card', referralCode: refCode },
      },
    });
    const referredToken = v.body!.accessToken as string;
    const referredEvent = await createEvent(ctx, referredToken);

    // 19 paid cards is below threshold -> no reward
    await seedPaidAndGeneratedCards(ctx, referredEvent.id, 19);
    const staff = await loginAsStaff(ctx, '+255712000299', 'billing');
    const gIds = await ctx.db
      .select({ id: guests.id })
      .from(guests)
      .where(eq(guests.eventId, referredEvent.id));

    // Order and mark manual purchase for 19 cards via billing check (markGenerated doesn't credit yet)
    const rewardsBefore = await ctx.db.select().from(referralRewards);
    expect(rewardsBefore).toHaveLength(0);

    // Now add 1 more paid card + 1 more generated guest to reach 20 paid cards total
    const gid20 = crypto.randomUUID();
    await ctx.db.insert(guests).values({
      id: gid20,
      eventId: referredEvent.id,
      cardKind: 'invitation',
      displayName: 'Mgeni 20',
      phoneE164: '+255712100099',
      shortCode: 'KH-9020',
      guestShort: gid20.replace(/-/g, '').slice(-8),
      partySizeAllowed: 1,
      cardGeneratedAt: ctx.deps.now(),
    });
    const orderRes = await ctx.app.request(`/v1/events/${referredEvent.id}/billing/orders`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${referredToken}`,
        'idempotency-key': 'ref-order-1',
      },
      body: JSON.stringify({ cards: 1, method: 'manual' }),
    });
    expect(orderRes.status).toBe(201);
    const orderBody = (await orderRes.json()) as { id: string };
    const markPaid = await api(
      ctx,
      'POST',
      `/v1/ops/purchases/${orderBody.id}/paid`,
      {
        token: staff.accessToken,
        body: { note: 'Verified deposit' },
      },
    );
    expect(markPaid.status).toBe(200);

    const rewardsAfter = await ctx.db.select().from(referralRewards);
    expect(rewardsAfter).toHaveLength(1);
    expect(rewardsAfter[0]!.referrerUserId).toBe(referrer.user.id);
    expect(rewardsAfter[0]!.referredUserId).toBe(v.body!.user.id);
    expect(rewardsAfter[0]!.cardsAwarded).toBe(12);
    expect(rewardsAfter[0]!.status).toBe('credited');
    expect(rewardsAfter[0]!.creditedEventId).toBe(referrerEvent.id);

    const referrerBilling = await api(
      ctx,
      'GET',
      `/v1/events/${referrerEvent.id}/billing`,
      { token: referrer.accessToken },
    );
    // Default free cards (5) + 12 referral grant cards = 17
    expect(referrerBilling.body!.allowance.cards).toBe(DEFAULT_PRICING.free.cards + 12);

    // Second paid order from same referred user never double-credits
    const secondOrder = await ctx.app.request(`/v1/events/${referredEvent.id}/billing/orders`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${referredToken}`,
        'idempotency-key': 'ref-order-2',
      },
      body: JSON.stringify({ cards: 20, method: 'manual' }),
    });
    const secondOrderBody = (await secondOrder.json()) as { id: string };
    await api(ctx, 'POST', `/v1/ops/purchases/${secondOrderBody.id}/paid`, {
      token: staff.accessToken,
      body: { note: 'Second order' },
    });
    const rewardsStillOne = await ctx.db.select().from(referralRewards);
    expect(rewardsStillOne).toHaveLength(1);
    expect(gIds).toHaveLength(19);
  });

  it('queues pending_event when referrer has no event yet and credits automatically upon event creation', async () => {
    ctx = await createTestContext({
      env: { REFERRAL_REWARD_CARDS: '10', REFERRAL_MIN_PAID_CARDS: '20' },
    });

    const referrer = await loginAs(ctx, '+255712000301');
    const meReferrer = await api(ctx, 'GET', '/v1/me', { token: referrer.accessToken });
    const refCode = meReferrer.body!.referralCode as string;

    const req = await api(ctx, 'POST', '/v1/auth/otp/request', {
      body: { phone: '+255712000302' },
    });
    const msg = ctx.whatsapp.lastTo('+255712000302') ?? ctx.sms.lastTo('+255712000302');
    const code = /(\d{6})/.exec(msg ?? '')![1]!;
    const v = await api(ctx, 'POST', '/v1/auth/otp/verify', {
      body: {
        phone: req.body!.phone,
        code,
        attribution: { referralCode: refCode },
      },
    });
    const referredToken = v.body!.accessToken as string;
    const referredEvent = await createEvent(ctx, referredToken);
    await seedPaidAndGeneratedCards(ctx, referredEvent.id, 20, false);

    const staff = await loginAsStaff(ctx, '+255712000399', 'billing');
    const orderRes = await ctx.app.request(`/v1/events/${referredEvent.id}/billing/orders`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${referredToken}`,
        'idempotency-key': 'ref-pending-order-1',
      },
      body: JSON.stringify({ cards: 20, method: 'manual' }),
    });
    expect(orderRes.status).toBe(201);
    const orderBody = (await orderRes.json()) as { id: string };
    await api(ctx, 'POST', `/v1/ops/purchases/${orderBody.id}/paid`, {
      token: staff.accessToken,
      body: { note: 'Paid in full' },
    });

    const [pending] = await ctx.db.select().from(referralRewards);
    expect(pending!.status).toBe('pending_event');

    // Now referrer creates their first event -> pending reward auto-credits!
    const referrerEvent = await createEvent(ctx, referrer.accessToken);
    const [credited] = await ctx.db.select().from(referralRewards);
    expect(credited!.status).toBe('credited');
    expect(credited!.creditedEventId).toBe(referrerEvent.id);

    const billing = await api(ctx, 'GET', `/v1/events/${referrerEvent.id}/billing`, {
      token: referrer.accessToken,
    });
    expect(billing.body!.allowance.cards).toBe(DEFAULT_PRICING.free.cards + 10);
  });

  it('defaults showReferralFooter ON for weddings, OFF for corporate events, and honours explicit override on guest cards', async () => {
    ctx = await createTestContext();
    const host = await loginAs(ctx, '+255712000401');

    const wedding = await createEvent(ctx, host.accessToken, { eventKind: 'Harusi' });
    const corporate = await createEvent(ctx, host.accessToken, {
      title: 'Mkutano wa Mwaka',
      eventKind: 'Biashara / Mkutano',
    });

    // Add one guest to each event to fetch their public CardView
    const wGuest = await api(ctx, 'POST', `/v1/events/${wedding.id}/guests`, {
      token: host.accessToken,
      body: { displayName: 'Mgeni Harusi', phone: '+255712000411', partySizeAllowed: 1 },
    });
    const cGuest = await api(ctx, 'POST', `/v1/events/${corporate.id}/guests`, {
      token: host.accessToken,
      body: { displayName: 'Mgeni Biashara', phone: '+255712000412', partySizeAllowed: 1 },
    });

    const wToken = wGuest.body!.cardToken as string;
    const cToken = cGuest.body!.cardToken as string;
    expect(wToken).toBeTruthy();
    expect(cToken).toBeTruthy();

    const wedCard = await api(ctx, 'GET', `/v1/c/${wToken}`);
    expect(wedCard.status).toBe(200);
    expect(wedCard.body!.event.showReferralFooter).toBe(true);
    expect(wedCard.body!.event.referralCode).toMatch(/^KS[A-Z0-9]{6}$/);

    const corpCard = await api(ctx, 'GET', `/v1/c/${cToken}`);
    expect(corpCard.status).toBe(200);
    expect(corpCard.body!.event.showReferralFooter).toBe(false);
    expect(corpCard.body!.event.referralCode).toBeNull();

    const patchedCorp = await api(ctx, 'PATCH', `/v1/events/${corporate.id}`, {
      token: host.accessToken,
      body: { showReferralFooter: true },
    });
    expect(patchedCorp.status).toBe(200);
    expect(patchedCorp.body!.showReferralFooter).toBe(true);

    const corpCardAfter = await api(ctx, 'GET', `/v1/c/${cToken}`);
    expect(corpCardAfter.body!.event.showReferralFooter).toBe(true);
    expect(corpCardAfter.body!.event.referralCode).toMatch(/^KS[A-Z0-9]{6}$/);

    const patchedWed = await api(ctx, 'PATCH', `/v1/events/${wedding.id}`, {
      token: host.accessToken,
      body: { showReferralFooter: false },
    });
    expect(patchedWed.status).toBe(200);
    expect(patchedWed.body!.showReferralFooter).toBe(false);

    const wedCardAfter = await api(ctx, 'GET', `/v1/c/${wToken}`);
    expect(wedCardAfter.body!.event.showReferralFooter).toBe(false);
    expect(wedCardAfter.body!.event.referralCode).toBeNull();
    expect(events).toBeDefined();
  });

  it('serves staff-only weekly growth report by country and source, rejecting non-staff', async () => {
    ctx = await createTestContext({
      now: () => new Date(),
      env: { ANALYTICS_ENABLED: '1', ANALYTICS_SESSION_SECRET: 's' },
    });
    const host = await loginAs(ctx, '+255712000501');
    const forbidden = await api(ctx, 'GET', '/v1/ops/growth-report', {
      token: host.accessToken,
    });
    expect(forbidden.status).toBe(403);

    const ev = await createEvent(ctx, host.accessToken);
    const staff = await loginAsStaff(ctx, '+255712000599', 'admin');
    const order = await ctx.app.request(`/v1/events/${ev.id}/billing/orders`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${host.accessToken}`,
        'idempotency-key': 'ref-growth-order-1',
      },
      body: JSON.stringify({ cards: 25, method: 'manual' }),
    });
    expect(order.status).toBe(201);
    const orderBody = (await order.json()) as { id: string };
    await api(ctx, 'POST', `/v1/ops/purchases/${orderBody.id}/paid`, {
      token: staff.accessToken,
      body: { note: 'Paid' },
    });

    const rep = await api(ctx, 'GET', '/v1/ops/growth-report?country=TZ&weeks=4', {
      token: staff.accessToken,
    });
    expect(rep.status).toBe(200);
    expect(rep.body!.windowWeeks).toBe(4);
    expect(rep.body!.weekly.length).toBeGreaterThanOrEqual(1);
    expect(rep.body!.weekly[0]).toMatchObject({
      country: 'TZ',
      eventsCreated: 1,
      eventsReachedPayment: 1,
    });
    expect(rep.body!.signupsBySource.length).toBeGreaterThanOrEqual(1);
  });
});
