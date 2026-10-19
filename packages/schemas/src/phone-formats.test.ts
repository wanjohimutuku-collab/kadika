import { describe, expect, it } from 'vitest';
import { formatPhoneInternational, normalizePhone, normalizeTzPhone } from './phone';

const TZ = '+255712345678';
const ok = (e164: string) => ({ ok: true, e164 });
const bad = (error: string) => ({ ok: false, error });
const zw = String.fromCharCode(0x200e); // left-to-right mark, added by contacts apps
const nbsp = String.fromCharCode(0xa0);
const en = String.fromCharCode(0x2013); // en dash

describe('any way of writing a Tanzanian number ends as E.164', () => {
  it.each([
    // what people type
    ['0712345678', TZ],
    ['0712 345 678', TZ],
    ['0712-345-678', TZ],
    ['0712.345.678', TZ],
    ['07 12 34 56 78', TZ],
    ['(0712) 345678', TZ],
    ['712345678', TZ],
    ['712 345 678', TZ],
    ['255712345678', TZ],
    ['255 712 345 678', TZ],
    ['+255712345678', TZ],
    ['+255 712 345 678', TZ],
    ['+255-712-345-678', TZ],
    ['+255 (712) 345-678', TZ],
    ['00255712345678', TZ],
    ['00 255 712 345 678', TZ],
    // the local 0 left in after the country code
    ['+2550712345678', TZ],
    ['+255 0712 345 678', TZ],
    ['+255 (0) 712 345 678', TZ],
    ['255 0712345678', TZ],
    ['00255 0712345678', TZ],
    // surrounding space and a letter O typed for zero
    ['   0712345678   ', TZ],
    ['O712 345 678', TZ],
    ['+255 7O2 345 678', '+255702345678'],
    ['o7l2345678'.replace('l', '1'), TZ],
  ])('%j → %s', (input, e164) => {
    expect(normalizeTzPhone(input)).toEqual(ok(e164));
  });

  it('reads numbers pasted from other apps: invisible marks, no-break spaces, odd dashes', () => {
    expect(normalizeTzPhone(`${zw}+255${nbsp}712${nbsp}345${nbsp}678${zw}`)).toEqual(ok(TZ));
    expect(normalizeTzPhone(`0712${en}345${en}678`)).toEqual(ok(TZ));
    expect(normalizeTzPhone(`‪+255 712 345 678‬`)).toEqual(ok(TZ));
    expect(normalizeTzPhone('​0712345678')).toEqual(ok(TZ));
  });

  it('reads digits written in other scripts', () => {
    expect(normalizeTzPhone('٠٧١٢٣٤٥٦٧٨')).toEqual(ok(TZ)); // Arabic-Indic
    expect(normalizeTzPhone('۰۷۱۲۳۴۵۶۷۸')).toEqual(ok(TZ)); // Persian
    expect(normalizeTzPhone('０７１２３４５６７８')).toEqual(ok(TZ)); // full-width
    expect(normalizeTzPhone('＋２５５ ７１２ ３４５ ６７８')).toEqual(ok(TZ));
  });

  it('finds the number inside words, labels and links', () => {
    for (const input of [
      'Simu: 0712 345 678',
      'Namba yangu ni 0712345678 asante',
      'Tel +255 712 345 678.',
      'WhatsApp: +255712345678',
      'tel:+255712345678',
      'tel:%2B255712345678',
      'https://wa.me/255712345678',
      'https://wa.me/255712345678?text=Habari',
      'https://api.whatsapp.com/send?phone=255712345678&text=hi',
      'Asha (0712 345 678) - bibi harusi',
      'Mpigie Asha: 0712-345-678 kabla ya saa 10',
    ])
      expect(normalizeTzPhone(input)).toEqual(ok(TZ));
  });

  it('does not mistake dates, years or short numbers in the text for the phone number', () => {
    expect(normalizeTzPhone('Harusi 14 Des 2026, simu 0712345678')).toEqual(ok(TZ));
    expect(normalizeTzPhone('Tarehe 14/12/2026')).toEqual(bad('invalid_chars'));
    expect(normalizeTzPhone('Nyumba 24 mtaa wa 3')).toEqual(bad('invalid_chars'));
  });

  it('asks for one number when there are two, however they are separated', () => {
    for (const input of [
      '0712345678 / 0754123456',
      '0712345678, 0754123456',
      '0712345678; 0754123456',
      '0712345678\n0754123456',
      '0712345678 au 0754123456',
      'Asha 0712345678 na Juma 0754123456',
      '+255712345678 | +255754123456',
    ])
      expect(normalizeTzPhone(input)).toEqual(bad('multiple_numbers'));
  });

  it('is fine when the same number is only written twice in one text, or just once with punctuation', () => {
    expect(normalizeTzPhone('0712 345 678.')).toEqual(ok(TZ));
    expect(normalizeTzPhone('"0712345678"')).toEqual(ok(TZ));
    expect(normalizeTzPhone('<0712345678>')).toEqual(ok(TZ));
  });
});

describe('numbers it must still refuse, with the right reason', () => {
  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    ['abc', 'invalid_chars'],
    ['hello world', 'invalid_chars'],
    ['07123', 'wrong_length'],
    ['0712 345 6789', 'wrong_length'],
    ['+255 712 345', 'wrong_length'],
    ['0222123456', 'not_mobile'], // a Dar es Salaam landline
    ['0512345678', 'not_mobile'],
    ['+254712345678', 'not_tanzanian'],
    ['+447911123456', 'not_tanzanian'],
    ['0044 7911 123456', 'not_tanzanian'],
  ])('%j → %s', (input, error) => {
    expect(normalizeTzPhone(input)).toEqual(bad(error));
  });
});

describe('with Kenya allowed', () => {
  const both = ['TZ', 'KE'] as const;
  it('reads Kenyan numbers in the same loose ways', () => {
    for (const input of [
      '0712 345 678',
      '+254 712 345 678',
      '254712345678',
      '00254712345678',
      '+254 0712 345 678',
      '+254 (0) 712 345 678',
      'Simu: 0712345678',
    ])
      expect(normalizePhone(input, 'KE', both)).toEqual(ok('+254712345678'));
    expect(normalizePhone('0112345678', 'KE', both)).toEqual(ok('+254112345678'));
  });

  it('reads a number in the other allowed country from any event', () => {
    expect(normalizePhone('+254 712 345 678', 'TZ', both)).toEqual(ok('+254712345678'));
    expect(normalizePhone('+255 0712 345 678', 'KE', both)).toEqual(ok(TZ));
    expect(normalizePhone('+256 712 345 678', 'TZ', both)).toEqual(bad('unsupported_country'));
  });
});

describe('formatPhoneInternational', () => {
  it('writes the understood number with spaces, for showing back to the person', () => {
    expect(formatPhoneInternational(TZ)).toBe('+255 712 345 678');
    expect(formatPhoneInternational('+254712345678')).toBe('+254 712 345 678');
    expect(formatPhoneInternational('+447911123456')).toBe('+447911123456');
  });
});

describe('what comes out is always the same shape', () => {
  it('every accepted input is +, the dial code and nine digits, nothing else', () => {
    const inputs = [
      '0712345678',
      '+255 (0) 712-345-678',
      `${zw}00 255 712 345 678`,
      '٠٧١٢٣٤٥٦٧٨',
      'tel:%2B255712345678',
      'Simu: O712.345.678',
    ];
    for (const i of inputs) {
      const r = normalizeTzPhone(i);
      expect(r.ok && r.e164).toMatch(/^\+255[67]\d{8}$/);
    }
  });
});
