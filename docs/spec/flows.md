# Core flows

## 7.1 Organizer onboarding (mobile)

1. Phone number + OTP login.
2. Create event (names, date, venue with map pin, language, theme).
3. Import guests: paste list, CSV, or contacts picker; normalise to E.164 (`+255…`); dedupe.
4. Choose card template; preview.
5. Choose delivery per guest group: WhatsApp / SMS / Print / Mixed.
6. Send (queued) → dashboard.

## 7.2 Delivery

- WhatsApp: template message with link `https://<domain>/c/<token>` and OG preview image.
- SMS fallback (also for non-WhatsApp numbers), ≤ 160 chars, Swahili default:
  `Karibu kwenye harusi ya {A} & {B}, {tarehe}. Kadi yako: {shortlink} Namba: {code}`
- Auto-fallback: if WhatsApp undelivered after N hours → SMS.
- Print: batch PDF, one card per guest, with QR + code.
- Verified-sender line on every landing page: "Mwaliko huu umetumwa na {couple/committee}. Simu ya kamati: {phone}".

## 7.3 Guest card page (web, `/c/<token>`)

- Initial load < 100 KB, works on 3G, no heavy animation by default.
- Shows: names, date, venue, map button, dress code, RSVP buttons (Nitahudhuria / Sitahudhuria), party size selector, QR (inline SVG), short code, add-to-calendar (.ics), pledge status and pay button (if enabled).
- Offer high-contrast PNG download of the QR; show a "raise screen brightness" hint.
- Service worker caches the page so the QR is visible **offline after first open**.
- PWA "Add to home screen"; "Save as PDF" button.

## 7.4 RSVP

- Recorded against guest token; no login. Rate-limited; idempotent.
- Reminder scheduler (BullMQ): T-14, T-7, T-1 days, respecting opt-out.

## 7.5 Pledges and payments

- Committee records pledge per guest; guest pays via mobile-money push from the card page; committee can record cash/manual payments.
- Webhook with signature verification, idempotent by `provider_ref`.
- Dashboard: target vs collected, pledged vs paid, per-guest balance, CSV/PDF export.
- **Policy toggle (default OFF):** "Require minimum pledge before card is issued." Must be explicitly enabled by the organizer.

## 7.6 Gate check-in (mobile, offline-first)

1. Gate agent joins via event gate link + PIN.
2. App downloads guest list, public key, revocations into SQLite.
3. Scan → verify signature locally → look up guest → large green/red result with name, party size, group; balance shown to committee role only.
4. Scans are stored locally and **synced** when online with retry/backoff. Conflict rule: earliest `scanned_at` wins admission; later scans flagged `duplicate`.
5. Multiple gate devices sync via API with periodic delta pull of "already admitted".
6. Large text, high contrast, haptic + sound feedback, torch toggle.

## 7.7 Dashboard and reports

- Funnel: invited → sent → delivered → opened → confirmed → attended.
- Headcount forecast (sum of confirmed party sizes); pledge totals.
- Post-event report export and thank-you broadcast.
