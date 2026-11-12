# Kadi Sasa marketing site: foundations + Home

Source kit: `kadisasa-site-kit/` (CLAUDE.md, docs/sitemap.md, brand.md, content-tz.md, content-ke.md, templates.md, humaniser skill).
This is sub-project 1 of 3. Sub-project 2: TZ core pages + event template. Sub-project 3: Kenya pages, cities, guides hub, press, contact.

## Decisions (confirmed with the owner, 2026-11-04)

1. **Locale URLs follow the kit.** `/` = Swahili Tanzania (`sw-TZ`), `/en/...` = English Tanzania (`en-TZ`), `/ke/...` = English Kenya (`en-KE`). `x-default` = the `/` page.
   Applies to public marketing pages only. Console, guest card, gate, ops and login keep English default + cookie.
2. **Kit brand on marketing pages only.** `--ks-*` tokens and Figtree are scoped to the public layout. App tokens (CLAUDE.md §17.2) are unchanged.
3. **Content stays in the typed TS model** (`apps/web/src/content`), extended with component blocks. No MDX, no new content dependencies.

## Routing

- Middleware: a public-content path starting `/en` (`/en` or `/en/...`) is **rewritten** to the path without the prefix, with `x-hp-lang: en`. No duplicate route tree.
- Unprefixed TZ public paths set `x-hp-lang: sw`. `/ke` paths set `x-hp-lang: en` and `x-hp-market: ke`. The path decides the language; the cookie no longer does on marketing pages.
- Legacy URLs 301 (permanent; the old scheme is retired): `?lang=en` on a TZ path → `/en<path>`; `?lang=sw` → path without the query; `/ke...?lang=*` → path without the query. `/en/ke...` → `/ke...`.
- `/en` mirror only exists for TZ pages that render in English (all content pages, `/bei`, `/programu`, `/privacy`, `/terms`). Unknown `/en/x` 404s like `/x`.
- Helpers in `src/lib/seo.ts`: `localeUrl(path, locale)` returns `/en`-prefixed paths for English TZ, plain path otherwise; `hreflangMap` emits `sw-TZ`, `en-TZ`, `en-KE` (when a counterpart exists), `x-default`. `sw-KE` is dropped: `/ke` is English only.
- `LocaleSwitch`: three links (Tanzania · Kiswahili, Tanzania · English, Kenya) pointing to the matching page (its counterpart, else that market's home).

## Brand (marketing scope)

- Tokens from brand.md as CSS variables under a `.ks` class on the public layout's wrapper, with the dark-mode swaps. Tailwind v4 `@theme`-free utility mapping via `ks-*` colour names.
- Fonts via `next/font/google`: Figtree variable (400–700, latin + latin-ext, swap, preload) as the body/heading font inside `.ks`; Fraunces italic only on `CardMockup` names (preload false). Two files max.
- Radius 12 / 999, buttons ≥ 48 px, max width 1120 px, block spacing 24 / 48.

## Shared components (`src/components/site/`, server components)

`Hero`, `AnswerBlock`, `Steps`, `CardMockup`, `SmsBubble`, `GateChip`, `MichangoBar`, `TrustStrip`, `CompareTable`, `Faq` (renders FAQPage JSON-LD), `CtaBand`, `LocaleSwitch`, `SiteHeader`, `SiteFooter(market)`.
Only the mobile menu toggle in the header needs client JS (reuse the existing `SiteNav` pattern).
Footer line: `/` and `/en` "Imetengenezwa Tanzania kwa sherehe za Afrika Mashariki." / "Made in Tanzania for East African celebrations."; `/ke` "Built in East Africa for Kenyan committees."
Header nav (max 5 + CTA): Huduma/Services · Bei/Pricing · Thibitisha kadi/Verify a card · Miongozo/Guides · Kuhusu/About · [Anza bure/Start free]; secondary "Nina namba ya kadi / I have a card number" → `/k`.
Links to pages that do not exist yet (`/thibitisha-kadi`, `/miongozo`) are omitted until sub-project 2 builds them.

## Home pages

- `/` (Swahili) and `/en` from content-tz.md § Home; `/ke` from content-ke.md § Home. Section order as in the kit.
- Prices come from the live pricing catalog (`getPricingOnServer`), never `{{bei}}` placeholders. TZ shows TZS, KE shows KES only.
- "Kamati zinasema" testimonials and the proof counter are not rendered until real data exists.
- Copy run through the humaniser checklist. Schema: Organization (with `sameAs` only for profiles that exist), WebSite, Service, FAQPage.

## SEO plumbing

- Sitemap index `/sitemap.xml` with children `sitemap/sw.xml`, `sitemap/en.xml`, `sitemap/ke.xml` (Next `generateSitemaps`). Excludes `/k`, `/c`, `/s`, `/login`, `/app`, `/ops`, `/dev`.
- robots.txt: explicit allow groups for Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot, Claude-User; `*` keeps today's disallow list. Training bots (GPTBot, ClaudeBot, Google-Extended) stay under `*` (allowed) pending an owner decision.
- `/llms.txt`: about 15 lines: one-line definition, links to home, pricing, gate, michango, Kenya home.
- Canonical on every page = its own locale URL.

## Out of scope here

`/thibitisha-kadi` (needs a new public endpoint that shows event + committee only and does not mark the invitation opened), other page rewrites, cities, guides hub.

## Testing

- Unit (vitest): `localeUrl`, `hreflangMap`, legacy-redirect mapping, middleware rewrite, content-model tests updated.
- Existing e2e/axe tests updated for the new URLs.
- Typecheck, lint, build; preview at 360 px for `/`, `/en`, `/ke`.
