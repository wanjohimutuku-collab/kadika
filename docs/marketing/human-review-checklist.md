# Consolidated Human Review Checklist (Prompts 1–12)

Use this sign-off ledger before deploying or launching paid/organic campaigns from branch `feat/marketing-changes-pack`. No change should be considered ready for public launch until every item below is reviewed and checked off by the relevant owner.

---

## Prompt 1: Brand Identity Audit (`Kadi Sasa`)

- **Fixed user-facing brand strings**:
  - [apps/web/src/components/site/home/quickwork-sections.tsx](file:///c:/Users/yusuf/Documents/github/kadika/apps/web/src/components/site/home/quickwork-sections.tsx): replaced `Kadika` / `Harusi Pass` comment and headings (`Kwa nini Kadika` / `Why Kadika`, `Mahali Kadika Inapojitofautisha` / `Where Kadika Stands Out`) with `Kadi Sasa`.
  - [apps/web/src/components/gate/mobile-scanner.tsx](file:///c:/Users/yusuf/Documents/github/kadika/apps/web/src/components/gate/mobile-scanner.tsx): replaced default `brandName = 'HarusiPass'` with `'Kadi Sasa'`.
- **Verified already `Kadi Sasa`**: `<title>`, `og:site_name`, `twitter`, `Organization.name`, `apps/mobile/app.json`, and guest-card footer logo `alt`.
- **Intentionally untouched internal/technical identifiers** (do NOT rename without separate infra migration):
  - Monorepo workspace scope: `@harusi/*`
  - Android / Mobile identifiers: `app.harusipass.mobile`, `harusipass://`
  - Repository / container references: `github.com/.../kadika`, `ghcr.io/.../kadika-*`
  - Local storage / client session keys: `harusi.*`
  - Test fixture username in [apps/api/src/messaging-settings.test.ts](file:///c:/Users/yusuf/Documents/github/kadika/apps/api/src/messaging-settings.test.ts) (`username: 'kadika'`)
- [ ] **Owner check**: Confirm zero remaining user-facing occurrences of `Kadika` or `HarusiPass`.

---

## Prompt 2: Hero Headline Options & Occasion Tab Order

All 6 headline options documented in [apps/web/src/content/home.ts](file:///c:/Users/yusuf/Documents/github/kadika/apps/web/src/content/home.ts):

### Kiswahili Options (`sw()`)

1. **(Active)** `"Mialiko kamati inayoiamini. Kila mgeni anaingia bila shida."`
2. `"Kadi za mwaliko kwa kila mgeni, michango bila makato."`
3. `"Mialiko ya kuaminika kwa familia, kamati na kila mgeni."`

### English Options (`en()`)

1. **(Active)** `"Digital invitations committees trust. Every guest gets in."`
2. `"Invitations every guest receives, with 0% cut on michango."`
3. `"Trusted event invitations for families, committees, and every guest."`

- **Occasion showcase tab order** updated across `sw()`, `en()`, `ke()`, and `ug()`:
  `weddings` (default active) → `personal` → `community` → `corporate` (moved to last).
- **Market demo card isolation**: Kenya (`/ke`) and Uganda (`/ug`) hero demo previews no longer fall back to `Asha & Juma` / `KH-4826`.
- [ ] **Copywriter / Founder sign-off**: Confirm active Option 1 or swap to Option 2/3.

---

## Prompt 3: Multilingual SEO & EN ↔ SW URL Parity Table

Code updates:

- Direct `/sw/<sw-slug>` hreflangs without 301 hops across `hreflangMap` and cross-market `counterpartsOf()` links.
- Fixed shared-slug `/sw/...` 404 bug (e.g., `/sw/cookies`, `/sw/privacy`, `/sw/terms`).
- Fixed `/programu` FAQ/contact links, `pricing-teaser.tsx` login link, and added `/bei` + security guide to `ContentPage` quick links.

| Market | Kiswahili Path                                 | English Path                                      | Cross-Market Counterpart                                 |
| ------ | ---------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------- |
| `tz`   | `/kadi-ya-harusi-mtandaoni`                    | `/online-wedding-invitation`                      | `ke:digital-wedding-invitations-kenya` (from KE side)    |
| `tz`   | `/michango-ya-harusi`                          | `/wedding-contributions`                          | `ke:wedding-contributions-guide` (from KE side)          |
| `tz`   | `/kadi-ya-send-off`                            | `/send-off-invitation`                            | —                                                        |
| `tz`   | `/kadi-ya-uchumba`                             | `/engagement-invitation`                          | —                                                        |
| `tz`   | `/kadi-za-mwaliko-mtandaoni`                   | `/online-invitations`                             | —                                                        |
| `tz`   | `/kadi-ya-kuzaliwa`                            | `/birthday-invitation`                            | —                                                        |
| `tz`   | `/kadi-ya-kitchen-party`                       | `/kitchen-party-invitation`                       | —                                                        |
| `tz`   | `/kadi-ya-mahafali`                            | `/graduation-invitation`                          | —                                                        |
| `tz`   | `/kadi-za-mwaliko-biashara`                    | `/business-event-invitations`                     | —                                                        |
| `tz`   | `/kadi-za-kanisa`                              | `/church-event-invitations`                       | —                                                        |
| `tz`   | `/kadi-ya-nikah-na-walima`                     | `/nikah-and-walima-invitation`                    | —                                                        |
| `tz`   | `/kadi-za-mwaliko-tanzania`                    | `/wedding-invitations-tanzania`                   | —                                                        |
| `tz`   | `/jinsi-ya-kuchagua-huduma-ya-kadi-za-mwaliko` | `/choosing-a-wedding-invitation-service`          | —                                                        |
| `tz`   | `/kamusi-ya-harusi`                            | `/wedding-glossary`                               | —                                                        |
| `tz`   | `/kadi-za-kidijitali-tanzania`                 | `/ecards-tanzania`                                | —                                                        |
| `tz`   | `/kadi-ya-harusi-bila-smartphone`              | `/wedding-invitation-without-a-smartphone`        | —                                                        |
| `tz`   | `/usalama-wa-kadi-za-mtandaoni`                | `/security-of-online-invitations`                 | `ke:is-a-digital-wedding-invitation-safe` (from KE side) |
| `tz`   | `/lango-la-harusi-qr`                          | `/wedding-gate-qr-check-in`                       | —                                                        |
| `tz`   | `/maneno-ya-kadi-ya-harusi`                    | `/wedding-invitation-wording`                     | `ke:wedding-invitation-wording` (from KE side)           |
| `tz`   | `/kadi-za-harusi-online`                       | `/online-wedding-cards-whatsapp-sms`              | —                                                        |
| `tz`   | `/kadi-ya-send-off-kitchen-party`              | `/send-off-and-kitchen-party-invitations`         | —                                                        |
| `tz`   | `/mwaliko-bila-smartphone`                     | `/invitations-for-elders-without-smartphones`     | —                                                        |
| `tz`   | `/kadi-sasa-vs-karatasi-na-zana-za-kubuni`     | `/kadi-sasa-vs-paper-vs-design-tools`             | —                                                        |
| `tz`   | `/gharama-halisi-za-huduma-ya-mialiko`         | `/what-an-invitation-service-really-costs`        | —                                                        |
| `tz`   | `/jinsi-ya-kuunda-kadi-ya-harusi-tanzania`     | `/how-to-create-a-wedding-invitation-in-tanzania` | —                                                        |
| `tz`   | `/kadi-ya-mtandaoni-vs-karatasi`               | `/online-vs-paper-wedding-invitations`            | —                                                        |
| `tz`   | `/kutuma-kadi-za-mwaliko-whatsapp`             | `/send-wedding-invitations-whatsapp`              | —                                                        |
| `tz`   | `/kusimamia-majibu-ya-rsvp`                    | `/managing-rsvp-responses`                        | —                                                        |
| `tz`   | `/maswali`                                     | `/faq`                                            | —                                                        |
| `tz`   | `/kuhusu`                                      | `/about`                                          | —                                                        |
| `tz`   | `/mawasiliano`                                 | `/contact`                                        | —                                                        |
| `tz`   | `/privacy` (served under `/sw/privacy`)        | `/privacy`                                        | `ke:privacy`                                             |
| `tz`   | `/terms` (served under `/sw/terms`)            | `/terms`                                          | `ke:terms`                                               |
| `tz`   | `/cookies` (served under `/sw/cookies`)        | `/cookies`                                        | —                                                        |
| `tz`   | `/ombi-la-data`                                | `/data-request`                                   | `ke:data-requests`                                       |
| `tz`   | `/matumizi-yanayokubalika`                     | `/acceptable-use`                                 | —                                                        |
| `ke`   | `/ke` (EN canonical)                           | `/ke`                                             | `/` & `/ug`                                              |
| `ke`   | —                                              | `/ke/wedding-committee-guide`                     | —                                                        |
| `ke`   | —                                              | `/ke/wedding-contributions-guide`                 | `tz:michango-ya-harusi`                                  |
| `ke`   | —                                              | `/ke/wedding-invitation-wording`                  | `tz:maneno-ya-kadi-ya-harusi`                            |
| `ke`   | —                                              | `/ke/is-a-digital-wedding-invitation-safe`        | `tz:usalama-wa-kadi-za-mtandaoni`                        |
| `ke`   | —                                              | `/ke/digital-wedding-invitations-kenya`           | `tz:kadi-ya-harusi-mtandaoni`                            |
| `ke`   | —                                              | `/ke/ruracio-harambee-invitations-contributions`  | —                                                        |
| `ke`   | —                                              | `/ke/privacy`                                     | `tz:privacy`                                             |
| `ke`   | —                                              | `/ke/terms`                                       | `tz:terms`                                               |
| `ke`   | —                                              | `/ke/data-requests`                               | `tz:ombi-la-data`                                        |
| `ug`   | —                                              | `/ug`                                             | `/` & `/ke`                                              |
| `ug`   | —                                              | `/ug/kwanjula-kuhingira-digital-invitation`       | —                                                        |
| `ug`   | —                                              | `/ug/uganda-wedding-pledge-cards-guide`           | —                                                        |
| `ug`   | —                                              | `/ug/uganda-wedding-committee-guide`              | —                                                        |
| `ug`   | —                                              | `/ug/ecard-uganda-vs-paper`                       | —                                                        |

_(Note: Core marketing routes `/`, `/sw`, `/bei`, `/sw/bei`, `/programu`, `/sw/programu`, `/ke`, `/ug` are also included in `sitemapEntries`.)_

---

## Prompt 4: Structured Data Audit

- **Implemented**: `pricingOffersNode(catalog, currency, locale)` emits schema.org `AggregateOffer` directly from `PricingCatalog` (wired onto `/bei` and home pages), `Article.datePublished` uses `page.published ?? page.updated` in `ContentPage`, and single-item `BreadcrumbList` was removed from `HomePage`.
- **Optional / Empty schema fields to fill when available**:
  - `Organization.sameAs`: currently omitted / empty until official social handles (TikTok, Instagram, WhatsApp Channel) are verified and live.
- **Free starter cards aligned (`packages/schemas/src/billing.ts`)**: `DEFAULT_PRICING.free.cards` has been updated from `10` to `5` (`messages: 40`) to match the prompt pack and marketing copy across `/`, `/bei`, comparison guides, and ad creatives.
  - [ ] **Ops DB check (`NEEDS-HUMAN-CONFIRMATION`)**: If production `pricing_settings` has a custom JSON row saved in Postgres, verify its `free.cards` matches `5` before launch (default fallback is `5`).

---

## Prompt 5: Swahili Answer-First Pages (Native Kiswahili Review)

Pages created/expanded in natural Tanzanian Kiswahili (`647–853` Swahili words each):

1. `kadi-za-harusi-online` ([swahili-answers.ts](file:///c:/Users/yusuf/Documents/github/kadika/apps/web/src/content/pages/swahili-answers.ts))
2. `michango-ya-harusi` ([products.ts](file:///c:/Users/yusuf/Documents/github/kadika/apps/web/src/content/pages/products.ts))
3. `kadi-ya-send-off-kitchen-party` ([swahili-answers.ts](file:///c:/Users/yusuf/Documents/github/kadika/apps/web/src/content/pages/swahili-answers.ts))
4. `mwaliko-bila-smartphone` ([swahili-answers.ts](file:///c:/Users/yusuf/Documents/github/kadika/apps/web/src/content/pages/swahili-answers.ts))

- [ ] **Native Kiswahili Reviewer**: Read through all 4 pages plus [apps/web/src/content/home.ts](file:///c:/Users/yusuf/Documents/github/kadika/apps/web/src/content/home.ts) `sw()` hero copy and [docs/marketing/social-whatsapp-content-engine.md](file:///c:/Users/yusuf/Documents/github/kadika/docs/marketing/social-whatsapp-content-engine.md) elder templates (`Shikamoo`, `kamati`, `mweka hazina`, `ukumbi`, `mchango`, `kadi za mwanzo`). Flag any stiff phrasing before publishing.

---

## Prompt 6: `[VERIFY]` Items in Comparison & Choosing Guides

All non-provable category claims in [apps/web/src/content/pages/comparisons.ts](file:///c:/Users/yusuf/Documents/github/kadika/apps/web/src/content/pages/comparisons.ts) are explicitly tagged `[VERIFY]` and **must be confirmed or removed** before publishing (zero named competitors are criticized):

### Page 1: `kadi-sasa-vs-karatasi-na-zana-za-kubuni` / `kadi-sasa-vs-paper-vs-design-tools`

- Lines 44–45 / 147–148: Printing & envelope per-card cost vs design subscription lack of SMS/gate.
- Lines 50–51 / 153–154: Reprinting costs & re-exporting static images when event times/venues change.
- Lines 56–57 / 159–160: Paper distribution speed for distant relatives; static images not reaching feature phones.
- Lines 62–63 / 165–166: Manual call/notebook RSVP tracking on paper vs lack of structured RSVP tracking on design tools.
- Lines 68–69 / 171–172: Paper card copying/forging and unrestricted image forwarding risk.
- Lines 81, 95, 119 (SW) & 184, 198, 222 (EN): Prose restatements of reprint/re-export costs, static PDF limitations, and third-party fundraising percentage fees.

### Page 2: `gharama-halisi-za-huduma-ya-mialiko` / `what-an-invitation-service-really-costs`

- Lines 264, 269, 274, 279, 284 (SW) & 362, 367, 372, 377, 382 (EN): Comparison table claims that print shops charge from card #1, competitor advertised starting prices (explicitly re-verify TZS 1,300 market example if kept), SMS add-on billing, third-party contribution percentage cuts, and online-only gate failure catering waste.
- Lines 310, 314 (SW) & 408, 412 (EN): Prose risk examples (`TZS 15 million` michango budget illustration & gate catering impact).

- [ ] **Reviewer sign-off**: Remove every `[VERIFY]` tag once checked or rewrite to verified facts only.

---

## Prompt 7: Kenya `/ke` `NEEDS-HUMAN-CONFIRMATION` List

Because Kenya pricing has not been set yet, `/ke` remains in **pilot status with no KES prices published**:

- [ ] **`NEEDS-HUMAN-CONFIRMATION` — KES Pricing**: Confirm final KES per-card tiers, starter allowance, and SMS credit pricing before launching paid plans in Kenya.
- [ ] **`NEEDS-HUMAN-CONFIRMATION` — Mobile Money Wording**: Verify Kenyan M-Pesa **Paybill** (with account number) and **Till / Buy Goods** instructions in [apps/web/src/content/pages/kenya.ts](file:///c:/Users/yusuf/Documents/github/kadika/apps/web/src/content/pages/kenya.ts) match live Kenyan host workflows.
- [ ] **`NEEDS-HUMAN-CONFIRMATION` — Cultural Terms & Examples**: Review `ruracio`, `harambee`, church fundraiser phrasing, `shosho`/`guka` elder wording, and venue references (Karen, Runda, Mombasa, Kisumu, Nakuru) and demo names (`Wanjiru & Otieno`, `Grace Wambui`, `Mr & Mrs Kamau`) with someone living in Kenya.
- [ ] **`NEEDS-HUMAN-CONFIRMATION` — Telecom Readiness**: Confirm `+254` SMS sender ID / Africa's Talking production status (`docs/ops/kenya-pilot-runbook.md`) before turning off pilot notice.

---

## Prompts 8 & 9: Referrals, Analytics & Privacy Compliance

- **Configurable referral reward**: `REFERRAL_REWARD_CARDS=10`, `REFERRAL_MIN_PAID_CARDS=20` in [apps/api/src/config.ts](file:///c:/Users/yusuf/Documents/github/kadika/apps/api/src/config.ts) & [.env.example](file:///c:/Users/yusuf/Documents/github/kadika/.env.example).
- **Corporate safeguard**: `showReferralFooter` defaults to `false` for corporate events (`occasionOf(kind) === 'corporate'`) unless organiser explicitly enables it in event settings.
- **Privacy & Cookie Consent check**:
  - `/login?...&ref=...` link on guest cards carries ONLY `utm_source=guest_card`, `utm_medium=referral`, `utm_campaign=<event_kind>`, and `ref=<host_referral_code>` — zero guest names, phones, or tokens.
  - Attribution uses `sessionStorage` (`ks.attribution.v1`), setting zero cookies (aligned with `/cookies`).
  - `POST /v1/analytics` and `analytics_events` accept only allow-listed keys, respect `doNotTrack`, set zero cookies, and store no guest PII.
- [ ] **Privacy / Legal owner**: Review against `/privacy` and `/cookies` pages prior to turning `ANALYTICS_ENABLED=1` on in production.

---

## Prompts 10, 11 & 12: Content, Partner Outreach & Paid Test Placeholders

- [ ] **Prompt 10 (`[CUSTOMER STORY NEEDED]`)**: Posts **#12** (`2026-12-16`) and **#17** (`2026-12-23`) in [social-whatsapp-content-engine.md](file:///c:/Users/yusuf/Documents/github/kadika/docs/marketing/social-whatsapp-content-engine.md) require real verified committee interviews & written permission before production.
- [ ] **Prompt 11 (`[PARTNER_REWARD_PLACEHOLDER]`)**: Business to confirm exact partner referral reward tier (currently using `REFERRAL_REWARD_CARDS=10` when referred account sends `≥20` paid cards) in [vendor-committee-outreach-kits.md](file:///c:/Users/yusuf/Documents/github/kadika/docs/marketing/vendor-committee-outreach-kits.md).
- [ ] **Prompt 12 (`[BUSINESS_TO_FILL]`)**: Fill daily Meta/TikTok budgets (`TZ` & `KE`) and `TARGET_COST_PER_EVENT_CREATED` / pause thresholds in [paid-test-plan.md](file:///c:/Users/yusuf/Documents/github/kadika/docs/marketing/paid-test-plan.md) before any spend starts.
