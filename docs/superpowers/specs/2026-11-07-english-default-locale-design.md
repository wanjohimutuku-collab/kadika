# English as default public-site locale — design

- Status: proposed
- Date: 2026-11-07
- Author: @yusuf.mutuku (with Claude)
- Scope: `apps/web/` public site routing, metadata, SEO. No KE changes.
- Prerequisite for: `2026-11-07-home-landing-overhaul-design.md`.

## 1. Problem and north star

Today the TZ public site lives at `/` in Swahili with English bolted on at `/en/...`. The team
has decided English is the default for new visitors (reach beyond Tanzania, parity with the KE
site, lower friction for ads traffic). Swahili remains fully supported — just one path segment
down. One PR, one DNS-less migration, every old SW URL 301s to its new home.

Non-goals: redesigning any page, changing KE, changing the guest card (`/c/<token>`), the
console (`/app`), staff panel (`/ops`), auth, or any copy. This change does not add or remove
content; it only moves URLs.

## 2. Target route map

| Was | Becomes | Status |
|---|---|---|
| `/` | `/` | Content now EN-TZ (was SW-TZ) |
| `/en` | `/` | 301 permanent redirect |
| `/en/x` | `/x` | 301 permanent redirect (all EN-TZ pages collapse to canonical path) |
| `/x` (SW pages at root) | `/sw/x` | 301 permanent redirect |
| `/ke`, `/ke/...` | unchanged | — |
| `/c/<token>`, `/s/<code>`, `/k`, `/app/...`, `/ops/...`, `/gate-join/...`, `/dev/...` | unchanged | Not site paths |

Canonical: every public TZ page's canonical URL uses the new scheme (EN at `/`, SW at `/sw/`).
`x-default` → `/`. Alternates: `en-TZ` at `/`, `sw-TZ` at `/sw/`, `en-KE` at `/ke/` where applicable.

## 3. Changes

### 3.1 `apps/web/src/lib/site-locale.ts`

`routeSiteLocale()` becomes:

- Detect `/sw` prefix instead of `/en`.
- If the path is unprefixed (not `/sw` and not `/ke`) → `{ action: 'next', locale: 'en', market: 'tz' }`.
- If the path is `/sw` or `/sw/...` → rewrite to the unprefixed path with `locale: 'sw'`, market TZ.
- `/en` and `/en/...` → `{ action: 'redirect', location: stripped-path }` (301).
- `/ke`, `/ke/...` → unchanged.
- Legacy `?lang=` handling stays but its meaning inverts: `lang=sw` redirects to `/sw<path>`, `lang=en` strips to the canonical path.

Rename `stripEnPrefix` → `stripSwPrefix`. Replace exported `enPath(path)` with `swPath(path)`
(returns `/sw` for `/`, else `/sw${path}`). A repo-wide grep showed no caller outside
`site-locale.ts` itself, so `enPath` is deleted outright in this change — no deprecation alias.

`editionOfPath` becomes: `/sw...` → `'sw'`; `/ke...` → `'ke'`; otherwise `'en'`.

### 3.2 `apps/web/middleware.ts`

Update the top docstring to describe the new scheme. The matcher and surface logic are unchanged.
The `x-hp-lang` header value now flips (EN by default at `/`).

### 3.3 `apps/web/src/lib/seo.ts`

- `defaultLocaleFor('tz')` returns `'en'` (today it returns `'sw'`).
- `localeUrl(path, locale)` composes `/sw${path}` for `locale === 'sw'`, unprefixed for `'en'`, `/ke${path}` for `'ke'`.
- `absoluteLocaleUrl` likewise.
- OG `locale` default: `en_TZ`; `locale:alternate` includes `sw_TZ` (was the other way round).

### 3.4 `apps/web/app/(public)/page.tsx` + layout.tsx

- Docstring updated.
- The home's canonical and OG URLs reflect the new canonical. `getLocale()` returns `'en'` by
  default; Swahili only when `/sw` is hit.

### 3.5 `apps/web/app/sitemap.xml` + `apps/web/app/sitemaps/*`

- Emit `/` + `/ke/...` as English, `/sw/...` for SW, with the appropriate `alternates`.
- The sitemap routes (`apps/web/app/sitemap.xml`, `apps/web/app/sitemaps/*`) compose URLs with
  `localeUrl()` from `@/lib/seo` — once that composer flips (§3.3), the sitemap output flips
  with it. Verify the final XML once in the task; no manual URL edits expected.

### 3.6 `apps/web/app/robots.ts`

- Already allows the whole site. Only explicit disallows (e.g. `/dev`, `/jaribu` once added)
  carry over. No change here unless a path uses the old `/en` prefix.

### 3.7 `apps/web/src/lib/light-card/route-utils.ts`

- `localeOf(request)` falls back to `'en'` already via `@harusi/i18n` `defaultLocale`; no change.

### 3.8 `apps/web/src/i18n/request.ts`

- No change: `resolveLocale()` already falls back to `defaultLocale` (`'en'`) when no header +
  no cookie.

### 3.9 Nav + footer links

- `apps/web/src/content/site-ui.ts` labels unchanged. The nav builder (`layout.tsx`) uses
  `localeUrl()` already, so flipping the composer in §3.3 is enough.
- `LocaleSwitch` in `components/site/locale-switch.tsx`: the toggle still labels the *other*
  locale; today's "EN" chip now reads "SW" when on `/`. Logic generic, no code change if it
  uses `editionTargets`. Verify.

### 3.10 Content pages (SW and EN slugs)

Pages in `apps/web/src/content/pages/*` have locale-specific slugs. Example:
`kadi-ya-harusi-mtandaoni` (SW) and its EN counterpart. Today the SW slug lives at `/<sw>` and
the EN at `/en/<en>`. After the flip: EN at `/<en>`, SW at `/sw/<sw>`. The route tree is
`(public)/[slug]/page.tsx`, so no per-page code change is needed — the slug lookup already
chooses by locale. Verify the [slug] page reads `getLocale()` and picks `textOf(page, locale)`
correctly.

### 3.11 Analytics

The `page_view` emitter already records `pathname`. After the flip, `/` events become EN. Add a
one-line note in the analytics dashboard copy acknowledging the move so historical dips are
explainable; no code change beyond that.

## 4. Redirect preservation (SEO continuity)

- Every current SW URL (e.g. `/kadi-ya-harusi-mtandaoni`) 301s to `/sw/kadi-ya-harusi-mtandaoni`
  via the middleware route rules — no per-page redirect table, since `routeSiteLocale()` can
  detect "old SW path at root" by checking whether the unprefixed path matches a known page slug
  that is a Swahili slug (set in `pagesIn('*')`).
- To keep this simple and reliable, the plan takes a different route: **a one-shot path-to-path
  redirect table** built once at module load from the TZ page list. Every TZ `ContentPageDef`
  carries both SW and EN slugs; the table maps each page's SW slug (as a root path, e.g.
  `/kadi-ya-harusi-mtandaoni`) to `/sw/<that-slug>`. It is read by middleware as an O(1)
  `Map.get()`; a path not in the table falls through to normal EN handling. Table lives in
  `apps/web/src/lib/legacy-sw-redirects.ts`.
- `/en` and `/en/*` 301s remain in `routeSiteLocale()` and don't need the table.

## 5. Tests

- `apps/web/src/lib/site-locale.test.ts` — new test cases:
  - `/` → `{ next, en, tz }`
  - `/sw` → `{ rewrite, path: '/', sw, tz }`
  - `/sw/kadi-ya-harusi-mtandaoni` → `{ rewrite, path: '/kadi-ya-harusi-mtandaoni', sw, tz }`
  - `/en` → `{ redirect, '/' }`
  - `/en/kadi-ya-harusi-mtandaoni` → `{ redirect, '/kadi-ya-harusi-mtandaoni' }`
  - `/kadi-ya-harusi-mtandaoni` (a legacy SW slug) → `{ redirect, '/sw/kadi-ya-harusi-mtandaoni' }`
  - `/kuhusu` (an existing SW slug) → `{ redirect, '/sw/kuhusu' }`
  - `/about` (the EN counterpart slug, once it exists) → `{ next, en, tz }`
  - `/ke/anything` → unchanged
  - `?lang=sw` → `{ redirect, with /sw prefix and no lang param }`
  - `?lang=en` → `{ redirect, without /sw prefix and no lang param }`
- `apps/web/src/lib/seo.test.ts` — canonicals for `/`, `/sw`, `/sw/x`, `/en` (legacy), `/ke/x`.
- Playwright: existing e2e specs that assert copy on `/` must be updated to expect English (or
  pivot to `/sw` to assert Swahili). Audit list: any spec that matches `/Nitahudhuria|Harusi|Tazama/`
  without a `/sw` goto.

## 6. Rollout

Single deploy, no feature flag:

1. Merge PR with the plan's changes.
2. Watch 404s and 301s on the analytics for 24 hours.
3. If a legacy SW path returns 404 (meaning the redirect table missed it), add it to the
   generated table and ship a patch.

Rollback is a git revert.

## 7. Risks and mitigations

- **Stale links from WhatsApp / printed materials.** The 301s cover every page that exists today;
  that is the entire mitigation. New QR codes go out as `/sw/<slug>` where appropriate.
- **Search-engine ranking dip.** 301s preserve link equity. Expected two-to-four-week rebalance.
- **Mixed-locale cookie.** A visitor with `LOCALE_COOKIE=sw` who hits `/` today sees SW because
  `resolveLocale()` reads the cookie. After the flip, the middleware's `x-hp-lang` takes
  precedence for path-driven routing (unchanged logic), so a cookie carrying `'sw'` on `/`
  would be overridden. Verify in `resolveLocale()`.

## 8. Acceptance criteria

- `/` renders in English without the `/en` suffix anywhere in the HTML.
- `/sw` renders Swahili.
- `/en`, `/en/kadi-ya-harusi-mtandaoni` 301 to their new canonical.
- `/kadi-ya-harusi-mtandaoni` 301s to `/sw/kadi-ya-harusi-mtandaoni`.
- `/ke/...` unchanged.
- Sitemaps advertise the new URLs with correct `hreflang` alternates and `x-default = /`.
- All existing unit tests pass. New site-locale tests pass.
- Playwright e2e for the public site pass against both locales after the retargeting of
  SW-copy assertions to `/sw`.
- Lighthouse mobile ≥ 90 on `/` and `/sw` (Perf + A11y).

## 9. Follow-ups (out of scope)

- Server-side IP geolocation to prefer SW for TZ visitors (would weaken the "English default" goal
  anyway).
- A copy sweep to adjust English wording now that it is the default (deferred to a copy PR).
- A banner inviting first-time visitors to switch to Swahili (optional, UX; separate task).

## 10. References

- CLAUDE.md §10 (localisation) — Swahili default, English toggle. This change inverts that
  default for the marketing site (§10's other guarantees — strings in `packages/i18n`, timezone,
  currency — are untouched).
- `apps/web/middleware.ts`, `apps/web/src/lib/site-locale.ts` — current scheme.
- `apps/web/src/lib/seo.ts` — canonical + alternate URL composer.
