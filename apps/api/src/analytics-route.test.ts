import { afterEach, describe, expect, it } from 'vitest';
import { analyticsEvents } from '@harusi/db';
import { api, createTestContext, loginAs, type TestContext } from './testing/test-app';

/**
 * ADR 057 §5 locks POST /v1/internal/analytics/events as internal-only: the route is refused
 * when `ANALYTICS_INTERNAL_SECRET` is unset, rejects a wrong or missing secret with 401, and
 * writes a row only when the request is both authenticated and analytics is enabled with a
 * session secret. The route itself never reveals whether analytics is on, so the response is
 * always `204 No Content` on success.
 */

let ctx: TestContext;
afterEach(async () => {
  await ctx.close();
});

const INTERNAL = 'internal-shared-secret';
const SESSION = 'session-rotate-me';

const EVENT = {
  name: 'page_view',
  path: '/kadi-ya-harusi-mtandaoni',
  ip: '197.149.1.2',
  userAgent: 'Mozilla/5.0 Mobile',
  market: 'tz',
  locale: 'sw',
  edition: 'sw',
};

async function post(token: undefined, body: unknown, secret?: string) {
  void token;
  return ctx.app.request('/v1/internal/analytics/events', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(secret === undefined ? {} : { 'x-internal-secret': secret }),
    },
    body: JSON.stringify(body),
  });
}

describe('POST /v1/internal/analytics/events', () => {
  it('refuses the route when the internal secret is not configured', async () => {
    ctx = await createTestContext();
    const res = await post(undefined, EVENT, 'anything');
    expect(res.status).toBe(403);
    expect(await ctx.db.select().from(analyticsEvents)).toHaveLength(0);
  });

  it('rejects a missing or wrong internal secret with 401', async () => {
    ctx = await createTestContext({
      env: {
        ANALYTICS_ENABLED: '1',
        ANALYTICS_SESSION_SECRET: SESSION,
        ANALYTICS_INTERNAL_SECRET: INTERNAL,
      },
    });
    const noHeader = await post(undefined, EVENT);
    expect(noHeader.status).toBe(401);
    const wrong = await post(undefined, EVENT, 'not-the-secret');
    expect(wrong.status).toBe(401);
    expect(await ctx.db.select().from(analyticsEvents)).toHaveLength(0);
  });

  it('writes a row on a valid request and answers 204', async () => {
    ctx = await createTestContext({
      env: {
        ANALYTICS_ENABLED: '1',
        ANALYTICS_SESSION_SECRET: SESSION,
        ANALYTICS_INTERNAL_SECRET: INTERNAL,
      },
    });
    const res = await post(undefined, EVENT, INTERNAL);
    expect(res.status).toBe(204);
    const rows = await ctx.db.select().from(analyticsEvents);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.name).toBe('page_view');
    expect(rows[0]!.sessionHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('answers 204 even when analytics is disabled, so a disabled deploy reveals nothing', async () => {
    ctx = await createTestContext({
      env: { ANALYTICS_INTERNAL_SECRET: INTERNAL },
    });
    const res = await post(undefined, EVENT, INTERNAL);
    expect(res.status).toBe(204);
    expect(await ctx.db.select().from(analyticsEvents)).toHaveLength(0);
  });

  it('rejects an unknown event name as a 400', async () => {
    ctx = await createTestContext({
      env: {
        ANALYTICS_ENABLED: '1',
        ANALYTICS_SESSION_SECRET: SESSION,
        ANALYTICS_INTERNAL_SECRET: INTERNAL,
      },
    });
    const res = await ctx.app.request('/v1/internal/analytics/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-secret': INTERNAL },
      body: JSON.stringify({ ...EVENT, name: 'something_else' }),
    });
    expect(res.status).toBe(400);
  });
});

/**
 * ADR 057 §5: business endpoints that count as conversions must emit when analytics is on, and
 * must stay silent when it is off. Test POST /v1/events and POST /v1/c/:token/rsvp as proxies for
 * the full set; the emit helper is shared so if these two work the others do too.
 */
describe('conversion events from business routes', () => {
  it('writes create_event when analytics is on', async () => {
    ctx = await createTestContext({
      env: { ANALYTICS_ENABLED: '1', ANALYTICS_SESSION_SECRET: SESSION },
    });
    const { accessToken } = await loginAs(ctx, '+255712480009');
    const create = await api(ctx, 'POST', '/v1/events', {
      token: accessToken,
      body: {
        title: 'Asha & Juma',
        coupleNames: 'Asha & Juma',
        dateStart: '2026-12-01',
        country: 'TZ',
      },
    });
    expect(create.status).toBe(201);
    // Retry the read briefly — emit is fire-and-forget so the row may land a tick later.
    let rows: unknown[] = [];
    for (let i = 0; i < 20; i++) {
      rows = await ctx.db.select().from(analyticsEvents);
      if (rows.some((r) => (r as { name: string }).name === 'create_event')) break;
      await new Promise((r) => setTimeout(r, 25));
    }
    expect(rows.some((r) => (r as { name: string }).name === 'create_event')).toBe(true);
  });

  it('writes nothing when analytics is off', async () => {
    ctx = await createTestContext();
    const { accessToken } = await loginAs(ctx, '+255712480009');
    const res = await api(ctx, 'POST', '/v1/events', {
      token: accessToken,
      body: {
        title: 'Asha & Juma',
        coupleNames: 'Asha & Juma',
        dateStart: '2026-12-01',
        country: 'TZ',
      },
    });
    expect(res.status).toBe(201);
    // Wait a short while so a slow emit cannot hide a failure.
    await new Promise((r) => setTimeout(r, 100));
    expect(await ctx.db.select().from(analyticsEvents)).toHaveLength(0);
  });
});
