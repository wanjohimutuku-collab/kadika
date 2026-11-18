import { describe, expect, it } from 'vitest';
import {
  buildPreview,
  CSV_TEMPLATE,
  guessMapping,
  parseCsv,
  parseGuestType,
  parsePastedList,
  summarizePreview,
  toCsv,
} from './import';

/** Parses a CSV and runs it through the header guess + preview, as the import screens do. */
function previewOf(csv: string, opts: Partial<Parameters<typeof buildPreview>[2]> = {}) {
  const rows = parseCsv(csv);
  const { mapping, hasHeader } = guessMapping(rows[0]!);
  return { mapping, hasHeader, preview: buildPreview(rows, mapping, { hasHeader, ...opts }) };
}

describe('CSV import', () => {
  it('parses quotes, CRLF and semicolons', () => {
    expect(parseCsv('a,"b, c","d ""e"""\r\n1,2,3\r\n')).toEqual([
      ['a', 'b, c', 'd "e"'],
      ['1', '2', '3'],
    ]);
    expect(parseCsv('Jina;Simu\nAsha;0712345678')).toEqual([
      ['Jina', 'Simu'],
      ['Asha', '0712345678'],
    ]);
  });
  it('parses pasted lists in several shapes', () => {
    expect(
      parsePastedList(
        'Asha Mwinyi, 0712 345 678\nBaraka\t+255754123456\nMama Neema 0688 123 456\nBibi Zuhura',
      ),
    ).toEqual([
      ['Asha Mwinyi', '0712 345 678'],
      ['Baraka', '+255754123456'],
      ['Mama Neema', '0688 123 456'],
      ['Bibi Zuhura'],
    ]);
  });
  it('guesses Swahili headers and flags invalid + duplicate rows', () => {
    const rows = parseCsv(
      'Jina,Simu,Kikundi,Idadi\nAsha,0712345678,Marafiki,2\nAsha tena,+255 712 345 678,Marafiki,1\nBaraka,07123,,1\nX,,,\nMama Neema,,Wazee,1\nJuma,0754000111,,1',
    );
    const { mapping, hasHeader } = guessMapping(rows[0]!);
    expect(hasHeader).toBe(true);
    expect(mapping).toEqual(['name', 'phone', 'group', 'party']);
    const preview = buildPreview(rows, mapping, { hasHeader, existingPhones: ['+255754000111'] });
    expect(preview.map((r) => r.issues.map((i) => i.kind))).toEqual([
      [],
      ['duplicate'],
      ['phone'],
      ['name'],
      [],
      ['duplicate'],
    ]);
    expect(preview[0]).toMatchObject({
      phoneE164: '+255712345678',
      partySizeAllowed: 2,
      include: true,
    });
    expect(preview[4]).toMatchObject({ inviteChannelPref: 'print', include: true });
    expect(summarizePreview(preview)).toEqual({
      total: 6,
      valid: 2,
      invalid: 2,
      duplicates: 2,
      withoutPhone: 2,
    });
  });
  it('treats a headerless file positionally', () => {
    const { mapping, hasHeader } = guessMapping(['Asha', '0712345678']);
    expect(hasHeader).toBe(false);
    expect(mapping).toEqual(['name', 'phone']);
  });
  it('escapes CSV output', () => {
    expect(toCsv([['a,b', 'c"d', null, 5]])).toBe('"a,b","c""d",,5\r\n');
  });
});

describe('CSV import: name and type layouts', () => {
  it('reads the Name, Phone number, Type layout (3 columns)', () => {
    const { mapping, hasHeader, preview } = previewOf(
      'Name,Phone number,Type\nAsha Mwinyi,0712 345 678,D\nBaraka Joseph,0754123456,S',
    );
    expect(hasHeader).toBe(true);
    expect(mapping).toEqual(['name', 'phone', 'type']);
    expect(preview).toMatchObject([
      {
        displayName: 'Asha Mwinyi',
        phoneE164: '+255712345678',
        partySizeAllowed: 2,
        include: true,
      },
      {
        displayName: 'Baraka Joseph',
        phoneE164: '+255754123456',
        partySizeAllowed: 1,
        include: true,
      },
    ]);
  });

  it('joins First Name + Second Name into the display name (4 columns)', () => {
    const { mapping, preview } = previewOf(
      'First Name,Second Name,Phone number,Type\nAsha,Mwinyi,0712345678,d\nBaraka,,0754123456,S',
    );
    expect(mapping).toEqual(['firstName', 'secondName', 'phone', 'type']);
    expect(preview.map((r) => [r.displayName, r.partySizeAllowed, r.include])).toEqual([
      ['Asha Mwinyi', 2, true],
      ['Baraka', 1, true],
    ]);
  });

  it('matches headers case-insensitively, in English or Swahili', () => {
    const fourCols = ['firstName', 'secondName', 'phone', 'type'];
    expect(guessMapping(['FIRST NAME', 'last name', 'PHONE NUMBER', 'guest type']).mapping).toEqual(
      fourCols,
    );
    expect(guessMapping(['Jina la kwanza', 'Jina la pili', 'Simu', 'Aina']).mapping).toEqual(
      fourCols,
    );
    expect(guessMapping(['jina', 'namba ya simu', 'AINA YA MGENI']).mapping).toEqual([
      'name',
      'phone',
      'type',
    ]);
  });

  it('reads D/S/Double/Single and keeps the default when Type is blank', () => {
    expect(
      ['D', 'd', 'Double', 'DOUBLE', ' S ', 's', 'Single', 'single'].map(parseGuestType),
    ).toEqual([2, 2, 2, 2, 1, 1, 1, 1]);
    expect(parseGuestType('')).toBeNull();
    expect(parseGuestType('   ')).toBeNull();

    const { mapping, preview } = previewOf(
      'Name,Phone number,Type,Idadi\nAsha,0712345678,,3\nJuma,0754123456,,\nNeema,0688123456,D,5',
    );
    expect(mapping).toEqual(['name', 'phone', 'type', 'party']);
    // blank Type: the party column if any, else 1; a recognised Type wins over the party column
    expect(preview.map((r) => r.partySizeAllowed)).toEqual([3, 1, 2]);
    expect(preview.every((r) => r.include)).toBe(true);
  });

  it('flags an unknown Type as a per-row error', () => {
    const { preview } = previewOf('Name,Phone number,Type\nAsha,0712345678,X\nJuma,0754123456,S');
    expect(preview[0]!.issues).toEqual([{ kind: 'type', value: 'X' }]);
    expect(preview[0]!.include).toBe(false);
    expect(preview[0]).not.toHaveProperty('typeRaw');
    expect(preview[1]!.issues).toEqual([]);
    expect(summarizePreview(preview)).toMatchObject({ valid: 1, invalid: 1 });
  });

  it('normalises phone numbers to E.164 (TZ, and KE when allowed)', () => {
    const csv =
      'Name,Phone number,Type\nA One,0712 345 678,S\nB Two,255712000111,S\nC Three,+255 754-000-222,S\nD Four,0712,S\nE Five,+254712345678,S';
    const tz = previewOf(csv).preview;
    expect(tz.map((r) => r.phoneE164)).toEqual([
      '+255712345678',
      '+255712000111',
      '+255754000222',
      null,
      null,
    ]);
    expect(tz[3]!.issues.map((i) => i.kind)).toEqual(['phone']);
    expect(tz[4]!.issues.map((i) => i.kind)).toEqual(['phone']);
    const ke = previewOf(csv, { phone: { country: 'TZ', allowed: ['TZ', 'KE'] } }).preview;
    expect(ke[4]!.phoneE164).toBe('+254712345678');
  });

  it('ships a template that reads with the new columns', () => {
    const { mapping, preview } = previewOf(CSV_TEMPLATE);
    expect(mapping).toEqual(['name', 'phone', 'type', 'group']);
    expect(preview.map((r) => [r.partySizeAllowed, r.include])).toEqual([
      [2, true],
      [1, true],
      [1, true],
    ]);
  });
});
