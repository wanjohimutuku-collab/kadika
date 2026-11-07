# Phase 0 — Discovery and baseline

Status: draft, 2026-11-06. Scope: the KadiSasa redesign programme in root CLAUDE.md, run against the
`feat/sms-reminders-only` tip. No production code was changed in this phase.

## 1. Stack and architecture

Monorepo, pnpm 9.15, Node 22, Turborepo, TypeScript strict, ESLint + Prettier.

Apps and packages already in place:

- `apps/web` — Next.js 15 App Router, React 19, Tailwind 4, next-intl 4, Firebase phone auth client,
  react-query, react-hook-form, zod, qrcode, Radix, Storybook 8, Playwright, Lighthouse CI.
- `apps/api` — Hono 4 + BullMQ + Drizzle ORM + Postgres + Redis + ioredis, Firebase admin via `jose`,
  Sentry.
- `apps/mobile` — Expo + expo-router (organizer + gate scanner).
- `packages/*` — `ui-tokens`, `schemas` (billing / branding / country / zod), `api-client`, `crypto`
  (isomorphic QR sign/verify), `db` (Drizzle schema + migrations + seed), `gate`, `messaging`,
  `payments`, `i18n` (sw + en).

### Host surfaces (ADR 032, `apps/web/middleware.ts` + `src/lib/surfaces.ts`)

Enforced in middleware when `NEXT_PUBLIC_APP_DOMAIN` is set:

- `kadisasa.com` / `www.kadisasa.com` — public site **and** guest card routes (`/c`, `/s`, `/k`).
  `www` gets a 308 to the apex.
- `app.kadisasa.com` — customer / reseller console (`/app`).
- `my.kadisasa.com` — staff panel (`/ops`).

A request for a surface on the wrong host gets a 307 redirect to its canonical host.

### Public site language scheme (do NOT change)

Decided in `src/lib/site-locale.ts` and the middleware:

- `/` — Swahili, Tanzania (`sw-TZ`). Default locale for the TZ market.
- `/en` — English, Tanzania (`en-TZ`), rewritten to the same route tree.
- `/ke` — English, Kenya (`en-KE`). Swahili never served on `/ke`.
- Legacy `?lang=…` URLs redirect 301 to the new paths.

This differs from the `/en-tz/`, `/sw-tz/`, `/en-ke/` structure suggested in CLAUDE.md §8. CLAUDE.md
§6 also says "Maintain existing URLs wherever possible" and §15 Prompt 4 says "Preserve existing URLs
and redirects." We keep the current scheme. Hreflang alternates are already reciprocal (see §4 of this
report).

## 2. Route inventory (apps/web)

### Public site — `app/(public)`

| Route        | Source                                | Notes                                                   |
| ------------ | ------------------------------------- | ------------------------------------------------------- |
| `/`          | `app/(public)/page.tsx`               | Home, Swahili. Uses `HomePage` + live `PricingCatalog`. |
| `/en`        | same, via `/en` rewrite in middleware | Home, English.                                          |
| `/ke`        | `app/(public)/ke/page.tsx` (home)     | Kenya home.                                             |
| `/bei`       | `app/(public)/bei/page.tsx`           | Pricing.                                                |
| `/programu`  | `app/(public)/programu/page.tsx`      | Android app page. `/app-download` 308 → `/programu`.    |
| `/login`     | `app/(public)/login/page.tsx`         | Phone sign-in (Firebase + OTP fallback).                |
| `/privacy`   | `app/(public)/privacy/page.tsx`       | Static route; ContentPage slug is skipped.              |
| `/terms`     | `app/(public)/terms/page.tsx`         | Static route; ContentPage slug is skipped.              |
| `/gate-join` | `app/(public)/gate-join/*`            | Gate join flow.                                         |
| `/[slug]`    | `app/(public)/[slug]/page.tsx`        | Every content page in `ALL_PAGES`.                      |

#### Content pages registered in `src/content/pages/*` (37 pages)

- **TZ product** (`group: 'product'`): `kadi-ya-harusi-mtandaoni`, `michango-ya-harusi`,
  `kadi-ya-send-off`, `kadi-ya-uchumba`, `kadi-za-mwaliko-mtandaoni`, `kadi-ya-kuzaliwa`,
  `kadi-ya-kitchen-party`, `kadi-ya-mahafali`, `kadi-za-mwaliko-biashara`, `kadi-ya-nikah-na-walima`,
  `kadi-za-mwaliko-tanzania`.
- **TZ guides**: `kadi-ya-harusi-bila-smartphone`, `usalama-wa-kadi-za-mtandaoni`,
  `lango-la-harusi-qr`, `maneno-ya-kadi-ya-harusi`, `jinsi-ya-kuchagua-huduma-ya-kadi-za-mwaliko`,
  `kamusi-ya-harusi`.
- **TZ articles**: `jinsi-ya-kuunda-kadi-ya-harusi-tanzania`, `kadi-ya-mtandaoni-vs-karatasi`,
  `kutuma-kadi-za-mwaliko-whatsapp`, `kusimamia-majibu-ya-rsvp`.
- **TZ company**: `maswali`, `kuhusu`, `mawasiliano`.
- **TZ legal**: `privacy` (static route), `terms` (static route), `cookies`, `ombi-la-data`,
  `matumizi-yanayokubalika`.
- **KE** (`/ke/*`): `` (home), `wedding-committee-guide`, `wedding-contributions-guide`,
  `wedding-invitation-wording`, `is-a-digital-wedding-invitation-safe`.
- **KE legal**: `/ke/privacy`, `/ke/terms`, `/ke/data-requests`.

Slugs are the same in both locales; English is served under `/en` for TZ pages.

### Non-public

- `app/app/*` — console: `/app` (dashboard), `/app/events`, `/app/events/[id]/*`, `/app/account`,
  `/app/contacts-config`, `/app/e/*`.
- `app/ops/*` — staff panel: `/ops`, `/ops/audit`, `/ops/billing`, `/ops/events`, `/ops/messaging`,
  `/ops/organizers`, `/ops/payments`, `/ops/pilot`, `/ops/requests`, `/ops/settings`, `/ops/sms`,
  `/ops/support`, `/ops/usage`.
- `app/c/[token]/*`, `app/s/[code]/*`, `app/k/page.tsx` — guest card surfaces.
- `app/dev/*` — dev tools (`noindex` header, `/ops` disallow in robots).
- `app/api/*` — proxied API routes.

### SEO files

- `app/robots.ts` — named allowlist for Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User,
  PerplexityBot, Claude-SearchBot, Claude-User. Disallow: `/app`, `/ops`, `/c/`, `/s/`, `/k$`,
  `/login`, `/dev`, `/api/`. Guarded by `src/lib/robots.test.ts`.
- `app/sitemap.xml/route.ts` — sitemap index, children per edition.
- `app/sitemaps/[edition]/route.ts` — urlsets for `sw`, `en`, `ke` with reciprocal hreflang.
- `app/llms.txt`, `app/llms-full.txt` — generated from content.
- `app/og/[file]/route.tsx` — build-time OG images per edition.

## 3. Design system baseline

### Shared app tokens (`packages/ui-tokens`)

Light-only on web. Primary emerald `#0F5C4D`, accent gold `#B8893B`, bg `#FBF8F3`, ink `#1B1B1F`,
muted `#5F6368`, border `#E6DFD3`. Gate colours `admit / duplicate / deny` are darkened for AA
contrast (ADR 006). Radii `card 12`, `input 8`, `pill 999`. Spacing on a 4-pt grid. Fonts: Figtree
(body), Fraunces italic (couple names), Cormorant Garamond (display).

### Marketing site scope — `.ks` layer (`apps/web/app/globals.css`)

Added 2026-11 (ADR 054). Scoped to the `.ks` class on the public layout only — the console, guest
card, gate and staff panel keep the shared tokens. Tokens: `--ks-green-900 #0A3F35`,
`--ks-green-700 #0F5C4D`, `--ks-green-100 #E3F0EC`, `--ks-gold-500 #D9A441`, `--ks-gold-100 #FBF1DC`,
`--ks-ink #1A1F1D`, `--ks-muted #5B6662`, `--ks-paper #FBFAF7`, `--ks-line #E4E1DA`. Utilities:
`ks-bezel` / `ks-core` (nested card tray + inner surface), `ks-mesh` / `ks-mesh-dark` (static
gradient backgrounds), `ks-reveal` + `ks-enter*` + `ks-stagger` (CSS view-timeline scroll reveals,
disabled under `prefers-reduced-motion`), `ks-kanga` (decorative border), `ks-grain` (SVG noise).

### Shared marketing primitives (`src/components/site/`)

`blocks.tsx`: `siteButton(kind)` (primary / secondary / onDark / outlineOnDark pill buttons with
ArrowDot), `PillLink`, `Container` (1120 px max, 16 px gutter), `Eyebrow`, `Hero`, `SectionHeading`,
`Steps`, `Faq`, `CtaBand`, `AnswerBlock`.

`mockups.tsx`: `CardAndSms`, `SmsBubble`, `GateChip`, `MichangoBar`, `AppMockup`, `TrustStrip` —
illustrative product mockups drawn in markup, not screenshots.

`site-footer.tsx`, `site-link.tsx`, `locale-switch.tsx`, `json-ld.tsx`, `home-page.tsx`.

### Nav shell

`src/components/public/site-nav.tsx` — client floating glass pill with dropdown groups desktop /
full-height sheet mobile. Server-rendered links stay crawlable while closed. Current header groups:
Huduma (products) + Miongozo (guides) + Bei + Kuhusu + "Nina namba ya kadi" + "Anza bure" CTA.

Storybook is already wired (`apps/web/src/components/ui/*.stories.tsx`) and CI builds it.

## 4. SEO baseline

Measured in `docs/seo/SEO-AUDIT.md` (2026-11-04), score 57/100 live, 72/100 after fixes already on
this branch. Key points:

- Every public page SSRs with full HTML + answer-first body + JSON-LD.
- Unique titles / descriptions / self canonical / hreflang (`sw-TZ`, `en-TZ`, `en-KE`, `x-default`)
  per page via `src/content/metadata.ts` + `src/lib/seo.ts`.
- One shared `Organization` entity by `@id` (`#org`), with logo + `areaServed: ['TZ','KE']` +
  `contactPoint`. `WebPage`+`speakable`, `HowTo` and `Article` nodes already in use.
- Sitemap index + per-edition urlsets include hreflang alternates for every page's counterpart.
- OG images per edition (`/og/sw.png`, `/en.png`, `/ke.png`); Twitter card is `summary_large_image`.
- Known gaps (from the audit, not this phase):
  - `http://` → `https://` is a 302 at the proxy; should be 301 (Cloudflare / Traefik change).
  - `sameAs` is empty — no off-site social / business profile URLs yet.
  - Core Web Vitals not measured on real hardware (the audit only had TTFB).

## 5. Integrations

| Capability               | Interface / adapter                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------- |
| Phone sign-in            | Firebase phone auth (ADR 048) in `src/lib/firebase-phone.ts`, fallback SMS OTP (`auth/otp.ts`).   |
| Staff 2FA                | TOTP (ADR 040), `apps/api/src/auth/staff-totp.ts`.                                                |
| WhatsApp                 | `MessagingProvider` interface. Adapters: WhatsApp Cloud API, Evolution API (unofficial, ADR 020). |
| SMS (TZ)                 | NextSMS (ADR 018).                                                                                |
| SMS (KE)                 | Africa's Talking (ADR 026).                                                                       |
| Payments aggregator (TZ) | `PaymentProvider` → Snippe aggregator (ADR 027): M-Pesa, Mixx, Airtel Money, HaloPesa.            |
| Payments aggregator (KE) | KES currency on same interface (ADR 027).                                                         |
| Analytics                | **None deployed.** `legal.ts:1298` promises "no advertising or analytics cookies". See §7.        |
| Error reporting          | `@sentry/node` on the API.                                                                        |

All providers have in-memory fakes used by tests and local dev; staff may swap live settings via
`/ops/messaging` and `/ops/settings`.

## 6. Build / test baseline

Root scripts:

```
pnpm typecheck   # turbo fan-out
pnpm lint
pnpm format:check
pnpm test        # vitest across workspaces
pnpm build       # Next standalone + API bundle + packages
```

Per-app (`apps/web`):

```
pnpm --filter @harusi/web e2e           # Playwright
pnpm --filter @harusi/web lhci          # Lighthouse CI
pnpm --filter @harusi/web build-storybook
```

CI (`.github/workflows/ci.yml`): `typecheck / lint / format:check / test / build`, smoke-test the
built API bundle against `/health`, build Storybook, `pnpm audit` (advisory). A separate `web-e2e`
job runs Playwright + Lighthouse CI. Required checks + auto-merge on main are already configured
(user memory: "kadika GitHub setup").

Baseline runs needed before any Phase 2+ work:

- `pnpm typecheck && pnpm lint && pnpm test && pnpm build` on the current branch head.
- Playwright + Lighthouse against a production build.

## 7. Risk assessment and hard constraints

Constraints that override CLAUDE.md where they disagree:

1. **Contributions wording** (ADR 043, user memory "Contributions not collected by us"). Guest
   michango are records only, encrypted, owner-visible only — KadiSasa never holds or processes
   that money. Any Section 7 ("Contributions") hero / FAQ / schema copy that implies otherwise is
   false and must be re-worded. Current content already enforces this; keep it.
2. **Analytics** (CLAUDE.md §13 + Prompt 8). The privacy page promises no advertising / analytics
   cookies and no banner. We cannot add gtag / Plausible / PostHog / GA without: a new ADR, a
   consent UI, and a privacy page update. First-party server-side event logging that never leaves
   our DB (and carries no guest PII) is possible without a banner, but still needs an ADR.
3. **URL structure.** Do not move to `/en-tz/` / `/sw-tz/` / `/en-ke/`. Current scheme is correct
   and the audit is passing hreflang. CLAUDE.md §2 says "Do not rename existing routes without a
   migration plan" and §6 "Maintain existing URLs wherever possible".
4. **Pricing** must always come from the live `PricingCatalog` (`getPricingOnServer()`), never
   hardcoded. CLAUDE.md's "5 free invitation cards" is a configured number that may change.
5. **Testimonials.** ADR 054 and CLAUDE.md §5.11 both require genuine ones. The site currently has
   none; do not fabricate.
6. **Kenya status.** KE pages exist but the market is "pilot" — the CTA is "Join the Kenya pilot",
   not "Sign up". Do not advertise unavailable payment / messaging flows there.
7. **Payments / OTPs / tokens** must never be logged.

Delta between CLAUDE.md spec and current implementation (to decide before Phase 2):

| CLAUDE.md asks for                                                | Today                                           | Proposed resolution                                                                              |
| ----------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Header: Platform / Occasions / How It Works / Pricing / Resources | Huduma + Miongozo + Bei + Kuhusu + CTA          | Keep current groups; rename labels only if confirmed by user.                                    |
| `/resources/`, `/help/`, `/about/`, `/contact/`                   | `/maswali`, `/kuhusu`, `/mawasiliano`           | Keep current slugs (preserve URLs); add EN aliases only if demanded.                             |
| Dedicated `/church-events/` landing page                          | Not present                                     | Create under `occasions.ts` only if user confirms demand.                                        |
| Warm cream + burgundy / terracotta accent                         | Warm paper + emerald `#0F5C4D` + gold `#D9A441` | Keep existing palette (brand identity + ADR 054); do not swap to burgundy without user approval. |
| Conversion event tracking                                         | None                                            | Needs new ADR + consent flow before any pixel.                                                   |

Risks that need user input before Phase 2 begins:

- **R1**: Palette change (burgundy) would break brand continuity (logo colours, kit, mobile app).
  Default: keep emerald / gold.
- **R2**: Rebuilding the hero with real product screenshots. The current site uses markup mockups
  (no screenshots in repo) — CLAUDE.md asks for real product screenshots. Capturing them needs the
  console + card running against a seeded demo account.
- **R3**: Nav structure change would reshape every page's header. Changing groups is cheap in
  code (one `editionTargets` function) but may disrupt indexed anchor links.

## 8. Feature preservation checklist (do-not-break list)

Must stay green after any Phase 1+ change:

- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` pass unchanged.
- [ ] Playwright + Lighthouse CI thresholds unchanged.
- [ ] Phone sign-in (Firebase + SMS OTP fallback) works end-to-end on `/login`.
- [ ] Event creation flow in `/app/events/new` + `/app/events/new/sms`.
- [ ] Invitation send flow (WhatsApp Cloud, Evolution, NextSMS, Africa's Talking fakes in tests).
- [ ] Guest card routes: `/c/[token]`, `/s/[code]`, `/k` (number entry).
- [ ] QR sign/verify via `@harusi/crypto` (isomorphic).
- [ ] Gate scanner flow (mobile app + `/gate-join`).
- [ ] Payment webhook verification (Snippe aggregator).
- [ ] Contribution records sealed on write (ADR 043).
- [ ] Staff 2FA, audit log, messaging/payment settings page.
- [ ] Robots `/k$` and `/en/k$` exact-match still blocks only the card entry page.
- [ ] Sitemap index + per-edition urlsets still contain the same URL set and hreflang graph.
- [ ] `www` → apex redirect (308), surface redirects (307).

## 9. Implementation plan (order of work)

The nine prompts in CLAUDE.md §15 map to these branches. Each one lands behind a PR, CI green,
required checks locked; nothing deploys without the user's explicit approval.

1. **Phase 0 — Discovery.** This document. No code change. Open PR for review.
2. **Phase 1 — Design system polish.** Only if the audit of §3 reveals gaps. Likely minor: audit
   AA contrast on every `ks-*` colour pair, add missing reusable blocks only where needed.
3. **Phase 2 — Homepage.** Rework `src/components/site/home-page.tsx` + `src/content/home.ts`
   against CLAUDE.md §5. Keep palette, keep pricing source, keep mockups (not fabricated
   screenshots). Replace testimonials only once real pilot feedback exists. Measure LCP / INP / CLS
   before and after.
4. **Phase 3 — Landing pages.** Audit the 11 TZ product / occasion pages; shore up thin ones using
   the same `ContentPageDef` shape; add missing GEO pages only if the user agrees. Preserve every
   slug. Do not add `/platform/` or `/resources/` trees.
5. **Phase 4 — SEO.** The §4 audit items marked "Open" (proxy 301, `sameAs` URLs). Run
   `src/lib/sitemap.test.ts`, `robots.test.ts`, `surfaces.test.ts`; add any missing structured-data
   assertions.
6. **Phase 5 — TZ / KE content.** Finish any missing Swahili pages identified in Phase 3; audit
   Kenya copy for "pilot" wording consistency. Do not change `/ke` default locale.
7. **Phase 6 — GEO + content articles.** Add at most five articles from CLAUDE.md §10, each as a
   `ContentPageDef` so sitemap, hreflang and `llms*.txt` pick them up without extra wiring.
8. **Phase 7 — Analytics.** Needs an ADR first (R: "Analytics for first-party event tracking").
   Only privacy-safe server-side events; no third-party scripts without explicit user approval and
   a consent flow.
9. **Phase 8 — QA.** Full typecheck / lint / unit / e2e / Lighthouse pass. Fresh audit report.
   Nothing deploys without the user's explicit approval.

### Open decisions needed from the user before Phase 2 opens

1. Palette: keep emerald + gold (recommended), or move to burgundy / terracotta as CLAUDE.md §4
   suggests?
2. Header labels: keep existing (Huduma / Miongozo / Bei), or re-label to Platform / Occasions /
   How It Works / Pricing / Resources?
3. Hero mockups vs real screenshots: capture screenshots from a seeded demo account, or keep the
   markup mockups?
4. New landing pages: add `/kanisa` (church events) and/or any other missing occasion?
5. Analytics: approve adding first-party server-side event logging (requires ADR + privacy page
   update)?
6. Testimonials: do we have any real pilot customers who have agreed to be quoted?

## 10. Implementation status (2026-11-07)

The six open decisions were all answered "all recommended". Implementation landed across these
pull requests, all CI-green, waiting for review and merge:

| Phase                   | What shipped                                                                                                                                                                                                                                                                                                                                    | PR                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 0 — Discovery           | This doc, ADR 056, ADR 057, AA fix on `--ks-ok` / `--ks-warn`, palette-contrast test                                                                                                                                                                                                                                                            | #92                                         |
| 1 — Design system       | Covered by the AA fix in #92 (no further gaps found)                                                                                                                                                                                                                                                                                            | #92                                         |
| 2 — Homepage            | Church occasion page + home-page strip entry; captured gate-scanner SVG wired into section 8                                                                                                                                                                                                                                                    | #93, #101                                   |
| 3 — Landing pages       | `/kadi-za-kanisa` added as the only missing occasion; thin pages already have their ADR 054 expansions                                                                                                                                                                                                                                          | #93                                         |
| 4 — SEO                 | **External only.** Proxy `http://` → `https://` is still a 302 on the Coolify / Traefik edge — flip to 301 in Cloudflare or the Traefik entrypoint (not a code change). `sameAs` stays empty until the Google Business Profile, LinkedIn, Instagram and YouTube URLs exist; then add them to `organizationNode()` in `apps/web/src/lib/seo.ts`. | n/a                                         |
| 5 — TZ / KE content     | KE already has its own pages and privacy; nothing missing in-tree.                                                                                                                                                                                                                                                                              | n/a                                         |
| 6 — GEO content         | Covered by ADR 054's four pages; no new articles in this cycle.                                                                                                                                                                                                                                                                                 | n/a                                         |
| 7 — Analytics (ADR 057) | Full stack behind `ANALYTICS_ENABLED=0`: schema + ingest service + retention sweep + internal route + `page_view` + `/ops/analytics` dashboard + privacy paragraph + every funnel emit site                                                                                                                                                     | #94, #95 (merged), #96, #97, #98, #99, #100 |
| 8 — QA                  | Each PR runs typecheck + lint + format + unit + web e2e + Lighthouse through CI.                                                                                                                                                                                                                                                                | per-PR                                      |

What is still blocked outside the code:

- **Proxy redirect** (SEO audit item 5). Flip `http://` → `https://` from 302 to 301 on the edge
  (Cloudflare "Always Use HTTPS" or the Traefik HTTP-to-HTTPS entrypoint).
- **`sameAs` URLs.** No social or Google Business Profile URLs exist yet; `organizationNode()`
  stays silent on them until there is something real to point at.
- **Testimonials.** Not surfaced until a real pilot customer has signed off on a quote; the
  `TrustStrip` on the home page carries the factual trust band in the meantime.

Operational switches once this is ready to go live:

- Set `ANALYTICS_ENABLED=1`, `ANALYTICS_SESSION_SECRET=<32-byte base64>` and
  `ANALYTICS_INTERNAL_SECRET=<shared secret>` in Coolify for both `kadisasa-api` and
  `kadisasa-web`. Rotate the session secret weekly (ADR 057 §2).
- Merge the open PRs in stack order: #92, #93, #94, then the analytics chain #96 → #100 (#95 is
  already on main), then #101.
