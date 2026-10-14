import { ApiError } from './errors';

/**
 * Fixed-window limiter (in-memory; moves to Redis with the other rate limits in Phase 7, §9).
 * Used on the public, unauthenticated guest-card endpoints so tokens cannot be brute-forced.
 */
export class RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private now: () => Date,
    private limit: number,
    private windowMs: number,
  ) {}

  check(key: string): void {
    const t = this.now().getTime();
    const h = this.hits.get(key);
    if (!h || h.resetAt <= t) {
      this.hits.set(key, { count: 1, resetAt: t + this.windowMs });
      if (this.hits.size > 50_000) this.hits.clear(); // bound memory under attack
      return;
    }
    if (++h.count > this.limit) {
      throw new ApiError('rate_limited', 'Too many requests', {
        retryAfterSeconds: Math.ceil((h.resetAt - t) / 1000),
      });
    }
  }
}
