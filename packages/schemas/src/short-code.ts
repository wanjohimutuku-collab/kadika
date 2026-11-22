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

const LABELS = '(?:kadi|card|code|namba|msimbo|ticket|tiketi)';
const LABELLED_CODE_RE = new RegExp(
  String.raw`${LABELS}\s*[:#-]?\s*([${SHORT_CODE_LETTERS}]{2}[-\s]?[${SHORT_CODE_DIGITS}]{4})`,
  'i',
);
const EMBEDDED_CODE_RE = new RegExp(
  String.raw`\b([${SHORT_CODE_LETTERS}]{2})[-\s]?([${SHORT_CODE_DIGITS}]{4})\b`,
  'i',
);
/** Links (the card token in `/s/<token>` can contain code-like runs), removed before searching. */
const URL_RE = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9.-]+\.[a-z]{2,}\/\S+/gi;

/**
 * Extracts a human short code (`KH-4821`) from either a bare code or a full SMS invitation/reminder
 * message (e.g. `... Namba: KH-4821`, `... Code: KH-4821` or `(Kadi: KH-4821)`). Links are ignored,
 * so a code-like run inside the card token is never taken for the code.
 */
export function extractShortCode(input: string): string | null {
  const direct = normalizeShortCode(input);
  if (direct) return direct;
  const text = input.replace(URL_RE, ' ');
  const labelled = LABELLED_CODE_RE.exec(text);
  if (labelled?.[1]) {
    const code = normalizeShortCode(labelled[1]);
    if (code) return code;
  }
  const embedded = EMBEDDED_CODE_RE.exec(text);
  if (embedded?.[1] && embedded?.[2]) {
    return normalizeShortCode(`${embedded[1]}${embedded[2]}`);
  }
  return null;
}

/** Characters text recognition confuses, mapped onto the letter or digit the position needs. */
const AS_LETTER: Record<string, string> = {
  '5': 'S',
  '8': 'B',
  '2': 'Z',
  '6': 'G',
  '4': 'A',
  '7': 'T',
};
const AS_DIGIT: Record<string, string> = { S: '5', B: '8', Z: '2', G: '6', A: '4', T: '7', Q: '9' };
const OCR_LABELLED_RE = new RegExp(
  String.raw`${LABELS}\s*[:;#.\-]?\s*([A-Z0-9]{2})\s*[-–—_.~]?\s*([A-Z0-9]{4})(?![A-Z0-9])`,
  'gi',
);

/**
 * Extracts a short code from text read off a photo of the guest's SMS (camera text recognition).
 * Takes the plain rules of `extractShortCode` first; then, only right after a label such as
 * `Namba:` or `Code:`, repairs look-alike characters (`K5-4B23` → `KS-4823`). Unlabelled noise is
 * never repaired, so a status bar (`4G 85%`) cannot become a code.
 */
export function extractShortCodeFromOcr(text: string): string | null {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (!flat) return null;
  const plain = extractShortCode(flat);
  if (plain) return plain;
  const scrubbed = flat.replace(URL_RE, ' ');
  for (const m of scrubbed.matchAll(OCR_LABELLED_RE)) {
    const letters = [...(m[1] ?? '').toUpperCase()].map((ch) => AS_LETTER[ch] ?? ch).join('');
    const digits = [...(m[2] ?? '').toUpperCase()].map((ch) => AS_DIGIT[ch] ?? ch).join('');
    const code = normalizeShortCode(`${letters}${digits}`);
    if (code) return code;
  }
  return null;
}
