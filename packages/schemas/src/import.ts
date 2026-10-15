import type { Country } from './country';
import { normalizePhone, type PhoneError } from './phone';

/** How phone numbers are read: local formats in `country`, international forms of any `allowed`. */
export interface PhoneRules {
  country: Country;
  allowed: readonly Country[];
}
const TZ_ONLY: PhoneRules = { country: 'TZ', allowed: ['TZ'] };
import type { ChannelPref } from './domain';

/** Minimal RFC 4180 CSV parser (quotes, escaped quotes, CRLF, `,` or `;` delimiter auto-detected). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  const delim =
    (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/** Pasted lists: one guest per line, "Name, phone[, group]" or "Name<TAB>phone" or "Name 0712…". */
export function parsePastedList(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.includes('\t')) return line.split('\t').map((s) => s.trim());
      if (line.includes(',') || line.includes(';')) return line.split(/[;,]/).map((s) => s.trim());
      const m = /^(.*?)[\s:–-]*((?:\+|00)?[\d][\d\s().-]{7,})$/.exec(line);
      return m ? [m[1]!.trim(), m[2]!.trim()] : [line];
    });
}

export type ImportField = 'name' | 'phone' | 'group' | 'party' | 'smartphone' | 'ignore';

const HEADER_HINTS: Record<Exclude<ImportField, 'ignore'>, RegExp> = {
  name: /^(jina|majina|name|full ?name|mgeni|guest)/i,
  phone: /(simu|phone|namba|mobile|tel|msisdn)/i,
  group: /(kikundi|group|kundi|category|upande)/i,
  party: /(idadi|party|watu|size|seats)/i,
  smartphone: /(smartphone|simu janja)/i,
};

/** Guesses a column mapping from the header row; falls back to positional name, phone, group. */
export function guessMapping(
  header: string[],
  phone: PhoneRules = TZ_ONLY,
): { mapping: ImportField[]; hasHeader: boolean } {
  const mapping = header.map((h): ImportField => {
    for (const [field, re] of Object.entries(HEADER_HINTS))
      if (re.test(h.trim())) return field as ImportField;
    return 'ignore';
  });
  const hasHeader =
    mapping.some((m) => m !== 'ignore') &&
    !header.some((h) => normalizePhone(h, phone.country, phone.allowed).ok);
  if (hasHeader) return { mapping, hasHeader };
  const positional: ImportField[] = ['name', 'phone', 'group', 'party'];
  return { mapping: header.map((_, i) => positional[i] ?? 'ignore'), hasHeader: false };
}

export type RowIssue =
  | { kind: 'phone'; error: PhoneError }
  | { kind: 'name' }
  | { kind: 'duplicate'; of: 'file' | 'existing'; otherRow?: number };

export interface PreviewRow {
  index: number;
  displayName: string;
  phoneRaw: string;
  phoneE164: string | null;
  groupLabel: string;
  partySizeAllowed: number;
  hasSmartphone: boolean;
  inviteChannelPref: ChannelPref;
  issues: RowIssue[];
  /** Invalid rows are excluded unless fixed; duplicates are excluded unless the user keeps them. */
  include: boolean;
}

export interface PreviewSummary {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  withoutPhone: number;
}

export function buildPreview(
  rows: string[][],
  mapping: ImportField[],
  opts: {
    hasHeader: boolean;
    existingPhones?: Iterable<string>;
    existingNames?: Iterable<string>;
    defaultGroup?: string;
    /** Defaults to Tanzania only (ADR 025). */
    phone?: PhoneRules;
  },
): PreviewRow[] {
  const col = (r: string[], f: ImportField) => {
    const i = mapping.indexOf(f);
    return i >= 0 ? (r[i] ?? '').trim() : '';
  };
  const existingPhones = new Set(opts.existingPhones ?? []);
  const existingNames = new Set([...(opts.existingNames ?? [])].map((n) => n.toLowerCase()));
  const seenPhones = new Map<string, number>();
  const body = opts.hasHeader ? rows.slice(1) : rows;
  return body.map((r, idx) => {
    const displayName = col(r, 'name');
    const phoneRaw = col(r, 'phone');
    const party = parseInt(col(r, 'party'), 10);
    const smart = col(r, 'smartphone').toLowerCase();
    return validateRow(
      {
        index: idx,
        displayName,
        phoneRaw,
        groupLabel: col(r, 'group') || opts.defaultGroup || '',
        partySizeAllowed: Number.isFinite(party) && party > 0 ? Math.min(party, 10) : 1,
        hasSmartphone: !['no', 'hapana', 'false', '0', 'hana'].includes(smart),
      },
      existingPhones,
      existingNames,
      seenPhones,
      opts.phone,
    );
  });
}

/** Re-validates one row (used after an inline fix). `seenPhones` tracks duplicates within the file. */
export function validateRow(
  r: Pick<
    PreviewRow,
    'index' | 'displayName' | 'phoneRaw' | 'groupLabel' | 'partySizeAllowed' | 'hasSmartphone'
  >,
  existingPhones: Set<string>,
  existingNames: Set<string>,
  seenPhones: Map<string, number>,
  phone: PhoneRules = TZ_ONLY,
): PreviewRow {
  const issues: RowIssue[] = [];
  if (r.displayName.trim().length < 2) issues.push({ kind: 'name' });
  let phoneE164: string | null = null;
  if (r.phoneRaw.trim()) {
    const p = normalizePhone(r.phoneRaw, phone.country, phone.allowed);
    if (p.ok) {
      phoneE164 = p.e164;
      if (existingPhones.has(p.e164)) issues.push({ kind: 'duplicate', of: 'existing' });
      else if (seenPhones.has(p.e164))
        issues.push({ kind: 'duplicate', of: 'file', otherRow: seenPhones.get(p.e164) });
      else seenPhones.set(p.e164, r.index);
    } else issues.push({ kind: 'phone', error: p.error });
  } else if (existingNames.has(r.displayName.trim().toLowerCase())) {
    issues.push({ kind: 'duplicate', of: 'existing' });
  }
  const invalid = issues.some((i) => i.kind !== 'duplicate');
  const duplicate = issues.some((i) => i.kind === 'duplicate');
  return {
    ...r,
    displayName: r.displayName.trim(),
    phoneE164,
    inviteChannelPref: !phoneE164 ? 'print' : r.hasSmartphone ? 'whatsapp' : 'sms',
    issues,
    include: !invalid && !duplicate,
  };
}

export function summarizePreview(rows: PreviewRow[]): PreviewSummary {
  let invalid = 0;
  let duplicates = 0;
  let withoutPhone = 0;
  for (const r of rows) {
    if (r.issues.some((i) => i.kind !== 'duplicate')) invalid++;
    else if (r.issues.some((i) => i.kind === 'duplicate')) duplicates++;
    if (!r.phoneRaw.trim()) withoutPhone++;
  }
  return {
    total: rows.length,
    valid: rows.filter((r) => r.include).length,
    invalid,
    duplicates,
    withoutPhone,
  };
}

export const CSV_TEMPLATE =
  'Jina,Simu,Kikundi,Idadi\nAsha Mwinyi,0712 345 678,Familia ya Bibi Harusi,2\nBaraka Joseph,+255 754 123 456,Marafiki,1\nMama Neema,,Wazee,1\n';

/** Escapes and joins rows for CSV export. */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v);
    return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(esc).join(',')).join('\r\n') + '\r\n';
}
