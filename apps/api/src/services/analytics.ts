import { blake2b } from '@noble/hashes/blake2';
import { z } from 'zod';
import { analyticsEvents, newId } from '@harusi/db';
import type { Deps } from '../context';
import type { Config } from '../config';

/**
 * First-party anonymous analytics ingestion (ADR 057). Writes rows to `analytics_events` and
 * never stores identifying information: no user id, no guest id, no event id, no phone, no
 * amount. The visitor's IP and user-agent are consumed by the hash and are not stored.
 *
 * The service is a no-op when `config.analyticsEnabled` is false (the default), or when
 * `ANALYTICS_SESSION_SECRET` is unset: without a secret the hash is not computable and no row is
 * written, which is the correct fail-closed behaviour.
 */

type Db = Deps['db'];

/** Fixed list; the zod schema rejects anything else. Adding a name needs an ADR amendment. */
export const ANALYTICS_EVENT_NAMES = [
  'page_view',
  'start_registration',
  'complete_registration',
  'create_event',
  'complete_event_setup',
  'create_invitation',
  'share_invitation',
  'add_guest',
  'receive_rsvp',
  'record_contribution',
  'scan_qr',
  'complete_checkin',
] as const;
export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

const MARKET = ['tz', 'ke'] as const;
const LOCALE = ['sw', 'en'] as const;
const EDITION = ['sw', 'en', 'ke'] as const;
export type AnalyticsDevice = 'mobile' | 'tablet' | 'desktop';
export type AnalyticsSource = 'direct' | 'search' | 'social' | 'referral';

const PATH_MAX = 160;
const REFERRER_HOST_MAX = 80;

/** Keys the ingest service may keep in `properties`. Any other key is dropped (ADR 057 §3). */
const PROPERTY_KEYS = [
  'country',
  'source',
  'landing_path',
  'invitation_channel',
  'occasion_bucket',
  'step_name',
] as const;
const PROPERTY_VALUE_MAX = 64;

const propertiesSchema = z
  .record(z.string(), z.string().max(PROPERTY_VALUE_MAX))
  .transform((raw) => {
    const out: Record<string, string> = {};
    for (const k of PROPERTY_KEYS) {
      const v = raw[k];
      if (typeof v === 'string' && v.length > 0 && v.length <= PROPERTY_VALUE_MAX) out[k] = v;
    }
    return out;
  })
  .default({});

/** Shape callers hand in. The route layer builds this from the request before calling. */
export const recordEventSchema = z.object({
  name: z.enum(ANALYTICS_EVENT_NAMES),
  /** Public page path; stripped of query here as a defence in depth. */
  path: z
    .string()
    .min(1)
    .max(PATH_MAX * 4),
  /** The visitor's fingerprint inputs. Consumed by the hash and NEVER persisted. */
  ip: z.string().min(1).max(64),
  userAgent: z.string().min(1).max(512),
  market: z.enum(MARKET),
  locale: z.enum(LOCALE),
  edition: z.enum(EDITION),
  referrer: z.string().max(2048).optional(),
  properties: propertiesSchema.optional(),
});
export type RecordEventInput = z.infer<typeof recordEventSchema>;

/** Daily bucket in UTC, so the hash rotates at midnight and does not survive the day. */
export function dateBucket(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * BLAKE2b-256(ip || userAgent || dateBucket || secret), hex-encoded. The order and separators
 * are stable so the same visitor on the same day gets the same digest. A different day, a
 * different IP, or a secret rotation each produce a different digest, which is the point.
 */
export function sessionHash(ip: string, userAgent: string, bucket: string, secret: string): string {
  const input = `${ip}\x1f${userAgent}\x1f${bucket}\x1f${secret}`;
  const bytes = blake2b(new TextEncoder().encode(input), { dkLen: 32 });
  return Buffer.from(bytes).toString('hex');
}

/**
 * The visitor's device class. Mobile and tablet come from the user-agent; anything else is
 * desktop. Order matters: tablet must beat mobile because the iPad UA used to include "Mobile".
 */
export function deviceOf(userAgent: string): AnalyticsDevice {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|playbook|kindle|silk/.test(ua)) return 'tablet';
  if (/android.*mobile|iphone|ipod|phone|mobile/.test(ua)) return 'mobile';
  return 'desktop';
}

/**
 * Where the visit came from, derived from the referrer host. A missing or same-origin referrer
 * is `direct`; a search engine's host is `search`; a social host is `social`; any other host
 * is `referral`. The host itself is also returned so it can be stored separately.
 */
export function sourceOf(
  referrer: string | undefined,
  siteHost: string,
): { source: AnalyticsSource; referrerHost: string | null } {
  if (!referrer) return { source: 'direct', referrerHost: null };
  let host: string;
  try {
    host = new URL(referrer).host.toLowerCase();
  } catch {
    return { source: 'direct', referrerHost: null };
  }
  if (!host || host === siteHost.toLowerCase()) return { source: 'direct', referrerHost: null };
  const trimmed = host.replace(/^www\./, '').slice(0, REFERRER_HOST_MAX);
  if (/(^|\.)(google|bing|duckduckgo|yahoo|yandex|baidu|ecosia)\./.test(host))
    return { source: 'search', referrerHost: trimmed };
  if (
    /(^|\.)(facebook|instagram|twitter|x|t|tiktok|linkedin|youtube|reddit|whatsapp|telegram|snapchat|pinterest|threads)\./.test(
      host,
    )
  )
    return { source: 'social', referrerHost: trimmed };
  return { source: 'referral', referrerHost: trimmed };
}

/** `?foo=…#hash` stripped and the result bounded to PATH_MAX. */
export function normalisePath(path: string): string {
  const noQuery = path.replace(/[?#].*$/, '');
  return (noQuery.startsWith('/') ? noQuery : `/${noQuery}`).slice(0, PATH_MAX);
}

export interface AnalyticsService {
  readonly enabled: boolean;
  record(input: RecordEventInput): Promise<void>;
}

/**
 * Service factory. `siteHost` names the public host (e.g. `kadisasa.com`) so the referrer
 * check can tell same-origin traffic from a real referrer.
 */
export function createAnalyticsService(
  deps: { db: Db; config: Config },
  siteHost: string,
): AnalyticsService {
  const enabled = Boolean(deps.config.analyticsEnabled && deps.config.analyticsSessionSecret);
  return {
    enabled,
    async record(raw) {
      if (!enabled) return;
      const input = recordEventSchema.parse(raw);
      const bucket = dateBucket();
      const hash = sessionHash(
        input.ip,
        input.userAgent,
        bucket,
        deps.config.analyticsSessionSecret!,
      );
      const { source, referrerHost } = sourceOf(input.referrer, siteHost);
      await deps.db.insert(analyticsEvents).values({
        id: newId(),
        name: input.name,
        sessionHash: hash,
        market: input.market,
        locale: input.locale,
        edition: input.edition,
        path: normalisePath(input.path),
        referrerHost,
        device: deviceOf(input.userAgent),
        source,
        properties: input.properties ?? {},
      });
    },
  };
}
