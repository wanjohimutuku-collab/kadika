/**
 * Phone numbers for the countries in `COUNTRY_INFO` (ADR 025). A Tanzanian mobile number is +255
 * followed by 9 digits starting with 6 or 7 (0712 345 678 → +255712345678); a Kenyan one is +254
 * followed by 9 digits starting with 1 or 7. Accepts local (07…), national (7…), and international
 * (255…, +255…, 00255…) forms with spaces, dashes, dots or brackets.
 */
import { COUNTRY_INFO, countryOfE164, type Country } from './country';

export type PhoneError =
  | 'empty'
  | 'invalid_chars'
  | 'wrong_length'
  | 'not_tanzanian'
  | 'unsupported_country'
  | 'not_mobile';

export type PhoneResult = { ok: true; e164: string } | { ok: false; error: PhoneError };

/**
 * Normalises to E.164. `defaultCountry` interprets local formats; `allowed` lists the countries whose
 * international numbers are accepted (defaults to just `defaultCountry`).
 */
export function normalizePhone(
  input: string,
  defaultCountry: Country = 'TZ',
  allowed: readonly Country[] = [defaultCountry],
): PhoneResult {
  const raw = input.trim();
  if (!raw) return { ok: false, error: 'empty' };
  if (!/^[+\d\s\-().]+$/.test(raw)) return { ok: false, error: 'invalid_chars' };
  const home = COUNTRY_INFO[defaultCountry];
  let digits = raw.replace(/[^\d]/g, '');
  const hadPlus = raw.startsWith('+');
  if (digits.startsWith('00')) digits = digits.slice(2);
  else if (!hadPlus && digits.startsWith('0')) digits = `${home.dial}${digits.slice(1)}`;
  else if (!hadPlus && digits.length === 9) digits = `${home.dial}${digits}`;
  const country = allowed.find((c) => digits.startsWith(COUNTRY_INFO[c].dial));
  if (!country) {
    const onlyTz = allowed.length === 1 && allowed[0] === 'TZ';
    if (hadPlus || digits.length > 10)
      return { ok: false, error: onlyTz ? 'not_tanzanian' : 'unsupported_country' };
    return { ok: false, error: 'wrong_length' };
  }
  const info = COUNTRY_INFO[country];
  const national = digits.slice(info.dial.length);
  if (national.length !== info.nationalLength) return { ok: false, error: 'wrong_length' };
  if (!info.mobileStart.test(national)) return { ok: false, error: 'not_mobile' };
  return { ok: true, e164: `+${info.dial}${national}` };
}

/** Tanzania-only normaliser kept for callers without an event; identical to the original behaviour. */
export function normalizeTzPhone(input: string): PhoneResult {
  return normalizePhone(input, 'TZ', ['TZ']);
}

/**
 * National form (`0712 345 678`) for a number in `home`, international (`+254 712 345 678`) for another
 * supported country, and the input unchanged for anything else.
 */
export function formatPhone(e164: string, home: Country = 'TZ'): string {
  const c = countryOfE164(e164);
  if (!c) return e164;
  const info = COUNTRY_INFO[c];
  const m = new RegExp(`^\\+${info.dial}(\\d{3})(\\d{3})(\\d{3})$`).exec(e164);
  if (!m) return e164;
  return c === home ? `0${m[1]} ${m[2]} ${m[3]}` : `+${info.dial} ${m[1]} ${m[2]} ${m[3]}`;
}

/** `+255712345678` → `0712 345 678`. Falls back to the input for non-TZ numbers. */
export function formatTzPhone(e164: string): string {
  return /^\+255\d{9}$/.test(e164) ? formatPhone(e164, 'TZ') : e164;
}

/** Masks all but the last 3 digits — for logs and limited-role views (§12). */
export function maskPhone(e164: string): string {
  return e164.length <= 4 ? '***' : `${e164.slice(0, 4)}•••••${e164.slice(-3)}`;
}
