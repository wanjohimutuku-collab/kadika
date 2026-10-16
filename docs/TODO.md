# Harusi Pass — project TODO

Legend: ☑ done · ◐ built, not verified · ☐ not started · ⏭ deferred. Last checked 2026-10-16 against `main` at e515d6a (PR #10 merged; the `v0.1.0` tag is on 782afad, just before it). Node 22 + pnpm installed to ~/.local/node (add `~/.local/node/bin` to PATH).

## Where things stand

- ☑ `main` holds everything built so far: Phases 0–7 (part 1), the mobile UI redesign, free-text event kinds, the SEO pages, Kenya support Phases 1–5 behind `KENYA_ENABLED`, organiser-written card content and scheduled sends (API, scheduler and the web waiting list). Most of it arrived in PR #8; PR #9 fixed an axe failure on scrollable tables; PR #10 added the web waiting list and ADR 029 and 030, which missed PR #8 by two seconds
- ☑ CI is green on `main` (run for the PR #9 merge): typecheck, lint, format check, 394 unit tests (API 159, schemas 64, web 62, api-client 42, mobile 11, other packages 56), build, Storybook build, `pnpm audit --prod` at high; Playwright 162 passed and 1 skipped (axe on every route); Lighthouse CI
- ☐ Not deployed: `build-push.yml` is written but has not run yet and `mobile-eas.yml` is a placeholder, so the `v0.1.0` tag built nothing (see "Deployment and release")
- ☑ PRs #2–#7 are closed. They were a stack (each targeted the previous phase branch) and every one of those branches was already in `main` through #8, so each was closed with a comment saying so. The branches themselves are still on the remote

## Needs you or an outside party

- ☐ Delete the merged branches (kept for now): all 12 remote branches other than `main` are merged into it, and `git branch -r --merged origin/main` lists them
- ☐ Deployment: Coolify services, the GitHub environments the build workflow reads, EAS (see "Deployment and release")
- ☐ Tanzania providers: pick the payment aggregator (§15.4) and run its sandbox; get the Meta WhatsApp templates approved (ADR 020); try WhatsApp and SMS on live accounts
- ☐ Reviews only people can do: a lawyer on the privacy and terms drafts (including the retention period), a native Swahili speaker on `sw.json` (`reviewed: false`) and the public pages, Kenyan readers on the Kenya text
- ☐ Kenya, before any real event: the 12-point pre-flight in `docs/ops/kenya-pilot-runbook.md` and the five open questions in `docs/plan/kenya-product-support.md` §7 (see "Kenya support")
- ☐ Printed test sheet on ≥ 3 phones (`docs/qa/print-test.md`); the usability check with 3 first-time gate agents (deferred to pilot)
- ☐ Pilot with 2–3 real weddings and the §14 KPIs

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
- ☑ Lighthouse mobile on the static card: 1.00 ×3 (landing 0.94–0.99); reports in `docs/ui/lighthouse`; the Lighthouse CI step passes on `main`
- ☑ Playwright e2e on `main`: 162 passed, 1 skipped, with axe on all routes incl. `/c/:token` (sw+en, mobile+desktop); `e2e/guest.spec.ts` covers offline QR, RSVP idempotency, pay, reissued and language, `e2e/card-412.spec.ts` covers 412 px (no horizontal scroll, QR ≥ 220 px)
- ☑ OG image and manifest read the API through `GET /v1/c/:token/preview` (no QR, never marks the card opened; tested)
- ☑ `/s/<token>` redirects to the card in real mode; short codes need `/k` (ADR 016)
- ☑ API card returns sender name, committee phone and greeting (new `events` columns, migration 0005, test in `card.test.ts`), the pledge summary and `pledgesEnabled`
- ☑ React `GuestCard` removed; `/dev/states` renders the static card in iframes
- ☑ Merged to `main` (PR #1)

## Phase 3 — Delivery

- ☑ Send service: per-guest WhatsApp/SMS choice, retries with backoff, WhatsApp→SMS fallback on failure, `message_log`, retry-failed, stats endpoint, idempotent send (ADR 017, `delivery.test.ts`)
- ◐ BullMQ worker (`worker.ts`): 15-minute tick, async send and, for Kenya, payment reconciliation. Typechecked; not run against a live Redis
- ◐ WhatsApp: both the official Cloud API and Evolution API, chosen by `WHATSAPP_PROVIDER` (ADR 018/020), plus NextSMS; unit tests against fake HTTP, signature-checked Meta webhook; verify against live accounts
- ☐ Create and get approved the Meta message templates (sw + en) — see ADR 020
- ☑ Delivery webhooks (Evolution `messages.update`, SMS report polling), WhatsApp→SMS fallback after N hours (once per guest)
- ☑ Reminders T-14/T-7/T-1 with opt-out (`POST /v1/c/:token/reminders/opt-out`), daytime only, once per milestone
- ☑ “Acha kunikumbusha / Stop reminders” button on the guest card (axe + 412 px specs pass)
- ☑ Print PDF batch: A6, A5 (3 mm bleed, crop marks), A4 4-up cut-and-collate, test sheet 20/25/30 mm; generator refuses QR < 25 mm or modules < 0.8 mm (`print.test.ts`, `POST /v1/events/:id/cards/pdf`)
- ☐ Printed test sheet scanned on ≥ 3 phones — checklist in `docs/qa/print-test.md` (manual, needs a printer)
- ☑ Web `HttpRepository` sends invitations, retries failures, downloads the print PDF and lists and cancels scheduled sends through the real API (tested end to end in `http-repository.test.ts`); thank-you broadcasts from the console stay `not_implemented`
- ☐ Embed a custom font in the print PDF (standard PDF fonts used now)
- ☑ 500-guest send test with simulated failures (`delivery.test.ts`)

## Phase 4 — Organizer mobile app (Expo)

- ☑ Expo Router app on the real API: auth (phone → OTP → name), wedding list + create, five tabs, guest detail with reissue/delete, paste import (preview then confirm), send with confirm/result/retry, team invite/revoke, settings, print-PDF share (ADR 021)
- ☑ Verified in a browser at 375×812 against the real API (sign-in, create, import, send, overview, detail, team); typecheck, eslint, 11 unit tests in CI incl. a Swahili/English key-coverage check
- ☑ API: guest detail now carries invitation status; list carries last channel; events carry `myRole` and funnel stats (headcount, feature-phone count)
- ☑ UI redesign (PR #8, `871bf28`): icon set, restyled component kit, new header and tabs. CI typecheck, lint and unit tests pass; no check in a browser or on a device is recorded since the redesign
- ☑ The Lango (Phase 5) and Michango (Phase 6) tabs are real screens now
- ☐ EAS preview build installs on a low-end Android (2 GB RAM) and the APK is < 40 MB (so far only Expo Go on a Galaxy A17 and A51, see Phase 5)
- ☐ Check 1.5× font scale at 360×640; test the committee role shell (the gate kiosk shell was run on phones in Phase 5)
- ☐ Contacts picker and CSV file import; swipe and multi-select actions; native date picker (none of these exist in the app yet)
- ☐ Persist the offline write queue across app restarts
- ☐ Scheduling and reminders in the send tab (it only sends invitations today); card-content editor screens

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
- ☑ Tests (`pledges.test.ts`, 11, plus the repository end-to-end in `http-repository.test.ts`): a webhook replayed 5× (and 5 at once) records one payment; balances reconcile with the dashboard; the aggregator's amount wins; forged, unsigned, unknown, failed and late webhooks; expired requests are not money; idempotent pay start; pledges-off closes payments; CSV formula escaping
- ☑ `HttpRepository` pledges, payments, card pay, status, CSV export, pledge summary (+ mock); mobile Michango tab (totals, progress, filters, record payment, set pledge, CSV share), checked in a browser against the real API
- ☐ Choose the aggregator (§15.4) and write its adapter; run its sandbox; verify its real webhook format
- ☑ Pledge reminders: `POST /v1/events/:id/pledges/reminders` (owner/committee) texts only guests who still owe, with their pledge, balance and card link; skips opt-outs, no phone, nothing owed, and anyone reminded in the last 3 days; WhatsApp template `WHATSAPP_TEMPLATE_PLEDGE`; button on the Michango tab (not checked on a device)
- ☐ Policy toggle "require minimum pledge before card" (default OFF) and PDF export (neither exists in the code)
- ☐ Re-check the web card's pay screen against the real API in a browser; Michango tab on a real phone

## Phase 7 — Hardening and launch

- ☑ API security headers (HSTS, nosniff, frame deny, CSP `default-src 'none'`, no referrer) on every response, `/ready` DB readiness probe, one JSON log line per request with the route pattern only (never tokens, PINs, OTPs or phones); tested
- ☑ Audit trail: `audit_log.event_id` (migration 0010); reissue, delete, erase, export, member add/invite/remove, gate link create/revoke, pledges, manual payments, payment webhooks and scheduled sends are recorded; owner-only `GET /v1/events/:id/audit` (newest first, no secrets); tested
- ☑ PDPA: owner-only `GET /v1/guests/:id/export` (everything held about a guest) and `POST /v1/guests/:id/erase` (name, phone, notes removed; payment amounts kept for the books; card dies); both audited; tested
- ☑ Rate limits can live in Redis (`RedisRateStore`: INCR + PEXPIRE, repairs a counter that lost its expiry, falls back to per-process counters if Redis fails; `REDIS_URL` turns it on); shared budget across two instances proven against a fake Redis. Gate PIN lockout is already in the database (shared). **Still per-process:** the OTP request and verify limits (`auth/otp.ts`); fine for one API instance, move them before running more than one. Not tested against a real Redis
- ◐ Privacy and terms pages expanded to match what the product really does (providers used, retention, what is kept on the device, erasure and export, gate agents), in Swahili and English. Still a draft behind the "Rasimu" banner: **a lawyer must set the retention period and approve the wording, and a native speaker must review the Swahili**
- ◐ Backup: `infra/backup/pg-backup.sh` (pg_dump → gzip → S3 with a size and integrity check, 14-day retention) and `infra/coolify/RESTORE.md` (step-by-step drill + production recovery + the `KEY_ENC_SECRET` warning). Syntax-checked only: **never run** (no Postgres, `pg_dump` or S3 here). Run the drill once on staging and fill in its log table
- ◐ Load test script `scripts/load-test.mjs` (creates its own event; 1,000 concurrent card views + 20 gate devices syncing 50 scans each; checks every scan lands). Smoke run on the Docker-free dev server (in-memory PGlite, one query at a time, 500 guests): 0 errors, all 500 check-ins reconciled, gate bundle+sync p95 ≈ 0.35 s, card views p95 ≈ 3.8 s with everything queued behind one database connection, so that number is a test-rig artefact. **Real capacity is unmeasured: run the script against staging Postgres + Redis**
- ☑ Card views cache the signed QR (10 min, keyed by signing key, guest, party size and token version, so a reissue is instant) and the server signs with Node's native Ed25519 (byte-identical to the library, tested, ~100× faster)
- ☑ Sentry (`SENTRY_DSN`; no PII: user, headers, cookies, bodies, query strings and breadcrumbs dropped, card links, gate codes, payment references and phone numbers masked; scrubber unit-tested; **never sent to a real Sentry**) and uptime monitor list (`infra/coolify/UPTIME.md`). Uptime Kuma itself is not set up
- ☑ Audit log screen in the mobile app (owner: Overview → Kumbukumbu za mabadiliko; newest first with load-more, action names in Swahili and English); `Repository.listAuditLog` (the web console's mock returns an empty trail). Typechecked and key-coverage tested, not checked on a device
- ☐ Pilot with 2–3 real weddings and the §14 KPIs

## Event kinds and wording (ADR 024)

- ☑ `events.event_kind` is a free-text label (≤ 40 characters; suggestions Harusi, Send-off, Uchumba), display only; the second host is optional (migration 0011)
- ☑ Wording follows the kind: guest card eyebrow, page title and calendar entry, link preview, PWA name, SMS invite, reminder and pledge-reminder texts, default sender line, print and preview cards; organiser screens say "event / tukio"
- ☐ Re-register the WhatsApp templates so the kind and a single host show there (the approved wording has two name slots)
- ⏭ Passes, capacities, multi-session events and ticket sales: out of scope, would need a separate spec. The marketing landing page still talks about weddings

## Card content and contribution cards (ADR 029)

ADR 029 arrived with PR #10 (`e478361`); the code below was already on `main`.

- ☑ `events.card_content` (jsonb, migration 0015) checked by `cardContentSchema` on every write: sender kind (family, committee, couple, host, custom) with its own trust line, greeting, main message, programme (up to 12 lines), venue and dress notes, RSVP texts, closing and footer notes, switches for the map, dress code, calendar, QR, RSVP and pledge sections. The QR block stays black on white. New events start as `family`; events made before keep `committee`
- ☑ Contribution cards: `guests.card_kind` is `invitation` or `contribution`. A contribution guest gets a card that asks for a contribution only (no RSVP, no QR) and is left out of the gate bundle, the print PDF, the invitation funnel (counted as `contributionGuests`) and the T-14/7/1 reminders. The amount raised is shown only if the organiser turns it on
- ☑ SMS wording: organiser templates for the invitation, reminder, contribution and pledge-reminder texts, built in one place (`composeSms` in `services/messages.ts`); `{link}` is required, at most 480 characters. WhatsApp keeps the Meta-approved wording
- ☑ Tests: `card-content.test.ts` in the API (9) and schemas (8), `render-content.test.ts` for the web card (11)
- ☐ Editor screens in the console and the mobile app: the API accepts `cardContent` and the `content.*` strings exist, but no screen uses them
- ☐ Native review of the new Swahili strings (`content.*` and `send.scheduled.*`); one known nit: the accessible label `send.scheduled.cancelLabel` uses "ya" for every kind ("Ghairi vikumbusho ya 1 Des"), but the plural "vikumbusho" takes "vya"
- ☐ Write the WhatsApp template for contribution cards (`WHATSAPP_TEMPLATE_CONTRIBUTION` and `_KE` are read from the environment) and submit it with the others; `docs/ops/whatsapp-templates-kenya.md` covers only invite, reminder and pledge
- ☐ Cover photo upload (the API and schema have no cover-photo field; it needs S3 and image optimisation) and per-section reordering

## Scheduled sends and reminders (ADR 030)

ADR 030 and the web waiting-list screen arrived with PR #10 (`e478361`); the API, scheduler and client below were already on `main`.

- ☑ Organiser-asked reminders (`kind: reminder`; audiences `unanswered`, `all`, guest ids, group) reach only invited guests: never opted-out, declined, contribution-only or uninvited ones; 12-hour cooldown per guest; refused once the event has started
- ☑ Scheduled invitations and reminders (migration 0016): `POST/GET/DELETE /v1/events/:id/scheduled-sends`; the audience is resolved when the time comes; at least a minute ahead and before the event starts; at most 20 waiting per event; gate agents cannot schedule or list; creating, cancelling and each run are audited
- ☑ Runner: `startScheduler` checks every minute with a plain interval, so it needs no Redis; each row is claimed by a conditional update, so several API instances never run one twice; a run stuck for 30 minutes is put back in line; a send more than 24 hours late is recorded as `missed`; a failure is recorded, not retried
- ☑ `HttpRepository` and the mock implement `listScheduledSends` and `cancelScheduledSend`; `scheduled-sends.test.ts` (13 tests, PGlite and fake providers) and two mock-repository tests (PR #10)
- ☑ Web console: a "Waiting to be sent" card on the send page lists scheduled invitations and reminders, each with a Cancel button (`scheduled-sends.tsx`, PR #10). Checked by hand on the mock backend in Swahili and English, desktop and 375 px (scheduled from "send later", saw it listed, cancelled it; cancel buttons 48 px tall, no horizontal overflow); no e2e spec or story covers it
- ☐ Scheduling and reminders in the mobile app
- ☐ Thank-you broadcasts through the real API (`thank_you` is still `not_implemented`); exports other than pledges and payments, such as the post-event report, are also `not_implemented` in `HttpRepository`
- ☐ Run the scheduler against a real provider and more than one instance
- ☐ Editing a waiting send (cancel and create another for now)

## Kenya support (behind `KENYA_ENABLED`, off by default)

Plan: `docs/plan/kenya-product-support.md`; ADR 025–028; pilot runbook `docs/ops/kenya-pilot-runbook.md`. Flags: `KENYA_ENABLED` (API), `NEXT_PUBLIC_KENYA_ENABLED` (web), `EXPO_PUBLIC_KENYA_ENABLED` (mobile). With the flag off the product behaves as before (+255 only).

- ☑ Phase 1: `events.country`, `currency` and `timezone` (migration 0012), `COUNTRY_INFO`, `normalizePhone` for +255 and +254 (a golden test matches the old Tanzanian parser on 20,000 generated inputs), `formatMoney`, payment methods per country (TZ: M-Pesa, Mixx, Airtel, HaloPesa; KE: M-Pesa, Airtel), the event's time zone instead of a hard-coded `Africa/Dar_es_Salaam` (ADR 025)
- ☑ Phase 1b: currency-neutral money names (`*_tzs` columns and `*Tzs` fields renamed, migration 0013); the old names are still answered for one release (see Housekeeping)
- ☑ Phase 2 code: SMS route chosen by the number's country, sign-in codes for +254, Africa's Talking adapter and delivery-report webhook, `SHORT_BASE_URL_KE`, Kenya WhatsApp templates (wording in `docs/ops/whatsapp-templates-kenya.md`), SMS cost per currency (prices are assumptions), the mobile network recorded on delivery reports (migration 0014) (ADR 026)
- ☑ Phase 3 code: payment provider per country, aggregator-shaped adapter (STK push, HMAC-signed callbacks, status query), per-country method lists and online limits (KE 10 to 250,000, assumed), callbacks in another currency rejected, a reconciliation job with late-success handling, KES statements (ADR 027). Model C: no custody of funds
- ☑ Phase 4: wording overlays for Kenya (KES labels, harambee vocabulary) on the card, pay page, console and mobile pledges; `/ke` privacy, terms and data-requests drafts (Data Protection Act 2019, ODPC notes) (ADR 028)
- ☑ Phase 5 tooling: pilot runbook with 12 pre-flight checks, launch gates and rollback; `GET /v1/ops/pilot-metrics` and `/ops/pilot` against the gates; rollback levers `KENYA_SENDING_PAUSED` and `KENYA_PAYMENTS_PAUSED` (tested)
- ◐ All of the above is tested with fakes and simulators only (`kenya.test.ts`, `messaging-kenya.test.ts`, `payments-kenya.test.ts`, `pilot-metrics.test.ts`, `kenya-rollback.test.ts`); nothing has touched a real Kenyan number, SMS gateway, WhatsApp account or payment provider
- ☐ Phase 0, the business work and the long wait: counsel's memo (data protection registration, cross-border transfer, SMS consent and sender rules, whether passing on funds needs authorisation), ODPC registration if required, an SMS contract and sender ID approval on Safaricom and Airtel, Meta approval of the Kenya WhatsApp templates (three are written up, the contribution one is not)
- ☐ Choose and onboard a real aggregator (credentials, KYC, sandbox, one live KES payment), map its real wire format and confirm KES limits and fees; our request and callback shape is an assumption
- ☐ Native Kenyan review of all Kenya text and a Swahili-Kenya style pass; KES pricing; update the `/ke` pages when providers are live
- ☐ Owner: answer the five open questions in the plan (§7: payment model, target date with pilot committees and support owner, Kenyan short domain, sign-in numbers, pricing); confirm the proposed SMS and payment limits; name the support owner and the engineer on call
- ☐ Run 2–3 real Kenyan events and measure them against the runbook's gates
- ⏭ Not built, by design for now: custody of funds (model A), refunds, partial reversals, disputes, a ledger, committee payouts. Africa's Talking delivery reports are push only (no polling)

## Public website and SEO (`apps/web`, `docs/seo/`)

- ☑ `robots`, sitemap, `metadataBase`, hreflang language URLs, Organization JSON-LD; `noindex` headers on private routes
- ☑ 16 Tanzania pages (products, guides, company, legal drafts) with FAQ and Article JSON-LD, `llms.txt` and a richer home page; the audit is in `docs/seo/site-audit-tanzania.md`
- ☑ Kenya section under `/ke` (hub, guides, privacy, terms, data requests) in English and Swahili, with market-aware routing and reciprocal region hreflang; the pages say Kenya is being tested, not open
- ☑ Content tables scroll with the keyboard (PR #9, axe `scrollable-region-focusable`)
- ☐ Search Console and Bing Webmaster set-up and sitemap submission (nothing in the repo records it); first AI-citation baseline; outreach to three outlets; directory listings and Google Business Profile (`docs/seo/keyword-and-geo-plan.md` §7)
- ☐ Native Swahili review of every page; company identity for the About page and `Organization` (`sameAs`, `contactPoint`); a pricing page (pricing is undecided, the FAQs say "free during pilot"); original-data pages, which need pilot data
- ☐ Lighthouse check on a production build before launch (CI already runs it on the landing page and a card)
- ☐ Legal pages stay drafts behind the "Rasimu" banner until a lawyer signs off, for Tanzania and Kenya

## Deployment and release (CLAUDE.md §11)

- ☑ `ci.yml`: install, typecheck, lint, format check, tests, build, Storybook build, `pnpm audit --prod --audit-level=high`; a second job runs the Playwright e2e (axe) and Lighthouse CI
- ◐ `infra/docker/Dockerfile.api` and `Dockerfile.web` exist. The web one now takes the `NEXT_PUBLIC_*` build arguments (it used to build in mock mode) and copies `public/` (it used to leave out `sw.js`). The build stages were run by hand; the images have not been built with Docker yet
- ◐ `build-push.yml` builds both images, pushes them to GHCR (`staging` from `main`; `production` and the version from a `v*` tag that has passed CI) and calls the Coolify deploy webhooks. Not run yet. Still open: the GitHub environments with their variables and secrets (see `infra/coolify/README.md`), and running migrations before the API starts (`node dist/migrate.js`)
- ☐ `mobile-eas.yml` is a placeholder: EAS preview on a PR label, production on a tag. The `v0.1.0` tag therefore built nothing
- ☐ Coolify: `infra/coolify/README.md` now describes the flow and the setup, but no Coolify services exist yet; create api, web, postgres, redis and S3-compatible storage, staging before production
- ☐ Run the backup and restore drill, set up Uptime Kuma and connect a real Sentry project (see Phase 7)

## Housekeeping

- ☐ `docs/ui/HANDOFF.md` still describes the Phase 1 API (sending, pledges, gate, public card and payment "reject with `not_implemented`"); refresh it, since those now go through the real API
- ☐ End the one-release compatibility window for the old `*Tzs` API names (ADR 025): delete `apps/api/src/compat.ts`, its middleware in `app.ts` and `compat.test.ts` once installed mobile apps have updated
