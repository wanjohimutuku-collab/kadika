# ADR 028: country-keyed wording (Phase 4 of Kenya support)

Status: accepted. Builds on ADR 025 and `docs/plan/kenya-product-support.md`.

## Decision

1. **One base text, small per-country overlays.** `packages/i18n/src/en.json` and `sw.json` stay the Tanzanian
   base. `src/variants/ke.en.json` and `ke.sw.json` hold only what differs for Kenya: currency labels
   (`Amount (KES)`), the target and pledge-amount labels, the minimum-amount message, a few vocabulary
   choices (the nav says "Contributions", settings mention harambee) and the guest card's contribution line.
   Overlays are merged by `messagesFor(locale, country)`, `pickMessages(locale, namespaces, country)` and
   `mergeVariant` (a light entry point, `@harusi/i18n/variants`, for client code that already has the base).
2. **Safety.** A test requires every overlay key to exist in the base with the same ICU parameters, so an
   overlay cannot drift, add keys nobody renders or break a placeholder.
3. **Where the country is known.** Server-rendered guest card and pay page: from the event in the card
   view. Organiser console: `CountryMessages` wraps the shell and event pages once the event has loaded.
   Mobile: `useCountryT(country)` on event screens (pledges so far; other screens carry no currency text).
4. **Currency and wallet names.** Amounts are formatted by `formatMoney` with the event currency (Phase 1);
   the wallets offered come from `paymentMethodsFor(country)` (Phase 1), so "Mixx by Yas" and HaloPesa never
   show for Kenya. Labels for those wallets stay in the base text and are only reachable for countries that
   offer them.
5. **Languages.** Kenyan English and Swahili reuse the same two locales; no new locale code. Kenya-specific
   pages (`/ke`) carry their own wording in the content system.

## Not done

Native review by Kenyan speakers (required before launch), a Swahili-Kenya style pass, and screens that
have no country context (the sign-in screens, which do not know an event). Adding a country means a new
overlay file and a `COUNTRY_INFO` row, nothing else.
