# Home landing overhaul — design

- Status: proposed
- Date: 2026-11-07
- Author: @yusuf.mutuku (with Claude)
- Scope: `apps/web/(public)/` home only (`/`, `/en`); KE `/ke` layout unchanged.

## 1. Problem and north star

The TZ home landing already covers hero / steps / bento / app / trust / events / FAQ / CTA, but
couples drop off before signing up because **they don't yet understand what the product actually
does** end-to-end. The overhaul optimises for one metric: clicks on the primary **Anza bure** CTA
(`/login`). Secondary KPI: opens of the live demo card.

Non-goals: redesigning KE (`/ke`), pricing page (`/bei`), product-type pages, dashboard, auth,
or any API surface.

## 2. Information architecture

New top-to-bottom order for `/` and `/en`:

1. Hero — live preview + conversion (§3)
2. Trust strip — one line: "Hulipi mpaka utume kadi · Ada moja · Inatumika pia bila mtandao"
3. "Jaribu mwenyewe" — three interactive steps (§4)
4. Three feature rows — Kadi · Lango · Michango (§5)
5. Social proof row — pilot wedding count + up to three short quotes (env-flag guarded; renders
   nothing until `NEXT_PUBLIC_HOME_PROOF=1`)
6. Pricing teaser — three tiles from live catalogue (§5)
7. Events chip grid — kept as-is (SEO value)
8. FAQ — kept, trimmed to six items
9. Final CTA band — WhatsApp-the-demo + `/login` (§6)

Kept from today: nav, footer, JSON-LD graph, Events, FAQ.
Removed: current `Steps` block, current `Bento` (`noPhone` + `gate` + `michango`), dark app section.
Their best copy survives in the new feature rows and pricing teaser.

## 3. Hero — live preview + conversion

Two-column at ≥ 1024 px, single-column below. Left column: eyebrow, H1 (Fraunces 48/56), sub
(Figtree 18/28), three inputs (couple names, date, event type), two CTAs, 1-line trust footnote.
Right column: scaled phone frame that renders the actual guest card HTML using a live `CardView`
built from the inputs (see §7 `buildDemoCardView`).

Inputs drive one client state object `{ names, dateISO, eventType }`. Phone frame re-renders on
each change, debounced 100 ms. Date defaults to the next Saturday ≥ 60 days out; names default to
"Asha & Juma"; venue stays fixed ("Ukumbi wa Mwanga, Kibaha") for v1. Event type is one of
`harusi | send-off | kitchen-party | nikah | uchumba | kuzaliwa | mahafali`; each maps to a preset
`brand_theme` (Emerald & Gold default, Terracotta, Navy & Silver, Rose & Sage) and a Swahili
event label.

CTAs:

- Primary: **Anza bure** → `/login` (unchanged target).
- Secondary: **Tazama kadi kamili ↗** → `/jaribu?names=…&date=…&event=…` in a new tab.

Trust line: "Mwaliko wako haupotei. Ad-free. PDPA-compliant." (EN equivalent in copy file.)

Analytics events (consume the existing `page_view`/emit sites introduced in commit `0158bb4`):

- `home_hero_view` on mount
- `home_hero_input` with `{field}` on debounced change
- `home_hero_cta_primary` on primary click
- `home_hero_cta_secondary` on secondary click

No PII is sent; `names` is hashed client-side before emission.

## 4. "Jaribu mwenyewe" — three interactive steps

Full-width section with ivory background, three equal cards on desktop, stacked on mobile. Each
card has an eyebrow number, title, one-sentence body, and a _working_ interaction (not a static
image). Interactions are entirely client-side state — no network calls.

1. **Mgeni anafungua kadi** — a mini WhatsApp-style bubble shows the real SMS/WhatsApp copy with
   the visitor's names + date. "Fungua kadi" button opens the same `/jaribu` link as the hero.
   Below the bubble, a monospace chip shows the raw message text guests will receive.

2. **Mgeni anathibitisha** — a mini RSVP card with Nitahudhuria / Sitahudhuria + party stepper.
   Clicking Nitahudhuria flips the card to a success state ("Umethibitisha ✔") and ticks a
   "Wathibitishaji: 1 / 320" counter at the section header.

3. **Lango linamsoma** — static QR + "Changanua QR" button that plays the gate-result overlay
   (ADMIT green, DUPLICATE amber, DENY red) using the same `#075E20 / #7A4A00 / #8C1D17` tokens
   the real gate uses. Successive taps cycle the three outcomes. Reduced-motion disables the
   overlay transition; the overlay still appears, just instantly.

Accessibility: each interactive area is a `<button>` with a text label; keyboard operable;
focus ring visible.

Analytics: `home_try_step_interact` with `{step: 1 | 2 | 3, action}`.

## 5. Feature rows, `/jaribu` route, pricing teaser

### Feature rows

Three `<section>`s, alternating left/right. Each row: left side headline + three bullets +
inline link to the related deeper page (where it exists), right side a visual reused from
`mockups.tsx`.

1. **Kadi** — "Kadi inayofaa kwa simu yoyote." Visual: `CardAndSms`. Bullets: SMS fallback,
   print PDF, offline after first open. Link → `kadi-ya-harusi-mtandaoni`.
2. **Lango** — "Mlangoni, sekunde moja kwa kila mgeni." Visual: `/public/site/gate-scanner-admit.svg`
   (static). Bullets: offline verify, duplicate-aware, PIN per lango. Link → gate guide page if it
   exists, otherwise bullet-only.
3. **Michango** — "Ahadi na malipo zinajiangalia zenyewe." Visual: `MichangoBar`. Bullets:
   M-Pesa / Mixx / Airtel, ripoti CSV, siri (owner-only). No deep link in v1, respecting
   [ADR 048] (contributions are records only — the platform never holds funds).

### `/jaribu` route

New file: `apps/web/app/(public)/jaribu/route.ts` (plain HTML handler, mirrors the pattern in
`apps/web/app/c/[token]/route.ts`). First paint ≤ 25 KB like `/c/<token>`.

Behaviour:

- `GET` reads `?names=`, `?date=`, `?event=` from the URL. Validates with zod: names 1–60 chars,
  date ISO-8601 within the next 24 months, event in the enum from §3. Invalid inputs fall back to
  defaults; the route never throws to the user.
- Builds an ad-hoc `CardView` via `buildDemoCardView()`.
- Wraps `renderCard()` output with a full-width banner at the top:
  "Hii ni kadi ya majaribio. Pata yako — [Anza bure]" linking to `/login`.
- The QR in the demo card encodes the URL of `/jaribu` itself (not a signed token); if scanned,
  a visitor lands back on the demo. This is deliberate — the demo must not render a
  shape resembling a real signed token.
- Response headers: `Cache-Control: s-maxage=3600, stale-while-revalidate=86400`, `X-Robots-Tag:
noindex`. Added to `robots.ts` disallow. Not added to sitemap.
- Works at `/jaribu` (SW) and `/en/jaribu` (EN). `/try` is a 308 redirect to `/en/jaribu`.

### Pricing teaser

Server component. Imports `getPricingOnServer()` already used by home. Renders three tiles —
Mini / Kati / Kubwa by catalogue name — with currency, one-line "what it includes", middle
tile emphasised with a ring. Every tile's CTA is **Chagua** → `/login?plan=<id>`.

Below the tiles: one-liner "Hulipi mpaka utume kadi" and a text link to `/bei` for the full
comparison. KE edition reuses the tile shape with KES prices.

`/login` already ignores unknown query params; no backend change is required for `?plan=<id>` in
v1. A later iteration may prefill the signup plan selector from this param — out of scope here.

## 6. Final CTA band

Full-bleed `ks-mesh-dark` background (existing class).

- Eyebrow: "Tayari kuanza?"
- Headline (Fraunces 40/48): "Pata mwaliko wako wa majaribio sasa hivi."
- One phone field + "Tuma kwa WhatsApp" button. On submit, the button opens
  `https://wa.me/<optional>?text=<encoded-SW-message-with-/jaribu-link>`. If the field is empty,
  it opens `https://wa.me/?text=…` so the visitor picks a recipient (themselves). Zero backend
  in v1 — no phone storage, no rate-limit surface, no new API endpoint.
- Secondary CTA: **Anza bure** → `/login`.
- Footnote line: committee contact + privacy link + domain, continuing the P1 / P7 trust pattern
  from the guest card.

A real "WhatsApp me the demo" bridge through WhatsApp Business Cloud API is explicitly deferred.

## 7. Engineering layout

### New files

- `apps/web/app/(public)/jaribu/route.ts` — `/jaribu` + `/en/jaribu` demo card (plain HTML).
- `apps/web/src/components/site/home/hero-live.tsx` — client island; inputs + phone frame
  - debounced preview.
- `apps/web/src/components/site/home/try-section.tsx` — client island; the three §4 steps and
  their local state.
- `apps/web/src/components/site/home/feature-row.tsx` — server component used three times.
- `apps/web/src/components/site/home/pricing-teaser.tsx` — server component; accepts a
  `PricingCatalog`.
- `apps/web/src/components/site/home/cta-band.tsx` — client component (only to build the
  `wa.me` URL from the phone field); no network.
- `apps/web/src/lib/demo-card.ts` — pure, isomorphic
  `buildDemoCardView({names, dateISO, eventType})` returning a `CardView`. Used by both
  `/jaribu` (server) and `<HeroLive>` (client).

### Edited files

- `apps/web/src/components/site/home-page.tsx` — reduced to stitching: Hero → TrustStrip →
  TrySection → 3× FeatureRow → PricingTeaser → Events → FAQ → CtaBand. The JSON-LD block is
  updated: the `HowTo` node is re-sourced from the new §4 `try-section` steps (same shape:
  `name`, `step[].name`, `step[].text`) so structured data keeps matching what's on the page.
  Other graph nodes (`Organization`, `WebSite`, `WebPage`, `Service`) are unchanged.
- `apps/web/src/content/home.ts` — extend `homeCopy()` with keys for new sections; remove
  `noPhone`, `steps`, `app.*` keys for removed sections; SW and EN both filled.
- `apps/web/src/content/site-ui.ts` — add missing labels (`tryItYourself`, pricing CTA labels).
- `apps/web/app/robots.ts` — disallow `/jaribu` and `/en/jaribu`.

### Deletions

`apps/web/src/components/site/mockups.tsx` keeps `CardAndSms`, `MichangoBar`, `GateChip`,
`TrustStrip` (still used). Unused mockups (`SmsBubble`, `AppMockup`) are removed if no other
consumer survives after the home-page.tsx rewrite. Grep-check before deleting.

### Tests

- `apps/web/src/lib/demo-card.test.ts` — vitest; builds view for each event type; asserts
  theme, event label, QR URL safety (no un-encoded user input).
- `apps/web/app/(public)/jaribu/route.test.ts` — vitest; `GET` with valid, invalid, long, and
  XSS-in-names inputs; asserts banner present, no `<script>` injection, correct `lang=`, correct
  `X-Robots-Tag`.
- `apps/web/e2e/home-hero.spec.ts` — Playwright; types names, waits for debounced preview to
  update, clicks "Tazama kadi kamili", asserts new tab lands on `/jaribu?names=…` with the demo
  banner.

### Performance

- Hero client island budget: ≤ 18 KB gz. No chart libs, no animation libs. Debounce ≤ 100 ms.
- `/jaribu` first paint budget: ≤ 25 KB (parity with `/c/<token>`).
- Existing Lighthouse mobile target (≥ 90) must not regress.

### Risks and mitigations

- **`renderCard()` shape drift:** the ad-hoc `CardView` must stay in step with the real one.
  Mitigation: `demo-card.test.ts` feeds the view through `renderCard()` and asserts no throw and
  that the demo banner appears exactly once.
- **Slow Android client preview:** cap debounce at 100 ms, skip re-render when fields unchanged,
  prefer CSS transforms over layout changes. Measured on a 2 GB RAM Android emulator pre-merge.
- **QR confusion:** the demo QR encodes `/jaribu` itself, not a signed token. Documented in
  `demo-card.ts` and asserted in the test.

## 8. Acceptance criteria

- Home at 360 × 640 and 1024 × 768 both render §3–§6 without horizontal scroll.
- Typing in the hero inputs updates the preview within 150 ms on a 2× CPU-throttled profile.
- `/jaribu` returns a valid HTML card with the demo banner for valid, invalid, and malicious
  inputs; never 5xx.
- Lighthouse mobile ≥ 90 performance and accessibility on `/` and `/jaribu` after the change.
- All four analytics events in §3 and §4 fire exactly once per their described trigger.
- `pnpm -w typecheck && pnpm -w lint && pnpm -w test` green; Playwright e2e green.

## 9. Follow-ups (out of scope)

- Real "WhatsApp me the demo card" via WhatsApp Business Cloud API.
- KE home overhaul using the same hero pattern (English only, KES tiles).
- Pricing comparison deep-link from `/login?plan=<id>` to a one-click signup prefill.
- Reduced-motion variants for the §4 transitions once motion is added beyond the gate overlay.

## 10. References

- CLAUDE.md §17 (UI/UX specification) — layout, tokens, microcopy, accessibility bar.
- ADR 005 — `/app` web console scope (confirms home is the public landing, not the dashboard).
- ADR 048 — Contributions are records only; never frame michango as collection.
- ADR 057 §5, §7 — server-side `page_view` and `/ops/analytics` summary route used by new events.
- Commit `0158bb4` — emit sites introduced; new events hang off the same transport.
