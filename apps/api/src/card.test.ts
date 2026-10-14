import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { verifyQrToken, shortId } from '@harusi/crypto';
import { api, createTestContext, loginAs, type TestContext } from './testing/test-app';

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(() => ctx.close());

async function setup(phone: string, event: Record<string, unknown> = {}) {
  const owner = await loginAs(ctx, phone);
  const ev = (
    await api(ctx, 'POST', '/v1/events', {
      token: owner.accessToken,
      body: {
        title: 'Harusi Kadi',
        coupleNames: 'Asha & Juma',
        dateStart: '2027-06-01T10:00:00+03:00',
        venueName: 'Ukumbi wa Mwanga',
        ...event,
      },
    })
  ).body!;
  const g = (
    await api(ctx, 'POST', `/v1/events/${ev.id}/guests`, {
      token: owner.accessToken,
      body: { displayName: 'Bibi Pendo', phone: '0712000111', partySizeAllowed: 3 },
    })
  ).body!;
  return { owner, ev, g, t: owner.accessToken };
}

describe('public guest card', () => {
  it('shows the card without a login, with a verifiable signed QR, and marks it opened', async () => {
    const { ev, g, t } = await setup('0744000001');
    const res = await api(ctx, 'GET', `/v1/c/${g.cardToken}`); // no Authorization header
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      state: 'ok',
      event: { coupleNames: 'Asha & Juma', venueName: 'Ukumbi wa Mwanga' },
      guest: { displayName: 'Bibi Pendo', partySizeAllowed: 3, shortCode: g.shortCode },
      rsvp: { status: 'pending' },
      rsvpOpen: true,
      eventPassed: false,
    });
    // The card shows no other guest's data and never the private key or token hash.
    expect(JSON.stringify(res.body)).not.toMatch(/privateKey|tokenHash|phone/i);
    const { publicKey } = (await api(ctx, 'GET', `/v1/events/${ev.id}/public-key`, { token: t }))
      .body!;
    expect(
      verifyQrToken(res.body!.qrPayload, {
        eventId: ev.id,
        publicKey,
        lookupGuest: (s) => (s === shortId(g.id) ? { guestId: g.id, currentVersion: 1 } : null),
      }),
    ).toMatchObject({ ok: true });
    const list = await api(ctx, 'GET', `/v1/events/${ev.id}/guests?status=opened`, { token: t });
    expect(list.body?.items).toHaveLength(1);
  });

  it('records an RSVP idempotently, caps the party size and lets the guest change their answer', async () => {
    const { ev, g, t } = await setup('0744000002');
    const rsvp = (body: unknown) => api(ctx, 'POST', `/v1/c/${g.cardToken}/rsvp`, { body });
    const yes = await rsvp({ attending: true, partySize: 9 });
    expect(yes.body?.rsvp).toEqual({ status: 'confirmed', partySize: 3 });
    expect((await rsvp({ attending: true, partySize: 9 })).body?.rsvp).toEqual({
      status: 'confirmed',
      partySize: 3,
    });
    const confirmed = await api(ctx, 'GET', `/v1/events/${ev.id}/guests?status=confirmed`, {
      token: t,
    });
    expect(confirmed.body?.items).toHaveLength(1);
    expect(confirmed.body?.items[0].rsvpPartySize).toBe(3);
    expect((await rsvp({ attending: false, partySize: 0 })).body?.rsvp).toEqual({
      status: 'declined',
      partySize: 0,
    });
    expect((await api(ctx, 'GET', `/v1/c/${g.cardToken}`)).body?.rsvp.status).toBe('declined');
    expect((await rsvp({ attending: 'yes' })).status).toBe(400);
  });

  it('treats unknown links as invalid and reissued links as replaced; the new link works', async () => {
    const { g, t } = await setup('0744000003');
    expect((await api(ctx, 'GET', '/v1/c/definitely-not-a-token')).body?.state).toBe('invalid');
    expect(
      (
        await api(ctx, 'POST', '/v1/c/definitely-not-a-token/rsvp', {
          body: { attending: true, partySize: 1 },
        })
      ).status,
    ).toBe(404);
    const re = (await api(ctx, 'POST', `/v1/guests/${g.id}/reissue`, { token: t })).body!;
    expect((await api(ctx, 'GET', `/v1/c/${g.cardToken}`)).body?.state).toBe('reissued');
    const stale = await api(ctx, 'POST', `/v1/c/${g.cardToken}/rsvp`, {
      body: { attending: true, partySize: 1 },
    });
    expect(stale.status).toBe(409);
    expect(stale.body?.error.details.reason).toBe('reissued');
    const fresh = await api(ctx, 'GET', `/v1/c/${re.cardToken}`);
    expect(fresh.body?.state).toBe('ok');
    expect(fresh.body?.qrPayload).toMatch(/^v1\.[0-9a-f]{8}\.[0-9a-f]{8}\.3\.2\./); // version 2
  });

  it('closes RSVPs after the deadline and after the wedding', async () => {
    const soon = await setup('0744000004', {
      rsvpDeadline: '2026-10-10T00:00:00+03:00',
      dateStart: '2026-10-20T10:00:00+03:00',
    });
    // The test clock is 2026-10-14: past the deadline (+1 day grace), before the wedding.
    const view = await api(ctx, 'GET', `/v1/c/${soon.g.cardToken}`);
    expect(view.body).toMatchObject({ rsvpOpen: false, eventPassed: false });
    const closed = await api(ctx, 'POST', `/v1/c/${soon.g.cardToken}/rsvp`, {
      body: { attending: true, partySize: 1 },
    });
    expect(closed.status).toBe(409);
    expect(closed.body?.error.details.reason).toBe('rsvp_closed');
    const past = await setup('0744000005', { dateStart: '2026-09-01T10:00:00+03:00' });
    expect((await api(ctx, 'GET', `/v1/c/${past.g.cardToken}`)).body).toMatchObject({
      eventPassed: true,
      rsvpOpen: false,
    });
  });

  it('rate-limits the public endpoints', async () => {
    const { g } = await setup('0744000006');
    let last = 200;
    for (let i = 0; i < 25; i++)
      last = (
        await api(ctx, 'POST', `/v1/c/${g.cardToken}/rsvp`, {
          body: { attending: true, partySize: 1 },
        })
      ).status;
    expect(last).toBe(429);
    expect((await api(ctx, 'GET', `/v1/c/${g.cardToken}`)).status).toBe(200); // reads have their own budget
  });

  it('does not expose cards of deleted guests', async () => {
    const { g, t } = await setup('0744000007');
    await api(ctx, 'DELETE', `/v1/guests/${g.id}`, { token: t });
    expect((await api(ctx, 'GET', `/v1/c/${g.cardToken}`)).body?.state).toBe('invalid');
  });
});
