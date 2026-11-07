import { afterEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { analyticsEvents } from '@harusi/db';
import {
  createAnalyticsService,
  dateBucket,
  deviceOf,
  normalisePath,
  sessionHash,
  sourceOf,
  type AnalyticsService,
} from './services/analytics';
import { createTestContext, type TestContext } from './testing/test-app';

/**
 * ADR 057 locks the analytics service against regression. These tests confirm the no-PII
 * promise: the service writes nothing without a secret, the session hash rotates daily and
 * with the secret, properties are whitelisted, and the device / source derivation keeps its
 * values inside the fixed enums.
 */

// Only the database tests at the bottom set `ctx`; the pure-function tests above leave it undefined.
let ctx: TestContext | undefined;
afterEach(async () => {
  await ctx?.close();
  ctx = undefined;
});

const BASE = {
  ip: '197.149.1.2',
  userAgent:
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  market: 'tz',
  locale: 'sw',
  edition: 'sw',
  path: '/kadi-ya-harusi-mtandaoni',
} as const;

function build(service: AnalyticsService) {
  return (over: Partial<Parameters<AnalyticsService['record']>[0]> = {}) =>
    service.record({ name: 'page_view', ...BASE, ...over });
}

describe('session hash', () => {
  it('is stable for the same inputs and rotates with the day, the ip or the secret', () => {
    const a = sessionHash('1.1.1.1', 'ua-a', '2026-11-07', 's1');
    const b = sessionHash('1.1.1.1', 'ua-a', '2026-11-07', 's1');
    expect(a).toBe(b);
    expect(a).not.toBe(sessionHash('1.1.1.1', 'ua-a', '2026-11-08', 's1'));
    expect(a).not.toBe(sessionHash('2.2.2.2', 'ua-a', '2026-11-07', 's1'));
    expect(a).not.toBe(sessionHash('1.1.1.1', 'ua-a', '2026-11-07', 's2'));
  });

  it('produces a 64-char hex digest (32 bytes)', () => {
    const h = sessionHash('1.1.1.1', 'ua', '2026-11-07', 'secret');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('uses UTC for the daily bucket', () => {
    expect(dateBucket(new Date('2026-11-07T23:59:59Z'))).toBe('2026-11-07');
    expect(dateBucket(new Date('2026-11-08T00:00:01Z'))).toBe('2026-11-08');
  });
});

describe('device classification', () => {
  it.each([
    [
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36',
      'mobile',
    ],
    [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1',
      'mobile',
    ],
    ['Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148', 'tablet'],
    [
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      'desktop',
    ],
  ] as const)('%s -> %s', (ua, expected) => {
    expect(deviceOf(ua)).toBe(expected);
  });
});

describe('source classification', () => {
  const site = 'kadisasa.com';
  it('treats missing or same-origin referrers as direct', () => {
    expect(sourceOf(undefined, site)).toEqual({ source: 'direct', referrerHost: null });
    expect(sourceOf('https://kadisasa.com/bei', site)).toEqual({
      source: 'direct',
      referrerHost: null,
    });
    expect(sourceOf('not-a-url', site)).toEqual({ source: 'direct', referrerHost: null });
  });
  it('tags search engines', () => {
    expect(sourceOf('https://www.google.com/search?q=kadi', site)).toEqual({
      source: 'search',
      referrerHost: 'google.com',
    });
    expect(sourceOf('https://duckduckgo.com/?q=kadi', site).source).toBe('search');
  });
  it('tags social hosts', () => {
    expect(sourceOf('https://m.facebook.com/xyz', site).source).toBe('social');
    expect(sourceOf('https://t.co/abc', site).source).toBe('social');
    expect(sourceOf('https://www.linkedin.com/pulse/post', site).source).toBe('social');
  });
  it('tags unknown hosts as referral', () => {
    expect(sourceOf('https://example.com/blog', site)).toEqual({
      source: 'referral',
      referrerHost: 'example.com',
    });
  });
});

describe('path normalisation', () => {
  it('strips query and hash and leaves a leading slash', () => {
    expect(normalisePath('/bei?utm=x#top')).toBe('/bei');
    expect(normalisePath('bei')).toBe('/bei');
  });
  it('bounds the length to 160 chars', () => {
    const long = `/${'a'.repeat(400)}`;
    expect(normalisePath(long).length).toBeLessThanOrEqual(160);
  });
});

describe('analytics service (database)', () => {
  it('is disabled by default and writes nothing', async () => {
    ctx = await createTestContext();
    const svc = createAnalyticsService(ctx.deps, 'kadisasa.com');
    expect(svc.enabled).toBe(false);
    await build(svc)();
    const rows = await ctx.db.select().from(analyticsEvents);
    expect(rows).toHaveLength(0);
  });

  it('stays disabled when the flag is on but the secret is missing (fail closed)', async () => {
    ctx = await createTestContext({ env: { ANALYTICS_ENABLED: '1' } });
    const svc = createAnalyticsService(ctx.deps, 'kadisasa.com');
    expect(svc.enabled).toBe(false);
    await build(svc)();
    expect(await ctx.db.select().from(analyticsEvents)).toHaveLength(0);
  });

  it('records a row with no PII when enabled', async () => {
    ctx = await createTestContext({
      env: { ANALYTICS_ENABLED: '1', ANALYTICS_SESSION_SECRET: 'rotate-me' },
    });
    const svc = createAnalyticsService(ctx.deps, 'kadisasa.com');
    expect(svc.enabled).toBe(true);
    await build(svc)();
    const [row] = await ctx.db.select().from(analyticsEvents);
    expect(row).toBeDefined();
    expect(row!.name).toBe('page_view');
    expect(row!.sessionHash).toMatch(/^[0-9a-f]{64}$/);
    expect(row!.device).toBe('mobile');
    expect(row!.source).toBe('direct');
    expect(row!.path).toBe('/kadi-ya-harusi-mtandaoni');
    expect(row!.market).toBe('tz');
    // No column in the row should carry the raw IP or user-agent.
    for (const v of Object.values(row!)) {
      expect(String(v)).not.toContain(BASE.ip);
      expect(String(v).toLowerCase()).not.toContain('mozilla');
    }
  });

  it('keeps only whitelisted property keys', async () => {
    ctx = await createTestContext({
      env: { ANALYTICS_ENABLED: '1', ANALYTICS_SESSION_SECRET: 's' },
    });
    const svc = createAnalyticsService(ctx.deps, 'kadisasa.com');
    await build(svc)({
      name: 'create_event',
      properties: {
        country: 'TZ',
        invitation_channel: 'whatsapp',
        // Not on the whitelist; ingest must drop it.
        phone: '+255712480009',
        email: 'yusuf@example.com',
      },
    });
    const [row] = await ctx.db
      .select()
      .from(analyticsEvents)
      .where(eq(analyticsEvents.name, 'create_event'));
    expect(row!.properties).toEqual({ country: 'TZ', invitation_channel: 'whatsapp' });
  });

  it('rejects an unknown event name', async () => {
    ctx = await createTestContext({
      env: { ANALYTICS_ENABLED: '1', ANALYTICS_SESSION_SECRET: 's' },
    });
    const svc = createAnalyticsService(ctx.deps, 'kadisasa.com');
    await expect(
      // Cast through unknown: the whole point is that the type and the runtime schema both refuse.
      svc.record({ ...BASE, name: 'something_else' as unknown as 'page_view' }),
    ).rejects.toThrow();
  });

  it('bounds the referrer host to 80 chars', async () => {
    ctx = await createTestContext({
      env: { ANALYTICS_ENABLED: '1', ANALYTICS_SESSION_SECRET: 's' },
    });
    const svc = createAnalyticsService(ctx.deps, 'kadisasa.com');
    const longHost = `${'a'.repeat(120)}.example.com`;
    await build(svc)({ referrer: `https://${longHost}/post` });
    const [row] = await ctx.db.select().from(analyticsEvents);
    expect(row!.referrerHost!.length).toBeLessThanOrEqual(80);
  });
});

describe('retention sweep', () => {
  it('is a no-op when analytics is disabled', async () => {
    ctx = await createTestContext();
    const svc = createAnalyticsService(ctx.deps, 'kadisasa.com');
    expect(await svc.sweepOld()).toBe(0);
  });

  it('deletes rows older than the retention window and keeps the rest', async () => {
    ctx = await createTestContext({
      env: { ANALYTICS_ENABLED: '1', ANALYTICS_SESSION_SECRET: 's' },
    });
    const svc = createAnalyticsService(ctx.deps, 'kadisasa.com');
    await build(svc)();
    await build(svc)({ name: 'create_event' });
    // Age one row past the cutoff and leave the other inside.
    const oldOccurred = new Date('2026-01-01T00:00:00Z');
    const rows = await ctx.db.select().from(analyticsEvents);
    await ctx.db
      .update(analyticsEvents)
      .set({ occurredAt: oldOccurred })
      .where(eq(analyticsEvents.id, rows[0]!.id));
    const now = new Date('2026-11-07T00:00:00Z'); // > 180 days after 2026-01-01
    const deleted = await svc.sweepOld(now);
    expect(deleted).toBe(1);
    const remaining = await ctx.db.select().from(analyticsEvents);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.id).toBe(rows[1]!.id);
  });

  it('respects a custom retention window', async () => {
    ctx = await createTestContext({
      env: { ANALYTICS_ENABLED: '1', ANALYTICS_SESSION_SECRET: 's' },
    });
    const svc = createAnalyticsService(ctx.deps, 'kadisasa.com');
    await build(svc)();
    const [row] = await ctx.db.select().from(analyticsEvents);
    const twoDaysAgo = new Date('2026-11-05T00:00:00Z');
    await ctx.db
      .update(analyticsEvents)
      .set({ occurredAt: twoDaysAgo })
      .where(eq(analyticsEvents.id, row!.id));
    // 180-day window keeps it; 1-day window deletes it.
    expect(await svc.sweepOld(new Date('2026-11-07T00:00:00Z'), 180)).toBe(0);
    expect(await svc.sweepOld(new Date('2026-11-07T00:00:00Z'), 1)).toBe(1);
  });
});

describe('summary aggregates', () => {
  it('returns an empty summary when disabled', async () => {
    ctx = await createTestContext();
    const svc = createAnalyticsService(ctx.deps, 'kadisasa.com');
    const s = await svc.summary(30);
    expect(s.totals).toEqual({});
    expect(s.byDay).toEqual([]);
    expect(s.byEdition).toEqual([]);
    expect(s.bySource).toEqual([]);
  });

  it('aggregates totals and groupings by edition and source', async () => {
    ctx = await createTestContext({
      env: { ANALYTICS_ENABLED: '1', ANALYTICS_SESSION_SECRET: 's' },
    });
    const svc = createAnalyticsService(ctx.deps, 'kadisasa.com');
    await build(svc)();
    await build(svc)({ edition: 'en' });
    await build(svc)({ name: 'create_event' });
    await build(svc)({
      referrer: 'https://www.google.com/search?q=kadi',
    });
    const s = await svc.summary(30);
    expect(s.totals.page_view).toBe(3);
    expect(s.totals.create_event).toBe(1);
    // One event from the referrer test comes from search.
    const search = s.bySource.find((r) => r.source === 'search');
    expect(search?.pageViews).toBe(1);
    const sw = s.byEdition.find((r) => r.edition === 'sw');
    expect(sw && sw.pageViews > 0).toBe(true);
  });
});
