import { describe, expect, it } from 'vitest';
import { healthResponseSchema } from './index';

describe('healthResponseSchema', () => {
  it('accepts a valid payload', () => {
    expect(
      healthResponseSchema.safeParse({
        status: 'ok',
        service: 'api',
        time: new Date().toISOString(),
      }).success,
    ).toBe(true);
  });
  it('rejects a bad status', () => {
    expect(
      healthResponseSchema.safeParse({ status: 'down', service: 'api', time: 'x' }).success,
    ).toBe(false);
  });
});
