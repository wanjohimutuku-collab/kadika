# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

<!-- The guest card, organiser console (/app) and staff panel (/ops) are web (apps/web, Next.js).
     The organiser and gate app (apps/mobile) is native Android via Expo. Any design work there should load the Android platform reference. iOS comes later. -->

## Users

- **Organisers (owners):** couples, families and their wedding committees in Tanzania (and Kenya, behind a flag). They create the event, import guests, send cards, follow RSVPs and collect michango. They work mostly from a mid-range Android phone, often on slow or patchy data, and sometimes from a laptop.
- **Resellers and planners:** wedding planners and agents who run events for several clients at once from the console. This is a real secondary audience and design should allow for it.
- **Committee members:** limited staff role. They manage guests, record pledges and payments, and can run the gate.
- **Gate agents:** scanner only, invited by link and PIN, with no access to money. They work at a venue entrance in sun or at night, with a queue in front of them and often no signal. They have usually had no training.
- **Guests:** no account. They range from young smartphone users to elders on feature phones who expect a printed card. Many have reason to suspect that a digital invitation is a scam.
- **Kadi Sasa staff:** support, billing and admin staff in the `/ops` panel.

## Product Purpose

Kadi Sasa replaces the fragile "QR on a card" and "link in WhatsApp" invitation with one flow that works for smartphone and feature-phone guests, online and offline venues, and that links the card to RSVP, pledges and payments, and gate entry. Success is measured as: ≥ 95% of guests reached through some channel, ≥ 95% first-attempt gate scans, median gate time under 8 s, zero lost scans and zero duplicate admissions after sync, and few support contacts per event.

## Positioning

Each guest gets their own signed card that works through every channel: a WhatsApp or SMS link, a printed card with the same QR, and a short human-readable code such as `KH-4821`. The gate verifies the card offline on any committee member's phone. Pledges and mobile-money contributions belong to the same guest record as the invitation. The QR is never a third-party link that can break, and the card never asks the guest for credentials.

## Operating Context

- Cards are delivered on WhatsApp (Cloud API or Evolution), SMS (NextSMS, Beem, Africa's Talking and others) and printed PDFs (A6 or A5, cut-and-collate sheets, a QR test sheet).
- Mobile money: M-Pesa, Mixx, Airtel Money and HaloPesa in Tanzania, and M-Pesa and Airtel in Kenya, plus cash and bank recorded by the committee.
- Event kinds are free text (Harusi, Send-off, Uchumba and others). Wording follows the kind, and the marketing site still talks mainly about weddings.
- Some guests get a contribution-only card: no RSVP and no QR, just a request for michango.
- Production web hosts: `kadisasa.com` (public site and guest card), `app.kadisasa.com` (console), `my.kadisasa.com` (staff panel).
- Typical usage: an organiser imports a few hundred guests weeks ahead, sends in batches, follows the funnel, and then several gate devices check guests in offline on the day.

## Capabilities and Constraints

- The full spec is in `CLAUDE.md`, decisions are in `docs/adr/`, and the UI plan and handoff are in `docs/ui/PLAN.md` and `docs/ui/HANDOFF.md`.
- **Language:** English is the default and Swahili is a full equal, one tap away on every surface. Every string lives in `packages/i18n`, with Kenyan overlays. Swahili copy needs review by a native speaker.
- **Country:** the event carries the country (TZ/KE), and with it the currency (TZS/KES) and time zone. Money is in whole units. Kenya stays behind `*_KENYA_ENABLED` flags.
- **Performance:** the guest card loads under 100 KB initially and its JS stays under 120 KB gz. It works on 3G, LCP is under 2.5 s on Slow 4G, and it shows offline after the first open. The mobile app targets Android 8+ on 2 GB RAM devices.
- **QR integrity:** always black on white with error correction M, a quiet zone of at least 4 modules, at least 25 mm printed, and the short code beside it at 12 pt or more. A theme or organiser edit never changes this.
- **Gate:** offline-first. Results are readable at arm's length, use icon and word together, never block on sync, and show the overlay instantly.
- Organisers can edit card content (`events.card_content`). WhatsApp wording is fixed by the templates Meta approved.
- Out of scope for v1: seating, vendor marketplace, galleries, streaming, multi-session events, ticket sales, in-app chat.
- **Open:** the rename from Harusi Pass to Kadi Sasa is decided but not carried through. The code, strings, app ID (`app.harusipass.mobile`) and spec still say Harusi Pass. Pricing model is undecided (only an event `plan` field exists).

## Brand Commitments

- **Name:** Kadi Sasa (domain `kadisasa.com`). Harusi Pass is the old working name.
- **Voice:** warm and respectful ("Karibu", "Tafadhali"). Elders are addressed formally. Short sentences, no slang, no emoji in system errors.
- **Trust on every guest-facing screen:** the sender's name, the committee phone and the domain. Never attachments, never a request for a password, PIN or OTP.
- **Guest flows:** no dark patterns, ads or upsell.

## Evidence on Hand

- Current UI screenshots at 360 and 1280 px: `docs/ui/screenshots/`. Lighthouse runs: `docs/ui/lighthouse/`.
- QA and usability protocols: `docs/qa/print-test.md`, `docs/qa/gate-device-test.md`, `docs/ux/gate-usability-test.md`. The usability sheet has not been filled in yet.
- Market research: `docs/seo/` (Tanzania site audit, keyword plan, Kenya readiness).
- **Absent:** no pilot results, customer testimonials, real event counts, press or pricing yet. Do not invent any of these on marketing or other surfaces.

## Product Principles

1. **Every guest can get in.** A feature phone, a printed card, a dead screen or no signal at the venue is never a dead end. Every path has a fallback.
2. **Trust is shown, not claimed.** The sender, the phone number and the domain are visible, and nothing ever asks a guest for secrets.
3. **Slow or no data is normal.** Show the last cached data, queue writes, and never block a person on the network.
4. **Card, money and entry are one record.** Invitation, pledge, payment and check-in belong to the same guest.
5. **One thumb, three taps.** Each role reaches its primary action (send, scan, RSVP) quickly on a 360 px Android phone.

## Accessibility & Inclusion

WCAG 2.2 AA minimum. Gate result screens meet AAA contrast (≥ 7:1). Layouts survive 200% font scaling, touch targets are at least 48 dp, and colour is never the only signal. Haptics and sound are optional, and nothing flashes or strobes. Forms have visible labels, a numeric keypad for phone, PIN and amount, and OTP autofill. The design must be friendly to low-literacy users and to guests aged 50+.
