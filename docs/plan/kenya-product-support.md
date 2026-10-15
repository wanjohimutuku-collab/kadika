# Plan: Kenya product support

Date: 2026-10-15. Status: proposal for review. Builds on `docs/seo/kenya-readiness.md` (which lists the
gaps) and ADR 024. Goal: a Kenyan host or committee can create an event, import `+254` guests, send
invitations by SMS and WhatsApp, collect pledges in KES through M-Pesa, and run the gate, with the same
offline-first guarantees as Tanzania.

Estimates are rough engineer-weeks for 1 to 2 engineers and exclude external waiting time, which is
the real critical path (section 4). Facts about Safaricom, the Kenyan regulator and SMS rules come from
vendor and press pages, not primary sources; each must be confirmed in the Phase 0 checklist.

## 1. How big is the change (measured in this repo)

| Area          | Footprint today                                                                                                         | Notes                                                                                                                          |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Phone numbers | `normalizeTzPhone` is called in 22 source files across API, web, mobile and shared packages; error code `not_tanzanian` | Also drives login OTP, guest import, pledge payer phone, gate lookup by last 4 digits                                          |
| Money         | `Tzs` / `_tzs` appears in 47 source files; DB columns `contribution_target_tzs`, `cost_tzs`, `amount_tzs` (x2)          | Whole units everywhere; M-Pesa STK takes whole shillings, so no minor-unit change is needed                                    |
| Timezone      | `events.timezone` exists (default `Africa/Dar_es_Salaam`); the string is hardcoded in 15 files                          | Nairobi and Dar es Salaam are both UTC+3 with no daylight saving, so this is correctness and labelling, not a behaviour change |
| Payments      | `PaymentProvider` interface and a fake; methods `mpesa, mixx, airtel, halopesa`                                         | A Kenya adapter fits the existing interface; the TZ method list is not valid for Kenya                                         |
| Messaging     | `MessagingProvider` interface; NextSMS (TZ SMS), WhatsApp Cloud and Evolution                                           | Cost fields are TZS; templates take `{{1..n}}` params                                                                          |
| Copy          | Swahili and English, Tanzanian vocabulary (Mixx by Yas, HaloPesa)                                                       | Kenya needs `en-KE` wording and different wallet names                                                                         |

## 2. Design decisions to make first (write as ADR 025 to 027)

1. **Country is a property of the event** (`events.country`: `TZ` | `KE`), not of the user. It sets the default
   phone region, currency, time zone, payment methods, SMS provider and price list. Guests from other
   countries (diaspora) are allowed: the phone parser accepts any valid E.164 number and uses the event
   country only to interpret local formats (`07..`).
2. **Phone parsing**: replace `normalizeTzPhone` with `normalizePhone(input, defaultCountry)` backed by a
   small table of supported countries (TZ, KE) plus a generic E.164 length check. Avoid a large library on
   the guest pay page (JS budget 120 KB, spec section 10). Kenya mobile numbers are `+254` followed by 9
   digits starting with 7 or 1 (confirm current ranges with Communications Authority numbering plan).
   Keep `normalizeTzPhone` as a thin wrapper until every caller is moved.
3. **Money**: add `events.currency` (`TZS` | `KES`); keep amounts as whole units. Rename columns to
   `*_amount` or add a `currency` beside each, via a migration that keeps old column names readable for one
   release. The API returns `amount` and `currency` and keeps `amountTzs` as a deprecated alias, because
   installed mobile apps and cached web bundles will lag the server.
4. **Payment model** (the highest-stakes choice, needs legal advice):
   - **A. Platform shortcode**: we hold collected funds and pay committees out. Simple for users, but may
     make us a regulated payment service provider and creates reconciliation, float and dispute duties.
   - **B. Each committee's own Paybill or Till**: money never touches us, but each event needs Daraja
     credentials (consumer key and secret, shortcode, passkey) and a Safaricom-issued number that settles to
     a bank account; onboarding friction is high and secrets per event must be stored encrypted.
   - **C. A licensed aggregator** (the same pattern as `PaymentProvider` for Tanzania) that offers M-Pesa
     Kenya collection and handles settlement and compliance. Recommended first: smallest regulatory
     surface, fits the existing interface, and works for Airtel Money too.
     Decide with counsel before Phase 3 starts.
5. **SMS and sender identity**: one SMS provider with Kenyan routes and an approved sender ID (candidates:
   Africa's Talking, Infobip; compare price, delivery reports and Safaricom/Airtel coverage). Keep the
   `MessagingProvider` interface; pick provider by event country.
6. **Link domain**: Kenyan guests will receive links on `harusipass.co.tz`. For a service whose first
   problem is trust (P1, P7), decide whether to add a Kenyan short domain (for example a `.co.ke` or a
   neutral domain) before pilot. `SHORT_BASE_URL` becomes per country.
7. **Terminology**: store the product concept as "pledge/contribution"; the UI vocabulary varies by
   country (Kenya: harambee, committee, contribution; Tanzania: michango, kamati). Implement as i18n
   variants keyed by country, not by forking strings.

## 3. Phases

### Phase 0: decisions and prerequisites (1 to 2 weeks, mostly business work; start now)

- Choose payment model (A, B or C) with counsel; shortlist aggregators; start KYC.
- Choose SMS provider; prepare sender-ID paperwork (vendor guides list a director's signed letter on
  letterhead, KRA PIN and business registration; some want a trademark certificate; approval takes days
  to weeks and is per operator).
- Confirm WhatsApp Business onboarding for the Kenyan audience; draft Kenya template wording
  (`invite`, `reminder`, `pledge`) in `en` and `sw`.
- Legal: instruct a Kenyan lawyer on the Data Protection Act, 2019 (registration of controllers and
  processors with the data commissioner applies to foreign entities handling Kenyan residents' data;
  small-entity exemption and fees need confirmation), cross-border transfer rules, SMS consent rules,
  and whether holding funds needs authorisation.
- Business: find 2 or 3 Kenyan pilot committees; set KES pricing; decide domain (section 2.6).
- Write ADRs 025 (country/currency model), 026 (payment model), 027 (messaging providers).

Exit: written decisions, vendor accounts opened, lawyer's memo received.

### Phase 1: country foundation (about 2 to 3 weeks; no new external provider)

**Status (2026-10-15): done, including Phase 1b (see ADR 025).** Delivered:
`events.country/currency` (migration 0012), `COUNTRY_INFO`, `normalizePhone` with a golden test against the
old Tanzanian behaviour, `formatMoney`, per-country payment methods, event-timezone reminders and dates,
the `KENYA_ENABLED` flag in API, web and mobile, and Kenya tests.

**Phase 1b (done 2026-10-15):** `*_tzs` columns and `*Tzs` API fields renamed to currency-neutral names, with
response aliases and request compatibility for one release (`apps/api/src/compat.ts`); see ADR 025.

Behind a feature flag (`KENYA_ENABLED`, off by default) so Tanzania is untouched.

- Schema: `events.country`, `events.currency`; amount columns migration with compatibility; backfill all
  existing rows `TZ` / `TZS`.
- Phone: `normalizePhone(input, country)`, `formatPhone`, `maskPhone`; update the 22 call sites; error
  codes become `not_mobile` / `wrong_length` / `unsupported_country`. Property tests (random valid and
  invalid numbers for TZ and KE), CSV import tests with mixed countries, gate last-4 search test.
- Currency: shared `formatMoney(amount, currency, locale)` replacing TZS strings in web, mobile, PDF,
  CSV exports and SMS cost estimates; `KSh` vs `KES` wording decided by copy review.
- Timezone: use `event.timezone` everywhere; remove the 15 hardcoded strings and the `+03:00` literal in
  the mobile create form; allow `Africa/Nairobi`.
- API: accept `country` on event creation; derive defaults; reject payment methods not valid for the
  event country; OTP login accepts `+254` numbers when the flag is on.
- Tests: full existing suite stays green; add a TZ-to-KE regression matrix (event in each country, guest
  in each country).

Exit: a KE event can be created and a `+254` guest imported and shown correctly everywhere, with fake
providers; TZ behaviour byte-for-byte unchanged in tests.

### Phase 2: messaging for Kenya (about 2 weeks plus approval time)

**Status (2026-10-15): code done behind `KENYA_ENABLED`, see ADR 026.** Per-country SMS routing, sign-in
codes by number country, an Africa's Talking adapter with delivery-report webhook, per-country link domain,
per-country WhatsApp templates and cost tables. Still open: sender ID, template approval, a live SMS
contract and counsel's view on message class and consent (Phase 0 items), and a test on real Safaricom and
Airtel numbers.

- Provider adapter for the chosen Kenyan SMS gateway behind `MessagingProvider`; delivery webhooks
  (verify signatures, idempotent), cost capture in the event currency.
- Route by event country: OTP and invitations for KE events through the Kenyan provider and sender ID.
- Decide message class: invitations and reminders to guests are neither pure transactional nor
  marketing; get the provider and counsel to confirm which sender type and sending hours apply, and keep
  the existing reminder window (08:00 to 20:00 local) within Kenyan limits.
- WhatsApp: register Kenya templates; keep the SMS fallback after N hours; per-country conversation
  pricing table for cost estimates.
- Per-country SMS cost table for the Send screen estimate.
- Link domain per country (`SHORT_BASE_URL`); verified-sender line shows the Kenyan committee phone.

Exit: delivery of invite, reminder and OTP to real Kenyan Safaricom and Airtel numbers; delivery
statuses flow back; a 200-guest simulated send ends in correct statuses (same bar as Phase 3 of the spec).

### Phase 3: M-Pesa Kenya payments (about 3 to 4 weeks plus onboarding time)

**Status (2026-10-15): code done behind `KENYA_ENABLED`, model C (aggregator), see ADR 027.** Provider per
country, an aggregator-shaped adapter (STK push, signed callbacks, query), per-country method lists and
online limits, a currency guard on callbacks, a reconciliation job in the worker tick with late-success
handling, and KES statements. Still open: choosing and onboarding a real aggregator (credentials, KYC,
sandbox, one live real-money test), the wire-format mapping for that aggregator, and confirming the KES
limits and fees with it; model A (custody) is not built.

- Adapter implementing `PaymentProvider` for the chosen route: STK push (customer approves on phone, no
  PIN seen by us) and a confirmation callback; HMAC or provider signature verification on the raw body;
  idempotency by provider reference (replay 5 times records one payment).
- Method list per country: Kenya `mpesa`, `airtel`; hide TZ-only methods.
- Reconciliation: periodic query of pending payments, reversal and timeout handling, mismatched amount
  handling, committee-facing statement and CSV in KES.
- If model A: float accounting, payout flow, dispute log, daily reconciliation report and an audit trail
  of every ledger movement. If model B: encrypted per-event credentials, a setup wizard, credential
  rotation. If model C: settlement report import.
- Security review: webhook endpoint exposure, secret storage, rate limits on pay start.
- Sandbox test plan with the provider's test numbers; then a small live test with real money, refunded.

Exit: end-to-end pledge, STK payment, callback, balance update and export in KES in sandbox and one live
payment; five-replay idempotency test passes; reconciliation job handles failures.

### Phase 4: localisation, legal and site (about 1 to 2 weeks, parallel with Phase 3)

- Copy: `en-KE` wording, KES formatting, Kenyan wallet names, harambee and committee vocabulary; native
  review by Kenyan speakers (also required by the spec).
- Legal: Kenya variants of privacy and terms; data commissioner registration if required; update the
  cookies and data-request pages for the Kenyan authority and route.
- Site: update the five `/ke` pages (remove availability notes only when Phase 3 exit is met), add KES
  pricing, Kenya FAQ, hreflang already in place; keep `docs/seo/kenya-readiness.md` in sync.
- Support: Kenyan contact route and committee phone format.

Exit: counsel sign-off; native review complete; site copy matches what works.

### Phase 5: pilot and launch gates (about 3 to 4 weeks, including the weddings)

- Run 2 or 3 real Kenyan events with a named support owner and a rollback plan.
- Measure the spec section 14 KPIs per country: reach at least 95% via any channel, first-scan success at
  least 95%, median gate time under 8 seconds, zero lost scans, share of SMS-only guests; plus payment
  success rate and time to confirmation, SMS delivery rate by operator, support contacts per event.
- Launch gate: all KPIs met or explained, no open severity-1 issues, legal items closed, pricing live.

## 4. Critical path and dependencies

```
Phase 0 (legal, KYC, sender ID, WhatsApp templates)  -> long external waits
        \
         Phase 1 (internal, can start immediately) -> Phase 2 -> Phase 5
                                              \-> Phase 3 (needs payment route decided) -> Phase 5
                                   Phase 4 (needs legal and native review)  ------------> Phase 5
```

Phase 1 needs no vendor, so it can begin the day the design decisions (section 2.1 to 2.3) are agreed.
Phase 3 is the longest and least predictable because onboarding depends on a third party.

## 5. Risks

| #   | Risk                                                                                     | Likelihood | Impact | Mitigation                                                                                                                            |
| --- | ---------------------------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Holding or moving committee funds makes us a regulated payment provider                  | Medium     | High   | Prefer an aggregator (model C); get counsel's memo in Phase 0; do not take custody before it                                          |
| 2   | Safaricom or aggregator onboarding takes longer than planned                             | High       | High   | Start KYC in Phase 0; keep Phase 1 and 2 independent; ship Kenya without payments first (pledges recorded, payments manual) if needed |
| 3   | Sender ID approval delays, or invitations classed as promotional and limited             | Medium     | Medium | File early; ask the provider for written guidance; use a shortcode or numeric sender if required; stay inside sending hours           |
| 4   | Data protection non-compliance (registration, transfers, consent)                        | Medium     | High   | Lawyer in Phase 0; register before launch if required; update notices; minimise data                                                  |
| 5   | Regressions in Tanzania from the phone and money refactor                                | Medium     | High   | Feature flag; golden tests that pin current TZ outputs; staged rollout; migration rehearsal on a copy of production                   |
| 6   | Old mobile app versions break when API field names change                                | Medium     | Medium | Keep deprecated aliases for at least one release; version the API; force-upgrade check in the app                                     |
| 7   | Kenyan guests distrust a `.co.tz` link                                                   | Medium     | Medium | Kenyan domain or neutral domain; verified-sender strip already shows committee name and phone                                         |
| 8   | Phone-range rules change (Kenya added `01` mobile ranges) and valid numbers are rejected | Medium     | Medium | Table-driven rules, loose length check, unit tests with real examples; log rejects (masked) to tune                                   |
| 9   | STK push failures (timeouts, wrong PIN, user cancels) create duplicate or lost payments  | High       | Medium | Idempotent references, pending-state UI with timeout, reconciliation job, clear guest messages                                        |
| 10  | Mixed-country events (diaspora guests) behave oddly in cost, time zones or currency      | Medium     | Low    | Currency is per event; guest numbers any valid E.164; show event-local time with zone name                                            |
| 11  | WhatsApp template rejection or country pricing surprise                                  | Medium     | Medium | Submit templates early; keep SMS fallback; cost table per country                                                                     |
| 12  | Copy and tradition errors in Kenyan content                                              | Medium     | Medium | Native review; wording that defers to family elders; no stats without sources                                                         |
| 13  | Scope creep to other countries before Kenya works                                        | Medium     | Medium | Country table is data-driven, but only TZ and KE are in scope for this plan                                                           |

## 6. Out of scope

Other countries (Uganda, Rwanda), card payments, bank transfers via aggregator, multi-currency inside one
event, billing and invoicing (still just the event `plan` field), the iOS gate app, and any change to the
QR format or offline gate logic (country-independent).

## 7. Open questions for the owner

1. Payment model: A (we collect), B (committee's own shortcode) or C (aggregator)? Recommended: C.
2. Target date and the first Kenyan pilot committees; who owns Kenyan support?
3. Kenyan short domain or one domain for both countries?
4. Do Kenyan hosts need to sign in with Tanzanian numbers too, or is `+254` plus `+255` enough?
5. Pricing in KES: per event or per card (spec open decision 5)?
