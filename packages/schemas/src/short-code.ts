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

const LABELS =
  '(?:kadi|adi|card|ard|code|ode|namba|amba|mba|number|umber|no|msimbo|simbo|ticket|tiketi|keti|pass)';
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
 * When a small feature-phone screen scrolls past the `Namba:` / `Code:` label and only shows the
 * hyphenated code line (`K5-4B23` or `KH—4823`), the explicit dash separates the 2-letter prefix
 * from the 4-digit suffix. Requires at least one letter in the prefix and two digits in the suffix
 * so status-bar text (`4G 85%`) or dates (`12-2026`) are never repaired into a code.
 */
const OCR_HYPHENATED_RE = /(?<![A-Z0-9/])([A-Z0-9]{2})\s*[-–—~]\s*([A-Z0-9]{4})(?![A-Z0-9])/gi;

function repairLetters(raw: string): string {
  return [...raw.toUpperCase()].map((ch) => AS_LETTER[ch] ?? ch).join('');
}

function repairDigits(raw: string): string {
  return [...raw.toUpperCase()].map((ch) => AS_DIGIT[ch] ?? ch).join('');
}

export interface PartialSmsGuest {
  shortCode: string;
  displayName?: string | null;
  guestShort?: string | null;
  token?: string | null;
  phoneLast4?: string | null;
}

/**
 * Extracts a short code from text read off a photo of the guest's SMS (camera text recognition).
 * Takes the plain rules of `extractShortCode` first; then repairs look-alike characters (`K5-4B23`
 * → `KS-4823`) after a label or across an explicit hyphen. When `roster` is provided, also matches
 * partial SMS screens from feature or disposable phones that cannot display the whole message.
 */
export function extractShortCodeFromOcr(
  text: string,
  roster?: readonly PartialSmsGuest[],
): string | null {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (!flat) return null;
  const plain = extractShortCode(flat);
  if (plain) return plain;
  const scrubbed = flat.replace(URL_RE, ' ');
  for (const m of scrubbed.matchAll(OCR_LABELLED_RE)) {
    const letters = repairLetters(m[1] ?? '');
    const digits = repairDigits(m[2] ?? '');
    const code = normalizeShortCode(`${letters}${digits}`);
    if (code) return code;
  }
  for (const m of scrubbed.matchAll(OCR_HYPHENATED_RE)) {
    const p1 = m[1] ?? '';
    const p2 = m[2] ?? '';
    if (!/[A-Z]/i.test(p1) || (p2.match(/\d/g)?.length ?? 0) < 2) continue;
    const code = normalizeShortCode(`${repairLetters(p1)}${repairDigits(p2)}`);
    if (code) return code;
  }
  if (roster && roster.length > 0) {
    return extractShortCodeFromPartialSms(flat, roster);
  }
  return null;
}

const SHORT_LINK_PATH_RE = /\/([sc])\/([A-Za-z0-9._~-]{2,})/g;
const OCR_LABELLED_PARTIAL_RE = new RegExp(
  String.raw`\b${LABELS}\s*[:;#.\-]?\s*([A-Z0-9]{2})\s*[-–—_.~\s]?\s*([A-Z0-9]{1,3})(?![A-Z0-9])`,
  'gi',
);
const OCR_HYPHEN_PARTIAL_RE = /(?<![A-Z0-9/])([A-Z0-9]{2})\s*[-–—]\s*([A-Z0-9]{2,3})(?![A-Z0-9])/gi;
const OCR_LEFT_CLIPPED_RE = new RegExp(
  String.raw`(?:\b${LABELS}\s*[:;#.\-]?\s*[A-Z0-9]{0,2}[-–—\s]?|(?<![A-Z0-9/])[A-Z0-9]{0,2}[-–—])([A-Z0-9]{4})(?![A-Z0-9])`,
  'gi',
);
const OCR_UNLABELLED_6_RE = /\b([A-Z0-9]{2})[-\s_.]?([A-Z0-9]{4})\b/gi;
const GREETING_RE =
  /\b(?:habari|hello|dear|hi|hujambo|mambo|salaam|karibu|kwa|for|ndugu|mgeni)\s+([a-z0-9]+)/i;

function normWords(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function editDistanceAtMostOne(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
    } else {
      edits++;
      if (edits > 1) return false;
      if (a.length > b.length) i++;
      else if (b.length > a.length) j++;
      else {
        i++;
        j++;
      }
    }
  }
  return true;
}

/**
 * Stitches multiple partial OCR snapshots captured as a guest scrolls an SMS on a small feature or
 * disposable phone screen, removing duplicate overlapping lines.
 */
export function combineSmsFragments(fragments: readonly string[]): string {
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const frag of fragments) {
    for (const rawLine of frag.split(/\r?\n/)) {
      const line = rawLine.replace(/\s+/g, ' ').trim();
      if (!line) continue;
      const key = line.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        kept.push(line);
      }
    }
  }
  return kept.join(' ');
}

/**
 * Resolves a guest's short code from a partial SMS view on a feature or disposable phone that cannot
 * display the whole message at once:
 * 1. Full or OCR-repaired short code (`KH-4823`, `K5-4B23`).
 * 2. Visible `/s/<token>` or `/c/<token>` short link in the middle of the message.
 * 3. Truncated / screen-clipped code prefix or suffix (`Namba: KH-482`, `KH-48`, `-4823`) uniquely
 *    matching a guest in the event's roster.
 * 4. Guest display name visible in the opening lines (`Habari Asha Mwinyi, unaalikwa...`) uniquely
 *    matching a guest in the event's roster.
 */
export function extractShortCodeFromPartialSms(
  text: string,
  roster: readonly PartialSmsGuest[] = [],
): string | null {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (!flat) return null;

  const directOcr = extractShortCodeFromOcr(flat);

  const rosterEntries = roster
    .map((g) => {
      const trimmed = g.shortCode.trim().toUpperCase();
      const code =
        normalizeShortCode(trimmed) ?? (/^[A-Z]{2}-\d{4}$/.test(trimmed) ? trimmed : null);
      return code ? { code, rawCode: code.replace('-', ''), guest: g } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  const rosterByCode = new Map(rosterEntries.map((r) => [r.code, r.guest]));

  if (directOcr && (rosterEntries.length === 0 || rosterByCode.has(directOcr))) {
    return directOcr;
  }

  // 1. Check visible `/s/...` or `/c/...` links (when only the middle of the SMS is on screen)
  for (const m of flat.matchAll(SHORT_LINK_PATH_RE)) {
    const seg = (m[2] ?? '').replace(/[.,;:!?)]+$/, '');
    if (!seg) continue;

    // `/s/KH-4823` or OCR-corrupted `/s/K5-4B23`
    const segCleaned = seg.replace(/[-–—_.]/g, '');
    if (segCleaned.length === 6) {
      const repaired = normalizeShortCode(
        `${repairLetters(segCleaned.slice(0, 2))}${repairDigits(segCleaned.slice(2))}`,
      );
      if (repaired && (rosterEntries.length === 0 || rosterByCode.has(repaired))) {
        return repaired;
      }
    }

    if (rosterEntries.length > 0) {
      // `/c/v1.<ev8>.<gu8>...`
      if (seg.startsWith('v1.')) {
        const parts = seg.split('.');
        const gu8 = parts[2]?.toLowerCase();
        if (gu8 && gu8.length >= 4) {
          const hits = rosterEntries.filter(
            (r) => r.guest.guestShort && r.guest.guestShort.toLowerCase().startsWith(gu8),
          );
          if (hits.length === 1) return hits[0]!.code;
        }
      }

      // `/s/<cardToken>` (full or right-clipped at the edge of the feature phone screen)
      if (seg.length >= 4) {
        const tokenHits = rosterEntries.filter((r) => {
          const tok = r.guest.token;
          if (!tok) return false;
          const tokTail = tok.includes('/s/') ? (tok.split('/s/').pop() ?? tok) : tok;
          return tokTail === seg || (seg.length >= 4 && tokTail.startsWith(seg));
        });
        if (tokenHits.length === 1) return tokenHits[0]!.code;
      }
    }
  }

  if (rosterEntries.length === 0) return null;

  const scrubbed = flat.replace(URL_RE, ' ');

  // 2. Unlabelled or labelled 6-char OCR candidate that exists in this event's roster (e.g. `K5 4B23` or demo `KH-4B21`)
  for (const m of scrubbed.matchAll(OCR_UNLABELLED_6_RE)) {
    const p1 = m[1] ?? '';
    const p2 = m[2] ?? '';
    if (!/[A-Z]/i.test(p1)) continue;
    const letters = repairLetters(p1);
    const digits = repairDigits(p2);
    const formatted = `${letters}-${digits}`;
    if (rosterByCode.has(formatted)) {
      return formatted;
    }
    const candidate = normalizeShortCode(`${letters}${digits}`);
    if (candidate && rosterByCode.has(candidate)) {
      return candidate;
    }
  }

  // 3. Right-truncated code at the 160-char SMS limit or screen edge (`Namba: KH-482` or `KH-48`)
  const tryPrefix = (rawLetters: string, rawDigits: string): string | null => {
    const letters = repairLetters(rawLetters);
    const digits = repairDigits(rawDigits);
    if (!/^[A-Z]{2}$/.test(letters) || !/^\d{1,3}$/.test(digits)) return null;
    const prefix = `${letters}${digits}`;
    const hits = rosterEntries.filter((r) => r.rawCode.startsWith(prefix));
    return hits.length === 1 ? hits[0]!.code : null;
  };

  for (const m of scrubbed.matchAll(OCR_LABELLED_PARTIAL_RE)) {
    const hit = tryPrefix(m[1] ?? '', m[2] ?? '');
    if (hit) return hit;
  }

  for (const m of scrubbed.matchAll(OCR_HYPHEN_PARTIAL_RE)) {
    const p1 = m[1] ?? '';
    const p2 = m[2] ?? '';
    if (!/[A-Z]/i.test(p1) || !/\d/.test(p2)) continue;
    const hit = tryPrefix(p1, p2);
    if (hit) return hit;
  }

  // 4. Left-clipped code (`...mba: -4823` or `H-4823`) where the 4 digits uniquely identify the guest
  for (const m of scrubbed.matchAll(OCR_LEFT_CLIPPED_RE)) {
    const raw4 = m[1] ?? '';
    if ((raw4.match(/\d/g)?.length ?? 0) < 3) continue;
    const digits = repairDigits(raw4);
    if (!/^\d{4}$/.test(digits)) continue;
    const hits = rosterEntries.filter((r) => r.rawCode.endsWith(digits));
    if (hits.length === 1) return hits[0]!.code;
  }

  // 5. Guest name visible at the top of the SMS (`Habari Asha Mwinyi, unaalikwa...`)
  const normText = normWords(scrubbed);
  if (normText.length >= 4) {
    const textWords = normText.split(' ').filter(Boolean);
    const paddedText = ` ${normText} `;

    const exactMultiWordMatches: { code: string; len: number }[] = [];
    const fuzzyMultiWordMatches: { code: string; len: number }[] = [];

    for (const r of rosterEntries) {
      const name = normWords(r.guest.displayName ?? '');
      if (name.length < 5) continue;
      const nameWords = name.split(' ').filter((w) => w.length >= 2);
      if (nameWords.length < 2) continue;
      const phrase = nameWords.join(' ');
      if (paddedText.includes(` ${phrase} `)) {
        exactMultiWordMatches.push({ code: r.code, len: phrase.length });
        continue;
      }
      if (phrase.length >= 8 && textWords.length >= nameWords.length) {
        for (let i = 0; i <= textWords.length - nameWords.length; i++) {
          const windowPhrase = textWords.slice(i, i + nameWords.length).join(' ');
          if (editDistanceAtMostOne(windowPhrase, phrase)) {
            fuzzyMultiWordMatches.push({ code: r.code, len: phrase.length });
            break;
          }
        }
      }
    }

    if (exactMultiWordMatches.length === 1) {
      return exactMultiWordMatches[0]!.code;
    }
    if (exactMultiWordMatches.length > 1) {
      exactMultiWordMatches.sort((a, b) => b.len - a.len);
      if (exactMultiWordMatches[0]!.len > exactMultiWordMatches[1]!.len) {
        return exactMultiWordMatches[0]!.code;
      }
    }
    if (fuzzyMultiWordMatches.length === 1) {
      return fuzzyMultiWordMatches[0]!.code;
    }

    // Single first-name after an explicit greeting (`Habari Asha, ...`) if unique in the event roster
    const greet = GREETING_RE.exec(normText);
    if (greet?.[1] && greet[1].length >= 4) {
      const first = greet[1].toLowerCase();
      const firstHits = rosterEntries.filter((r) => {
        const w = normWords(r.guest.displayName ?? '').split(' ')[0];
        return w === first;
      });
      if (firstHits.length === 1) return firstHits[0]!.code;
    }
  }

  return directOcr;
}
