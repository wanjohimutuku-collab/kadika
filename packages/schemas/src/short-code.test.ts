import { describe, expect, it } from 'vitest';
import {
  combineSmsFragments,
  extractShortCode,
  extractShortCodeFromOcr,
  extractShortCodeFromPartialSms,
  normalizeShortCode,
} from './short-code';

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

  it('reads the "Namba:" label of the Swahili invite and reminder SMS', () => {
    expect(
      extractShortCode(
        'Karibu kwenye harusi ya Juma na Amina, 12 Des 2026. Kadi yako: https://k.sasa.tz/s/aB3dE Namba: KH-4823',
      ),
    ).toBe('KH-4823');
  });

  it('never takes a code out of the card link token', () => {
    // The token holds "-XY2345-" which looks like a code; the real one comes after the label.
    const sms =
      'Karibu kwenye harusi ya Juma na Amina, 12 Des 2026. Kadi yako: https://k.sasa.tz/s/q9-XY2345-zz Namba: KH-4823';
    expect(extractShortCode(sms)).toBe('KH-4823');
    expect(extractShortCode('Kadi yako: https://k.sasa.tz/s/q9-XY2345-zz')).toBeNull();
  });
});

describe('extractShortCodeFromOcr', () => {
  it('reads a code from text recognised off a phone screen, across line breaks', () => {
    const ocr =
      'Karibu kwenye harusi ya Juma na\nAmina, 12 Des 2026. Kadi yako:\nhttps://k.sasa.tz/s/aB3dE\nNamba: KH-4823\n';
    expect(extractShortCodeFromOcr(ocr)).toBe('KH-4823');
  });

  it('fixes look-alike characters only next to a label', () => {
    // OCR read the S as 5 and the 8 as B.
    expect(extractShortCodeFromOcr('Namba: K5-4B23')).toBe('KS-4823');
    expect(extractShortCodeFromOcr('Code : UR 87G6')).toBe('UR-8766');
    expect(extractShortCodeFromOcr('Namba:KH—4823')).toBe('KH-4823');
  });

  it('does not invent a code from unlabelled noise', () => {
    expect(extractShortCodeFromOcr('12:45 Safaricom 4G 85%')).toBeNull();
    expect(extractShortCodeFromOcr('')).toBeNull();
  });

  it('repairs a hyphenated code when a feature phone screen scrolled past the Namba/Code label', () => {
    expect(extractShortCodeFromOcr('...s/aB3dE\nK5-4B23')).toBe('KS-4823');
    expect(extractShortCodeFromOcr('KH—4823')).toBe('KH-4823');
    expect(extractShortCodeFromOcr('mba: K5 4B23')).toBe('KS-4823');
  });
});

describe('extractShortCodeFromPartialSms (feature / disposable phones)', () => {
  const roster = [
    {
      shortCode: 'KH-4821',
      displayName: 'Juma Bakari',
      guestShort: '4a6f4821',
      token: 'tok_juma_991122',
    },
    {
      shortCode: 'KH-4826',
      displayName: 'Mwanaidi Salim',
      guestShort: '4a6f4826',
      token: 'aB3dE_fGhIjKlMnOp',
    },
    {
      shortCode: 'UR-8766',
      displayName: 'Asha Mwinyi',
      guestShort: '4a6f8766',
      token: 'xY9zW_qRsTuVwXyZ',
    },
  ];

  it('matches when only the top lines of the SMS (greeting + guest name) fit on the screen', () => {
    expect(
      extractShortCodeFromPartialSms(
        '12:45 Safaricom\nHabari Mwanaidi Salim, unaalikwa kwenye harusi ya Asha & Juma...',
        roster,
      ),
    ).toBe('KH-4826');
    expect(
      extractShortCodeFromPartialSms(
        'Hello Juma Bakari! You are invited to the wedding of...',
        roster,
      ),
    ).toBe('KH-4821');
  });

  it('matches when only the middle lines with a short link (/s/<token> or /s/<code>) are visible', () => {
    expect(
      extractShortCodeFromPartialSms(
        '...tarehe 14 Des pale Serena. Fungua kadi yako: https://k.sasa.tz/s/aB3dE_fGh...',
        roster,
      ),
    ).toBe('KH-4826');
    expect(
      extractShortCodeFromPartialSms('...Kadi yako: https://hrs.tz/s/UR-8766...', roster),
    ).toBe('UR-8766');
  });

  it('matches when the code at the end of the SMS is truncated or clipped by the screen edge', () => {
    expect(
      extractShortCodeFromPartialSms(
        '...Kadi yako: https://k.sasa.tz/s/x Namba: KH-4826'.slice(0, -1), // 'Namba: KH-482' is ambiguous (4821 vs 4826)
        roster,
      ),
    ).toBeNull();
    expect(
      extractShortCodeFromPartialSms('...Kadi yako: https://k.sasa.tz/s/x Namba: UR-87', roster),
    ).toBe('UR-8766');
    expect(extractShortCodeFromPartialSms('...mba: -4826', roster)).toBe('KH-4826');
  });

  it('stitches multi-frame partial views as the guest scrolls a small feature phone screen', () => {
    const combined = combineSmsFragments([
      'Karibu kwenye harusi ya Asha & Juma, 14 Des.',
      'Kadi yako: https://k.sasa.tz/s/x Namba:',
      'KH-4B21',
    ]);
    expect(extractShortCodeFromPartialSms(combined, roster)).toBe('KH-4821');
  });
});
