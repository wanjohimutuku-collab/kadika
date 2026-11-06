# Product goal, roles, metrics, scope

## 1. Product goal

Replace fragile "QR code on a card" and "link in WhatsApp" invitations with one robust flow that works for **smartphone and feature-phone guests**, **online and offline venues**, and ties **the card to pledges/payments and to gate entry**.

### Problems this must solve (from research)

| ID | Problem | Required behaviour |
|----|---------|--------------------|
| P1 | Guests distrust digital cards (think scam) | Verified-sender landing page, couple/committee name, call-back option, no attachments, no OTP/password requests |
| P2 | Elders expect printed cards | Hybrid: printable card PDF with same QR + human code per guest |
| P3 | Feature-phone guests (~83% feature-phone penetration vs ~45% smartphone) | SMS with short code; gate lookup by code/phone/name; no smartphone needed |
| P4 | QR fails at gate (low brightness, screenshot, no internet) | Offline-validating signed QR, manual fallback, brightness hint |
| P5 | Low contrast / small / blurry printed QR | Print spec enforced by the PDF generator |
| P6 | Link rot / free QR provider outages | Own domain, own short links, own redirect layer, never third-party QR services |
| P7 | Phishing/fake card fear | Always show sender + domain; never ask for credentials |
| P8 | No RSVP tracking | Per-guest link/code; states: created → sent → delivered → opened → confirmed → checked-in |
| P9 | Michango (contribution) separate from card | Pledge + payment status attached to guest; mobile-money payment |
| P10 | Duplicate/forwarded/screenshot cards | Per-guest ID, entry count, scan log, duplicate detection |
| P11 | Gate staffing friction | Any committee member can run the gate from their phone |

## 2. Users and roles

- **Couple / Organizer (owner):** creates event, imports guests, sends invites, views dashboard.
- **Committee member (staff):** limited role: manage guests, record pledges/payments, run gate scanner.
- **Gate agent:** scanner only, per-event PIN or invite link; no access to financial data.
- **Guest:** receives card, RSVPs, optionally pays pledge, shows QR/code at gate. No account required.

## 14. Success metrics (pilot)

- ≥ 95% of guests reached via any channel
- Card open rate and RSVP conversion
- First-attempt gate scan success ≥ 95%; share of manual fallbacks
- Median gate time per guest < 8 s
- Zero lost scans after sync; zero duplicate admissions
- Share of guests served via the SMS/feature-phone path
- Support contacts per event

## 15. Open decisions (default shown; confirm before Phase 3 and 6)

1. Brand name and domains (default: placeholder `harusipass.*` plus a short domain).
2. WhatsApp: Cloud API directly vs via a BSP (default: Cloud API).
3. SMS gateway for v1 (default: Beem or Africa's Talking behind the adapter).
4. Payment aggregator for v1 (default: one with M-Pesa, Mixx, Airtel Money push + webhooks, behind `PaymentProvider`).
5. Pricing model (per event vs per card); keep billing out of v1 except an event `plan` field.
6. Organizer web dashboard in v1 (default: mobile only; web card + minimal admin).

When a default is unconfirmed, implement behind the interface, use the fake provider, and note it in `docs/adr/`.

## 16. Out of scope for v1

Seating charts, vendor marketplace, photo galleries, live streaming, multi-day multi-ceremony scheduling, iOS gate scanner (Android first), in-app chat.
