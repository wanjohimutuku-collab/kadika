import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatDateShort,
  formatTime,
  formatTzs,
  formatTzsCompact,
  fromLocalInput,
  initials,
  swahiliTime,
  toLocalInput,
} from './format';
import { daysUntil } from './dates';

describe('format', () => {
  it('formats TZS', () => {
    expect(formatTzs(1200000)).toBe('TZS 1,200,000');
    expect(formatTzsCompact(8_400_000)).toBe('TZS 8.4M');
    expect(formatTzsCompact(12_000_000)).toBe('TZS 12M');
    expect(formatTzsCompact(450_000)).toBe('TZS 450K');
  });
  it('uses Swahili month names in Dar es Salaam time', () => {
    // 21:30 UTC on 13 Dec is already 14 Dec in Dar es Salaam.
    expect(formatDate('2026-12-13T21:30:00Z', 'sw')).toBe('14 Desemba 2026');
    expect(formatDateShort('2026-12-14T13:00:00Z', 'sw')).toBe('14 Des 2026');
    expect(formatDate('2026-12-14T13:00:00Z', 'en')).toBe('14 December 2026');
  });
  it('converts to Swahili time', () => {
    expect(swahiliTime('2026-12-14T13:00:00Z')).toBe('10:00 jioni'); // 16:00 EAT
    expect(swahiliTime('2026-12-14T04:00:00Z')).toBe('1:00 asubuhi'); // 07:00
    expect(swahiliTime('2026-12-14T09:30:00Z')).toBe('6:30 mchana'); // 12:30
    expect(swahiliTime('2026-12-13T21:00:00Z')).toBe('6:00 usiku'); // 00:00
    expect(formatTime('2026-12-14T13:00:00Z', 'sw')).toBe('10:00 jioni (16:00)');
    expect(formatTime('2026-12-14T13:00:00Z', 'en')).toBe('4:00 pm');
  });
  it('counts calendar days in EAT', () => {
    expect(daysUntil('2026-12-14T13:00:00Z', Date.parse('2026-12-13T22:00:00Z'))).toBe(0);
    expect(daysUntil('2026-12-14T13:00:00Z', Date.parse('2026-12-13T20:00:00Z'))).toBe(1);
  });
  it('round-trips datetime-local values as EAT', () => {
    expect(fromLocalInput('2026-12-14T16:00')).toBe('2026-12-14T13:00:00.000Z');
    expect(toLocalInput('2026-12-14T13:00:00.000Z')).toBe('2026-12-14T16:00');
  });
  it('builds initials without honorifics', () => {
    expect(initials('Mama Neema Mushi')).toBe('NM');
    expect(initials('Familia ya Kombo')).toBe('K');
    expect(initials('Asha Mwinyi')).toBe('AM');
  });
});
