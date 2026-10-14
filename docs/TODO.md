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
- ☐ WhatsApp + SMS adapters, BullMQ, retries, webhooks, WhatsApp→SMS fallback, reminders, message log
- ☐ Print PDF batch (A6/A5, A4 4-up, test sheet) with §6.4 assertions; `docs/qa/print-test.md`
- ☐ 500-guest send test with simulated failures

## Phase 4 — Organizer mobile app (Expo)
- ☐ Not started (`apps/mobile` is not scaffolded)

## Phase 5 — Gate scanner (offline-first)
- ☐ Gate bundle endpoint, SQLite, offline verify, fallbacks, sync + conflict rule, multi-device test

## Phase 6 — Pledges and payments
- ☐ Pledge CRUD, manual payments, aggregator sandbox, webhook idempotency, exports

## Phase 7 — Hardening and launch
- ☐ Rate limits audit, privacy pages (legal text is placeholder), backups drill, load test, Sentry, pilot
- ☐ Native-speaker Swahili review (`sw.json` `reviewed: false`)

## Open decisions (CLAUDE.md §15)
- ☐ Brand/domains · WhatsApp route · SMS gateway · payment aggregator · pricing — confirm before Phases 3 and 6
