import { TZDate } from '@date-fns/tz';
import { differenceInCalendarDays } from 'date-fns';
import { TZ } from './format';

/** Calendar days from today until the date, both in Dar es Salaam (date-fns + @date-fns/tz). */
export function daysUntil(iso: string, now: number = Date.now()): number {
  return differenceInCalendarDays(new TZDate(new Date(iso).getTime(), TZ), new TZDate(now, TZ));
}
