/**
 * Address-book exports turned into import rows (ADR 051). Everything here runs on the organizer's own
 * device: a contacts file or a provider response is read in memory, reduced to a name and one phone
 * number per person, and only the people the organizer then picks are sent to our API.
 */

/** One person from an address book, reduced to what a guest needs. */
export interface ContactLite {
  name: string;
  /** The best number for an invitation: a mobile one when the contact has several. */
  phone: string;
}

/** Contacts larger than this are refused before parsing (a family address book is well under 1 MB). */
export const CONTACTS_FILE_MAX_BYTES = 5_000_000;
/** More people than any guest list; keeps a pathological file from freezing a low-end phone. */
export const CONTACTS_MAX = 5_000;

type Labelled = { value: string; label?: string };

/** Prefers a number labelled mobile/cell, then the first one. */
export function pickPhone(phones: Labelled[]): string {
  const usable = phones.map((p) => ({ ...p, value: p.value.trim() })).filter((p) => p.value);
  const mobile = usable.find((p) => /mobile|cell|simu|iphone|main/i.test(p.label ?? ''));
  return (mobile ?? usable[0])?.value ?? '';
}

/** Drops empties, trims, and keeps the first entry per number (address books repeat people). */
export function cleanContacts(list: ContactLite[]): ContactLite[] {
  const seen = new Set<string>();
  const out: ContactLite[] = [];
  for (const c of list) {
    const name = c.name.replace(/\s+/g, ' ').trim();
    const phone = c.phone.trim();
    if (!name) continue;
    const key = phone ? phone.replace(/[^\d+]/g, '') : `name:${name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, phone });
    if (out.length >= CONTACTS_MAX) break;
  }
  return out;
}

/** Undoes vCard escaping (`\,` `\;` `\n` `\\`). */
function unescapeVCard(v: string): string {
  return v.replace(/\\([,;\\nN])/g, (_, ch: string) => (ch === 'n' || ch === 'N' ? ' ' : ch));
}

/** Splits on `;` that is not escaped as `\;` (no regex lookbehind, for older JS engines). */
function splitUnescaped(v: string): string[] {
  const out: string[] = [];
  let cur = '';
  for (let i = 0; i < v.length; i++) {
    if (v[i] === '\\' && i + 1 < v.length) {
      cur += v[i]! + v[i + 1]!;
      i++;
    } else if (v[i] === ';') {
      out.push(cur);
      cur = '';
    } else cur += v[i];
  }
  out.push(cur);
  return out;
}

/** Decodes a QUOTED-PRINTABLE value (vCard 2.1, still written by older Android phones). */
function decodeQuotedPrintable(v: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < v.length; i++) {
    if (v[i] === '=' && /^[0-9A-F]{2}$/i.test(v.slice(i + 1, i + 3))) {
      bytes.push(parseInt(v.slice(i + 1, i + 3), 16));
      i += 2;
    } else bytes.push(v.charCodeAt(i) & 0xff);
  }
  try {
    return new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes));
  } catch {
    return String.fromCharCode(...bytes);
  }
}

/**
 * Reads a `.vcf` file (vCard 2.1, 3.0 or 4.0), as exported by iPhone/iCloud ("Export vCard"), Google
 * Contacts and Android's Contacts app. Only FN/N and TEL are read; photos, addresses, notes and every
 * other property are skipped without being kept.
 */
export function parseVCard(text: string): ContactLite[] {
  // Unfold: a line starting with a space or tab continues the previous one (RFC 6350 §3.2);
  // a QUOTED-PRINTABLE soft break is a trailing "=".
  const lines = text
    .replace(/^\uFEFF/, '')
    .replace(/=\r?\n/g, '')
    .split(/\r?\n/)
    .reduce<string[]>((acc, line) => {
      if (/^[ \t]/.test(line) && acc.length) acc[acc.length - 1] += line.slice(1);
      else acc.push(line);
      return acc;
    }, []);

  const out: ContactLite[] = [];
  let fn = '';
  let n = '';
  let phones: Labelled[] = [];
  let inCard = false;
  for (const line of lines) {
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const head = line.slice(0, colon);
    const raw = line.slice(colon + 1);
    // "item1.TEL;type=CELL" → name TEL, params "type=CELL"
    const [nameWithGroup = '', ...params] = head.split(';');
    const prop = nameWithGroup.replace(/^[^.]*\./, '').toUpperCase();
    const paramText = params.join(';');
    const value = /ENCODING=QUOTED-PRINTABLE/i.test(paramText) ? decodeQuotedPrintable(raw) : raw;
    if (prop === 'BEGIN' && /^VCARD$/i.test(value.trim())) {
      inCard = true;
      fn = '';
      n = '';
      phones = [];
    } else if (prop === 'END' && /^VCARD$/i.test(value.trim())) {
      if (inCard) out.push({ name: fn || n, phone: pickPhone(phones) });
      inCard = false;
    } else if (!inCard) continue;
    else if (prop === 'FN') fn = unescapeVCard(value).trim();
    else if (prop === 'N') {
      // N:Family;Given;Additional;Prefix;Suffix
      const [family = '', given = '', additional = ''] = splitUnescaped(value).map(unescapeVCard);
      n = [given, additional, family]
        .map((s) => s.trim())
        .filter(Boolean)
        .join(' ');
    } else if (prop === 'TEL') {
      const tel = unescapeVCard(value).replace(/^tel:/i, '').trim();
      phones.push({ value: tel, label: paramText });
    }
  }
  return cleanContacts(out);
}

/** True for a CSV exported by Google Contacts ("Phone 1 - Value" columns). */
export function isGoogleContactsCsv(header: string[]): boolean {
  return header.some((h) => /^phone 1 - value$/i.test(h.trim()));
}

/**
 * Google Contacts CSV → contacts. Google writes either one "Name" column (older exports) or First /
 * Middle / Last, and up to N "Phone N - Label" / "Phone N - Value" pairs, joining several numbers of one
 * label with " ::: ".
 */
export function fromGoogleContactsCsv(rows: string[][]): ContactLite[] {
  const [header, ...body] = rows;
  if (!header) return [];
  const idx = (re: RegExp) => header.findIndex((h) => re.test(h.trim()));
  const name = idx(/^name$/i);
  const parts = [/^first name$/i, /^middle name$/i, /^last name$/i].map(idx);
  const phoneCols: { value: number; label: number }[] = [];
  header.forEach((h, i) => {
    const m = /^phone (\d+) - value$/i.exec(h.trim());
    if (m)
      phoneCols.push({ value: i, label: idx(new RegExp(`^phone ${m[1]} - (label|type)$`, 'i')) });
  });
  return cleanContacts(
    body.map((r) => {
      const full =
        (name >= 0 ? r[name]?.trim() : '') ||
        parts
          .map((i) => (i >= 0 ? (r[i] ?? '').trim() : ''))
          .filter(Boolean)
          .join(' ');
      const phones = phoneCols.flatMap(({ value, label }) =>
        (r[value] ?? '')
          .split(':::')
          .map((v) => ({ value: v, label: label >= 0 ? r[label] : undefined })),
      );
      return { name: full, phone: pickPhone(phones) };
    }),
  );
}

/** Contacts as rows for `buildPreview` with a positional name, phone mapping. */
export function contactsToRows(list: ContactLite[]): string[][] {
  return list.map((c) => [c.name, c.phone]);
}
