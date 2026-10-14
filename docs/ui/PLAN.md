# Harusi Pass — Web MVP UI/UX plan

Status legend: ☐ not started · ◐ in progress · ☑ done (acceptance checks passed)

Source of truth: `CLAUDE.md` (§1, §2, §5–§8, §10, §17). This plan covers `apps/web` only, running on mock data. Decisions that differ from or extend `CLAUDE.md` are in `docs/adr/005`–`docs/adr/0xx`.

---

## 1. Sitemap

```
Public (server-rendered, no console code)
  /                      Landing (hero, 4 steps, feature-phone section, trust, FAQ ×6, footer)
  /privacy  /terms       Draft legal pages with "Rasimu" banner
  /login                 Phone (+255) → E.164
  /login/otp             6-cell OTP (mock code 123456), resend timer, error + lockout

Guest (lean bundle, PWA scope /c/ and /s/ and /k)
  /c/[token]             Guest card (§17.6, §7.3)
  /c/[token]/pay         Mobile-money pay flow (amount → number → provider → wait 60 s → result + receipt)
  /s/[code]              Short link → redirect to /c/[token]
  /k                     Manual code entry ("Weka namba ya kadi yako, mfano KH-4821")

Organizer console (/app, auth required, roles owner | committee; gate role is refused)
  /app                                 Events list
  /app/events/new                      Create-event wizard (4 steps, autosaved draft)
  /app/e/[id]                          Muhtasari (overview)
  /app/e/[id]/guests                   Wageni table / list
  /app/e/[id]/guests/new               Add guest (also as quick-add sheet)
  /app/e/[id]/guests/import            Import wizard (source → preview → confirm)
  /app/e/[id]/guests/[gid]             Guest detail
  /app/e/[id]/send                     Tuma (compose → confirm → progress → failures; reminders)
  /app/e/[id]/cards                    Kadi (themes, wording, phone + print preview, PDF/test sheet)
  /app/e/[id]/pledges                  Michango
  /app/e/[id]/gate                     Lango (web monitor + manual check-in)
  /app/e/[id]/team                     Timu (members, invites, gate link + PIN)
  /app/e/[id]/reports                  Ripoti
  /app/e/[id]/settings                 Mipangilio (owner only)
  /app/account                         Akaunti

Dev only (NODE_ENV !== 'production' or NEXT_PUBLIC_USE_MOCKS=1)
  /dev/states            Every screen × every §17.10 state
  Floating dev panel     role · locale · network (online/slow/offline) · failure injection · pay outcome · reset data
```

Navigation (console): mobile = header + bottom tabs (Muhtasari, Wageni, Tuma, Lango, Michango) + "Zaidi" sheet (Kadi, Timu, Ripoti, Mipangilio, Akaunti); ≥ 768 px = left sidebar with the same items. Header: event switcher, language chip, sync indicator, user menu.

## 2. Code layout

```
apps/web/
  app/
    (public)/ page.tsx, privacy/, terms/, login/, login/otp/
    c/[token]/ page.tsx, pay/page.tsx, manifest + sw registration
    s/[code]/page.tsx  k/page.tsx
    app/ layout.tsx (console shell, QueryClientProvider), page.tsx, events/new, e/[id]/…, account
    dev/states/page.tsx
    layout.tsx  globals.css (Tailwind v4 + tokens.css)
  public/sw.js  public/manifest.webmanifest  public/icons/*
  src/
    components/ui/        §17.9 inventory (stateless, strings via props) + *.stories.tsx
    components/card/      guest card sections (no console imports)
    components/console/   console shell, charts (SVG), tables
    lib/                  repo.ts (selects Mock/Http), format.ts (TZS, dates, phones), ics.ts, qr.ts, theme.ts, sms-cost.ts, csv.ts
    i18n/                 next-intl request config (cookie locale)
  e2e/                    Playwright specs
  .storybook/
packages/
  ui-tokens/  tokens (TS) + generated tokens.css + themes (4 presets) + contrast()
  i18n/       sw.json (with _meta.reviewed=false), en.json — namespaced keys
  schemas/    zod: phone, guest, event, pledge, payment, rsvp, import row, …
  api-client/ Repository interface (§8), MockRepository (+ seed generator), HttpRepository stub
```

The guest route group imports only `components/card`, `components/ui` primitives it needs, `lib/qr`, `lib/ics`, `lib/format`. ESLint `no-restricted-imports` blocks `components/console`, `@tanstack/*`, and chart code from `app/c/**`, `app/s/**`, `app/k/**`.

## 3. Data and Repository interfaces

`packages/api-client/src/repository.ts` mirrors §8 (one method per endpoint, typed with `packages/schemas`):

| §8 endpoint                               | Repository method                                                                                             |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| POST /auth/otp/request, /verify, /refresh | `requestOtp(phone)`, `verifyOtp(phone, code)`, `getSession()`, `signOut()`                                    |
| GET/POST /events, GET/PATCH /events/:id   | `listEvents()`, `createEvent(input)`, `getEvent(id)`, `updateEvent(id, patch)`                                |
| POST/DELETE /events/:id/members           | `listMembers`, `inviteMember`, `removeMember`, `createGateLink`                                               |
| GET/POST /events/:id/guests, /import      | `listGuests(eventId, query)`, `createGuest`, `previewImport` (local), `importGuests`                          |
| PATCH/DELETE /guests/:id, POST reissue    | `getGuest`, `updateGuest`, `deleteGuests`, `reissueGuest`                                                     |
| POST /invitations/send, GET stats         | `sendInvitations(eventId, req)`, `getSendJob(jobId)`, `getInvitationStats(eventId)`, `retryFailed(jobId)`     |
| POST /cards/pdf                           | `requestCardsPdf(eventId, opts)` (mock returns a Blob)                                                        |
| GET /gate/bundle, POST /gate/scans/sync   | `getGateBundle`, `listScans`, `manualCheckIn(eventId, guestId, reason?)`                                      |
| GET/POST pledges, POST /payments/manual   | `listPledges`, `upsertPledge`, `recordManualPayment`, `listPayments`                                          |
| GET /c/:token, POST rsvp, POST pay        | `getCard(token)`, `rsvp(token, input, idempotencyKey)`, `startPayment(token, input)`, `getPaymentStatus(ref)` |
| (short links)                             | `resolveShortCode(code)`                                                                                      |
| (reports, activity, audit)                | `getReport(eventId)`, `listActivity(eventId)`, `listAudit(guestId)`                                           |

Errors use the §8 shape: `RepositoryError { code, message, details? }` with codes `offline`, `not_found`, `invalid_token`, `reissued`, `rate_limited`, `validation`, `server`.

**MockRepository**: in-memory state persisted to `localStorage` (`harusi.mock.v1`), deterministic seed (seeded PRNG) — 2 events (one upcoming, one past), 320+ guests on the upcoming event (Tanzanian names, groups, phone formats incl. `07…`, `+255…`, `255…`, spaces; statuses across the whole funnel; party sizes 1–4; ~30% feature-phone; pledges on ~60%), 3 team members, messages, scans and payments consistent with statuses. Controls (`mockControls`): latency 200–600 ms (×4 on "slow"), failure rate 0/10/30 %, offline flag (writes queued, reads from cache), pay outcome (success | declined | timeout | duplicate_webhook). Mock tokens: `v1.<eventId8>.<guestId8>.<party>.<ver>.MOCKSIG` (clearly labelled; `QrBlock` accepts any token string).

**HttpRepository**: stub class implementing the same interface with `fetch` against `/v1`, throwing `not_implemented` — selected when `NEXT_PUBLIC_USE_MOCKS !== '1'`.

## 4. Tokens and themes

- `packages/ui-tokens/src/index.ts` — §17.2 colours (light/dark), gate fills, spacing, radius, type scale.
- `packages/ui-tokens/src/themes.ts` — 4 presets (emerald-gold default, navy-silver, terracotta, rose-sage) overriding only `primary`, `on-primary`, `accent`, `pattern`.
- `packages/ui-tokens/src/contrast.ts` — WCAG contrast; `assertThemeContrast` rejects < 4.5:1.
- `packages/ui-tokens/tokens.css` — generated (`pnpm --filter @harusi/ui-tokens gen`), CSS custom properties; a unit test fails if out of sync. Tailwind v4 `@theme` maps them to utilities (`bg-bg`, `text-ink`, `bg-primary`, …).

## 5. Component inventory (§17.9)

Primitives (`src/components/ui`, Radix where interactive): Button (primary/secondary/ghost/danger; loading, disabled), IconButton, TextField (prefix, inline error), PhoneField, OtpField, Stepper, SegmentedControl, Chip, StatusPill, Avatar, ListRow, Card, KpiTile, ProgressBar, FunnelBar, Timeline, BottomSheet (Radix Dialog), ConfirmSheet, Toast (Radix Toast), Banner (info/warn/offline/error), EmptyState, Skeleton, Tabs (Radix), Header, QrBlock, SearchSheet, FilePicker, ContactPicker (mock), CurrencyText, DateText, Switch, Checkbox, Select, Ring (progress ring), BarChart (SVG), DataTable wrapper.

Every component has a story covering each variant and state.

## 6. State coverage (§17.10)

Shared `<QueryState>` wrapper renders Skeleton / EmptyState / ErrorState (Jaribu tena + code) / offline banner. Partial failure via per-item status lists. Permission-denied component (camera/contacts). Destructive actions through ConfirmSheet (typed confirmation for event delete). `/dev/states` renders each screen with a forced state.

## 7. Milestones and acceptance checks

| #   | Milestone                                                                                                                        | Acceptance checks                                                                                                                                                                                                             | Status                 |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| M1  | Foundations: tokens, Tailwind, i18n (next-intl, cookie), layout shells, Storybook, Repository + MockRepository + seed, dev panel | typecheck/lint/test green; Storybook builds; seed tests (≥ 320 guests, 2 events, 3 members); locale cookie switch; dev panel toggles affect the mock                                                                          | ☑                      |
| M2  | Guest card + pay + offline PWA + /s, /k                                                                                          | §17.6 layout at 360 px (screenshots); all card states in `/dev/states`; RSVP idempotent + durable outbox (unit + e2e); QR PNG; .ics; offline after first load (e2e); pay success/decline/timeout (e2e); JS 116 KB gz < 120 KB | ☑                      |
| M3  | Auth, events list, create wizard, Muhtasari                                                                                      | login with 123456; lockout after 5 wrong (unit); wizard autosave; KPIs/funnel from mock data                                                                                                                                  | ☑                      |
| M4  | Guests table, add, import, detail, reissue                                                                                       | virtualised table/list and import preview; invalid/duplicate flags; reissue → old link "imebadilishwa" (e2e); keyboard-only table run (e2e)                                                                                   | ☑                      |
| M5  | Send + progress, cards/print, pledges                                                                                            | send with injected failures → correct counters and retry (e2e); print rules block QR < 25 mm (e2e); cash payment updates balances (e2e)                                                                                       | ☑                      |
| M6  | Gate monitor, team, reports, settings, account, landing/legal                                                                    | manual check-in + duplicate (e2e); gate link + PIN shown once; typed-confirm delete                                                                                                                                           | ☑                      |
| M7  | Polish                                                                                                                           | axe: zero serious/critical on 20 routes × 2 locales × 2 viewports (e2e, 112 passed); screenshots in `docs/ui/screenshots`; HANDOFF.md; Lighthouse CI configured                                                               | ☑ Lighthouse 0.93–0.97 |

### Open items

- **Lighthouse ≥ 90: met.** `/` 0.94–0.97 and `/c/[token]` 0.93–0.95 (3 runs each, simulated slow-4G mobile) after dropping the web font from the guest card (ADR 009).
- **< 100 KB initial load** conflicts with the mandated Next.js stack (ADR 009); the card is 116 KB gz of JS (< 120 KB budget).
- Native-speaker Swahili review pending (`sw.json` `_meta.reviewed: false`).
- Staff panel: pricing, invoices, refunds, staff sub-roles and 2FA are undecided (ADR 012).

Each milestone ends with: run app → check in browser at 360×640 and 1280×800 → fix defects → update this table → Conventional Commit.

## 8. Test plan

- Vitest: phone normalisation, short-code alphabet, CSV parse/dedupe, pledge math, SMS-cost estimator, theme contrast guard, ICS, mock offline/fallback logic, seed invariants.
- Playwright (360×640, 1280×800): journeys listed in the brief; axe on every route in both locales; no console errors.
- Lighthouse CI: `/c/[token]` and `/` mobile, throttled.
