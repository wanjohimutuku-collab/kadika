import { describe, expect, it } from 'vitest';
import { pledgeTotals, progress, summarizePledge } from './pledge';
import { buildInviteSms, estimateSmsCost, smsSegments } from './sms';
import { advanceStatus, funnelCounts } from './funnel';
import {
  buildPreview,
  guessMapping,
  parseCsv,
  parsePastedList,
  summarizePreview,
  toCsv,
} from './import';
import { isMockPayload, mockQrPayload } from './token';

describe('pledge math', () => {
  it('derives status and balance', () => {
    expect(summarizePledge(100_000, 0)).toEqual({
      amountTzs: 100_000,
      paidTzs: 0,
      balanceTzs: 100_000,
      status: 'pledged',
    });
    expect(summarizePledge(100_000, 40_000).status).toBe('partial');
    expect(summarizePledge(100_000, 100_000)).toMatchObject({ status: 'paid', balanceTzs: 0 });
    expect(summarizePledge(100_000, 120_000)).toMatchObject({ status: 'paid', balanceTzs: 0 });
    expect(summarizePledge(100_000, 0, true)).toMatchObject({ status: 'waived', balanceTzs: 0 });
  });
  it('totals reconcile: pledged = collected-against-pledges + outstanding - overpaid', () => {
    const list = [
      summarizePledge(100_000, 40_000),
      summarizePledge(50_000, 50_000),
      summarizePledge(20_000, 30_000),
      null,
      summarizePledge(10_000, 0),
    ];
    const t = pledgeTotals(list, 5_000);
    expect(t).toEqual({
      pledgedTzs: 180_000,
      collectedTzs: 125_000,
      outstandingTzs: 70_000,
      overpaidTzs: 10_000,
      guestsPaid: 2,
      guestsPartial: 1,
      guestsUnpaid: 1,
    });
    expect(t.pledgedTzs).toBe(t.collectedTzs - 5_000 + t.outstandingTzs - t.overpaidTzs);
  });
  it('clamps progress', () => {
    expect(progress(5, 10)).toBe(0.5);
    expect(progress(20, 10)).toBe(1);
    expect(progress(5, 0)).toBe(0);
  });
});

describe('sms cost estimator', () => {
  it('counts GSM-7 segments', () => {
    expect(smsSegments('a'.repeat(160))).toMatchObject({ encoding: 'GSM-7', segments: 1 });
    expect(smsSegments('a'.repeat(161))).toMatchObject({ segments: 2 });
    expect(smsSegments('€'.repeat(80))).toMatchObject({ units: 160, segments: 1 });
  });
  it('switches to UCS-2 for emoji', () => {
    expect(smsSegments('Karibu 🎉')).toMatchObject({ encoding: 'UCS-2', segments: 1 });
    expect(smsSegments('🎉'.repeat(40))).toMatchObject({ encoding: 'UCS-2', segments: 2 });
  });
  it('estimates cost in TZS', () => {
    expect(estimateSmsCost('hello', 100, 25).costTzs).toBe(2500);
  });
  it('§7.2 invite SMS fits in one segment', () => {
    const text = buildInviteSms({
      locale: 'sw',
      partnerA: 'Asha',
      partnerB: 'Juma',
      dateText: 'Jumamosi 14 Des 2026',
      shortLink: 'https://hrs.tz/s/KH-4826',
      code: 'KH-4826',
    });
    expect(text.length).toBeLessThanOrEqual(160);
    expect(smsSegments(text).segments).toBe(1);
  });
});

describe('funnel', () => {
  it('counts cumulative stages; declined never reach confirmed', () => {
    const c = funnelCounts([
      'created',
      'sent',
      'delivered',
      'opened',
      'confirmed',
      'declined',
      'checked_in',
    ]);
    expect(c).toEqual({
      created: 7,
      sent: 6,
      delivered: 5,
      opened: 4,
      confirmed: 2,
      checked_in: 1,
    });
  });
  it('never moves status backwards', () => {
    expect(advanceStatus('opened', 'delivered')).toBe('opened');
    expect(advanceStatus('confirmed', 'declined')).toBe('declined');
    expect(advanceStatus('checked_in', 'declined')).toBe('checked_in');
  });
});

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

describe('mock token', () => {
  it('follows the §6.1 shape and is labelled', () => {
    const t = mockQrPayload(
      '0192f1a0-7c3e-7a11-9b2c-5e8d4a6f0001',
      'abcdef12-3456-7890-abcd-ef1234567890',
      2,
      1,
    );
    expect(t).toBe('v1.0192f1a0.abcdef12.2.1.MOCKSIG');
    expect(isMockPayload(t)).toBe(true);
  });
});
