import { describe, expect, it } from 'vitest';
import {
  buildPreview,
  guessMapping,
  parseCsv,
  parsePastedList,
  summarizePreview,
  toCsv,
} from './import';

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
