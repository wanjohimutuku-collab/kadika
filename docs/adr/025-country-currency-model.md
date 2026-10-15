# ADR 025: country, currency and time zone on the event

Status: accepted (Phase 1 of `docs/plan/kenya-product-support.md`)

## Context

The product accepts only Tanzanian `+255` numbers, stores and shows TZS everywhere, and hardcodes
`Africa/Dar_es_Salaam` in about 15 places. Kenya needs `+254` numbers, KES and `Africa/Nairobi`
(`docs/seo/kenya-readiness.md`). Tanzania must not change.

## Decision

1. **Country belongs to the event.** `events.country` is `TZ` or `KE` (default `TZ`). `events.currency`
   (`TZS` or `KES`) and `events.timezone` (already present) are derived from the country at creation.
   One table, `COUNTRY_INFO` in `packages/schemas/src/country.ts`, holds dial code, mobile-number rule,
   currency, time zone and the mobile-money methods valid in that country.
2. **Phones.** `normalizePhone(input, defaultCountry, allowedCountries)` interprets local formats (`07..`)
   with the event's country and accepts any allowed country's international form. Guests from another
   allowed country (diaspora) are valid. `normalizeTzPhone` stays and is defined as
   `normalizePhone(input, 'TZ', ['TZ'])`; a golden test pins every Tanzanian result to the previous
   implementation. A number is shown in national form (`0712 345 678`) only when it belongs to the
   event's country, otherwise in international form, so mixed lists are unambiguous.
3. **Money.** Amounts stay whole currency units (M-Pesa STK takes whole shillings). `formatMoney(amount,
currency)` and `formatMoneyCompact` replace TZS-only formatting; with `TZS` they produce exactly the
   old strings. Event screens take the currency from the event.
4. **Feature flag.** `KENYA_ENABLED` (API), `NEXT_PUBLIC_KENYA_ENABLED` (web) and
   `EXPO_PUBLIC_KENYA_ENABLED` (mobile) default to off. Off means: only `+255` accepted, creating a `KE`
   event is rejected, no country field is shown, and behaviour matches the previous release.
5. **Payment methods per country.** `paymentMethodsFor(country)`: TZ `mpesa, mixx, airtel, halopesa`; KE
   `mpesa, airtel`. Cash and bank are valid anywhere. The API rejects a method not valid for the event.

## Currency-neutral money names (Phase 1b, done)

Amount columns and API fields no longer say TZS. Columns: `events.contribution_target`,
`message_log.cost`, `payments.amount`, `pledges.amount` (migration `0013`, plain `RENAME COLUMN`). Fields:
`amount`, `paid`, `balance`, `pledged`, `collected`, `outstanding`, `overpaid`, `newBalance`,
`pledgeAmount`, `unpledgedPayments`, `contributionTarget`, `cost`, `estimatedSmsCost`, `smsCost`,
`smsCost30d`, and `targetAmount` (was `targetTzs`; `target` alone clashes with the send target). Amounts
are in the event's `currency`.

Compatibility for one release (`apps/api/src/compat.ts`, with tests): every JSON response carries the old
`*Tzs` name next to the new one (numbers and null only), and request bodies may still use the old names
(the new name wins if both are sent). This keeps installed mobile apps and cached web bundles working.
To end the window: delete `compat.ts`, its middleware in `app.ts` and `compat.test.ts`.

The demo backend (browser `localStorage`, state version 3) migrates saved state to version 4 by renaming
the keys. The staff panel keeps `formatTzs` because its totals add up events without a currency; revisit
when Kenyan events exist.

## Consequences

- Tanzania: no behaviour change with the flag off (pinned by golden tests and the existing suites).
- Kenyan events no longer need to stay out of production because of the field names; they still wait for
  Phases 2 and 3 (messaging, payments).
- SMS, OTP and WhatsApp for `+254` still go through the Tanzanian providers (Phase 2); payments for KES
  use the fake provider only (Phase 3).
- Hardcoded `Africa/Dar_es_Salaam` is replaced by the event's `timezone`.
