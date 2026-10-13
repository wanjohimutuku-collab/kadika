/**
 * Human short codes (§6.1): 2 letters + 4 digits, e.g. `KH-4821`.
 * Excludes the ambiguous characters 0 O 1 I L.
 */
export const SHORT_CODE_LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ';
export const SHORT_CODE_DIGITS = '23456789';
export const SHORT_CODE_PATTERN = new RegExp(
  `^[${SHORT_CODE_LETTERS}]{2}-[${SHORT_CODE_DIGITS}]{4}$`,
);

/** Returns a code using the supplied random source (0 ≤ r < 1), so callers control entropy. */
export function generateShortCode(random: () => number): string {
  const pick = (set: string) => set[Math.floor(random() * set.length)] ?? set[0];
  return `${pick(SHORT_CODE_LETTERS)}${pick(SHORT_CODE_LETTERS)}-${pick(SHORT_CODE_DIGITS)}${pick(SHORT_CODE_DIGITS)}${pick(SHORT_CODE_DIGITS)}${pick(SHORT_CODE_DIGITS)}`;
}

/** Normalises what a person typed (`kh 4821`, `KH4821`, `kh-4821`) to `KH-4821`, or null. */
export function normalizeShortCode(input: string): string | null {
  const s = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (s.length !== 6) return null;
  const code = `${s.slice(0, 2)}-${s.slice(2)}`;
  return SHORT_CODE_PATTERN.test(code) ? code : null;
}
