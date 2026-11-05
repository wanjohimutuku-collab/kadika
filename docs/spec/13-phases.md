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

