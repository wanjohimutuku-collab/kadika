# Harusi Pass — project TODO

Legend: ☑ done · ◐ built, not verified · ☐ not started. Last checked 2026-10-14. Node 22 + pnpm installed to ~/.local/node (add `~/.local/node/bin` to PATH).

## Phase 0 — Foundations

- ☑ Monorepo, tooling, CI, compose, Drizzle schema, seed, health, `.env.example`

## Phase 1 — Core API + crypto

- ☑ Phone-OTP auth, events, members, guests (CRUD, import, dedupe), signing keys, Ed25519 QR (commit e760834)
- ☑ Cursor pagination + Idempotency-Key (14a52ea)

## Phase 2 — Guest card web

- ☑ `/c/:token` as static HTML route, ~30 KB, no framework JS (ADR 014)
- ☑ Trust strip, map, dress code, RSVP + party stepper, QR inline SVG (EC M, 4-module quiet zone), short code, brightness hint
- ☑ `.ics`, QR PNG download, print/"Save as PDF", PWA manifest, service worker (`public/sw.js`), OG image
- ☑ Swahili/English switch; invalid / reissued / offline / event-passed states
- ☑ API: `GET /v1/c/:token`, `POST /v1/c/:token/rsvp` (idempotent, rate-limited, deadline) + tests in `card.test.ts`
- ☑ Lighthouse mobile on the static card: 1.00 ×3 (landing 0.94–0.99); reports in `docs/ui/lighthouse`
- ☑ `e2e/guest.spec.ts` on the static card: offline QR, RSVP idempotency, pay, reissued, language — pass
- ☑ axe on all routes incl. `/c/:token` (sw+en, mobile+desktop): 131 e2e tests pass
- ☑ 412 px: no horizontal scroll, QR ≥ 220 px, zero serious axe issues (`e2e/card-412.spec.ts`)
- ☑ web typecheck clean; vitest web 21 + api 36 pass
- ☑ Committed locally as aa11c7b (not pushed)
- ☑ OG image and manifest read the API through `GET /v1/c/:token/preview` (no QR, never marks the card opened; tested)
- ☑ `/s/<token>` redirects to the card in real mode; short codes need `/k` (ADR 016)
- ☑ API card now returns sender name, committee phone, greeting (new `events` columns, migration 0005, test in `card.test.ts`)
- ☐ API card still lacks pledge summary and `pledgesEnabled` (Phase 6)
- ☑ React `GuestCard` removed; `/dev/states` renders the static card in iframes
- ☐ Push `feat/light-guest-card` (waiting for your go-ahead)

## Phase 3 — Delivery

- ☑ Send service: per-guest WhatsApp/SMS choice, retries with backoff, WhatsApp→SMS fallback on failure, `message_log`, retry-failed, stats endpoint, idempotent send (ADR 017, `delivery.test.ts`)
- ◐ BullMQ worker (`worker.ts`): 15-minute tick + async send. Typechecked; not run against a live Redis
- ◐ WhatsApp: both the official Cloud API and Evolution API, chosen by `WHATSAPP_PROVIDER` (ADR 018/020), plus NextSMS; unit tests against fake HTTP, signature-checked Meta webhook; verify against live accounts
- ☐ Create and get approved the Meta message templates (sw + en) — see ADR 020
- ☑ Delivery webhooks (Evolution `messages.update`, SMS report polling), WhatsApp→SMS fallback after N hours (once per guest)
- ☑ Reminders T-14/T-7/T-1 with opt-out (`POST /v1/c/:token/reminders/opt-out`), daytime only, once per milestone
- ☑ “Acha kunikumbusha / Stop reminders” button on the guest card (axe + 412 px specs pass)
- ☑ Print PDF batch: A6, A5 (3 mm bleed, crop marks), A4 4-up cut-and-collate, test sheet 20/25/30 mm; generator refuses QR < 25 mm or modules < 0.8 mm (`print.test.ts`, `POST /v1/events/:id/cards/pdf`)
- ☐ Printed test sheet scanned on ≥ 3 phones — checklist in `docs/qa/print-test.md` (manual, needs a printer)
- ☑ Web `HttpRepository` now sends invitations, retries failures and downloads the print PDF through the real API (tested end to end in `http-repository.test.ts`); thank-you broadcasts from the console stay `not_implemented`
- ☑ Organiser-asked reminders (`kind: reminder`, audiences `unanswered` / `all` / ids / group): only invited, unanswered invitation cards; never opted-out, declined, contribution-only or uninvited guests; 12-hour cooldown per guest; refused once the event has started (ADR 030, `scheduled-sends.test.ts`)
- ☑ Scheduled invitations and reminders: `POST/GET/DELETE /v1/events/:id/scheduled-sends`, audience resolved at send time, run by a one-minute scheduler (works without Redis, safe on several instances), missed after 24 h, stuck runs recovered, audited; `HttpRepository` + mock `listScheduledSends` / `cancelScheduledSend`; web send page lists what is waiting with Cancel
- ☐ Scheduling and reminders in the mobile app; thank-you broadcasts through the API; run the scheduler against a real Redis/provider
- ☐ Card-content editor screens (console and mobile): the API, schema, card rendering and `content.*` strings exist, no UI yet (ADR 029)
- ☐ Embed a custom font in the print PDF (standard PDF fonts used now)
- ☑ 500-guest send test with simulated failures (`delivery.test.ts`)

## Phase 4 — Organizer mobile app (Expo)

- ☑ Expo Router app on the real API: auth (phone → OTP → name), wedding list + create, five tabs, guest detail with reissue/delete, paste import (preview then confirm), send with confirm/result/retry, team invite/revoke, settings, print-PDF share (ADR 021)
- ☑ Verified in a browser at 375×812 against the real API (sign-in, create, import, send, overview, detail, team); typecheck, eslint, 5 unit tests incl. a Swahili/English key-coverage check
- ☑ API: guest detail now carries invitation status; list carries last channel; events carry `myRole` and funnel stats (headcount, feature-phone count)
- ☐ Run on a real low-end Android (2 GB RAM), EAS preview build installs, APK < 40 MB
- ☐ Check 1.5× font scale at 360×640; test the gate and committee role shells
- ☐ Contacts picker and CSV file import; swipe and multi-select actions; native date picker
- ☐ Persist the offline write queue across app restarts
- ☐ Lango (Phase 5) and Michango (Phase 6) tabs are placeholders

## Phase 5 — Gate scanner (offline-first)

- ☑ Server: gate link + PIN with lockout, event-scoped gate tokens, device registration, bundle (ETag, last-4 phones), admissions, idempotent scan sync with earliest-wins ordering (ADR 022)
- ☑ `@harusi/gate` engine: offline QR verify, card-number/name/last-4 lookup, duplicate and override rules, sync queue with backoff, reissue via bundle refresh
- ☑ Tests: 200 mixed scans offline → correct results, zero lost after reconnect, server log matches; two devices on one guest → one admit + one duplicate; forged / wrong-event / revoked; lockout; override rules
- ☑ App: scanner UI, search, typed number, result overlay (AAA colours), sync sheet, camera-denied fallback, Lango tab, gate-join + kiosk, owner creates link and PIN; verified in a browser against the real API (typed-number admit, duplicate overlay, background sync)
- ☑ Tampered QR and a validly signed QR for another wedding, shown on a laptop screen and scanned by the phone's camera: each was refused 3 times (deny-pattern vibration ≈ 340 ms and a sound each time, versus ≈ 230 ms for an admit) and the arrived count stayed at 0 / 3. I then saw the red refusal screen myself on the phone (via an unknown typed number, same overlay component): white ✖, "KADI SI HALALI", the reason line and the "Tafuta kwa jina" button
- ☑ Camera denied on the phone (permission revoked, then refused): the explanation screen appears, the button becomes "Fungua mipangilio" and opens Android's app-info page for the app, and the typed-number and search fallbacks stay on screen
- ☑ Run on real Android (Samsung Galaxy A17, Android 16, Expo Go SDK 53, over Wi-Fi to a dev API): the camera decoded a real signed QR shown on a screen, verified offline on the phone, and the admission (party of 2) reached the server; full-screen ADMIT overlay seen on the phone; the system logs show 5 vibration effects and 5 audio tracks at the 5 scan times
- ☑ SQLite across restarts on the phone: force-stopped Expo Go, relaunched, it opened straight into the gate with the saved bundle and admissions (2 / 3)
- ☑ Offline on the phone: with the API process frozen the phone admitted a guest, then the server ordered it correctly against a second device (a scripted gate device running the real engine) that scanned later but synced first: the phone's earlier scan kept the admission and the second device saw "duplicate, first by the phone"
- ☑ 200 mixed scans against the phone's SQLite store and Hermes crypto (dev self-test): all results correct, 73–177 ms per scan in a dev build, nothing lost after reopening the database
- ☑ Two physical phones at once (Galaxy A17 + Galaxy A51, both on Expo Go SDK 53, same gate link): with the API frozen both phones admitted the same guest offline (each showed green KARIBU NDANI, A at 14:55:30Z and B at 14:55:57Z); after the API came back the server kept A's earlier scan as the admission, and B's next scan of that guest showed amber TAYARI AMEINGIA with "Saa 17:55 · Lango 0A2" (A) and no override button for a gate agent
- ☑ Torch: switched on from the scanner on the Galaxy A17 and the flash LED lit (confirmed by eye by the owner)
- ☑ Release-mode timing (overlay ≤ 100 ms) on the Galaxy A17, production-mode bundle, warm, with the verify-once cache: 200 mixed scans in 11.98 s = **60 ms per scan** (first-time verify ≈ 60 ms, SQLite insert 7–13 ms; re-scans skip the verify). Earlier runs 74–76 ms before the cache; one cold run right after clearing Expo Go's data took 790 ms per scan, so the first scan after a cold start can be slow: warm up by opening the scanner before guests arrive. Overlay render time on top of this was not measured
- ☑ Gate PIN field no longer triggers Samsung Pass (hand-masked bullets, tested on the A17)
- ⏭ Deferred to pilot (owner decision): usability check with 3 first-time gate agents; protocol and recording sheet ready in `docs/ux/gate-usability-test.md`
- ☑ Gate token lasts until its link expires (no mid-event expiry); vibration setting is remembered
- ☑ Sound feedback: generated tones (rising two-tone admit, beep duplicate, low buzz deny) with a remembered toggle; tone generator unit-tested, playback unverified on a device
- ☑ Android Hermes bundle builds (`expo export --platform android`, 3.4 MB) so every native import resolves
- ☑ CLAUDE.md §17.2 gate fills updated to the AAA values (ADR 006/022); revert that line if you prefer the original colours

## Phase 6 — Pledges and payments

- ☑ `@harusi/payments`: `PaymentProvider` interface, HMAC helpers, fake provider (ADR 023)
- ☑ Server: migration 0009, pledge status math, manual payments, pay-from-card with idempotent reference, status polling, atomic webhook, CSV exports, pledge on the public card, dashboard money in event stats; gate agents never see money
- ☑ Tests (`pledges.test.ts`, 9 + repository end-to-end; API suite 75 passing): a webhook replayed 5× (and 5 at once) records one payment; balances reconcile with the dashboard; the aggregator's amount wins; forged, unsigned, unknown, failed and late webhooks; expired requests are not money; idempotent pay start; pledges-off closes payments; CSV formula escaping
- ☑ `HttpRepository` pledges, payments, card pay, status, CSV export, pledge summary (+ mock); mobile Michango tab (totals, progress, filters, record payment, set pledge, CSV share), checked in a browser against the real API
- ☐ Choose the aggregator (§15.4) and write its adapter; run its sandbox; verify its real webhook format
- ☑ Pledge reminders: `POST /v1/events/:id/pledges/reminders` (owner/committee) texts only guests who still owe, with their pledge, balance and card link; skips opt-outs, no phone, nothing owed, and anyone reminded in the last 3 days; WhatsApp template `WHATSAPP_TEMPLATE_PLEDGE`; button on the Michango tab (not checked on a device)
- ☐ Policy toggle "require minimum pledge before card" (default OFF) and PDF export
- ☐ Re-check the web card's pay screen against the real API in a browser; Michango tab on a real phone

## Phase 7 — Hardening and launch

- ☑ API security headers (HSTS, nosniff, frame deny, CSP `default-src 'none'`, no referrer) on every response, `/ready` DB readiness probe, one JSON log line per request with the route pattern only (never tokens, PINs, OTPs or phones); tested
- ☑ Audit trail: `audit_log.event_id` (migration 0010); reissue, delete, erase, export, member add/invite/remove, gate link create/revoke, pledges, manual payments and payment webhooks are recorded; owner-only `GET /v1/events/:id/audit` (newest first, no secrets); tested
- ☑ PDPA: owner-only `GET /v1/guests/:id/export` (everything held about a guest) and `POST /v1/guests/:id/erase` (name, phone, notes removed; payment amounts kept for the books; card dies); both audited; tested
- ☑ Rate limits can live in Redis (`RedisRateStore`: INCR + PEXPIRE, repairs a counter that lost its expiry, falls back to per-process counters if Redis fails; `REDIS_URL` turns it on); shared budget across two instances proven against a fake Redis. Gate PIN lockout is already in the database (shared). **Still per-process:** the OTP request and verify limits (`auth/otp.ts`); fine for one API instance, move them before running more than one. Not tested against a real Redis
- ◐ Privacy and terms pages expanded to match what the product really does (providers used, retention, what is kept on the device, erasure and export, gate agents), in Swahili and English. Still a draft behind the "Rasimu" banner: **a lawyer must set the retention period and approve the wording, and a native speaker must review the Swahili**
- ◐ Backup: `infra/backup/pg-backup.sh` (pg_dump → gzip → S3 with a size and integrity check, 14-day retention) and `infra/coolify/RESTORE.md` (step-by-step drill + production recovery + the `KEY_ENC_SECRET` warning). Syntax-checked only: **never run** (no Postgres, `pg_dump` or S3 here). Run the drill once on staging and fill in its log table
- ◐ Load test script `scripts/load-test.mjs` (creates its own event; 1,000 concurrent card views + 20 gate devices syncing 50 scans each; checks every scan lands). Smoke run on the Docker-free dev server (in-memory PGlite, one query at a time, 500 guests): 0 errors, all 500 check-ins reconciled, gate bundle+sync p95 ≈ 0.35 s, card views p95 ≈ 3.8 s with everything queued behind one database connection, so that number is a test-rig artefact. **Real capacity is unmeasured: run the script against staging Postgres + Redis**
- ☑ Card views cache the signed QR (10 min, keyed by signing key, guest, party size and token version, so a reissue is instant) and the server signs with Node's native Ed25519 (byte-identical to the library, tested, ~100× faster)
- ☑ Sentry (`SENTRY_DSN`; no PII: user, headers, cookies, bodies, query strings and breadcrumbs dropped, card links, gate codes, payment references and phone numbers masked; scrubber unit-tested; **never sent to a real Sentry**) and uptime monitor list (`infra/coolify/UPTIME.md`). Uptime Kuma itself is not set up
- ☑ Audit log screen in the mobile app (owner: Overview → Kumbukumbu za mabadiliko; newest first with load-more, action names in Swahili and English); `Repository.listAuditLog` (the web console's mock returns an empty trail). Typechecked and key-coverage tested, not checked on a device
- ☐ Pilot with 2–3 real weddings and the §14 KPIs
