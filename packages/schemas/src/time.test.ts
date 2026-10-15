import { describe, expect, it } from 'vitest';
import { COUNTRIES, COUNTRY_INFO } from './country';
import { toZoned, zoneOffsetMs } from './time';

describe('zoneOffsetMs', () => {
  const at = new Date('2026-12-14T10:00:00Z');
  it('is +3 h for Dar es Salaam and Nairobi, all year', () => {
    for (const tz of ['Africa/Dar_es_Salaam', 'Africa/Nairobi']) {
      expect(zoneOffsetMs(tz, at)).toBe(3 * 3_600_000);
      expect(zoneOffsetMs(tz, new Date('2026-07-01T00:00:00Z'))).toBe(3 * 3_600_000);
    }
  });
  it('follows daylight saving elsewhere', () => {
    expect(zoneOffsetMs('Europe/London', new Date('2026-07-01T00:00:00Z'))).toBe(3_600_000);
    expect(zoneOffsetMs('Europe/London', new Date('2026-12-01T00:00:00Z'))).toBe(0);
  });
  it('shifts to local fields', () => {
    expect(toZoned(new Date('2026-12-14T22:30:00Z'), 'Africa/Nairobi').getUTCDate()).toBe(15);
  });

  it('every supported country is UTC+3 all year, which the clients rely on (ADR 025)', () => {
    for (const c of COUNTRIES)
      for (const month of [0, 3, 6, 9])
        expect(zoneOffsetMs(COUNTRY_INFO[c].timezone, new Date(Date.UTC(2026, month, 15)))).toBe(
          3 * 3_600_000,
        );
  });
});
