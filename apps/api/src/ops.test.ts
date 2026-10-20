import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, like } from 'drizzle-orm';
import { auditLog, events, messageLog, refreshTokens, users } from '@harusi/db';
import { createHttpRepository, memoryTokenStore } from '@harusi/api-client';
import { api, createTestContext, loginAs, type TestContext } from './testing/test-app';

let ctx: TestContext;
let admin: string;
let support: string;
let billing: string;
let owner: { accessToken: string; refreshToken: string; user: { id: string } };
let other: { accessToken: string; user: { id: string } };
let staffAdminId: string;
let eventId: string;
let guestId: string;
let shortCode: string;

const opsAudit = async (action: string) =>
  ctx.db
    .select()
    .from(auditLog)
    .where(like(auditLog.action, `ops.${action}`));

beforeAll(async () => {
  ctx = await createTestContext();
  const a = await loginAs(ctx, '0711900001');
  const s = await loginAs(ctx, '0711900002');
  const b = await loginAs(ctx, '0711900003');
  owner = await loginAs(ctx, '0711900004');
  other = await loginAs(ctx, '0711900005');
  staffAdminId = a.user.id;
  for (const [id, staffRole, name] of [
    [a.user.id, 'admin', 'Amina Staff'],
    [s.user.id, 'support', 'Saidi Support'],
    [b.user.id, 'billing', 'Bahati Billing'],
  ] as const)
    await ctx.db
      .update(users)
      .set({ roleGlobal: 'admin', staffRole, name })
      .where(eq(users.id, id));
  await ctx.db.update(users).set({ name: 'Asha Mteja' }).where(eq(users.id, owner.user.id));
  admin = a.accessToken;
  support = s.accessToken;
  billing = b.accessToken;

  const t = owner.accessToken;
  const ev = await api(ctx, 'POST', '/v1/events', {
    token: t,
    body: { title: 'Harusi', coupleNames: 'Asha & Juma', dateStart: '2026-12-14T10:00:00+03:00' },
  });
  eventId = ev.body!.id;
  const g = await api(ctx, 'POST', `/v1/events/${eventId}/guests`, {
    token: t,
    body: { displayName: 'Mzee Hamisi', phone: '0754321678' },
  });
  guestId = g.body!.id;
  shortCode = g.body!.shortCode;
  await api(ctx, 'POST', `/v1/events/${eventId}/guests`, {
    token: t,
    body: { displayName: 'Bi Zawadi', phone: '0765111222' },
  });
  ctx.fail.sms = (to) => to.endsWith('111222');
  await api(ctx, 'POST', `/v1/events/${eventId}/invitations/send`, {
    token: t,
    body: { target: 'remaining', channel: 'sms' },
  });
  ctx.fail.sms = () => false;
  await api(ctx, 'POST', '/v1/payments/manual', {
    token: t,
    body: { guestId, amount: 50_000, method: 'cash', reference: 'CASH-OPS-1' },
  });
});
afterAll(() => ctx.close());

describe('staff panel reads (ADR 012)', () => {
  const reads = [
    '/v1/ops/overview',
    '/v1/ops/organizers',
    '/v1/ops/events',
    '/v1/ops/usage',
    '/v1/ops/payments',
    '/v1/ops/audit',
    '/v1/ops/data-requests',
  ];

  it('are refused without a token and to customers', async () => {
    for (const path of reads) {
      expect((await api(ctx, 'GET', path)).status).toBe(401);
      const r = await api(ctx, 'GET', path, { token: owner.accessToken });
      expect(r.status).toBe(403);
      expect(r.body!.error.code).toBe('forbidden');
    }
  });

  it('are open to every staff level', async () => {
    for (const token of [admin, support, billing])
      for (const path of reads) expect((await api(ctx, 'GET', path, { token })).status).toBe(200);
  });

  it('counts customers, weddings, messages and contributions in the overview', async () => {
    const r = await api(ctx, 'GET', '/v1/ops/overview', { token: billing });
    expect(r.body).toMatchObject({
      organizers: 2, // staff are not customers
      suspendedOrganizers: 0,
      newOrganizers30d: 2,
      events: { total: 1, draft: 1 },
      guests: 2,
      messages30d: { sms: 2, failed: 1, total: 2 },
      failureRate30d: 0.5,
      contributions30d: { count: 1, amount: 50_000 },
      paidPlans: 0,
      openDataRequests: 0,
    });
    // message_log.created_at is the database clock, not the test clock
    expect(r.body!.messagesByDay).toEqual([{ day: expect.any(String), sent: 1, failed: 1 }]);
  });

  it('lists customers with usage and masked phones', async () => {
    const r = await api(ctx, 'GET', '/v1/ops/organizers', { token: support });
    expect(r.body).toHaveLength(2);
    const asha = r.body!.find((o: { id: string }) => o.id === owner.user.id);
    expect(asha).toMatchObject({
      name: 'Asha Mteja',
      phoneE164: '+255•••••004',
      status: 'active',
      eventCount: 1,
      guestCount: 2,
      messagesSent: 1,
    });
  });

  it('lists weddings with owner, usage and money', async () => {
    const r = await api(ctx, 'GET', '/v1/ops/events', { token: support });
    expect(r.body).toEqual([
      expect.objectContaining({
        id: eventId,
        coupleNames: 'Asha & Juma',
        plan: 'free',
        ownerId: owner.user.id,
        ownerName: 'Asha Mteja',
        guests: 2,
        sent: 1,
        failedMessages: 1,
        confirmed: 0,
        collected: 50_000,
      }),
    ]);
  });

  it('breaks usage down by channel, day, wedding and failure reason', async () => {
    await ctx.db.update(messageLog).set({ cost: 30 });
    const r = await api(ctx, 'GET', '/v1/ops/usage', { token: support });
    expect(r.body!.byChannel).toEqual([
      expect.objectContaining({ channel: 'whatsapp', sent: 0, delivered: 0, failed: 0, cost: 0 }),
      expect.objectContaining({ channel: 'sms', sent: 2, failed: 1, cost: 60 }),
    ]);
    expect(r.body!.byDay).toEqual([{ day: expect.any(String), whatsapp: 0, sms: 1, failed: 1 }]);
    expect(r.body!.topEvents).toEqual([
      expect.objectContaining({
        eventId,
        coupleNames: 'Asha & Juma',
        whatsapp: 0,
        sms: 1,
        failed: 1,
        cost: 60,
      }),
    ]);
    expect(r.body!.failureReasons).toHaveLength(1);
    expect(r.body!.failureReasons[0].count).toBe(1);
  });

  it('lists payments with the wedding and a masked phone', async () => {
    const r = await api(ctx, 'GET', '/v1/ops/payments', { token: billing });
    expect(r.body).toEqual([
      expect.objectContaining({
        guestId,
        guestName: 'Mzee Hamisi',
        amount: 50_000,
        status: 'success',
        reference: expect.stringMatching(/:CASH-OPS-1$/),
        eventId,
        coupleNames: 'Asha & Juma',
        recordedBy: 'Asha Mteja',
      }),
    ]);
  });
});

describe('support lookup and phone reveal', () => {
  it('needs the lookup permission (support or admin)', async () => {
    const r = await api(ctx, 'GET', '/v1/ops/lookup?q=hamisi', { token: billing });
    expect(r.status).toBe(403);
    expect(r.body!.error).toMatchObject({
      message: 'missing_permission',
      details: { permission: 'lookup' },
    });
    expect((await api(ctx, 'GET', '/v1/ops/lookup?q=x', { token: owner.accessToken })).status).toBe(
      403,
    );
  });

  it('finds guests by name, phone digits and card code, with masked phones, and logs each search', async () => {
    const byName = await api(ctx, 'GET', '/v1/ops/lookup?q=hamisi', { token: support });
    expect(byName.body!.guests).toEqual([
      expect.objectContaining({
        guestId,
        eventId,
        coupleNames: 'Asha & Juma',
        displayName: 'Mzee Hamisi',
        phoneMasked: '+255•••••678',
        shortCode,
      }),
    ]);
    expect(byName.body!.payments).toHaveLength(1); // guest name matches the payment too
    const byPhone = await api(ctx, 'GET', '/v1/ops/lookup?q=0754321678', { token: support });
    expect(byPhone.body!.guests.map((g: { guestId: string }) => g.guestId)).toEqual([guestId]);
    expect(JSON.stringify(byPhone.body)).not.toContain('754321678');
    const byCode = await api(ctx, 'GET', `/v1/ops/lookup?q=${shortCode.replace('-', '')}`, {
      token: admin,
    });
    expect(byCode.body!.guests).toHaveLength(1);
    const byRef = await api(ctx, 'GET', '/v1/ops/lookup?q=cash-ops-1', { token: admin });
    expect(byRef.body!.payments[0].reference).toMatch(/:CASH-OPS-1$/);
    const byOrganizer = await api(ctx, 'GET', '/v1/ops/lookup?q=asha', { token: support });
    expect(byOrganizer.body!.organizers).toEqual([
      expect.objectContaining({ id: owner.user.id, phoneE164: '+255•••••004' }),
    ]);
    // a wildcard in the search is matched literally
    const wild = await api(ctx, 'GET', '/v1/ops/lookup?q=%25%25%25', { token: support });
    expect(wild.body!.guests).toEqual([]);

    const logged = await opsAudit('lookup');
    expect(logged.length).toBeGreaterThanOrEqual(6);
    // §12: a search typed as a phone number is never stored whole
    expect(JSON.stringify(logged)).not.toContain('754321678');
  });

  it('returns nothing (and logs nothing) for searches under three characters', async () => {
    const before = (await opsAudit('lookup')).length;
    const r = await api(ctx, 'GET', '/v1/ops/lookup?q=ab', { token: support });
    expect(r.body).toEqual({ organizers: [], guests: [], payments: [] });
    expect((await opsAudit('lookup')).length).toBe(before);
  });

  it('reveals a phone only with a reason, to support or admin, and audits it with the staff name', async () => {
    const body = { kind: 'guest', id: guestId, reason: 'Mgeni alipiga simu' };
    expect((await api(ctx, 'POST', '/v1/ops/reveal-phone', { token: billing, body })).status).toBe(
      403,
    );
    const short = await api(ctx, 'POST', '/v1/ops/reveal-phone', {
      token: support,
      body: { ...body, reason: ' ok ' },
    });
    expect(short.status).toBe(400);
    expect(short.body!.error.message).toBe('reason_required');

    const r = await api(ctx, 'POST', '/v1/ops/reveal-phone', { token: support, body });
    expect(r.body).toEqual({ phoneE164: '+255754321678' });
    const o = await api(ctx, 'POST', '/v1/ops/reveal-phone', {
      token: admin,
      body: { kind: 'organizer', id: owner.user.id, reason: 'Kuthibitisha akaunti' },
    });
    expect(o.body).toEqual({ phoneE164: '+255711900004' });
    // staff are not customers: their numbers are not revealed here
    const missing = await api(ctx, 'POST', '/v1/ops/reveal-phone', {
      token: admin,
      body: { kind: 'organizer', id: staffAdminId, reason: 'Namba ya mfanyakazi' },
    });
    expect(missing.status).toBe(404);

    const audit = await api(ctx, 'GET', '/v1/ops/audit', { token: billing });
    const reveals = audit.body!.filter((e: { action: string }) => e.action === 'reveal_phone');
    expect(reveals).toEqual([
      expect.objectContaining({
        actorName: 'Amina Staff',
        target: 'Asha Mteja',
        details: 'Kuthibitisha akaunti',
      }),
      expect.objectContaining({
        actorName: 'Saidi Support',
        target: 'Mzee Hamisi',
        details: 'Mgeni alipiga simu',
      }),
    ]);
    expect(JSON.stringify(await opsAudit('reveal_phone'))).not.toContain('754321678');
  });
});

describe('plans and suspension', () => {
  it('lets billing and admin mark a wedding as paid, and audits it', async () => {
    expect(
      (
        await api(ctx, 'PATCH', `/v1/ops/events/${eventId}/plan`, {
          token: support,
          body: { plan: 'paid' },
        })
      ).status,
    ).toBe(403);
    const r = await api(ctx, 'PATCH', `/v1/ops/events/${eventId}/plan`, {
      token: billing,
      body: { plan: 'paid' },
    });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ id: eventId, plan: 'paid' });
    const [e] = await ctx.db.select().from(events).where(eq(events.id, eventId));
    expect(e!.plan).toBe('paid');
    const [entry] = await opsAudit('set_plan');
    expect(entry).toMatchObject({ actorId: expect.any(String), entityId: eventId });
    expect(entry!.diff).toMatchObject({ plan: { from: 'free', to: 'paid' } });
    expect(
      (
        await api(ctx, 'PATCH', '/v1/ops/events/not-a-uuid/plan', {
          token: billing,
          body: { plan: 'free' },
        })
      ).status,
    ).toBe(400);
  });

  it('suspends a customer (admin only, with a reason), ending their sessions and logins', async () => {
    const path = `/v1/ops/organizers/${other.user.id}/status`;
    for (const token of [support, billing])
      expect(
        (
          await api(ctx, 'PATCH', path, {
            token,
            body: { status: 'suspended', reason: 'Udanganyifu' },
          })
        ).status,
      ).toBe(403);
    expect(
      (await api(ctx, 'PATCH', path, { token: admin, body: { status: 'suspended', reason: 'x' } }))
        .status,
    ).toBe(400);

    const r = await api(ctx, 'PATCH', path, {
      token: admin,
      body: { status: 'suspended', reason: 'Malalamiko ya udanganyifu' },
    });
    expect(r.body).toMatchObject({
      id: other.user.id,
      status: 'suspended',
      suspendedReason: 'Malalamiko ya udanganyifu',
    });
    // the access token stops working at once, the refresh tokens are revoked, a new login is refused
    const me = await api(ctx, 'GET', '/v1/me', { token: other.accessToken });
    expect(me.status).toBe(403);
    const tokens = await ctx.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.userId, other.user.id));
    expect(tokens.every((t) => t.revokedAt)).toBe(true);
    ctx.clock.now += 60_000; // past the OTP resend wait
    await expect(loginAs(ctx, '0711900005')).rejects.toThrow(/suspended/i);

    const re = await api(ctx, 'PATCH', path, {
      token: admin,
      body: { status: 'active', reason: '' },
    });
    expect(re.body).toMatchObject({ status: 'active', suspendedReason: null });
    ctx.clock.now += 60_000;
    other = await loginAs(ctx, '0711900005');

    const audit = await api(ctx, 'GET', '/v1/ops/audit', { token: support });
    const actions = audit.body!.map((e: { action: string }) => e.action);
    expect(actions).toContain('suspend');
    expect(actions).toContain('reactivate');
    expect(audit.body!.find((e: { action: string }) => e.action === 'suspend')).toMatchObject({
      actorName: 'Amina Staff',
      details: 'Malalamiko ya udanganyifu',
    });
  });

  it('cannot suspend staff', async () => {
    const r = await api(ctx, 'PATCH', `/v1/ops/organizers/${staffAdminId}/status`, {
      token: admin,
      body: { status: 'suspended', reason: 'Jaribio la kusimamisha' },
    });
    expect(r.status).toBe(404);
  });

  it('shows settings changes in the staff audit log too', async () => {
    await api(ctx, 'PUT', '/v1/ops/branding', {
      token: admin,
      body: {
        businessName: 'Kadi Sasa',
        tagline: '',
        primary: null,
        accent: null,
        fontBody: 'system',
        fontDisplay: 'elegant',
      },
    });
    const audit = await api(ctx, 'GET', '/v1/ops/audit', { token: billing });
    expect(audit.body![0]).toMatchObject({ action: 'branding', actorName: 'Amina Staff' });
  });
});

describe('PDPA data requests', () => {
  it('are filed by customers once per kind and resolved by support or admin', async () => {
    const filed = await api(ctx, 'POST', '/v1/me/data-requests', {
      token: owner.accessToken,
      body: { kind: 'export' },
    });
    expect(filed.status).toBe(201);
    const again = await api(ctx, 'POST', '/v1/me/data-requests', {
      token: owner.accessToken,
      body: { kind: 'export' },
    });
    expect(again.body!.requestedAt).toBe(filed.body!.requestedAt);

    const list = await api(ctx, 'GET', '/v1/ops/data-requests', { token: billing });
    expect(list.body).toEqual([
      expect.objectContaining({
        userId: owner.user.id,
        userName: 'Asha Mteja',
        phoneE164: '+255•••••004',
        kind: 'export',
        status: 'open',
        resolvedAt: null,
      }),
    ]);
    const id = list.body![0].id;
    expect(
      (await api(ctx, 'GET', '/v1/ops/overview', { token: billing })).body!.openDataRequests,
    ).toBe(1);

    const resolve = (token: string, body: object) =>
      api(ctx, 'POST', `/v1/ops/data-requests/${id}/resolve`, { token, body });
    expect((await resolve(billing, { status: 'done', note: '' })).status).toBe(403);
    const done = await resolve(support, { status: 'done', note: 'Imetumwa kwa barua pepe' });
    expect(done.body).toMatchObject({
      status: 'done',
      resolvedBy: 'Saidi Support',
      note: 'Imetumwa kwa barua pepe',
    });
    expect((await resolve(support, { status: 'rejected', note: '' })).status).toBe(409);
    const [entry] = await opsAudit('resolve_request');
    expect(entry!.diff).toMatchObject({
      target: 'Asha Mteja',
      details: 'export: done — Imetumwa kwa barua pepe',
    });
  });

  it('completing a deletion wipes the account and archives the weddings it owns', async () => {
    await api(ctx, 'POST', '/v1/me/data-requests', {
      token: owner.accessToken,
      body: { kind: 'deletion' },
    });
    const list = await api(ctx, 'GET', '/v1/ops/data-requests', { token: admin });
    // open requests first
    expect(list.body![0]).toMatchObject({ kind: 'deletion', status: 'open' });
    const r = await api(ctx, 'POST', `/v1/ops/data-requests/${list.body![0].id}/resolve`, {
      token: admin,
      body: { status: 'done', note: '' },
    });
    expect(r.status).toBe(200);
    expect(r.body!.phoneE164).toBe('—');

    const [u] = await ctx.db.select().from(users).where(eq(users.id, owner.user.id));
    expect(u).toMatchObject({ name: '', status: 'suspended' });
    expect(u!.deletedAt).toBeTruthy();
    expect(u!.phoneE164).not.toContain('711900004');
    const [e] = await ctx.db.select().from(events).where(eq(events.id, eventId));
    expect(e!.status).toBe('archived');
    expect((await api(ctx, 'GET', '/v1/me', { token: owner.accessToken })).status).toBe(403);
    // the account is gone from the customer list; the guests' cards are untouched
    const orgs = await api(ctx, 'GET', '/v1/ops/organizers', { token: admin });
    expect(orgs.body!.map((o: { id: string }) => o.id)).not.toContain(owner.user.id);
    // the same phone can sign up again as a new, empty account
    ctx.clock.now += 60_000;
    const fresh = await loginAs(ctx, '0711900004');
    expect(fresh.user.id).not.toBe(owner.user.id);
  });
});

describe('HttpRepository ops methods', () => {
  it('reach the real routes instead of not_implemented', async () => {
    const tokens = memoryTokenStore();
    const r = createHttpRepository('http://api.test', {
      tokens,
      fetchImpl: ((url: string, init?: RequestInit) =>
        ctx.app.request(url.replace('http://api.test', ''), init)) as typeof fetch,
    });
    tokens.set({ accessToken: admin, refreshToken: 'unused' });
    expect((await r.opsOverview()).events.total).toBe(1);
    expect(Array.isArray(await r.opsListOrganizers())).toBe(true);
    const [ev] = await r.opsListEvents();
    expect((await r.opsSetEventPlan(ev!.id, 'free')).plan).toBe('free');
    expect((await r.opsUsage()).byChannel).toHaveLength(2);
    expect((await r.opsListPayments())[0]!.reference).toMatch(/:CASH-OPS-1$/);
    const hits = await r.opsLookup('Hamisi');
    expect(hits.guests).toHaveLength(1);
    expect(
      (await r.opsRevealPhone({ kind: 'guest', id: hits.guests[0]!.guestId }, 'Kwa msaada'))
        .phoneE164,
    ).toBe('+255754321678');
    const target = (await r.opsListOrganizers())[0]!;
    expect((await r.opsSetUserStatus(target.id, 'active', '')).status).toBe('active');
    expect((await r.opsListAudit()).length).toBeGreaterThan(0);
    expect((await r.opsListDataRequests()).length).toBe(2);
    await expect(r.opsResolveDataRequest(ev!.id, 'done', '')).rejects.toMatchObject({
      code: 'not_found',
    });

    const customer = createHttpRepository('http://api.test', {
      tokens: memoryTokenStore(),
      fetchImpl: ((url: string, init?: RequestInit) =>
        ctx.app.request(url.replace('http://api.test', ''), init)) as typeof fetch,
    });
    await expect(customer.opsOverview()).rejects.toMatchObject({ code: 'unauthorized' });
  });

  it('files data requests for the signed-in customer', async () => {
    const tokens = memoryTokenStore();
    const r = createHttpRepository('http://api.test', {
      tokens,
      fetchImpl: ((url: string, init?: RequestInit) =>
        ctx.app.request(url.replace('http://api.test', ''), init)) as typeof fetch,
    });
    tokens.set({ accessToken: other.accessToken, refreshToken: 'unused' });
    expect((await r.requestDataExport()).requestedAt).toBeTruthy();
    expect((await r.requestAccountDeletion()).requestedAt).toBeTruthy();
  });
});
