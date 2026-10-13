# Prompt for Claude Code — Build the complete MVP UI/UX of the Harusi Pass web app

Paste everything below into Claude Code, run from the repo root (where `CLAUDE.md` lives).

---

## ROLE

You are a senior product designer + frontend engineer. Build the **complete MVP UI/UX of the Harusi Pass web app** (`apps/web`, Next.js App Router) as production-quality code, running end-to-end on **mock data** so the whole experience can be clicked through before the backend exists. Swahili-first, mobile-first, built for slow networks and low-end Android phones in Tanzania.

## SOURCE OF TRUTH

Read `CLAUDE.md` completely before doing anything, especially §1 (problems P1–P11), §2 (roles), §5 (data model), §6 (QR/code rules), §7 (flows), §10 (performance/localisation) and **§17 (UI/UX specification: tokens, navigation, wireframes, states, microcopy, accessibility, acceptance criteria)**. If this prompt and `CLAUDE.md` conflict, `CLAUDE.md` wins; record the conflict in `docs/adr/`. Do not change the stack in §3. Do not build the Expo mobile app or the backend in this task.

## SCOPE (what "complete MVP web app" means)

Three surfaces in one Next.js app:

1. **Public site** — landing, privacy, terms.
2. **Guest card** — `/c/[token]` and its sub-flows (RSVP, QR, calendar, pay, offline).
3. **Organizer console** — responsive web app under `/app` for owners and committee members (full MVP: events, guests, import, send, cards/print, pledges, check-in monitor, team, settings, reports). It must be fully usable on a 360 px phone browser **and** pleasant on a 1280 px laptop.

Out of scope: real API/auth/payment/messaging integrations (mock them behind interfaces), the native gate scanner (the web console gets a **manual check-in + live monitor** instead), seating charts, galleries, chat (see §16).

## TECH REQUIREMENTS

- Next.js (App Router, TypeScript strict), Tailwind CSS using tokens from `packages/ui-tokens` (create it per §17.2 if missing), **Radix UI primitives** (shadcn-style, restyled to our tokens, no default shadcn look), `lucide-react` icons.
- Forms: `react-hook-form` + `zod` schemas from `packages/schemas`. Server state: **TanStack Query** over a typed repository interface in `packages/api-client`. Tables: `@tanstack/table`. Dates: `date-fns` with `Africa/Dar_es_Salaam`. QR: `qrcode` (SVG output, error correction **M**, quiet zone ≥ 4 modules).
- i18n: `next-intl`; **Swahili default**, English toggle, locale persisted in a cookie; all strings in `packages/i18n/sw.json` and `en.json` (use the keys/copy in §17.11 and extend them); add `"_meta": {"reviewed": false}` to `sw.json` until a native speaker reviews it. No hard-coded user-facing strings in components.
- **Mock layer:** `packages/api-client` exposes a `Repository` interface matching §8 endpoints; implement `MockRepository` (in-memory + `localStorage` persistence, simulated latency 200–600 ms, random failure injection toggle, an "offline" toggle) and select it via `NEXT_PUBLIC_USE_MOCKS=1`. A later `HttpRepository` must be a drop-in swap. Seed ≥ 320 realistic Tanzanian guests (varied names, groups, phone formats, statuses, party sizes, pledges, a mix of smartphone/feature-phone), 2 events (one upcoming, one past), 3 team members.
- **Dev tooling:** Storybook with stories for every shared component in every state; a `/dev/states` route (dev only) that renders every screen in loading/empty/error/offline/partial-failure/permission-denied states (§17.10); a floating dev panel to switch role (owner/committee), locale, network (online/offline/slow), and failure injection.
- Fake signed token: until `packages/crypto` exists, generate a clearly labelled **mock** token format `v1.<eventId8>.<guestId8>.<party>.<ver>.<mockSig>` and keep QR generation behind a `QrBlock` that will accept real tokens unchanged.
- Performance budgets: guest card `/c/[token]` first load **< 100 KB** transfer and **< 120 KB gz JS**, LCP < 2.5 s on throttled Slow 4G (Lighthouse CI). Console routes are code-split; the guest card must not import console code, chart libraries, table libraries or the display font unless needed (subset font ≤ 30 KB, `font-display: swap`).
- PWA for the guest card only: manifest + service worker caching the card shell and last-fetched card data so the **QR and short code render offline after first open**.
- Accessibility: WCAG 2.2 AA, axe-clean, keyboard-complete console, 48 px touch targets, `prefers-reduced-motion`, works at 200% text zoom.
- Security UX (P1, P7): guest pages always show the **trust strip** (sender, committee phone, domain). No guest-facing screen ever asks for a password, OTP or PIN. Console login uses phone + OTP (mock code `123456`).

## DESIGN DIRECTION

Warm, dignified, celebratory but fast. Ivory background, deep emerald primary, gold accent (tokens in §17.2). Display serif only for couple names/headings on the guest card and print card; system font stack elsewhere. Use an **original** subtle geometric border/pattern (SVG, < 2 KB, inspired by East African textile rhythm but not copying any specific design, brand or kanga) as the card ornament. Four event themes (Emerald & Gold, Navy & Silver, Terracotta, Rose & Sage) that only alter primary/accent/pattern and are contrast-checked; the QR block is always black on white. Avoid generic SaaS-template looks; prefer generous spacing, calm hierarchy, confident typography and clear primary actions. Illustration-free empty states (icon + one sentence + one action). No stock photos; cover photo is optional user upload (mock with a gradient).

## ROUTE MAP AND SCREEN REQUIREMENTS

Implement every route below with all states from §17.10. Where §17 gives a wireframe, match it.

### Public
- `/` — Swahili-first landing: hero (value in one sentence + CTA "Anza" → `/login`), "Jinsi inavyofanya kazi" in 4 steps (Ingiza wageni → Tuma kadi → Wageni wajibu & walipe → Wafike langoni), a section explaining it works for **wageni wasio na smartphone** (SMS + namba), a trust section (verified sender, no fake links, your data stays yours), FAQ (6 items incl. "Je, kadi ya karatasi bado inawezekana?"), footer with language switch. Page weight < 150 KB.
- `/privacy`, `/terms` — readable placeholder legal pages with a clear "draft" banner.
- `/login` → `/login/otp` — phone field (+255 prefix, normalises to E.164), 6-cell OTP with autofill and resend timer, error and lockout states.

### Guest card — `/c/[token]`
Exactly per §17.6 and §7.3:
- Sections: cover/pattern + names + date/time; **trust strip** with tap-to-call; venue + map button (opens maps link); dress code; RSVP (Nitahudhuria / Sitahudhuria) + party-size stepper capped by `party_size_allowed`; QR block (≥ 220 px, black on white, quiet zone) + short code (large, monospaced, letter-spaced); brightness hint; **Pakua picha** (high-contrast PNG of the QR, generated client-side), **Ongeza kwenye kalenda** (.ics), **Ongeza kwenye skrini ya mwanzo** (install prompt where supported); pledge summary + **Lipa kwa simu**; footer (SW|EN, Faragha, Kamati).
- Behaviour: optimistic idempotent RSVP, success banner, change-answer flow, RSVP disabled after deadline/event; opened-state recorded in mock.
- Special states: invalid/expired token, **reissued card** (old token → "Kadi hii imebadilishwa"), offline (cached copy banner, QR still shown), event passed, RSVP closed, loading skeleton, server error with retry.
- `/c/[token]/pay` — amount (prefilled with balance, editable ≥ minimum), mobile-money number field, provider chooser (M-Pesa, Mixx by Yas, Airtel Money, HaloPesa; icons text-only), "Thibitisha kwenye simu yako" waiting state with 60 s countdown and manual "Nimeshalipa" check, success and failure screens, receipt with reference. Mock outcomes selectable in the dev panel (success, declined, timeout, duplicate webhook).
- SMS-friendly short route `/s/[code]` that redirects to the card (so the short link in SMS works), with a manual code-entry page `/k` ("Weka namba ya kadi yako, mfano KH-4821") for guests who only have the code.

### Organizer console — `/app` (auth required in mock; roles owner/committee; gate role has no console)
Layout: **mobile = top header + bottom tab bar (Muhtasari, Wageni, Tuma, Lango, Michango; "Zaidi" sheet for Kadi, Timu, Ripoti, Mipangilio); ≥ 768 px = left sidebar** with the same items. Header: event switcher, language chip, sync/offline indicator, user menu.

1. `/app` **Events list** — cards with date, venue, countdown, headline stats, status pill; empty state; **Harusi mpya** button.
2. `/app/events/new` — 4-step wizard (Majina & tarehe → Ukumbi & ramani link → Mtindo wa kadi (theme + cover) → Hakiki), autosaved draft, inline validation, review step.
3. `/app/e/[id]` **Muhtasari** — per §17.4: countdown, KPI tiles (Waalikwa, Wamethibitisha, Wamefika, Michango), funnel bar (created → sent → delivered → opened → confirmed → attended) with drill-down links, "Hatua inayofuata" smart next-step card, recent activity feed, alerts (failed messages, unusual duplicate scans, unpaid pledges near deadline).
4. `/app/e/[id]/guests` **Wageni** — searchable, filterable (chips from §17.4), sortable, virtualised table on desktop / row-list on mobile; saved filters; multi-select bulk bar (Tuma, Chapisha, Badilisha kikundi, Futa); inline status pills and channel icons; counters; export CSV; empty state.
5. `/app/e/[id]/guests/new` and **drawer/sheet** quick add — name, phone (validated, E.164), group, party size allowed, channel preference, "Hana smartphone" toggle (explained), notes.
6. `/app/e/[id]/guests/import` — 3-step wizard per §17.4: choose source (paste, CSV upload, mock contacts picker) → **preview** with column mapping, invalid phones (red), duplicates (amber), counts, inline fix → confirm; downloadable CSV template; nothing saved until confirmed; large-list performance (5,000 rows) stays smooth.
7. `/app/e/[id]/guests/[gid]` **Guest detail** — per §17.4: status timeline with timestamps, message history (channel, status, error), party size, short code with copy, QR preview, pledge summary, actions: tuma tena, onyesha QR, **toa kadi mpya (reissue)** with consequence-explaining confirm, pakua kadi ya kuchapisha, andika kumbukumbu (audit trail visible).
8. `/app/e/[id]/send` **Tuma** — per §17.4: audience selector, channel cards with counts and **estimated SMS cost (TZS)**, WhatsApp→SMS fallback explainer + toggle, schedule now/later, live message preview in SW/EN, test-send to my own number, confirm sheet showing exact numbers, **progress screen** with live per-status counters, failed list with *Tuma tena zilizoshindwa*, reminders configuration (T-14, T-7, T-1 toggles).
9. `/app/e/[id]/cards` **Kadi** — theme carousel (4 themes, contrast-checked live), cover upload (mock), editable wording (greeting line, dress code, extra note) with live guest-card preview in a phone frame and print preview (A6/A5), **print rules enforced in UI** (§6.4: QR ≥ 25 mm, show a blocking error if a layout would shrink it), buttons: Pakua PDF (mock file), Karatasi ya majaribio (test sheet at 20/25/30 mm), cut-and-collate A4 sheet.
10. `/app/e/[id]/pledges` **Michango** — header (lengo, kilichokusanywa, salio, ring/progress), tabs (Wote, Wamelipa, Sehemu, Hawajalipa), per-guest rows, **Rekodi malipo** sheet (guest search → amount → method M-Pesa/Mixx/Airtel/Cash/Bank → note/reference), payment history, reminders to unpaid guests (select + send), export, toggle for the policy "Hitaji ahadi kabla ya kadi" (default OFF, with explanatory warning copy).
11. `/app/e/[id]/gate` **Lango (web monitor)** — live check-in counter and arrival chart (hourly), **manual check-in** (search by name / last 4 digits / code → confirm card → Ingiza), scan log table with results (ok, duplicate, invalid, manual) and device/gate names, duplicate alerts, revocation list view, per-gate stats; owner/committee only; financial data hidden from `gate` role mock.
12. `/app/e/[id]/team` **Timu** — members table, invite by phone with role (committee/gate), generate **gate join link + PIN** (shown once, copyable, QR for the link), revoke access, last active.
13. `/app/e/[id]/reports` **Ripoti** — funnel summary, headcount forecast vs target, channel performance (delivered/opened/RSVP by WhatsApp/SMS/print), pledge reconciliation, post-event summary + thank-you message broadcast composer; export CSV/PDF (mock).
14. `/app/e/[id]/settings` **Mipangilio** — event info, venue, RSVP deadline, committee contact phone (feeds the trust strip), sender name, language defaults, timezone (read-only), danger zone (archive/delete with typed confirmation).
15. `/app/account` — profile, language, sign out, data export/deletion request (privacy).

Charts (funnel, arrivals, collections) must follow dataview best practices: accessible colours from the tokens, labelled values, text alternative table, no chart library on the guest card bundle. Prefer lightweight SVG components or a small library loaded only on console routes.

## COMPONENTS AND STATES

Build the full inventory in §17.9 once, in `packages/ui` (or `apps/web/src/components/ui`), each documented in Storybook with all variants and states. Every screen implements loading skeletons, empty, error, offline queue banner, partial failure, permission denied and destructive-confirm patterns from §17.10. Optimistic updates with rollback toast for guest edits, RSVP, and recording payments. Offline: console shows banner and queues writes in the mock layer; sync indicator shows pending count; "Sawazisha sasa" works.

## CONTENT AND MICROCOPY

Use warm, respectful Swahili (formal for elders), plain words, no slang, no emoji in system errors. Cover every string from §17.11 and write the rest consistently. Provide English for all. Currency `TZS 1,200,000`; dates in Swahili month names; phone display `0712 345 678` with E.164 stored.

## TESTING AND QUALITY GATES

- Unit tests (Vitest) for phone normalisation, short-code alphabet, CSV import parsing/dedupe, pledge math, SMS-cost estimator, theme contrast guard, ICS generation, mock fallback logic.
- E2E (Playwright) at **360×640 and 1280×800** for: guest opens card → RSVP → downloads QR → goes offline → QR still visible; guest pays (success/decline/timeout); owner logs in → creates event → imports 50 guests with errors → sends → monitors progress → retries failures; records a cash payment; manual check-in + duplicate handling; reissue card then old link shows "imebadilishwa"; language switch persists; keyboard-only run through the guests table.
- axe checks on every route in both locales; Lighthouse CI on `/c/[token]` (performance ≥ 90 on throttled mobile) and `/`.
- Visual snapshots of key screens at both viewports saved to `docs/ui/screenshots/` and committed.
- Lint, typecheck, build must pass; no `any`; no console errors in e2e.

## WORKING METHOD

1. **Plan first (no code):** write `docs/ui/PLAN.md` containing sitemap, component inventory, data/Repository interfaces, theme/token file layout, milestone list with acceptance checks. Create a task list from it.
2. **Milestones, each committed separately with Conventional Commits and verified by screenshots + tests before moving on:**
   - M1 Foundations: tokens, Tailwind config, i18n, layout shells, Storybook, mock repository + seed, dev panel.
   - M2 Guest card + pay + offline PWA + short routes.
   - M3 Auth, events list, create-event wizard, Muhtasari.
   - M4 Guests table, add, import wizard, guest detail, reissue.
   - M5 Send flow + progress, cards/print preview, pledges + record payment.
   - M6 Gate monitor + manual check-in, team, reports, settings, account, landing/legal pages.
   - M7 Polish: a11y pass, performance pass, Swahili copy pass, state coverage via `/dev/states`, e2e + Lighthouse green.
3. After each milestone, run the app, exercise it in a real browser at 360×640 and 1280×800, fix visual or UX defects, and update `docs/ui/PLAN.md` with status. Do not mark a milestone done until its acceptance checks pass.
4. Keep `CLAUDE.md` accurate: if you add routes/components/decisions, update §17 and add an ADR.

## DEFINITION OF DONE

- Every route and screen above exists, works on mock data, matches §17 wireframes/tokens/microcopy, and has all required states.
- A reviewer can complete the full journey (organizer sets up event → imports → sends → guest RSVPs, pays, shows QR → gate check-in monitor → pledges → report) using only the browser and the dev panel.
- Guest card meets the size/performance budgets and works offline after first open.
- Swahili default everywhere; English complete; locale persisted.
- axe: zero serious/critical issues; keyboard and screen-reader labels verified on key flows.
- Tests, lint, typecheck, build, Storybook build and Lighthouse CI pass.
- `docs/ui/PLAN.md`, ADRs, screenshots and a short `docs/ui/HANDOFF.md` (how to swap `MockRepository` for the real API, known gaps, Swahili review checklist) are committed.

Start now with step 1 (the plan). Do not ask questions; where something is ambiguous, choose the option most consistent with `CLAUDE.md`, proceed, and record the decision in `docs/adr/`.
