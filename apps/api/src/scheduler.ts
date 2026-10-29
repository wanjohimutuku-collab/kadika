import type { Deps } from './context';
import { DeliveryService } from './services/delivery';
import { EventService } from './services/events';
import { ScheduledSendService } from './services/scheduled';
import { safeErrorMessage } from './observability';

const EVERY_MS = 60_000;

/**
 * Starts the check for scheduled sends that have come due (ADR 030). It is a plain interval rather than a
 * queue job so it also works without Redis; each send is claimed with a conditional update, so running
 * it on several instances is safe. Returns a function that stops it.
 */
export function startScheduler(deps: Deps, everyMs = EVERY_MS): () => void {
  const events = new EventService(deps);
  const scheduled = new ScheduledSendService(deps, events, new DeliveryService(deps, events));
  let running = false;
  const tick = async () => {
    if (running) return; // a long send must not overlap the next check
    running = true;
    try {
      const r = await scheduled.runDue();
      if (r.ran + r.failed + r.missed > 0)
        console.log(JSON.stringify({ level: 'info', msg: 'scheduled sends', ...r }));
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
