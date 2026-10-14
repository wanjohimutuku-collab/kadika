import { describe, expect, it } from 'vitest';
import { MemoryRateStore, RateLimiter, RedisRateStore, type RedisLike } from './rate-limit';
import type { ApiError } from './errors';

/** A tiny in-memory Redis with just INCR / PEXPIRE / PTTL and a clock, to prove the protocol. */
class FakeRedis implements RedisLike {
  data = new Map<string, { n: number; exp: number | null }>();
  fail = false;
  constructor(private clock: { now: number }) {}
  private live(k: string) {
    const v = this.data.get(k);
    if (v && v.exp !== null && v.exp <= this.clock.now) this.data.delete(k);
    return this.data.get(k);
  }
  async incr(k: string) {
    if (this.fail) throw new Error('redis down');
    const v = this.live(k) ?? { n: 0, exp: null };
    v.n++;
    this.data.set(k, v);
    return v.n;
  }
  async pexpire(k: string, ms: number) {
    if (this.fail) throw new Error('redis down');
    const v = this.live(k);
    if (!v) return 0;
    v.exp = this.clock.now + ms;
    return 1;
  }
  async pttl(k: string) {
    if (this.fail) throw new Error('redis down');
    const v = this.live(k);
    return !v ? -2 : v.exp === null ? -1 : v.exp - this.clock.now;
  }
}

const tooMany = async (p: Promise<void>) => {
  try {
    await p;
  } catch (e) {
    return e as ApiError;
  }
  return null;
};

describe('RateLimiter', () => {
  it('allows the limit, then answers rate_limited with a retry time, and resets after the window', async () => {
    const clock = { now: 1_000_000 };
    const rl = new RateLimiter(() => new Date(clock.now), 3, 60_000, 't');
    for (let i = 0; i < 3; i++) await rl.check('ip:1');
    const err = await tooMany(rl.check('ip:1'));
    expect(err).toMatchObject({ code: 'rate_limited', details: { retryAfterSeconds: 60 } });
    await rl.check('ip:2'); // another caller is unaffected
    clock.now += 61_000;
    await rl.check('ip:1'); // window over
  });

  it('keeps limiters with different names apart', async () => {
    const clock = { now: 0 };
    const now = () => new Date(clock.now);
    const store = new MemoryRateStore(now);
    const a = new RateLimiter(now, 1, 60_000, 'a', store);
    const b = new RateLimiter(now, 1, 60_000, 'b', store);
    await a.check('ip:1');
    await b.check('ip:1');
    expect(await tooMany(a.check('ip:1'))).toMatchObject({ code: 'rate_limited' });
  });
});

describe('RedisRateStore', () => {
  it('shares one budget between two API instances', async () => {
    const clock = { now: 5_000 };
    const now = () => new Date(clock.now);
    const redis = new FakeRedis(clock);
    const one = new RateLimiter(now, 4, 60_000, 'card', new RedisRateStore(redis, now));
    const two = new RateLimiter(now, 4, 60_000, 'card', new RedisRateStore(redis, now));
    await one.check('ip:9');
    await two.check('ip:9');
    await one.check('ip:9');
    await two.check('ip:9');
    // 4 hits across two instances: the 5th is refused on either one
    expect(await tooMany(one.check('ip:9'))).toMatchObject({ code: 'rate_limited' });
    expect(await tooMany(two.check('ip:9'))).toMatchObject({ code: 'rate_limited' });
    clock.now += 60_001;
    await one.check('ip:9');
  });

  it('repairs a counter that lost its expiry, so a key can never stick forever', async () => {
    const clock = { now: 0 };
    const now = () => new Date(clock.now);
    const redis = new FakeRedis(clock);
    redis.data.set('harusi:rl:x:k', { n: 5, exp: null }); // as if the process died between INCR and PEXPIRE
    const store = new RedisRateStore(redis, now);
    await store.hit('x:k', 10_000);
    expect(redis.data.get('harusi:rl:x:k')!.exp).toBe(10_000);
  });

  it('falls back to in-memory counters when Redis fails, instead of failing requests or going unlimited', async () => {
    const clock = { now: 0 };
    const now = () => new Date(clock.now);
    const redis = new FakeRedis(clock);
    redis.fail = true;
    const rl = new RateLimiter(now, 2, 60_000, 'card', new RedisRateStore(redis, now));
    await rl.check('ip:1');
    await rl.check('ip:1');
    expect(await tooMany(rl.check('ip:1'))).toMatchObject({ code: 'rate_limited' });
  });
});
