import { afterEach, describe, expect, it, vi } from 'vitest';
import { startScheduler } from './scheduler';
import type { AnalyticsService } from './services/analytics';
import { createTestContext, type TestContext } from './testing/test-app';

/**
 * Covers the scheduler's analytics hook: with analytics on it calls sweepOld once per sweep
 * window, and with it off it never calls sweepOld. The scheduler's other duties (scheduled sends
 * and SMS campaigns) have their own test coverage; this file only guards the ADR 057 §6 wiring.
 */

let ctx: TestContext | undefined;
let stop: (() => void) | undefined;
afterEach(async () => {
  stop?.();
  stop = undefined;
  vi.useRealTimers();
  await ctx?.close();
  ctx = undefined;
});

function spyAnalytics(enabled: boolean): AnalyticsService & { sweeps: number } {
  const svc = {
    enabled,
    sweeps: 0,
    async record() {},
    async sweepOld() {
      this.sweeps += 1;
      return 0;
    },
  };
  return svc;
}

describe('scheduler: analytics retention', () => {
  it('runs the sweep once per window when analytics is enabled', async () => {
    vi.useFakeTimers();
    ctx = await createTestContext();
    const analytics = spyAnalytics(true);
    stop = startScheduler(ctx.deps, {
      everyMs: 10,
      analyticsSweepEveryMs: 1_000,
      analytics,
    });
    // First tick: sweep fires.
    await vi.advanceTimersByTimeAsync(10);
    expect(analytics.sweeps).toBe(1);
    // A later tick inside the same window must NOT re-fire.
    await vi.advanceTimersByTimeAsync(500);
    expect(analytics.sweeps).toBe(1);
    // Crossing the next window fires again.
    await vi.advanceTimersByTimeAsync(600);
    expect(analytics.sweeps).toBe(2);
  });

  it('never runs the sweep when analytics is disabled', async () => {
    vi.useFakeTimers();
    ctx = await createTestContext();
    const analytics = spyAnalytics(false);
    stop = startScheduler(ctx.deps, {
      everyMs: 10,
      analyticsSweepEveryMs: 1_000,
      analytics,
    });
    await vi.advanceTimersByTimeAsync(5_000);
    expect(analytics.sweeps).toBe(0);
  });
});
