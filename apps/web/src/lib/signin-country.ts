import { SIGN_IN_COUNTRIES, type Country } from '@harusi/schemas/country';
import { parsePhone } from './country';
import type { PhoneSignInError } from './firebase-phone';

export type CountryHint =
  /** Firebase could not deliver to the number: switch the country for the visitor. */
  | { kind: 'switch'; country: Country }
  /** Firebase refused the attempt (reCAPTCHA / SMS fraud rules): name the country, do not switch. */
  | { kind: 'suggest'; country: Country };

/**
 * After a failed "Send code": does the typed number also fit another sign-in country? A local number
 * read under the wrong country (0797… is Kenyan, not Tanzanian) both fails delivery and, under
 * reCAPTCHA Enterprise ENFORCE, looks like SMS fraud to Firebase, so its refusal reads as "blocked".
 *
 * Only an undeliverable number switches the country. A refusal can also hit a genuine number (VPN,
 * low score), and every Tanzanian 07… number fits Kenya too, so for that case the page only names
 * the other country.
 */
export function countryHintFor(
  reason: PhoneSignInError,
  phone: string,
  country: Country | 'OTHER',
): CountryHint | undefined {
  if (reason !== 'undeliverable' && reason !== 'blocked') return undefined;
  if (country === 'OTHER' || phone.trim().startsWith('+')) return undefined;
  const other = SIGN_IN_COUNTRIES.find(
    (c) => c !== country && parsePhone(phone, c, SIGN_IN_COUNTRIES).ok,
  );
  if (!other) return undefined;
  return { kind: reason === 'undeliverable' ? 'switch' : 'suggest', country: other };
}
