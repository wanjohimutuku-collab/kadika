import { describe, expect, it } from 'vitest';
import { extractShortCode, normalizeShortCode } from './short-code';

describe('short-code', () => {
  it('normalizes bare codes', () => {
    expect(normalizeShortCode('kh 4823')).toBe('KH-4823');
    expect(normalizeShortCode('kh4823')).toBe('KH-4823');
    expect(normalizeShortCode('KH-4823')).toBe('KH-4823');
    expect(normalizeShortCode('OO-1010')).toBeNull();
  });

  it('extracts card text codes from Swahili and English SMS messages', () => {
    const swSms =
      'Habari Asha, unaalikwa kwenye harusi ya Juma & Amina tarehe 12 Des pale Serena. Fungua kadi yako: https://kadisasa.com/c/tok123 (Kadi: KH-4823)';
    expect(extractShortCode(swSms)).toBe('KH-4823');

    const enSms =
      'Hello John, you are invited to the wedding of Juma & Amina on Dec 12 at Serena. View your card: https://kadisasa.com/c/tok123 (Card: UR 8766)';
    expect(extractShortCode(enSms)).toBe('UR-8766');

    expect(extractShortCode('Your ticket code is ab2345 at the gate')).toBe('AB-2345');
    expect(extractShortCode('No card code in this message 123456')).toBeNull();
  });
});
