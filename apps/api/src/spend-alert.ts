import { and, gt, inArray, ne, sql } from 'drizzle-orm';
import { messageLog } from '@harusi/db';
import type { Deps } from './context';

/**
 * Spend guard: SMS and WhatsApp messages sent in the last 24 hours, reported as an error once the count
 * passes MESSAGE_DAILY_ALERT, so a runaway send, a loop or SMS pumping pages someone before the provider
 * bill does. Runs with the scheduled tick (every 15 minutes). Provider-side balance alerts are still
 * needed: this only sees what went through this API.
 */
export async function checkMessageVolume(
  deps: Deps,
): Promise<{ last24h: number; alerted: boolean }> {
  const limit = deps.config.messageDailyAlert;
  if (!limit) return { last24h: 0, alerted: false };
  const since = new Date(deps.now().getTime() - 24 * 3_600_000);
  const [r] = await deps.db
    .select({ n: sql<number>`count(*)::int` })
    .from(messageLog)
    .where(
      and(
        gt(messageLog.createdAt, since),
        inArray(messageLog.channel, ['sms', 'whatsapp']),
        ne(messageLog.status, 'failed'),
      ),
    );
  const last24h = r?.n ?? 0;
  if (last24h < limit) return { last24h, alerted: false };
  console.error(
    JSON.stringify({ level: 'error', msg: 'message volume alert', last24h, alertAt: limit }),
  );
  // One fixed message so the error tracker groups every tick into one issue.
  deps.reportError?.(
    new Error('Message volume alert: 24-hour SMS/WhatsApp count passed MESSAGE_DAILY_ALERT'),
  );
  return { last24h, alerted: true };
}
