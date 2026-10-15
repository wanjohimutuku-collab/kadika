import { Queue, Worker, type ConnectionOptions } from 'bullmq';
import { Redis } from 'ioredis';
import type { Deps } from './context';
import { DeliveryService, type SendInput } from './services/delivery';
import { EventService } from './services/events';
import { PledgeService } from './services/pledges';

const QUEUE = 'harusi-delivery';
const TICK_EVERY_MS = 15 * 60_000;

export interface SendJobData {
  eventId: string;
  userId: string;
  input: SendInput;
}

/** The scheduled work: WhatsApp→SMS fallback, T-14/7/1 reminders, SMS delivery reports. */
export async function runTick(deps: Deps, delivery: DeliveryService, pledges?: PledgeService) {
  const fallback = await delivery.fallbackUndelivered(deps.config.whatsappFallbackHours);
  const reminders = await delivery.sendReminders();
  const reports = await delivery.pollSmsReports();
  // Provider payments still open past their prompt window are settled by asking the provider (ADR 027).
  const payments = pledges ? await pledges.reconcilePending() : null;
  return { fallback, reminders, reports, payments };
}

/**
 * BullMQ worker (§3). Sends can be queued from the API (`enqueueSend`), and one repeatable `tick`
 * job runs the scheduled work. Returns a handle to enqueue sends and to shut down cleanly.
 */
export function startWorker(deps: Deps, redisUrl: string) {
  const connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
  }) as unknown as ConnectionOptions;
  const events = new EventService(deps);
  const delivery = new DeliveryService(deps, events);
  const pledges = new PledgeService(deps, events);
  const queue = new Queue(QUEUE, { connection });
  void queue.add(
    'tick',
    {},
    { repeat: { every: TICK_EVERY_MS }, jobId: 'tick', removeOnComplete: 20, removeOnFail: 50 },
  );
  const worker = new Worker(
    QUEUE,
    async (job) => {
      if (job.name === 'tick') return runTick(deps, delivery, pledges);
      if (job.name === 'send') {
        const d = job.data as SendJobData;
        return delivery.send(d.eventId, d.userId, d.input);
      }
      throw new Error(`unknown job ${job.name}`);
    },
    { connection, concurrency: 2 },
  );
  worker.on('failed', (job, err) =>
    console.error(
      JSON.stringify({ level: 'error', msg: 'job failed', job: job?.name, err: err.message }),
    ),
  );
  return {
    enqueueSend: async (data: SendJobData) => {
      const job = await queue.add('send', data, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      });
      return String(job.id);
    },
    close: async () => {
      await worker.close();
      await queue.close();
    },
  };
}
