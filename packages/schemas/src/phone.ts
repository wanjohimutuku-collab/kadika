/**
 * Tanzanian phone numbers. Mobile numbers are +255 followed by 9 digits starting with 6 or 7
 * (e.g. 0712 345 678 → +255712345678). Accepts local (07…), national (7…), and international
 * (255…, +255…, 00255…) forms with spaces, dashes, dots or brackets.
 */
export type PhoneError =
  'empty' | 'invalid_chars' | 'wrong_length' | 'not_tanzanian' | 'not_mobile';

export type PhoneResult = { ok: true; e164: string } | { ok: false; error: PhoneError };

export function normalizeTzPhone(input: string): PhoneResult {
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
  const national = digits.slice(3);
  if (national.length !== 9) return { ok: false, error: 'wrong_length' };
  if (!/^[67]/.test(national)) return { ok: false, error: 'not_mobile' };
  return { ok: true, e164: `+255${national}` };
}

/** `+255712345678` → `0712 345 678`. Falls back to the input for non-TZ numbers. */
export function formatTzPhone(e164: string): string {
  const m = /^\+255(\d{3})(\d{3})(\d{3})$/.exec(e164);
  return m ? `0${m[1]} ${m[2]} ${m[3]}` : e164;
}

/** Masks all but the last 3 digits — for logs and limited-role views (§12). */
export function maskPhone(e164: string): string {
  return e164.length <= 4 ? '***' : `${e164.slice(0, 4)}•••••${e164.slice(-3)}`;
}

export function lastFourDigits(e164: string | null | undefined): string {
  return e164 ? e164.slice(-4) : '';
}
