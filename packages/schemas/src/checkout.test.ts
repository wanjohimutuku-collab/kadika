import { describe, expect, it } from 'vitest';
import { detectNetwork, quickAmounts } from './checkout';
import { onlinePaymentLimits } from './country';

describe('detectNetwork', () => {
  it.each([
    ['+255744123456', 'mpesa'],
    ['+255754123456', 'mpesa'],
    ['+255764123456', 'mpesa'],
    ['+255712345678', 'mixx'],
    ['+255652345678', 'mixx'],
    ['+255672345678', 'mixx'],
    ['+255682345678', 'airtel'],
    ['+255692345678', 'airtel'],
    ['+255782345678', 'airtel'],
    ['+255612345678', 'halopesa'],
    ['+255622345678', 'halopesa'],
  ])('%s is %s', (n, want) => expect(detectNetwork(n)).toBe(want));

  it('gives no suggestion for networks it is not sure of, other countries, or bad input', () => {
    for (const n of [
      '+255732345678', // TTCL
      '+255772345678', // not certain
      '+254712345678', // Kenya is never guessed
      '+25571234567', // too short
      '+2557123456789', // too long
      '0712345678', // not E.164
      '',
      null,
      undefined,
    ])
      expect(detectNetwork(n)).toBeNull();
  });
});

describe('quickAmounts', () => {
  it('offers the balance first, then the presets, without repeats', () => {
    expect(quickAmounts('TZ', 35_000)).toEqual([35_000, 10_000, 20_000, 50_000]);
    expect(quickAmounts('TZ', 20_000)).toEqual([20_000, 10_000, 50_000, 100_000]);
    expect(quickAmounts('TZ')).toEqual([10_000, 20_000, 50_000, 100_000]);
    expect(quickAmounts('KE', 1_500)).toEqual([1_500, 500, 1_000, 2_000]);
  });

  it('keeps every amount inside the online payment limits', () => {
    const { min, max } = onlinePaymentLimits('TZ');
    expect(quickAmounts('TZ', min - 1)).not.toContain(min - 1);
    expect(quickAmounts('TZ', max + 1)).not.toContain(max + 1);
    expect(quickAmounts('TZ', 0)).toEqual([10_000, 20_000, 50_000, 100_000]);
    expect(quickAmounts('TZ', -5)).toEqual([10_000, 20_000, 50_000, 100_000]);
    expect(quickAmounts('TZ', 12.5)).not.toContain(12.5);
    for (const a of quickAmounts('TZ', 7_000)) {
      expect(a).toBeGreaterThanOrEqual(min);
      expect(a).toBeLessThanOrEqual(max);
    }
  });

  it('respects the maximum count', () => {
    expect(quickAmounts('TZ', 35_000, 2)).toEqual([35_000, 10_000]);
  });
});
