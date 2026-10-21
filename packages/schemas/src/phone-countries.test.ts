import { describe, expect, it } from 'vitest';
import { normalizeTzPhone, normalizePhone, formatPhone, maskPhone } from './phone';
import { allowedCountries, countryOfE164, paymentMethodsFor, currencyOf } from './country';
import { formatMoney, formatMoneyCompact } from './money';

/**
 * The implementation before ADR 025, frozen so Tanzanian behaviour is pinned byte for byte. Two things
 * were added on purpose since (ADR 036) and are modelled here, so every OTHER difference still fails:
 * the local 0 left in after the country code is dropped, and a stray trailing letter is ignored.
 */
function legacyNormalizeTzPhone(input: string) {
  // A stray letter after the number ("…678x"): read the number if there is one worth reading.
  if (input.endsWith('x')) {
    const stripped = input.slice(0, -1);
    return stripped.replace(/\D/g, '').length >= 7
      ? legacyCore(stripped)
      : { ok: false, error: 'invalid_chars' };
  }
  return legacyCore(input);
}

function legacyCore(input: string) {
  const raw = input.trim();
  if (!raw) return { ok: false, error: 'empty' };
  if (!/^[+\d\s\-().]+$/.test(raw)) return { ok: false, error: 'invalid_chars' };
  let digits = raw.replace(/[^\d]/g, '');
  const hadPlus = raw.startsWith('+');
  if (digits.startsWith('00')) digits = digits.slice(2);
  else if (!hadPlus && digits.startsWith('0')) digits = `255${digits.slice(1)}`;
  else if (!hadPlus && digits.length === 9) digits = `255${digits}`;
  if (!digits.startsWith('255')) {
    return hadPlus || digits.length > 10
      ? { ok: false, error: 'not_tanzanian' }
      : { ok: false, error: 'wrong_length' };
  }
  let national = digits.slice(3);
  // added on purpose: "+255 0712…", the local trunk 0 after the country code
  if (national.length === 10 && national.startsWith('0')) national = national.slice(1);
  if (national.length !== 9) return { ok: false, error: 'wrong_length' };
  if (!/^[67]/.test(national)) return { ok: false, error: 'not_mobile' };
  return { ok: true, e164: `+255${national}` };
}

// Small deterministic generator so the test is repeatable.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32;
}

describe('Tanzania behaviour is unchanged', () => {
  it('matches the legacy implementation on 20,000 generated inputs', () => {
    const r = rng(42);
    const pick = <T>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)]!;
    const digits = (n: number) => Array.from({ length: n }, () => Math.floor(r() * 10)).join('');
    const prefixes = ['', '0', '+', '00', '255', '+255', '00255', '254', '+254', '0255', ' ', '(0'];
    const noise = ['', ' ', '-', '.', ' (', ') '];
    for (let i = 0; i < 20000; i++) {
      const body = digits(Math.floor(r() * 14));
      const input = `${pick(prefixes)}${body.slice(0, 3)}${pick(noise)}${body.slice(3)}${r() < 0.03 ? 'x' : ''}`;
      expect(normalizeTzPhone(input), JSON.stringify(input)).toEqual(legacyNormalizeTzPhone(input));
    }
    // About 3.5 s alone, but CI runs every package's tests at once on 2 CPUs, where it has taken
    // 5.7 s and failed vitest's 5 s default.
  }, 30_000);

  it('keeps rejecting Kenyan numbers when Kenya is not enabled', () => {
    expect(normalizeTzPhone('+254712345678')).toEqual({ ok: false, error: 'not_tanzanian' });
  });
});

describe('Kenya numbers', () => {
  const both = allowedCountries(true);
  it.each([
    ['0712345678', '+254712345678'],
    ['0712 345 678', '+254712345678'],
    ['712345678', '+254712345678'],
    ['254712345678', '+254712345678'],
    ['+254 712-345-678', '+254712345678'],
    ['00254712345678', '+254712345678'],
    ['0112345678', '+254112345678'],
    ['0105123456', '+254105123456'],
  ])('%s → %s for a Kenyan event', (input, e164) => {
    expect(normalizePhone(input, 'KE', both)).toEqual({ ok: true, e164 });
  });

  it('reads local formats with the event country', () => {
    expect(normalizePhone('0712345678', 'TZ', both)).toEqual({ ok: true, e164: '+255712345678' });
    expect(normalizePhone('0712345678', 'KE', both)).toEqual({ ok: true, e164: '+254712345678' });
  });

  it('accepts diaspora numbers in international form', () => {
    expect(normalizePhone('+255712345678', 'KE', both)).toEqual({
      ok: true,
      e164: '+255712345678',
    });
    expect(normalizePhone('+254712345678', 'TZ', both)).toEqual({
      ok: true,
      e164: '+254712345678',
    });
  });

  it.each([
    ['', 'empty'],
    ['abc', 'invalid_chars'],
    ['07123', 'wrong_length'],
    ['+256712345678', 'unsupported_country'],
    ['0222123456', 'not_mobile'],
    ['0612345678', 'not_mobile'], // 6xx is Tanzanian, not a Kenyan mobile range
  ])('%s fails with %s for a Kenyan event', (input, error) => {
    expect(normalizePhone(input, 'KE', both)).toEqual({ ok: false, error });
  });

  it('rejects a country that is not allowed', () => {
    expect(normalizePhone('+254712345678', 'TZ', ['TZ'])).toEqual({
      ok: false,
      error: 'not_tanzanian',
    });
    expect(normalizePhone('+254712345678', 'KE', ['KE', 'TZ']).ok).toBe(true);
  });

  it('formats nationally at home and internationally abroad', () => {
    expect(formatPhone('+254712345678', 'KE')).toBe('0712 345 678');
    expect(formatPhone('+254712345678', 'TZ')).toBe('+254 712 345 678');
    expect(formatPhone('+255712345678')).toBe('0712 345 678');
    expect(formatPhone('+256712345678')).toBe('+256712345678');
    expect(maskPhone('+254712345678')).toBe('+254•••••678');
  });

  it('knows each country', () => {
    expect(countryOfE164('+254712345678')).toBe('KE');
    expect(countryOfE164('+255712345678')).toBe('TZ');
    expect(countryOfE164('+256712345678')).toBeNull();
    expect(currencyOf('KE')).toBe('KES');
    expect(paymentMethodsFor('KE')).toEqual(['mpesa', 'airtel']);
    expect(paymentMethodsFor('TZ')).toContain('halopesa');
    expect(allowedCountries(false)).toEqual(['TZ']);
  });
});

describe('formatMoney', () => {
  it('matches the previous TZS strings exactly', () => {
    expect(formatMoney(1200000)).toBe('TZS 1,200,000');
    expect(formatMoney(1200000, 'TZS')).toBe('TZS 1,200,000');
    expect(formatMoneyCompact(8_400_000)).toBe('TZS 8.4M');
    expect(formatMoneyCompact(12_000_000)).toBe('TZS 12M');
    expect(formatMoneyCompact(450_000)).toBe('TZS 450K');
    expect(formatMoneyCompact(5_000)).toBe('TZS 5,000');
  });
  it('formats shillings', () => {
    expect(formatMoney(25000, 'KES')).toBe('KES 25,000');
    expect(formatMoneyCompact(2_500_000, 'KES')).toBe('KES 2.5M');
  });
});
