import { describe, expect, it } from 'vitest';
import { daysUntil, formatDate, formatTzs, initials } from '../lib/format';

describe('format helpers', () => {
  it('formats dates in Dar es Salaam time with Swahili month names', () => {
    expect(formatDate('2027-03-20T22:30:00Z', 'sw')).toBe('21 Machi 2027'); // 01:30 local the next day
    expect(formatDate('2027-06-01T07:00:00Z', 'en')).toBe('1 Jun 2027');
  });
  it('counts whole local days to the wedding', () => {
    const now = Date.UTC(2027, 2, 19, 9, 0, 0);
    expect(daysUntil('2027-03-20T12:00:00Z', now)).toBe(1);
    expect(daysUntil('2027-03-19T20:00:00Z', now)).toBe(0); // 23:00 local, still the same local day
    expect(daysUntil('2027-03-19T21:00:00Z', now)).toBe(1); // midnight local: the next day
    expect(daysUntil('2027-03-18T09:00:00Z', now)).toBe(-1);
  });
  it('builds initials and TZS amounts', () => {
    expect(initials('Asha Mwinyi Juma')).toBe('AM');
    expect(initials('neema')).toBe('N');
    expect(formatTzs(1200000)).toBe('TZS 1,200,000');
  });
});
