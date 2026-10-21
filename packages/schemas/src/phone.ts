/**
 * Phone numbers for the countries in `COUNTRY_INFO` (ADR 025). A Tanzanian mobile number is +255
 * followed by 9 digits starting with 6 or 7 (0712 345 678 → +255712345678); a Kenyan one is +254
 * followed by 9 digits starting with 1 or 7.
 *
 * People type and paste numbers in every shape, so the reader is forgiving: local (07…), national
 * (7…), international (255…, +255…, 00255…), the local 0 left in after the country code
 * (+255 0712…, +255 (0) 712…), any spacing, dashes, dots, brackets or slashes, digits in other scripts
 * (Arabic-Indic, full-width), invisible marks that contacts apps add, a letter O typed for zero, and text
 * around the number ("Simu: 0712 345 678", a wa.me or tel: link). Whatever goes in, the system stores
 * one thing: E.164 (§5).
 */
import { COUNTRY_INFO, countryOfE164, type Country } from './country';

export type PhoneError =
  | 'empty'
  | 'invalid_chars'
  | 'wrong_length'
  | 'not_tanzanian'
  | 'unsupported_country'
  | 'not_mobile'
  /** The text holds more than one number; a field takes exactly one. */
  | 'multiple_numbers';

export type PhoneResult = { ok: true; e164: string } | { ok: false; error: PhoneError };

/** Zero-width and direction marks, soft hyphen and BOM: pasted from contacts and chat apps, never typed. */
const isInvisible = (c: number) =>
  (c >= 0x200b && c <= 0x200f) ||
  (c >= 0x202a && c <= 0x202e) ||
  (c >= 0x2060 && c <= 0x2069) ||
  c === 0xfeff ||
  c === 0xad;

const isDash = (c: number) => (c >= 0x2010 && c <= 0x2015) || c === 0x2212 || c === 0xff0d;

/**
 * One plain-ASCII line out of whatever was typed: other-script digits become 0-9, all dashes become `-`,
 * all spaces become one space, invisible marks go. `%2B` and `%20` (a link copied from a browser) decode.
 */
function toPlain(input: string): string {
  let text = input.normalize('NFKC');
  if (text.includes('%')) {
    try {
      text = decodeURIComponent(text);
    } catch {
      /* not an encoded link: use it as typed */
    }
  }
  // Line breaks, commas, semicolons and slashes separate numbers (a list pasted into one field).
  text = text.replace(/[\r\n\t;,/|]+/g, ' | ');
  let out = '';
  for (const ch of text) {
    const c = ch.codePointAt(0)!;
    if (isInvisible(c)) continue;
    if (c >= 0x660 && c <= 0x669)
      out += String(c - 0x660); // Arabic-Indic digits
    else if (c >= 0x6f0 && c <= 0x6f9)
      out += String(c - 0x6f0); // Persian digits
    else if (isDash(c)) out += '-';
    else if (/\s/.test(ch)) out += ' ';
    else out += ch;
  }
  return out.trim();
}

type Picked = { ok: true; text: string } | { ok: false; error: PhoneError };

/** The one number inside `plain`, or why there is not exactly one. */
function pickNumber(plain: string): Picked {
  if (!plain) return { ok: false, error: 'empty' };
  // Only phone characters: use it all. A letter O among digits is a zero typed by hand.
  if (/^[+\d\s\-().]+$/.test(plain)) return { ok: true, text: plain };
  if (/^[+\dOo\s\-().]+$/.test(plain) && (plain.match(/[\dOo]/g)?.length ?? 0) >= 7)
    return { ok: true, text: plain.replace(/[Oo]/g, '0') };
  // Words, slashes, commas or a link around the number: find the number-shaped runs.
  const runs = [...plain.matchAll(/\+?\d[\d\s\-().]{4,}\d/g)]
    .map((m) => m[0].trim())
    .filter((r) => r.replace(/\D/g, '').length >= 7);
  const distinct = new Set(runs.map((r) => r.replace(/\D/g, '')));
  if (distinct.size === 0) return { ok: false, error: 'invalid_chars' };
  if (distinct.size > 1) return { ok: false, error: 'multiple_numbers' };
  return { ok: true, text: runs[0]! };
}

/**
 * Normalises to E.164. `defaultCountry` interprets local formats; `allowed` lists the countries whose
 * international numbers are accepted (defaults to just `defaultCountry`).
 */
export function normalizePhone(
  input: string,
  defaultCountry: Country = 'TZ',
  allowed: readonly Country[] = [defaultCountry],
): PhoneResult {
  const picked = pickNumber(toPlain(input));
  if (!picked.ok) return picked;
  const raw = picked.text;
  const home = COUNTRY_INFO[defaultCountry];
  let digits = raw.replace(/[^\d]/g, '');
  const hadPlus = /^\(?\s*\+/.test(raw);
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
  let national = digits.slice(info.dial.length);
  // "+255 0712 345 678": the local trunk 0 is often left in after the country code. It is not part of it.
  if (national.length === info.nationalLength + 1 && national.startsWith('0'))
    national = national.slice(1);
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

/** Always the international form with spaces: `+255 712 345 678`. For showing how a number was understood. */
export function formatPhoneInternational(e164: string): string {
  const c = countryOfE164(e164);
  if (!c) return e164;
  const dial = COUNTRY_INFO[c].dial;
  const m = new RegExp(`^\\+${dial}(\\d{3})(\\d{3})(\\d{3})$`).exec(e164);
  return m ? `+${dial} ${m[1]} ${m[2]} ${m[3]}` : e164;
}

/** `+255712345678` → `0712 345 678`. Falls back to the input for non-TZ numbers. */
export function formatTzPhone(e164: string): string {
  return /^\+255\d{9}$/.test(e164) ? formatPhone(e164, 'TZ') : e164;
}

/** Masks all but the last 3 digits — for logs and limited-role views (§12). */
export function maskPhone(e164: string): string {
  return e164.length <= 4 ? '***' : `${e164.slice(0, 4)}•••••${e164.slice(-3)}`;
}
