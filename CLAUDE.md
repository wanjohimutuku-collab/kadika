# Harusi Pass — Build Specification for Claude Code

> Working name: **Harusi Pass** (rename freely). A Tanzanian wedding invitation, RSVP, contribution (michango) and gate-check-in platform. Mobile-first, offline-capable, Swahili-first.

This file is the source of truth. Read it fully before writing code. Build in the phase order in §13. Do not skip the acceptance criteria.

---

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

---

## 2. Users and roles

- **Couple / Organizer (owner):** creates event, imports guests, sends invites, views dashboard.
- **Committee member (staff):** limited role: manage guests, record pledges/payments, run gate scanner.
- **Gate agent:** scanner only, per-event PIN or invite link; no access to financial data.
- **Guest:** receives card, RSVPs, optionally pays pledge, shows QR/code at gate. No account required.

---

## 3. Recommended stack (mobile-first)

Chosen so that **one TypeScript codebase serves the guest web card, the organizer mobile app, and the gate scanner**, and so deployment fits the existing **Contabo VPS + Coolify** setup with images built in **GitHub Actions**.

| Layer | Choice | Why |
|-------|--------|-----|
| Monorepo | **pnpm workspaces + Turborepo** | Share types, validation, QR/crypto code between apps |
| Language | **TypeScript (strict)** everywhere | One language, shared schemas |
| Mobile app (organizer + gate) | **Expo (React Native) + Expo Router** | Fast iteration, camera/QR, SQLite, OTA updates, Android-first (dominant in Tanzania) |
| Mobile local DB (offline gate) | **expo-sqlite** (+ Drizzle ORM sqlite driver) | Offline guest list and scan log |
| QR scanning | **expo-camera** (barcode scanning) | Maintained, works offline |
| Guest web card | **Next.js (App Router)** | SSR/ISR for fast, light, shareable pages; OG tags for WhatsApp previews |
| Styling | **Tailwind CSS** (web), **NativeWind** (mobile) | Shared design tokens |
| API | **Hono** on Node with **zod** validation | Small, fast, typed; shares schemas with clients |
| API contract | **OpenAPI generated from zod** (`@hono/zod-openapi`) + typed client package | Mobile and web consume one client |
| Database | **PostgreSQL 16** + **Drizzle ORM** + drizzle-kit migrations | Reliable, typed |
| Cache / queues | **Redis** + **BullMQ** | Message sending, retries, rate limits |
| Auth (organizers/staff) | **Better Auth** with phone+OTP and email/password; JWT access + refresh | Phone-first login suits Tanzania |
| Crypto | **Ed25519 via `@noble/ed25519`** | Signed QR payloads verifiable offline |
| Short codes / IDs | **nanoid** (custom alphabet, no ambiguous chars) | Human-readable codes |
| PDF/print cards | **@react-pdf/renderer** or **Playwright PDF** | Print-ready cards with enforced QR spec |
| QR rendering | **`qrcode`** (server) / **react-native-qrcode-svg** (mobile) | Error-correction level control |
| Messaging | **WhatsApp Business Cloud API** (primary), **SMS gateway adapter** (Beem / Africa's Talking / NextSMS, pluggable) | Interface-based so providers can be swapped |
| Payments | **Aggregator adapter** (Selcom / AzamPay / ClickPesa — pick one for v1) behind a `PaymentProvider` interface | Covers M-Pesa, Mixx, Airtel Money, banks |
| File storage | **S3-compatible (MinIO on VPS or Cloudflare R2)** | Card images, PDFs |
| Observability | **pino** logs, **Sentry**, **Uptime Kuma** | Cheap and self-hostable |
| Testing | **Vitest** (unit), **Playwright** (web e2e), **Maestro** (mobile e2e) | |
| CI/CD | **GitHub Actions → build Docker images → push to GHCR → Coolify deploy webhook** | Matches existing workflow |
| Hosting | **Contabo VPS + Coolify** (API, web, Postgres, Redis, MinIO as Coolify services) | Existing infra |
| Mobile builds | **EAS Build** (Android APK/AAB first; iOS later) | |

### Explicitly rejected

- Third-party dynamic QR generators (P6: link rot, expiry, scan limits).
- Native Kotlin/Swift in v1 (cost).
- Flutter (decision confirmed: Expo stays): Dart cannot share the crypto, schemas, and API client with the TypeScript API and web.
- Firebase-only backend (data residency, cost, offline-conflict control is weaker for the gate).

---

## 4. Monorepo layout

```
harusi-pass/
├─ CLAUDE.md                  # this file
├─ package.json  pnpm-workspace.yaml  turbo.json  tsconfig.base.json
├─ apps/
│  ├─ api/                    # Hono API + BullMQ workers
│  ├─ web/                    # Next.js: guest card, RSVP, pay, minimal admin
│  └─ mobile/                 # Expo app: organizer + gate scanner
├─ packages/
│  ├─ db/                     # Drizzle schema + migrations + seed
│  ├─ schemas/                # zod schemas (shared)
│  ├─ api-client/             # generated typed client
│  ├─ crypto/                 # QR payload sign/verify (isomorphic, works in RN)
│  ├─ messaging/              # WhatsApp + SMS provider adapters
│  ├─ payments/               # PaymentProvider adapters
│  ├─ ui-tokens/              # colors, spacing
│  └─ i18n/                   # sw.json, en.json
├─ infra/
│  ├─ docker/                 # Dockerfile.api, Dockerfile.web
│  └─ coolify/                # env templates, deploy notes
└─ .github/workflows/         # ci.yml, build-push.yml, mobile-eas.yml
```

---

## 5. Domain model (Postgres)

All IDs are UUIDv7. All tables have `created_at`, `updated_at`. Amounts are stored in **TZS as integer** (no decimals).

- `users` (id, name, phone_e164 unique, email?, role_global)
- `events` (id, owner_id, title, couple_names, date_start, venue_name, venue_lat, venue_lng, venue_map_url, dress_code, language_default, timezone default `Africa/Dar_es_Salaam`, status, signing_key_id, brand_theme jsonb, rsvp_deadline, contribution_target_tzs?, plan)
- `event_members` (event_id, user_id, role: owner|committee|gate, pin_hash?)
- `guests` (id, event_id, display_name, phone_e164?, has_smartphone bool?, group_label, party_size_allowed default 1, short_code unique per event, token_version int default 1, language, invite_channel_pref, notes, deleted_at)
- `invitations` (id, guest_id, token_hash, status enum[created, queued, sent, delivered, opened, confirmed, declined, checked_in], sent_at, delivered_at, opened_at, rsvp_at, rsvp_party_size, channel_last)
- `message_log` (id, guest_id, channel enum[whatsapp, sms, print], provider, provider_msg_id, status, error, cost_tzs?, created_at)
- `pledges` (id, guest_id, amount_tzs, note, status enum[pledged, partial, paid, waived], created_by)
- `payments` (id, pledge_id?, guest_id, provider, provider_ref unique, amount_tzs, status enum[pending, success, failed], phone_e164, paid_at, raw jsonb)
- `scan_log` (id, event_id, guest_id?, scanned_by, device_id, result enum[ok, duplicate, invalid_sig, wrong_event, not_found, manual_ok, manual_denied], party_admitted, scanned_at (device time), synced_at, offline bool)
- `signing_keys` (id, event_id, public_key, private_key_encrypted, created_at, revoked_at)
- `audit_log` (id, actor_id, action, entity, entity_id, diff jsonb, ip, created_at)

Indexes: `guests(event_id, short_code)`, `guests(event_id, phone_e164)`, `scan_log(event_id, guest_id)`, `invitations(status)`.

---

## 6. QR and code design (critical)

### 6.1 Payload

Signed, compact, verifiable **offline**. Format (base64url, no padding):

```
v1.<eventId8>.<guestId8>.<partySize>.<ver>.<sigB64u>
```

- `sig = Ed25519(privateKey, "v1|" + eventId + "|" + guestId + "|" + partySize + "|" + ver)`.
- The mobile gate app stores the event **public key** and verifies signatures locally.
- The QR content is the signed token (not a URL). A **separate "open card" URL** (`https://<domain>/c/<token>`) is used in SMS/WhatsApp/print text.
- Print cards also show the **short code** (e.g. `KH-4821`): 2 letters + 4 digits, alphabet excludes `0 O 1 I L`.

### 6.2 Lookup fallbacks at the gate (all must work)

1. Scan QR (offline verify)
2. Type short code
3. Search by name or last 4 phone digits (local SQLite FTS)
4. Manual override with reason (logged; requires owner/committee role)

### 6.3 Duplicate and revocation

- First successful scan → mark admitted with `party_admitted`.
- Second scan → `duplicate` result, show who/when/where scanned first.
- Organizer can **reissue** a guest: increments `token_version`; old QR becomes invalid. Revocation list is synced to gate devices.

### 6.4 Print spec (enforced in PDF generator)

- Black modules on white background only; no gradients, logos, or patterned areas behind QR.
- Error correction **M**.
- Quiet zone ≥ 4 modules.
- Minimum printed size **25 mm** square; module size ≥ **0.8 mm**. Fail the build of the PDF if a template would shrink below.
- Always print the short code in ≥ 12 pt beside the QR.
- Provide a "Print test sheet" with QR at 20/25/30 mm.

---

## 7. Core flows

### 7.1 Organizer onboarding (mobile)

1. Phone number + OTP login.
2. Create event (names, date, venue with map pin, language, theme).
3. Import guests: paste list, CSV, or contacts picker; normalise to E.164 (`+255…`); dedupe.
4. Choose card template; preview.
5. Choose delivery per guest group: WhatsApp / SMS / Print / Mixed.
6. Send (queued) → dashboard.

### 7.2 Delivery

- WhatsApp: template message with link `https://<domain>/c/<token>` and OG preview image.
- SMS fallback (also for non-WhatsApp numbers), ≤ 160 chars, Swahili default:
  `Karibu kwenye harusi ya {A} & {B}, {tarehe}. Kadi yako: {shortlink} Namba: {code}`
- Auto-fallback: if WhatsApp undelivered after N hours → SMS.
- Print: batch PDF, one card per guest, with QR + code.
- Verified-sender line on every landing page: “Mwaliko huu umetumwa na {couple/committee}. Simu ya kamati: {phone}”.

### 7.3 Guest card page (web, `/c/<token>`)

- Initial load < 100 KB, works on 3G, no heavy animation by default.
- Shows: names, date, venue, map button, dress code, RSVP buttons (Nitahudhuria / Sitahudhuria), party size selector, QR (inline SVG), short code, add-to-calendar (.ics), pledge status and pay button (if enabled).
- Offer high-contrast PNG download of the QR; show a "raise screen brightness" hint.
- Service worker caches the page so the QR is visible **offline after first open**.
- PWA "Add to home screen"; "Save as PDF" button.

### 7.4 RSVP

- Recorded against guest token; no login. Rate-limited; idempotent.
- Reminder scheduler (BullMQ): T-14, T-7, T-1 days, respecting opt-out.

### 7.5 Pledges and payments

- Committee records pledge per guest; guest pays via mobile-money push from the card page; committee can record cash/manual payments.
- Webhook with signature verification, idempotent by `provider_ref`.
- Dashboard: target vs collected, pledged vs paid, per-guest balance, CSV/PDF export.
- **Policy toggle (default OFF):** "Require minimum pledge before card is issued." Must be explicitly enabled by the organizer.

### 7.6 Gate check-in (mobile, offline-first)

1. Gate agent joins via event gate link + PIN.
2. App downloads guest list, public key, revocations into SQLite.
3. Scan → verify signature locally → look up guest → large green/red result with name, party size, group; balance shown to committee role only.
4. Scans are stored locally and **synced** when online with retry/backoff. Conflict rule: earliest `scanned_at` wins admission; later scans flagged `duplicate`.
5. Multiple gate devices sync via API with periodic delta pull of "already admitted".
6. Large text, high contrast, haptic + sound feedback, torch toggle.

### 7.7 Dashboard and reports

- Funnel: invited → sent → delivered → opened → confirmed → attended.
- Headcount forecast (sum of confirmed party sizes); pledge totals.
- Post-event report export and thank-you broadcast.

---

## 8. API (Hono, REST, `/v1`)

Auth: Bearer JWT (organizer/staff); guest endpoints use the opaque card token.

```
POST   /v1/auth/otp/request        POST /v1/auth/otp/verify     POST /v1/auth/refresh
GET    /v1/events                  POST /v1/events              GET/PATCH /v1/events/:id
POST   /v1/events/:id/members      DELETE /v1/events/:id/members/:uid
GET    /v1/events/:id/guests       POST /v1/events/:id/guests   POST /v1/events/:id/guests/import
PATCH  /v1/guests/:id              DELETE /v1/guests/:id        POST /v1/guests/:id/reissue
POST   /v1/events/:id/invitations/send
GET    /v1/events/:id/invitations/stats
POST   /v1/events/:id/cards/pdf
GET    /v1/events/:id/gate/bundle           # guests, pubkey, revocations (ETag)
POST   /v1/events/:id/gate/scans/sync       # batch of offline scans
GET    /v1/events/:id/pledges    POST /v1/guests/:id/pledges    POST /v1/payments/manual
POST   /v1/payments/webhook/:provider
GET    /v1/c/:token                         # guest card data (public)
POST   /v1/c/:token/rsvp
POST   /v1/c/:token/pay
POST   /v1/webhooks/whatsapp   POST /v1/webhooks/sms
```

Rules: zod-validate every input; error shape `{ error: { code, message, details? } }`; cursor pagination; idempotency keys on send/pay/sync.

---

## 9. Security and trust

- Guest tokens: 128-bit random; store only the **hash**; constant-time compare.
- Private signing keys encrypted at rest (AES-GCM, key from env/secret store); never leave the server.
- Redis rate limiting on OTP, RSVP, pay, token lookup.
- Phone numbers are personal data: collect minimum, support deletion/export, follow Tanzania's Personal Data Protection Act; link a privacy notice from every card.
- Never send attachments/APKs; never ask guests for passwords or OTPs. Landing pages show sender + domain.
- Verify signatures on WhatsApp, SMS and payment webhooks.
- Audit log for admin actions, manual overrides, payment changes.
- Gate PIN brute-force lockout; device registration for gate agents.
- CSP, HSTS, secure cookies; dependency audit in CI.

---

## 10. Performance, connectivity, localisation

- Swahili default; English toggle; strings in `packages/i18n`. Timezone `Africa/Dar_es_Salaam`; currency `TZS`.
- Guest web: LCP < 2.5 s on throttled Slow 4G; JS budget < 120 KB gz; AVIF/WebP images with fallback.
- Mobile: Android 8+ (API 26), test on 2 GB RAM devices; APK < 40 MB.
- Gate is offline-first; organizer actions use optimistic UI + sync queue.
- Short links on our own short domain, under our control.

---

## 11. DevOps

- Environments: `dev` (docker compose) → `staging` (Coolify) → `prod` (Coolify).
- Docker: multi-stage, non-root, healthchecks (`infra/docker/Dockerfile.api`, `Dockerfile.web`). Local compose: postgres, redis, minio, mailpit.
- GitHub Actions: `ci.yml` (install, typecheck, lint, test, build); `build-push.yml` (build images → GHCR → Coolify deploy webhook); `mobile-eas.yml` (EAS preview on PR label, production on tag). Run `drizzle-kit migrate` as a release step before API start.
- Backups: nightly `pg_dump` to object storage, 14-day retention; restore drill in `infra/coolify/RESTORE.md`.
- Env template (`.env.example`): `DATABASE_URL, REDIS_URL, JWT_SECRET, KEY_ENC_SECRET, S3_*, WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_VERIFY_TOKEN, SMS_PROVIDER, SMS_API_KEY, SMS_SENDER_ID, PAYMENT_PROVIDER, PAYMENT_API_KEY, PAYMENT_WEBHOOK_SECRET, APP_BASE_URL, SHORT_BASE_URL, SENTRY_DSN`

---

## 12. Engineering conventions

- TypeScript strict, ESLint + Prettier, `no-explicit-any`.
- Conventional Commits; small PRs; one branch per phase.
- Every external provider behind an interface (`MessagingProvider`, `PaymentProvider`) with a **fake in-memory implementation** for tests and local dev.
- Business logic in service modules, not route handlers.
- Money in integer TZS; times stored UTC.
- Tests alongside features; minimum unit tests for crypto, code generation, phone normalisation, pledge math, scan conflict resolution.
- Never log tokens, OTPs, private keys, or full phone numbers.
- Record decisions in `docs/adr/NNN-title.md`.

---

## 13. Build phases and acceptance criteria

### Phase 0 — Foundations
Monorepo, tooling, CI, docker compose, Drizzle schema + migrations, seed, health endpoint, `.env.example`.
**Done when:** `pnpm i && pnpm dev` runs API + web + mobile dev server; CI green.

### Phase 1 — Core API + crypto
Phone-OTP auth (fake SMS provider), events, guests (CRUD, CSV import, phone normalisation, dedupe), short-code generator, signing keys, QR sign/verify package.
**Done when:** tests prove tampered payload fails, wrong-event payload fails, reissue invalidates the old token, and the code alphabet has no ambiguous characters.

### Phase 2 — Guest card web
`/c/:token`, RSVP, ICS, QR SVG/PNG, offline service worker, OG image, Swahili/English.
**Done when:** Lighthouse mobile performance ≥ 90 on throttled profile; QR visible offline after first load; RSVP idempotent.

### Phase 3 — Delivery
WhatsApp + SMS adapters, BullMQ, retries, delivery webhooks, WhatsApp→SMS fallback, reminders, message log, print PDF batch with enforced QR spec and test sheet.
**Done when:** a 500-guest send with simulated failures ends in correct statuses; PDF QR passes size/quiet-zone assertions; printed test sheet scans on ≥ 3 phones (checklist in `docs/qa/print-test.md`).

### Phase 4 — Organizer mobile app
Expo app: login, event create, guest import (contacts/paste/CSV), send, dashboard, guest detail, reissue, member invites.
**Done when:** full organizer journey works on a low-end Android device; EAS preview build installs.

### Phase 5 — Gate scanner (offline-first)
Bundle download, SQLite, offline verify, four fallback paths, duplicate handling, sync with conflict rule, multi-device test.
**Done when:** in airplane mode, 200 mixed scans (valid, duplicate, forged, wrong-event, manual) give correct results; after reconnect the server `scan_log` matches with zero lost scans; two devices scanning the same guest yield one admit + one duplicate.

### Phase 6 — Pledges and payments
Pledge CRUD, manual payments, aggregator sandbox integration, webhook idempotency, pay-from-card, dashboard, exports.
**Done when:** replaying one webhook 5× records one payment; balances reconcile in tests; exports are correct.

### Phase 7 — Hardening and launch
Rate limits, audit views, privacy pages, backup/restore drill, load test (1,000 concurrent card views, 20 gate devices), Sentry, uptime checks, pilot with 2–3 real weddings.
**Done when:** pilot KPIs in §14 are measured and reported.

---

## 14. Success metrics (pilot)

- ≥ 95% of guests reached via any channel
- Card open rate and RSVP conversion
- First-attempt gate scan success ≥ 95%; share of manual fallbacks
- Median gate time per guest < 8 s
- Zero lost scans after sync; zero duplicate admissions
- Share of guests served via the SMS/feature-phone path
- Support contacts per event

---

## 15. Open decisions (default shown; confirm before Phase 3 and 6)

1. Brand name and domains (default: placeholder `harusipass.*` plus a short domain).
2. WhatsApp: Cloud API directly vs via a BSP (default: Cloud API).
3. SMS gateway for v1 (default: Beem or Africa's Talking behind the adapter).
4. Payment aggregator for v1 (default: one with M-Pesa, Mixx, Airtel Money push + webhooks, behind `PaymentProvider`).
5. Pricing model (per event vs per card); keep billing out of v1 except an event `plan` field.
6. Organizer web dashboard in v1 (default: mobile only; web card + minimal admin).

When a default is unconfirmed, implement behind the interface, use the fake provider, and note it in `docs/adr/`.

---

## 16. Out of scope for v1

Seating charts, vendor marketplace, photo galleries, live streaming, multi-day multi-ceremony scheduling, iOS gate scanner (Android first), in-app chat.
