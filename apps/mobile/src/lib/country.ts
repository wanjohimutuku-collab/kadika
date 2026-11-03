import { allowedCountries, type Country, type Currency } from '@harusi/schemas/country';
import { normalizePhone, type PhoneResult } from '@harusi/schemas/phone';
import { useEvent } from './queries';

/** Kenya support is off unless the build turns it on (ADR 025). */
export const KENYA_ENABLED = process.env.EXPO_PUBLIC_KENYA_ENABLED === '1';
export const ALLOWED_COUNTRIES = allowedCountries(KENYA_ENABLED);

/**
 * Reads a phone number: local formats in `country`, international forms of any allowed country.
 * Sign-in passes `SIGN_IN_COUNTRIES`: Kenyan numbers sign in even with Kenya off.
 */
export function parsePhone(
  raw: string,
  country: Country = 'TZ',
  allowed: readonly Country[] = ALLOWED_COUNTRIES,
): PhoneResult {
  return normalizePhone(raw, country, allowed);
}

/** The event's country and currency from the cached event query; Tanzania until it loads. */
export function useEventLocale(id: string): { country: Country; currency: Currency } {
  const e = useEvent(id).data;
  return { country: e?.country ?? 'TZ', currency: e?.currency ?? 'TZS' };
}
