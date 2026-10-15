/**
 * Offset of an IANA time zone from UTC at an instant, in milliseconds (Dar es Salaam and Nairobi are
 * both +3 h all year, but code should not assume it; ADR 025).
 */
export function zoneOffsetMs(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(at);
  const n = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const asUtc = Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'), n('second'));
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** The instant shifted so its UTC fields read as local time in `timeZone`. */
export function toZoned(at: Date, timeZone: string): Date {
  return new Date(at.getTime() + zoneOffsetMs(timeZone, at));
}
