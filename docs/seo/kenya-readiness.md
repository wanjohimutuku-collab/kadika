# Kenya pages and what the product still needs for Kenya

Date: 2026-10-15. Decisions: one domain with a `/ke` folder; English and Swahili; English is the default
language on `/ke` pages (`/ke?lang=sw` for Swahili).

## 1. What was built

Five pages under `/ke`, in `apps/web/src/content/pages/kenya.ts`, rendered by the same content system as
the Tanzania pages (answer box, sections, FAQ, JSON-LD, breadcrumbs `Home > Kenya > page`).

| Path | Targets | Counterpart (Tanzania) |
|---|---|---|
| `/ke` | digital wedding invitations Kenya | `/kadi-ya-harusi-mtandaoni` |
| `/ke/wedding-committee-guide` | how to run a wedding committee Kenya | none |
| `/ke/wedding-contributions-guide` | wedding contributions, harambee, M-Pesa | `/michango-ya-harusi` |
| `/ke/wedding-invitation-wording` | wedding, ruracio, introduction, kitchen party wording | `/maneno-ya-kadi-ya-harusi` |
| `/ke/is-a-digital-wedding-invitation-safe` | is a digital invitation a scam, Kenya | `/usalama-wa-kadi-za-mtandaoni` |

Technical: hreflang is region-specific where a page has a counterpart (`sw-TZ`, `en-TZ`, `sw-KE`,
`en-KE`, `x-default` = Tanzania Swahili) and reciprocal from both sides (tested). Kenya-only pages use
`en-KE`, `sw-KE`. Sitemap (22 URLs), footer "Kenya" column and `/llms.txt` include them. The call to
action on Kenya pages is "Want this in Kenya? Tell us" (contact page), not "Get started".

## 2. Why the pages do not claim Kenyan support

The product cannot serve a Kenyan organiser today, so the pages say so on every page and are useful guides
rather than product claims:

| Gap | Where | Needed for Kenya |
|---|---|---|
| Phone numbers | `packages/schemas/src/phone.ts` accepts only `+255` mobiles; guests, login and gate lookups depend on it | Accept `+254` (Safaricom, Airtel, Telkom ranges), per-event country, formatting and masking |
| Currency | Done in Phase 1 and 1b (ADR 025): per-event currency, neutral field names, formatting and exports | KES prices and payments (Phase 3) |
| Mobile money | Payment provider adapter targets Tanzanian wallets | M-Pesa Kenya (Daraja STK push, till/paybill) or an aggregator, plus webhook verification |
| Messaging | SMS and WhatsApp providers are configured for Tanzania | Kenyan sender ID registration, SMS gateway and WhatsApp templates |
| Time zone | Default `Africa/Dar_es_Salaam` | `Africa/Nairobi` per event |
| Legal | Privacy and terms cite Tanzania's 2022 data protection law | Kenya's Data Protection Act, 2019 and registration with its data commissioner; counsel to confirm |
| Language and copy | Swahili and English exist; Kenyan wording and idioms need a Kenyan reviewer | Review by a Kenyan Swahili and English speaker |

Until these exist, do not add "works in Kenya", "pay with M-Pesa in Kenya" or KES prices to any page. When
the first item ships, update the availability notes and the FAQ answers on the Kenya pages.

## 3. SEO notes for the Kenya section

- Keywords to validate in Google Keyword Planner (Kenya, English and Swahili) before expanding: wedding
  committee Kenya, wedding contributions Kenya, harambee wedding, wedding fundraiser M-Pesa, ruracio
  invitation wording, kitchen party invitation Kenya, digital wedding invitation Kenya.
- The content is general guidance and uses no unverified statistics. Platform names (M-Changa, OneKitty)
  appear as examples with a prompt to check current fees and rules; do not add fee numbers without a
  source.
- Authority: a Kenyan page on a `.co.tz` domain is a weaker local signal than a `.co.ke` domain. If Kenya
  becomes a real market, revisit a separate domain; the hreflang model already supports moving later.
- Off-site work (Search Console country targeting is not available for a ccTLD-less folder, so rely on
  hreflang and content), Kenyan press and wedding blogs, and local directories still need real accounts
  and outreach.

## 4. Native review

All Kenya text, including the Swahili versions and the ruracio and introduction wording, needs review by
Kenyan readers before launch. Traditions vary by community; the sample wording says "as practised in some
communities" and tells people to check with the elders of both families.
