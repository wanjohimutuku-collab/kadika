import { countryOfE164, type Country } from '@harusi/schemas/country';
import type { MessagingProvider } from '@harusi/messaging';
import type { Config } from './config';
import type { Deps } from './context';

/**
 * The SMS provider for a destination country (ADR 026). Tanzania uses `deps.sms` (the original
 * provider); every other country needs its own route in `deps.smsByCountry`. A Kenyan number is
 * never sent through the Tanzanian gateway: it would fail or bill an international rate.
 */
export function smsFor(deps: Pick<Deps, 'sms' | 'smsByCountry'>, country: Country) {
  if (country === 'TZ') return deps.smsByCountry?.TZ ?? deps.sms;
  return deps.smsByCountry?.[country];
}

/** The country whose route carries a number: its own dial code, else the fallback (event country). */
export const routeCountry = (e164: string, fallback: Country): Country =>
  countryOfE164(e164) ?? fallback;

/** Link domain for a country's events (`SHORT_BASE_URL_KE` for Kenya, else the default). */
export const shortBaseFor = (config: Pick<Config, 'shortBaseUrl' | 'shortBaseUrls'>, c: Country) =>
  config.shortBaseUrls[c] ?? config.shortBaseUrl;

export type { MessagingProvider };
