'use client';

import { createContext, useContext, type ReactNode } from 'react';
import {
  allowedCountries,
  COUNTRY_INFO,
  type Country,
  type Currency,
} from '@harusi/schemas/country';
import { normalizePhone, type PhoneResult } from '@harusi/schemas/phone';

/** Kenya support is off unless the deployment turns it on (ADR 025). */
export const KENYA_ENABLED = process.env.NEXT_PUBLIC_KENYA_ENABLED === '1';
export const ALLOWED_COUNTRIES = allowedCountries(KENYA_ENABLED);

/** Reads a phone number: local formats in `country`, international forms of any allowed country. */
export function parsePhone(raw: string, country: Country = 'TZ'): PhoneResult {
  return normalizePhone(raw, country, ALLOWED_COUNTRIES);
}

/** `+255` / `+254`. */
export const dialPrefix = (country: Country): string => `+${COUNTRY_INFO[country].dial}`;

interface EventLocale {
  country: Country;
  currency: Currency;
}

const EventLocaleContext = createContext<EventLocale>({ country: 'TZ', currency: 'TZS' });

/** The open event's country and currency for everything inside the event console. */
export function EventLocaleProvider({
  country,
  currency,
  children,
}: EventLocale & { children: ReactNode }) {
  return (
    <EventLocaleContext.Provider value={{ country, currency }}>
      {children}
    </EventLocaleContext.Provider>
  );
}

/** The country local phone numbers are read in: the open event's, else Tanzania. */
export const usePhoneCountry = (): Country => useContext(EventLocaleContext).country;

/** The open event's currency, else Tanzanian shillings. */
export const useCurrency = (): Currency => useContext(EventLocaleContext).currency;
