import { describe, expect, it } from 'vitest';
import { countryHintFor } from './signin-country';

describe('countryHintFor', () => {
  it('switches to Kenya when a Kenyan number typed under Tanzania is undeliverable', () => {
    expect(countryHintFor('undeliverable', '799 000 111', 'TZ')).toEqual({
      kind: 'switch',
      country: 'KE',
    });
  });

  it('only suggests the other country when Firebase refused the attempt', () => {
    expect(countryHintFor('blocked', '0799 000 111', 'TZ')).toEqual({
      kind: 'suggest',
      country: 'KE',
    });
  });

  it('gives no hint for other failures, international numbers or "Other country"', () => {
    expect(countryHintFor('too_many', '799 000 111', 'TZ')).toBeUndefined();
    expect(countryHintFor('failed', '799 000 111', 'TZ')).toBeUndefined();
    expect(countryHintFor('blocked', '+255 799 000 111', 'TZ')).toBeUndefined();
    expect(countryHintFor('undeliverable', '799 000 111', 'OTHER')).toBeUndefined();
  });
});
