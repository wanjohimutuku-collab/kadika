import { describe, expect, it } from 'vitest';
import { buildIcs } from './ics';

describe('ICS', () => {
  const ics = buildIcs({
    uid: 'guest-1@kadisasa',
    title: 'Harusi ya Asha & Juma',
    start: '2026-12-14T13:00:00Z',
    location: 'Ukumbi wa Mwanga, Kibaha',
    description: 'Mavazi: Kijani na dhahabu; Namba: KH-4826',
    url: 'https://kadisasa.com/c/abc',
    now: new Date('2026-10-13T00:00:00Z'),
  });
  it('is a valid VEVENT in UTC with CRLF line endings', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(ics).toContain('DTSTART:20261214T130000Z\r\n');
    expect(ics).toContain('DTEND:20261214T180000Z\r\n');
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
  });
  it('escapes commas and semicolons', () => {
    expect(ics).toContain('LOCATION:Ukumbi wa Mwanga\\, Kibaha');
    expect(ics).toContain('Mavazi: Kijani na dhahabu\\; Namba: KH-4826');
  });
  it('folds lines longer than 75 octets', () => {
    for (const line of ics.split('\r\n'))
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
});
