import type { Deps } from './context';
import { DeliveryService } from './services/delivery';
import { EventService } from './services/events';
import { ScheduledSendService } from './services/scheduled';
import { SmsCampaignService } from './services/sms-campaigns';
import { createAnalyticsService, type AnalyticsService } from './services/analytics';
import { safeErrorMessage } from './observability';

const EVERY_MS = 60_000;
/** The analytics retention sweep runs at most once per this interval (ADR 057 §6). */
const ANALYTICS_SWEEP_EVERY_MS = 24 * 60 * 60 * 1000;

/**
 * Starts the check for scheduled sends that have come due (ADR 030). It is a plain interval rather than a
 * queue job so it also works without Redis; each send is claimed with a conditional update, so running
 * it on several instances is safe. Returns a function that stops it.
 */
export interface SchedulerOptions {
  everyMs?: number;
  /** Public site host, used by the analytics service's referrer check. */
  siteHost?: string;
  /** Override the sweep cadence for tests; defaults to 24 h. */
  analyticsSweepEveryMs?: number;
  /** For tests: supply a prepared analytics service (so the sweep can be observed). */
  analytics?: AnalyticsService;
}

export function startScheduler(deps: Deps, options: SchedulerOptions = {}): () => void {
  const {
    everyMs = EVERY_MS,
    siteHost = 'kadisasa.com',
    analyticsSweepEveryMs = ANALYTICS_SWEEP_EVERY_MS,
  } = options;
  const events = new EventService(deps);
  const scheduled = new ScheduledSendService(deps, events, new DeliveryService(deps, events));
  const sms = new SmsCampaignService(deps, events);
  const analytics = options.analytics ?? createAnalyticsService(deps, siteHost);
  let running = false;
  let lastSweep = 0;
  const tick = async () => {
    if (running) return; // a long send must not overlap the next check
    running = true;
    try {
      const r = await scheduled.runDue();
      if (r.ran + r.failed + r.missed > 0)
        console.log(JSON.stringify({ level: 'info', msg: 'scheduled sends', ...r }));
      // SMS-reminder-only customers' texts set for later (ADR 055)
      const s = await sms.runDue();
      if (s.ran + s.missed > 0)
        console.log(JSON.stringify({ level: 'info', msg: 'sms campaigns', ...s }));
      // Analytics retention sweep; no-op when ANALYTICS_ENABLED is off (ADR 057 §6).
      if (analytics.enabled && Date.now() - lastSweep >= analyticsSweepEveryMs) {
        lastSweep = Date.now();
        const deleted = await analytics.sweepOld(deps.now());
        if (deleted > 0)
          console.log(JSON.stringify({ level: 'info', msg: 'analytics sweep', deleted }));
      }
    } catch (e) {
      console.error(
        JSON.stringify({
          level: 'error',
          msg: 'scheduled sends failed',
          err: safeErrorMessage(e),
        }),
      );
      deps.reportError?.(e as Error);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => void tick(), everyMs);
  timer.unref();
  return () => clearInterval(timer);
}
