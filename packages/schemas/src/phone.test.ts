import { describe, expect, it } from 'vitest';
import { formatTzPhone, maskPhone, normalizeTzPhone } from './phone';
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
