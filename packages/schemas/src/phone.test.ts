import { describe, expect, it } from 'vitest';
import { formatTzPhone, maskPhone, normalizeAnyPhone, normalizeTzPhone } from './phone';
import { tzPhoneSchema } from './domain';

describe('normalizeTzPhone', () => {
  it.each([
    ['0712345678', '+255712345678'],
    ['0712 345 678', '+255712345678'],
    ['712345678', '+255712345678'],
    ['255712345678', '+255712345678'],
    ['+255 712-345-678', '+255712345678'],
    ['00255712345678', '+255712345678'],
    ['(0754) 123 456', '+255754123456'],
    ['0620123456', '+255620123456'],
  ])('%s → %s', (input, e164) => {
    expect(normalizeTzPhone(input)).toEqual({ ok: true, e164 });
  });

  it.each([
    ['', 'empty'],
    ['abc', 'invalid_chars'],
    ['07123', 'wrong_length'],
    ['+254712345678', 'not_tanzanian'],
    ['0222123456', 'not_mobile'],
  ])('%s fails with %s', (input, error) => {
    expect(normalizeTzPhone(input)).toEqual({ ok: false, error });
  });

  it('formats and masks', () => {
    expect(formatTzPhone('+255712345678')).toBe('0712 345 678');
    expect(maskPhone('+255712345678')).toBe('+255•••••678');
  });

  it('works as a zod schema with i18n error keys', () => {
    expect(tzPhoneSchema.parse('0712345678')).toBe('+255712345678');
    const r = tzPhoneSchema.safeParse('0712');
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe('phone.wrong_length');
  });
});

describe('normalizeAnyPhone', () => {
  it.each([
    ['0712345678', '+255712345678'],
    ['+255 712 345 678', '+255712345678'],
    ['0712345678', '+254712345678', 'KE'],
    ['+254 712 345 678', '+254712345678'],
    ['+256 701 234 567', '+256701234567'], // Uganda
    ['+250 788 123 456', '+250788123456'], // Rwanda
    ['+1 555 123 4567', '+15551234567'], // US
    ['+44 7911 123456', '+447911123456'], // UK
    ['00256 701 234 567', '+256701234567'],
    ['+44 (0) 7911 123456', '+447911123456'],
  ])('%s → %s', (input, expected, defaultCountry = 'TZ') => {
    expect(normalizeAnyPhone(input, defaultCountry as 'TZ' | 'KE')).toEqual({
      ok: true,
      e164: expected,
    });
  });

  it.each([
    ['', 'empty'],
    ['abc', 'invalid_chars'],
    ['123', 'wrong_length'],
  ])('%s fails with %s', (input, error) => {
    expect(normalizeAnyPhone(input)).toEqual({ ok: false, error });
  });
});
