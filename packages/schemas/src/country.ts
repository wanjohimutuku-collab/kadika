import { z } from 'zod';

/** Countries the product can run an event in. Add a row to `COUNTRY_INFO` to add one (ADR 025). */
export const COUNTRIES = ['TZ', 'KE'] as const;
export type Country = (typeof COUNTRIES)[number];
export const countrySchema = z.enum(COUNTRIES);

export const CURRENCIES = ['TZS', 'KES'] as const;
export type Currency = (typeof CURRENCIES)[number];
export const currencySchema = z.enum(CURRENCIES);

/** Mobile-money wallets a guest can pay with (the manual methods `cash` and `bank` work anywhere). */
export type MobileMoneyMethodId = 'mpesa' | 'mixx' | 'airtel' | 'halopesa';

export interface CountryInfo {
  code: Country;
  /** International dial code without `+`. */
  dial: string;
  /** Digits after the dial code. */
  nationalLength: number;
  /** First digit(s) of a mobile number after the dial code. */
  mobileStart: RegExp;
  currency: Currency;
  timezone: string;
  methods: readonly MobileMoneyMethodId[];
  /** Whole-unit limits for one online (mobile-money) payment; assumptions to confirm (ADR 027). */
  onlinePayment: { min: number; max: number };
}

export const COUNTRY_INFO: Record<Country, CountryInfo> = {
  TZ: {
    code: 'TZ',
    dial: '255',
    nationalLength: 9,
    mobileStart: /^[67]/,
    currency: 'TZS',
    timezone: 'Africa/Dar_es_Salaam',
    methods: ['mpesa', 'mixx', 'airtel', 'halopesa'],
    onlinePayment: { min: 1_000, max: 100_000_000 },
  },
  KE: {
    code: 'KE',
    dial: '254',
    nationalLength: 9,
    // Safaricom and Airtel use 07xx and, since the numbering expansion, 01xx.
    mobileStart: /^[17]/,
    currency: 'KES',
    timezone: 'Africa/Nairobi',
    methods: ['mpesa', 'airtel'],
    onlinePayment: { min: 10, max: 250_000 },
  },
};

/** Countries a deployment accepts: Tanzania only unless the Kenya flag is on (ADR 025). */
export function allowedCountries(kenyaEnabled: boolean): readonly Country[] {
  return kenyaEnabled ? COUNTRIES : ['TZ'];
}

export const currencyOf = (country: Country): Currency => COUNTRY_INFO[country].currency;
export const timezoneOf = (country: Country): string => COUNTRY_INFO[country].timezone;

export const onlinePaymentLimits = (country: Country) => COUNTRY_INFO[country].onlinePayment;

export function paymentMethodsFor(country: Country): readonly MobileMoneyMethodId[] {
  return COUNTRY_INFO[country].methods;
}

/** The country whose dial code starts an E.164 number, if it is one we support. */
export function countryOfE164(e164: string): Country | null {
  const digits = e164.replace(/^\+/, '');
  for (const c of COUNTRIES) if (digits.startsWith(COUNTRY_INFO[c].dial)) return c;
  return null;
}
