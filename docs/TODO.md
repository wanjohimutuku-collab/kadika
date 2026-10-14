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
- ☑ Web `HttpRepository` now sends invitations, retries failures and downloads the print PDF through the real API (tested end to end in `http-repository.test.ts`); scheduled sends and reminders/thank-you broadcasts from the console stay `not_implemented`
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
- ☑ Run on real Android (Samsung Galaxy A17, Android 16, Expo Go SDK 53, over Wi-Fi to a dev API): the camera decoded a real signed QR shown on a screen, verified offline on the phone, and the admission (party of 2) reached the server; full-screen ADMIT overlay seen on the phone; the system logs show 5 vibration effects and 5 audio tracks at the 5 scan times
- ☑ SQLite across restarts on the phone: force-stopped Expo Go, relaunched, it opened straight into the gate with the saved bundle and admissions (2 / 3)
- ☑ Offline on the phone: with the API process frozen the phone admitted a guest, then the server ordered it correctly against a second device (a scripted gate device running the real engine) that scanned later but synced first: the phone's earlier scan kept the admission and the second device saw "duplicate, first by the phone"
- ☑ 200 mixed scans against the phone's SQLite store and Hermes crypto (dev self-test): all results correct, 73–177 ms per scan in a dev build, nothing lost after reopening the database
- ☐ Two *physical* phones at once (second device was the real engine in a script; the emulator hung under load)
- ☐ Torch: toggled on the phone and the camera service reports a torch request, not seen by eye
- ◐ Release-mode timing (overlay ≤ 100 ms): a production-mode (`--no-dev --minify`) bundle on the Galaxy A17 measured 74–76 ms per scan end to end (verify + SQLite write, signing excluded), so the ≤ 100 ms target holds with little margin; the verify-vs-write split probe is in `/dev/gate-selftest` but its result was not read yet (phone locked)
- ☐ Usability check: a first-time gate agent joins and scans with no instructions (3 people)
- ☑ Gate token lasts until its link expires (no mid-event expiry); vibration setting is remembered
- ☑ Sound feedback: generated tones (rising two-tone admit, beep duplicate, low buzz deny) with a remembered toggle; tone generator unit-tested, playback unverified on a device
- ☑ Android Hermes bundle builds (`expo export --platform android`, 3.4 MB) so every native import resolves
- ☐ Update CLAUDE.md §17.2 gate fills to the AAA values (ADR 006/022)

## Phase 6 — Pledges and payments
- ☐ Pledge CRUD, manual payments, aggregator sandbox, webhook idempotency, exports

## Phase 7 — Hardening and launch
- ☐ Rate limits audit, privacy pages (legal text is placeholder), backups drill, load test, Sentry, pilot
- ☐ Native-speaker Swahili review (`sw.json` `reviewed: false`)

## Open decisions (CLAUDE.md §15)
- ☐ Brand/domains · WhatsApp route · SMS gateway · payment aggregator · pricing — confirm before Phases 3 and 6
