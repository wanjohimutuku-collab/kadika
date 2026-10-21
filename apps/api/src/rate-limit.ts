import { ApiError } from './errors';

export interface RateHit {
  count: number;
  /** Epoch milliseconds when this window ends. */
  resetAt: number;
}

/** Where hit counts live. Shared (Redis) when there is more than one API instance. */
export interface RateStore {
  hit(key: string, windowMs: number): Promise<RateHit>;
}

/** Per-process counters: fine for one instance and for tests; the fallback if Redis fails. */
export class MemoryRateStore implements RateStore {
  private hits = new Map<string, RateHit>();
  constructor(private now: () => Date) {}

  async hit(key: string, windowMs: number): Promise<RateHit> {
    const t = this.now().getTime();
    const h = this.hits.get(key);
    if (!h || h.resetAt <= t) {
      const fresh = { count: 1, resetAt: t + windowMs };
      this.hits.set(key, fresh);
      if (this.hits.size > 50_000) this.hits.clear(); // bound memory under attack
      return fresh;
    }
    h.count++;
    return { ...h };
  }
}

/** The few Redis commands the limiter needs (`ioredis` satisfies this). */
export interface RedisLike {
  incr(key: string): Promise<number>;
  pexpire(key: string, ms: number): Promise<number>;
  pttl(key: string): Promise<number>;
}

/**
 * Fixed-window counters in Redis (§9): INCR, and on the first hit set the expiry. If Redis is down
 * the call throws and `RateLimiter` falls back to its in-memory counters rather than letting
 * requests through unchecked or failing every request.
 */
export class RedisRateStore implements RateStore {
  constructor(
    private redis: RedisLike,
    private now: () => Date,
    private prefix = 'harusi:rl:',
  ) {}

  async hit(key: string, windowMs: number): Promise<RateHit> {
    const k = this.prefix + key;
    const count = await this.redis.incr(k);
    if (count === 1) await this.redis.pexpire(k, windowMs);
    let ttl = await this.redis.pttl(k);
    if (ttl < 0) {
      // the key lost its expiry (a crash between INCR and PEXPIRE): repair it so it cannot stick forever
      await this.redis.pexpire(k, windowMs);
      ttl = windowMs;
    }
    return { count, resetAt: this.now().getTime() + ttl };
  }
}

/**
 * Fixed-window limiter used on the public, unauthenticated endpoints (card views, RSVP, pay, gate
 * join) so tokens and PINs cannot be brute-forced. `name` keeps the limiters' counters apart.
 */
export class RateLimiter {
  private fallback: MemoryRateStore;

  constructor(
    private now: () => Date,
    private limit: number,
    private windowMs: number,
    private name = 'default',
    private store?: RateStore,
  ) {
    this.fallback = new MemoryRateStore(now);
  }

  async check(key: string): Promise<void> {
    const k = `${this.name}:${key}`;
    let h: RateHit;
    try {
      h = this.store
        ? await this.store.hit(k, this.windowMs)
        : await this.fallback.hit(k, this.windowMs);
    } catch {
      h = await this.fallback.hit(k, this.windowMs);
    }
    if (h.count > this.limit) {
      throw new ApiError('rate_limited', 'Too many requests', {
        retryAfterSeconds: Math.max(1, Math.ceil((h.resetAt - this.now().getTime()) / 1000)),
      });
    }
  }
}

/**
 * The caller's IP for rate limiting. A configured edge header (`cf-connecting-ip`) wins; otherwise the
 * LAST X-Forwarded-For entry, the one our own proxy appended. The first entry is whatever the client
 * sent, so keying on it would let anyone pick a fresh address per request and skip every limit.
 */
export function clientIp(header: (name: string) => string | undefined, edgeHeader: string | null) {
  const edge = edgeHeader ? header(edgeHeader)?.trim() : undefined;
  if (edge) return edge;
  const hops = header('x-forwarded-for')
    ?.split(',')
    .map((h) => h.trim())
    .filter(Boolean);
  return hops?.at(-1) ?? 'local';
}
