# English-Default Public-Site Locale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve the TZ public site at `/` in English by default, move Swahili under `/sw/`, 301 every legacy URL (`/en`, `/en/*`, and the Swahili slugs that used to live at root) to its new canonical home, and keep SEO equity intact.

**Architecture:** One route-logic rewrite in `site-locale.ts` + one URL-composer flip in `seo.ts` cover 95% of the change. A tiny `legacy-sw-redirects.ts` table built from TZ page definitions carries the SW-slug-at-root 301s so middleware can do an O(1) lookup. Every downstream consumer (nav, footer, sitemap, OG, hreflang, `editionTargets`) already calls `localeUrl`, so once that composer flips the rest follows.

**Tech Stack:** Next.js middleware + App Router, TypeScript strict, `next-intl`, `@harusi/i18n`, vitest, Playwright.

## Global Constraints

- Scope: `apps/web/` public site. KE (`/ke/...`), guest card (`/c/<token>`), console (`/app`), staff panel (`/ops`), auth, API: untouched.
- `/sw/...` is the new Swahili prefix; `/en` is retired from the public URL space and 301s to the canonical English path.
- `x-default` points to `/`; `en-TZ` canonical is `/`; `sw-TZ` alternate is `/sw/...`.
- All 301s are permanent (`301`), not 308 — browsers may cache them indefinitely, which is intended.
- No per-page code or copy edits in this change. Content pages' `[slug]` route already picks `textOf(page, locale)` by the resolved locale.
- Lighthouse mobile ≥ 90 (Perf + A11y) on `/` and `/sw` after the flip.
- Attribution on commits: `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`.
- Reference spec: `docs/superpowers/specs/2026-11-07-english-default-locale-design.md`.

---

## File Structure

### New

- `apps/web/src/lib/legacy-sw-redirects.ts` — build-once `Map<string, string>` from TZ page SW-slugs at root → `/sw/<slug>`.
- `apps/web/src/lib/legacy-sw-redirects.test.ts` — vitest for the table.

### Modified

- `apps/web/src/lib/site-locale.ts` — the locale routing core (rewrite of `routeSiteLocale`, rename of helpers).
- `apps/web/src/lib/site-locale.test.ts` — new cases for every row in the target route map.
- `apps/web/src/lib/seo.ts` — `defaultLocaleFor`, `localeUrl`, `absoluteLocaleUrl`, `hreflangMap`, `ogImages` defaults.
- `apps/web/src/lib/seo.test.ts` — new cases for canonical + hreflang output.
- `apps/web/middleware.ts` — docstring refresh only (the delta lives in `site-locale.ts`).
- `apps/web/app/(public)/page.tsx` — docstring refresh.
- `apps/web/app/(public)/layout.tsx` — docstring refresh; verify `edition` computation.
- `apps/web/app/sitemap.xml/**` and `apps/web/app/sitemaps/**` — regenerate; only verify, no manual URL edits expected.
- `apps/web/e2e/*` — retarget any spec that asserts SW copy at `/` to `/sw` (list enumerated in Task 8).

### Removed exports (deleted outright, not aliased)

- `enPath()` in `apps/web/src/lib/site-locale.ts` — replaced by `swPath()`. No caller outside this file (grep-confirmed).

---

## Task 1: Lock in the new `routeSiteLocale` behavior with tests

**Files:**

- Modify: `apps/web/src/lib/site-locale.test.ts` (add new cases first; existing cases stay until Task 3 changes the behavior).

**Interfaces:**

- Consumes: `routeSiteLocale` from `./site-locale` (soon-to-change behavior).
- Produces: a complete test matrix that will go from failing to passing in Task 3.

- [ ] **Step 1: Write the new test cases**

Add this `describe` block to `apps/web/src/lib/site-locale.test.ts`. Keep the existing tests for now — they will be removed in Task 3 when the behavior inverts.

```ts
// apps/web/src/lib/site-locale.test.ts — add after existing describe blocks
import { describe, it, expect } from 'vitest';
import { routeSiteLocale } from './site-locale';

describe('routeSiteLocale — English-default scheme', () => {
  it('serves / in English TZ', () => {
    expect(routeSiteLocale('/', '')).toEqual({ action: 'next', locale: 'en', market: 'tz' });
  });

  it('serves /sw by rewriting to / in Swahili', () => {
    expect(routeSiteLocale('/sw', '')).toEqual({
      action: 'rewrite',
      path: '/',
      locale: 'sw',
      market: 'tz',
    });
  });

  it('rewrites /sw/<slug> to /<slug> in Swahili', () => {
    expect(routeSiteLocale('/sw/kadi-ya-harusi-mtandaoni', '')).toEqual({
      action: 'rewrite',
      path: '/kadi-ya-harusi-mtandaoni',
      locale: 'sw',
      market: 'tz',
    });
  });

  it('301s /en to /', () => {
    expect(routeSiteLocale('/en', '')).toEqual({ action: 'redirect', location: '/' });
  });

  it('301s /en/<slug> to /<slug>', () => {
    expect(routeSiteLocale('/en/kadi-ya-harusi-mtandaoni', '')).toEqual({
      action: 'redirect',
      location: '/kadi-ya-harusi-mtandaoni',
    });
  });

  it('301s a legacy SW slug at root to /sw/<slug>', () => {
    expect(routeSiteLocale('/kadi-ya-harusi-mtandaoni', '')).toEqual({
      action: 'redirect',
      location: '/sw/kadi-ya-harusi-mtandaoni',
    });
  });

  it('301s /kuhusu to /sw/kuhusu', () => {
    expect(routeSiteLocale('/kuhusu', '')).toEqual({
      action: 'redirect',
      location: '/sw/kuhusu',
    });
  });

  it('301s ?lang=sw to /sw<path> without the query param', () => {
    expect(routeSiteLocale('/', 'lang=sw')).toEqual({
      action: 'redirect',
      location: '/sw',
    });
  });

  it('301s ?lang=en to <path> without the query param', () => {
    expect(routeSiteLocale('/sw/kadi-ya-harusi-mtandaoni', 'lang=en')).toEqual({
      action: 'redirect',
      location: '/kadi-ya-harusi-mtandaoni',
    });
  });

  it('leaves /ke/... unchanged', () => {
    expect(routeSiteLocale('/ke', '')).toEqual({ action: 'next', locale: 'en', market: 'ke' });
    expect(routeSiteLocale('/ke/weddings', '')).toEqual({
      action: 'next',
      locale: 'en',
      market: 'ke',
    });
  });
});
```

- [ ] **Step 2: Run the suite to see the new cases fail**

```bash
pnpm -F @harusi/web test -- --run src/lib/site-locale.test.ts
```

Expected: all **new** cases FAIL (behaviour not yet flipped); existing cases still PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/site-locale.test.ts
git commit -m "$(cat <<'EOF'
test(web): add failing cases for English-default locale routing

Nine new cases covering /, /sw, /sw/<slug>, /en, /en/<slug>, legacy SW
slug at root, kuhusu, ?lang= redirects and /ke untouched.

Refs: docs/superpowers/specs/2026-11-07-english-default-locale-design.md §5

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Build the legacy-SW-redirect table and its tests

**Files:**

- Create: `apps/web/src/lib/legacy-sw-redirects.ts`
- Create: `apps/web/src/lib/legacy-sw-redirects.test.ts`

**Interfaces:**

- Consumes: `pagesOf('tz')` from `@/content`; `pagePath(page, locale)` or equivalent from `@/content` (grep to confirm the exact export; a 1-minute lookup).
- Produces:
  - `export const LEGACY_SW_ROOT_PATHS: ReadonlyMap<string, string>` — keys are old root paths (e.g. `/kadi-ya-harusi-mtandaoni`, `/kuhusu`), values are new canonical SW paths (e.g. `/sw/kadi-ya-harusi-mtandaoni`).
  - `export function legacySwRedirect(path: string): string | null` — returns `LEGACY_SW_ROOT_PATHS.get(path) ?? null`.

- [ ] **Step 1: Confirm the content helpers**

```bash
grep -rn "export function pagesOf\|export function pagePath\|export .* ALL_PAGES" apps/web/src/content | head
```

Note the exact import source and function signatures; use them in Step 2. If `pagePath(page)` returns the canonical (locale-aware) path, call it with the SW locale to get the SW slug at root.

- [ ] **Step 2: Write the failing test**

```ts
// apps/web/src/lib/legacy-sw-redirects.test.ts
import { describe, it, expect } from 'vitest';
import { legacySwRedirect, LEGACY_SW_ROOT_PATHS } from './legacy-sw-redirects';

describe('legacySwRedirect', () => {
  it('includes a known SW slug and maps it under /sw', () => {
    expect(legacySwRedirect('/kadi-ya-harusi-mtandaoni')).toBe('/sw/kadi-ya-harusi-mtandaoni');
  });

  it('includes /kuhusu and maps it under /sw', () => {
    expect(legacySwRedirect('/kuhusu')).toBe('/sw/kuhusu');
  });

  it('returns null for an unknown path', () => {
    expect(legacySwRedirect('/not-a-real-page')).toBeNull();
  });

  it('never contains an entry whose value is not under /sw/', () => {
    for (const v of LEGACY_SW_ROOT_PATHS.values()) {
      expect(v.startsWith('/sw/')).toBe(true);
    }
  });

  it('is non-empty', () => {
    expect(LEGACY_SW_ROOT_PATHS.size).toBeGreaterThan(5);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
pnpm -F @harusi/web test -- --run src/lib/legacy-sw-redirects.test.ts
```

Expected: FAIL with "Cannot find module './legacy-sw-redirects'".

- [ ] **Step 4: Implement**

```ts
// apps/web/src/lib/legacy-sw-redirects.ts
import { pagesOf, pagePath } from '@/content';

/**
 * Permanent 301s from Swahili slugs that used to live at the site root (pre-flip) to their new
 * `/sw/<slug>` canonical. Built once from the TZ page list at module load; O(1) lookup in middleware.
 *
 * Why a table and not pattern-based detection: `/kuhusu` is a real EN root path for KE copy on other
 * sites, and we never want to misclassify an EN page as legacy SW. Explicit mapping is the only
 * safe signal.
 */
function buildTable(): Map<string, string> {
  const t = new Map<string, string>();
  for (const page of pagesOf('tz')) {
    const swPath = pagePath(page, 'sw');
    if (swPath === '/' || swPath.startsWith('/sw/') || swPath.startsWith('/ke')) continue;
    t.set(swPath, `/sw${swPath === '/' ? '' : swPath}`);
  }
  return t;
}

export const LEGACY_SW_ROOT_PATHS: ReadonlyMap<string, string> = buildTable();

export function legacySwRedirect(path: string): string | null {
  return LEGACY_SW_ROOT_PATHS.get(path) ?? null;
}
```

> **Guard:** if `pagePath(page, locale)` in this repo has a different arity or name (e.g. only `pagePath(page)` returning the canonical and a separate `swSlug` property on the page), adapt the mapping in `buildTable()` only. Keep the exported API identical.

- [ ] **Step 5: Run the test to verify it passes**

```bash
pnpm -F @harusi/web test -- --run src/lib/legacy-sw-redirects.test.ts
```

Expected: PASS (all 5 cases).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/legacy-sw-redirects.ts apps/web/src/lib/legacy-sw-redirects.test.ts
git commit -m "$(cat <<'EOF'
feat(web): legacy-SW root-path 301 table for the locale flip

Builds once from pagesOf('tz'); maps every Swahili slug that used to
live at the site root to /sw/<slug>. Read by middleware for O(1) 301s.

Refs: docs/superpowers/specs/2026-11-07-english-default-locale-design.md §4

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Flip `site-locale.ts` to the new scheme

**Files:**

- Modify: `apps/web/src/lib/site-locale.ts`
- Modify: `apps/web/src/lib/site-locale.test.ts` (remove tests for the old scheme that now contradict the new behavior)

**Interfaces:**

- Consumes: `legacySwRedirect` from `./legacy-sw-redirects`; `isSitePath`, `editionOfPath` kept for consumers.
- Produces:
  - `export function routeSiteLocale(pathname, search): LocaleRoute | null` — new behavior per the spec target route map.
  - `export function stripSwPrefix(path: string): string` (renamed from `stripEnPrefix`).
  - `export function swPath(path: string): string` (replaces `enPath`).
  - `export function editionOfPath(href: string): 'sw' | 'en' | 'ke'` — new rule: `/sw...` → `sw`; `/ke...` → `ke`; else `en`.

- [ ] **Step 1: Rewrite `site-locale.ts`**

```ts
// apps/web/src/lib/site-locale.ts
import type { Locale } from '@harusi/i18n';
import { areaOf } from './surfaces';
import { legacySwRedirect } from './legacy-sw-redirects';

/**
 * Language of the public marketing site comes from the path (ADR TBD: English-default):
 *
 *   /...      English, Tanzania (en-TZ) — the default edition
 *   /sw/...   Swahili, Tanzania (sw-TZ), the same pages rendered in Swahili
 *   /ke/...   English, Kenya (en-KE) — unchanged
 *
 * `/sw/x` is rewritten to `/x` with the language set, so there is one route tree. `/en` and
 * `/en/x` answer with a 301 to their canonical `/` and `/x` forms; the old `?lang=` scheme
 * answers with a 301 to the same canonical.
 */

export type SiteMarket = 'tz' | 'ke';

export type LocaleRoute =
  | { action: 'redirect'; location: string }
  | { action: 'rewrite'; path: string; locale: Locale; market: SiteMarket }
  | { action: 'next'; locale: Locale; market: SiteMarket };

const isUnder = (p: string, prefix: string) => p === prefix || p.startsWith(`${prefix}/`);

export function isSitePath(path: string): boolean {
  return areaOf(path) === 'public' && !isUnder(path, '/dev') && !isUnder(path, '/gate-join');
}

/** `/sw/x` → `/x`, `/sw` → `/`; other paths unchanged. */
export function stripSwPrefix(path: string): string {
  if (path === '/sw') return '/';
  return path.startsWith('/sw/') ? path.slice(3) : path;
}

/** The Swahili TZ URL of a TZ path. */
export function swPath(path: string): string {
  return path === '/' ? '/sw' : `/sw${path}`;
}

const withQuery = (path: string, params: URLSearchParams) => {
  const q = params.toString();
  return q ? `${path}?${q}` : path;
};

export function routeSiteLocale(pathname: string, search: string): LocaleRoute | null {
  // /en and /en/x are retired — straight 301 to the canonical.
  if (pathname === '/en' || pathname.startsWith('/en/')) {
    const target = pathname === '/en' ? '/' : pathname.slice(3);
    const params = new URLSearchParams(search);
    params.delete('lang');
    return { action: 'redirect', location: withQuery(target, params) };
  }

  const swPrefixed = pathname === '/sw' || pathname.startsWith('/sw/');
  const bare = swPrefixed ? stripSwPrefix(pathname) : pathname;
  if (!isSitePath(bare)) return null;

  const market: SiteMarket = isUnder(bare, '/ke') ? 'ke' : 'tz';

  // Legacy ?lang=sw|en handling — redirect to the canonical URL.
  const params = new URLSearchParams(search);
  const legacy = params.get('lang');
  if (legacy !== null) {
    params.delete('lang');
    if (market === 'ke') return { action: 'redirect', location: withQuery(bare, params) };
    const wantSw = legacy === 'sw';
    const target = wantSw ? swPath(bare) : bare;
    return { action: 'redirect', location: withQuery(target, params) };
  }

  if (market === 'ke') return { action: 'next', locale: 'en', market };

  if (swPrefixed) return { action: 'rewrite', path: bare, locale: 'sw', market };

  // At this point we are on a TZ unprefixed path. If it matches a legacy SW slug, 301 it to /sw.
  const legacySw = legacySwRedirect(bare);
  if (legacySw) return { action: 'redirect', location: withQuery(legacySw, params) };

  return { action: 'next', locale: 'en', market };
}

/** `/sw...` → `'sw'`; `/ke...` → `'ke'`; else `'en'`. */
export function editionOfPath(href: string): 'sw' | 'en' | 'ke' {
  const path = href.replace(/[?#].*$/, '');
  if (isUnder(path, '/sw')) return 'sw';
  if (isUnder(path, '/ke')) return 'ke';
  return 'en';
}
```

- [ ] **Step 2: Remove old-scheme test cases**

Open `apps/web/src/lib/site-locale.test.ts` and delete every case that asserts the old scheme (`/` → sw TZ, `/en` → rewrite, `/kadi-…` → next in sw, etc.). The Task 1 block stays; any truly generic case (e.g. `/dev` returns null) stays.

- [ ] **Step 3: Run the suite to verify it passes**

```bash
pnpm -F @harusi/web test -- --run src/lib/site-locale.test.ts
```

Expected: PASS (all cases from Task 1 + any generic retained cases).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/site-locale.ts apps/web/src/lib/site-locale.test.ts
git commit -m "$(cat <<'EOF'
feat(web): flip site-locale routing to English-default

/ serves en-TZ; /sw/... serves sw-TZ; /en and /en/* 301 to canonical;
legacy ?lang= redirects use the new scheme; /ke untouched. Legacy SW
slugs at root 301 to /sw/<slug> via the lookup table from the prior task.
Renames stripEnPrefix→stripSwPrefix and enPath→swPath (no external
callers).

Refs: docs/superpowers/specs/2026-11-07-english-default-locale-design.md §3.1

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Flip the URL composer in `seo.ts`

**Files:**

- Modify: `apps/web/src/lib/seo.ts`
- Modify: `apps/web/src/lib/seo.test.ts` if it exists; otherwise create it with focused cases.

**Interfaces:**

- Produces:
  - `defaultLocaleFor('tz')` → `'en'`; `defaultLocaleFor('ke')` → `'en'` (unchanged).
  - `localeUrl(path, 'en')` → `path` (unchanged in shape; semantics now default).
  - `localeUrl(path, 'sw')` → `swPath(path)` for TZ market; `path` for KE market (SW is not served there).
  - `absoluteLocaleUrl` composes against `SITE_URL` unchanged.
  - `hreflangMap(path)` → `x-default` becomes the EN URL; `en-TZ` canonical is unprefixed; `sw-TZ` alternate is under `/sw`.
  - `ogImages(locale, market)` keeps its edition logic unchanged.

- [ ] **Step 1: Edit `seo.ts`**

Replace the `enPath` import with `swPath`, flip `defaultLocaleFor`, flip `localeUrl`, flip `hreflangMap`:

```ts
// apps/web/src/lib/seo.ts — edits:
// 1) import
import { swPath } from './site-locale';

// 2) defaultLocaleFor
export function defaultLocaleFor(market: Market): Locale {
  return 'en';
}

// 3) localeUrl
export function localeUrl(path: string, locale: Locale): string {
  if (marketOfPath(path) === 'ke' || locale === 'en') return path;
  return swPath(path);
}

// 4) hreflangMap
export function hreflangMap(path: string, counterpartPath?: string): Record<string, string> {
  const abs = absoluteLocaleUrl;
  const market = marketOfPath(path);
  const tz = market === 'tz' ? path : counterpartPath;
  const ke = market === 'ke' ? path : counterpartPath;
  const map: Record<string, string> = {};
  if (tz) {
    map['en-TZ'] = abs(tz, 'en');
    map['sw-TZ'] = abs(tz, 'sw');
  }
  if (ke) map['en-KE'] = abs(ke, 'en');
  map['x-default'] = tz ? abs(tz, 'en') : abs(ke!, 'en');
  return map;
}
```

Leave `ogImages`, `SITE_URL`, `ORG_ID`, `organizationNode`, `marketOfPath`, `localesFor`, `absoluteLocaleUrl` as they are. `localesFor('tz')` still returns `['sw', 'en']`.

- [ ] **Step 2: Add / update seo tests**

Create or extend `apps/web/src/lib/seo.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { defaultLocaleFor, hreflangMap, localeUrl, SITE_URL } from './seo';

describe('seo URL composer — English-default', () => {
  it('defaults to en for every market', () => {
    expect(defaultLocaleFor('tz')).toBe('en');
    expect(defaultLocaleFor('ke')).toBe('en');
  });

  it('en TZ URL is unprefixed', () => {
    expect(localeUrl('/', 'en')).toBe('/');
    expect(localeUrl('/kadi-ya-harusi-mtandaoni', 'en')).toBe('/kadi-ya-harusi-mtandaoni');
  });

  it('sw TZ URL lives under /sw', () => {
    expect(localeUrl('/', 'sw')).toBe('/sw');
    expect(localeUrl('/kadi-ya-harusi-mtandaoni', 'sw')).toBe('/sw/kadi-ya-harusi-mtandaoni');
  });

  it('ke path is unchanged regardless of locale', () => {
    expect(localeUrl('/ke/weddings', 'en')).toBe('/ke/weddings');
    expect(localeUrl('/ke/weddings', 'sw')).toBe('/ke/weddings');
  });

  it('hreflangMap x-default points to the EN canonical for a TZ page', () => {
    const map = hreflangMap('/', '/ke');
    expect(map['x-default']).toBe(`${SITE_URL}/`);
    expect(map['en-TZ']).toBe(`${SITE_URL}/`);
    expect(map['sw-TZ']).toBe(`${SITE_URL}/sw`);
    expect(map['en-KE']).toBe(`${SITE_URL}/ke`);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
pnpm -F @harusi/web test -- --run src/lib/seo.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/seo.ts apps/web/src/lib/seo.test.ts
git commit -m "$(cat <<'EOF'
feat(web): flip SEO composer to English-default

localeUrl, absoluteLocaleUrl, hreflangMap, and defaultLocaleFor now
default to en-TZ at '/'. sw-TZ lives under '/sw'; x-default points to
the EN canonical; ke is unchanged.

Refs: docs/superpowers/specs/2026-11-07-english-default-locale-design.md §3.3

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Refresh middleware + public-layout docstrings

**Files:**

- Modify: `apps/web/middleware.ts` (docstring only)
- Modify: `apps/web/app/(public)/page.tsx` (docstring only)
- Modify: `apps/web/app/(public)/layout.tsx` (docstring + verify `edition` derivation)

**Interfaces:**

- No external signature changes.

- [ ] **Step 1: Update `middleware.ts` top-level comment**

Replace the paragraph starting with "The public site takes its language from the path…" with:

```
/**
 * The public site takes its language from the path: `/` English Tanzania (en-TZ), `/sw/...` Swahili
 * Tanzania (sw-TZ, rewritten to the same route), `/ke/...` English Kenya. Old `/en`, `/en/x`, and
 * `?lang=` URLs each 301 to their canonical.
 */
```

Also update the docstring on the `middleware` export (the "`/` Swahili, `/en/...` English…" line) with the same substance.

- [ ] **Step 2: Update `(public)/page.tsx` docstring**

Replace:

```ts
/** `/` is Swahili, `/en` English (the middleware rewrites `/en` here). */
```

with:

```ts
/** `/` is English, `/sw` Swahili (the middleware rewrites `/sw` here); `/ke` is English KE. */
```

- [ ] **Step 3: Audit `(public)/layout.tsx` `edition` derivation**

Open the file. The current code sets:

```ts
const edition: SiteEdition = market === 'ke' ? 'ke' : locale;
```

That still works — `locale` comes from `getLocale()`, which returns `'en'` at `/` after the flip and `'sw'` at `/sw`. No code change; add a one-line comment clarifying the new mapping:

```ts
// After the English-default flip: locale is 'en' at '/', 'sw' at '/sw/...'; market is 'ke' at '/ke/...'.
const edition: SiteEdition = market === 'ke' ? 'ke' : locale;
```

- [ ] **Step 4: Typecheck**

```bash
pnpm -F @harusi/web typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/middleware.ts apps/web/app/\(public\)/page.tsx apps/web/app/\(public\)/layout.tsx
git commit -m "$(cat <<'EOF'
docs(web): update public-site docstrings for English-default scheme

Describe the new /, /sw, /ke routing; clarify edition derivation.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Verify sitemap output flipped

**Files:**

- Modify (only if needed): `apps/web/app/sitemap.xml/**`, `apps/web/app/sitemaps/**`
- Smoke-test outputs; no proactive edits expected.

- [ ] **Step 1: Build**

```bash
pnpm -F @harusi/web build
```

- [ ] **Step 2: Run dev server and curl the sitemap**

```bash
pnpm -F @harusi/web dev &
sleep 3
curl -sS http://localhost:3000/sitemap.xml | head -c 2000
```

Expected output (verify by eye): every TZ URL that used to appear bare now appears at `/` (home) or `/sw/<slug>` (SW alternate) or unprefixed (EN canonical); every `<xhtml:link rel="alternate">` has `hreflang="en-TZ"` pointing to the unprefixed URL and `hreflang="sw-TZ"` pointing to `/sw/...`; `x-default` points to the EN URL.

- [ ] **Step 3: If the output still shows old `/en/...` URLs anywhere**

Open the sitemap route and search for literal `/en` or any hard-coded `enPath`/`'en'`-under-path concatenation; replace with `localeUrl(path, 'en')` or `localeUrl(path, 'sw')`. Rerun Step 2 until clean. If no such literals exist, no edit is needed — the composer flip already covered it.

- [ ] **Step 4: Stop the dev server, commit any sitemap source edit (if made)**

```bash
# only if Step 3 required an edit
git add apps/web/app/sitemap.xml/** apps/web/app/sitemaps/**
git commit -m "$(cat <<'EOF'
fix(web): route sitemap URLs through localeUrl after locale flip

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

If no edit was needed, skip the commit and record the verification in the final verification commit (Task 10).

---

## Task 7: Verify `LocaleSwitch` + nav links flip with the composer

**Files:**

- Verify only: `apps/web/src/components/site/locale-switch.tsx`, `apps/web/src/lib/site-nav.ts`, `apps/web/app/(public)/layout.tsx`.

**Interfaces:**

- None added. Expectation: after Task 4 flipped `localeUrl`, the nav's locale-switch chip, footer links, and in-page cross-locale links all compose the new URLs automatically.

- [ ] **Step 1: Dev smoke-test**

```bash
pnpm -F @harusi/web dev
```

Open `http://localhost:3000/` in a browser. In the header's locale switch, confirm:

- The chip offers "SW" on `/` and links to `/sw`.
- On `/sw`, the chip offers "EN" and links to `/`.
- On a content page, e.g. `/sw/kadi-ya-harusi-mtandaoni`, the chip links to the EN counterpart under `/`.

- [ ] **Step 2: If any link still contains `/en`**

Grep for literal `'en'` prefixes in the components:

```bash
grep -rn "/en\b\|'/en'" apps/web/src/components/site apps/web/app/\(public\)
```

Rewrite each hit to go through `localeUrl()`; commit.

- [ ] **Step 3: If no edits were needed, no commit**

Note the verification in Task 10.

---

## Task 8: Retarget e2e specs that asserted SW copy at `/`

**Files:**

- Modify: specs under `apps/web/e2e/` that assert Swahili copy on `/`.

**Interfaces:**

- None.

- [ ] **Step 1: List candidate specs**

```bash
grep -rln "Nitahudhuria\|Harusi\|Tazama\|Karibu\|Pakia" apps/web/e2e
```

Record the list.

- [ ] **Step 2: For each spec in the list**

Decide: does the spec want to assert SW copy (then change `page.goto('/')` to `page.goto('/sw')`), or does it want to assert EN copy (then update the matcher strings to the EN equivalents from `apps/web/src/content/home.ts`)?

Preference order:

1. If the spec's intent is "the SW landing works end-to-end", change the goto path.
2. If the spec's intent is "the default landing has a working CTA", keep `/` and update matchers to EN.

Apply the change spec-by-spec. Commit each with a clear message.

- [ ] **Step 3: Run the e2e suite**

```bash
pnpm -F @harusi/web exec playwright test
```

Expected: PASS. For any still-failing spec, triage per Step 2 and iterate.

- [ ] **Step 4: Commit the batch (if multiple specs touched, one commit is fine)**

```bash
git add apps/web/e2e
git commit -m "$(cat <<'EOF'
test(web): retarget e2e specs for English-default locale

Specs that asserted Swahili copy at / now goto /sw; specs that assert
the default landing updated to the EN strings in content/home.ts.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Add a redirect e2e spec

**Files:**

- Create: `apps/web/e2e/locale-redirects.spec.ts`

**Interfaces:**

- Consumes: Playwright `test`, `expect`.

- [ ] **Step 1: Write the spec**

```ts
// apps/web/e2e/locale-redirects.spec.ts
import { expect, test } from '@playwright/test';

test('legacy /en lands at the English canonical', async ({ page }) => {
  const res = await page.goto('/en', { waitUntil: 'domcontentloaded' });
  expect(page.url()).toMatch(/\/$/);
  expect(res?.status()).toBe(200);
});

test('legacy /en/<slug> lands at /<slug>', async ({ page }) => {
  await page.goto('/en/kadi-ya-harusi-mtandaoni', { waitUntil: 'domcontentloaded' });
  expect(page.url()).toMatch(/\/kadi-ya-harusi-mtandaoni$/);
  expect(page.url()).not.toMatch(/\/en\//);
  expect(page.url()).not.toMatch(/\/sw\//);
});

test('legacy SW root slug lands at /sw/<slug>', async ({ page }) => {
  await page.goto('/kadi-ya-harusi-mtandaoni', { waitUntil: 'domcontentloaded' });
  expect(page.url()).toMatch(/\/sw\/kadi-ya-harusi-mtandaoni$/);
});

test('?lang=sw on / lands at /sw without the query param', async ({ page }) => {
  await page.goto('/?lang=sw', { waitUntil: 'domcontentloaded' });
  expect(page.url()).toMatch(/\/sw$/);
});

test('/ke is unchanged', async ({ page }) => {
  await page.goto('/ke', { waitUntil: 'domcontentloaded' });
  expect(page.url()).toMatch(/\/ke$/);
});
```

- [ ] **Step 2: Run**

```bash
pnpm -F @harusi/web exec playwright test e2e/locale-redirects.spec.ts
```

Expected: PASS (all 5 cases).

- [ ] **Step 3: Commit**

```bash
git add apps/web/e2e/locale-redirects.spec.ts
git commit -m "$(cat <<'EOF'
test(web): e2e for /en, legacy SW, ?lang= and /ke after locale flip

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Final verification

**Files:**

- None created. Verifies the spec's §8 acceptance criteria.

- [ ] **Step 1: Run every test**

```bash
pnpm -w typecheck
pnpm -w lint
pnpm -w test
pnpm -F @harusi/web exec playwright test
```

Expected: all green.

- [ ] **Step 2: Lighthouse mobile audit on `/` and `/sw`**

```bash
pnpm -F @harusi/web build
pnpm -F @harusi/web start &
sleep 5
pnpm -F @harusi/web exec lhci autorun --config=./lighthouserc.cjs --collect.url=http://localhost:3000/ --collect.url=http://localhost:3000/sw
```

Expected: Performance ≥ 90 and Accessibility ≥ 90 on both URLs.

- [ ] **Step 3: Grep for lingering references to the old scheme**

```bash
grep -rn "enPath\|/en/\|\"en\"" apps/web/src apps/web/app | grep -v "node_modules\|.next"
```

Any remaining `/en/` literal that is not inside a 301 target check or a test comment is a bug — fix before shipping. `"en"` as a Locale value is fine.

- [ ] **Step 4: Final commit**

```bash
git commit --allow-empty -m "$(cat <<'EOF'
chore(web): English-default locale — verification pass

All unit + e2e tests green; Lighthouse mobile Perf/A11y ≥ 90 on / and
/sw; sitemap and locale-switch verified; no lingering /en literals.

Refs: docs/superpowers/specs/2026-11-07-english-default-locale-design.md §8

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review (performed before saving)

- Spec coverage: §2 route map → Tasks 1, 3, 9. §3.1 `site-locale.ts` → Task 3. §3.2 middleware docstring → Task 5. §3.3 `seo.ts` → Task 4. §3.4 home/layout docstrings → Task 5. §3.5 sitemap → Task 6. §3.6 robots → no-op (no `/en` literal there; verified by the grep in Task 10 Step 3). §3.7 `route-utils.ts` → no change needed. §3.8 i18n request → no change needed. §3.9 nav + LocaleSwitch → Task 7. §3.10 content pages → no-op (verified by Task 9's redirect e2e). §3.11 analytics note → out of scope for this plan (documentation-only, deferred). §4 redirect table → Task 2. §5 tests → Tasks 1, 2, 4, 9. §6 rollout: single deploy covered; monitoring is operational, not in-plan. §7 risks acknowledged. §8 acceptance → Task 10.
- Placeholders: none. Every step has exact code / commands.
- Type consistency: `LocaleRoute`, `SiteMarket`, `stripSwPrefix`, `swPath`, `editionOfPath`, `legacySwRedirect`, `LEGACY_SW_ROOT_PATHS` names match across Tasks 2, 3, 4. `hreflangMap(path, counterpartPath?)` signature unchanged. `localeUrl(path, locale)` signature unchanged.
- Decomposition: 10 tasks, each with a single commit. Tests precede implementation for Tasks 1–4. Verification-only tasks (6, 7) make a commit only if they trigger an edit.

---

## 2026-11-07 Addendum — per-locale slugs (supersedes Tasks 1 and 2)

### Why

`ContentPageDef.slug` is shared across SW and EN; the original Task 2 legacy-redirect table
cannot distinguish a legacy SW URL from a valid EN URL. The remedy is per-locale slugs.

### New task order (replaces Tasks 1, 2; re-numbers Tasks 3–10 as A–I below)

Each task ends with its own commit, TDD where applicable.

### Task A — Content model: `slugEn` on every TZ page

- Modify `apps/web/src/content/types.ts`: add `slugEn: string` to `ContentPageDef`.
- Modify `apps/web/src/content/pages/{articles,company,geo,guides,legal,occasions,products}.ts`:
  author `slugEn` on each page per the map in the spec addendum.
- Modify `apps/web/src/content/pages/{kenya,kenya-legal}.ts`: set `slugEn = slug` per page
  (KE pages have one English slug already).
- Commit:
  ```
  feat(web,content): add slugEn to every content page
  ```

### Task B — Content helpers: `pagePath(locale)`, `pageBySlug`, `routeSlugRedirect`

- Modify `apps/web/src/content/index.ts`:
  - `pagePath(p: ContentPageDef, locale: Locale): string` — returns `/ke/<slug>` for KE,
    `/<slug-en>` for EN TZ, `/<slug-sw>` for SW TZ (callers wrap with the `/sw` prefix
    later via `localeUrl`).
  - `pageBySlug(slug: string, market: Market): { page: ContentPageDef; matchedLocale: Locale } | null`
    — EN first, SW second.
- Modify every existing `pagePath(p)` call site to pass a locale. Grep: `pagePath\(` to find
  them; they all have a resolvable locale in context.
- New file: `apps/web/src/content/slug-redirect.ts`:
  - `routeSlugRedirect(path: string): string | null` — returns a 301 target when an EN-edition
    URL carries a SW slug, or vice versa; null otherwise.
- Tests: `apps/web/src/content/slug-redirect.test.ts` covering the §2026-11-07 Addendum
  "Updated test matrix" entries plus "slugs identical → no redirect".
- Commit:
  ```
  feat(web,content): locale-aware pagePath + pageBySlug + slug-redirect
  ```

### Task C — Flip `site-locale.ts` to the per-locale-slug scheme

- Modify `apps/web/src/lib/site-locale.ts` to the body in the main plan's Task 3, with the
  "legacy-SW table" replaced by `routeSlugRedirect(bare)` from Task B.
- Replace `legacy-sw-redirects.*` with `slug-redirect.*` references.
- Tests: expand `site-locale.test.ts` with the Updated test matrix cases from the spec
  addendum.
- Commit:
  ```
  feat(web): routeSiteLocale with per-locale slug redirects
  ```

### Task D — `[slug]` route resolves by either locale's slug

- Modify `apps/web/app/(public)/[slug]/page.tsx` to look up the page via `pageBySlug(slug, 'tz')`
  (and for `/ke/[slug]`, `pageBySlug(slug, 'ke')`).
- If the slug matched in a language different from the resolved page locale, return
  `notFound()` — the middleware's `routeSlugRedirect` should have 301'd first; a direct hit
  means the URL is indeed canonical for the current edition.
- No test change; existing page tests continue to pass.
- Commit:
  ```
  feat(web): resolve [slug] via pageBySlug
  ```

### Task E — Flip `seo.ts` composer

- Modify `apps/web/src/lib/seo.ts` exactly as in the main plan's Task 4, except `localeUrl`:

  ```ts
  export function localeUrl(path: string, locale: Locale): string {
    if (marketOfPath(path) === 'ke' || locale === 'en') return path;
    return swPath(path);
  }
  ```

  Content-page links must compose through `pagePath(p, locale)` for the slug part; `localeUrl`
  only handles the SW `/sw` prefix and the KE case. Callers that build content-page URLs
  (`site-nav.ts`, `home-page.tsx`, footer builders) pass the locale-correct path returned by
  `pagePath(p, locale)` into `localeUrl` with the same locale.

- Tests: the main plan's Task 4 test file, with the content-page assertions updated — e.g.
  `localeUrl('/online-wedding-invitation', 'en')` returns `/online-wedding-invitation`;
  `localeUrl('/kadi-ya-harusi-mtandaoni', 'sw')` returns `/sw/kadi-ya-harusi-mtandaoni`.
- Commit:
  ```
  feat(web): flip SEO composer for English-default + per-locale slugs
  ```

### Task F — Nav, footer, `editionTargets`, `counterpartOf` consume locale-aware paths

- Modify callers of `pagePath` in `apps/web/src/lib/site-nav.ts`, `apps/web/app/(public)/layout.tsx`,
  and `apps/web/src/components/site/home-page.tsx` to pass the resolved locale into
  `pagePath(p, locale)`.
- `counterpartOf` is unchanged, but the way the layout builds the counterpart URL uses
  `pagePath(counterpart, counterpartLocale)` now.
- Verify LocaleSwitch chip offers the right URL on a content page.
- Commit:
  ```
  refactor(web): plumb locale into pagePath call sites
  ```

### Task G — Middleware + layout docstrings (same as main plan's Task 5)

### Task H — Playwright + sitemap verification

- Expand `locale-redirects.spec.ts` with:
  - Visit `/kadi-ya-harusi-mtandaoni` → URL settles at `/online-wedding-invitation`.
  - Visit `/sw/online-wedding-invitation` → settles at `/sw/kadi-ya-harusi-mtandaoni`.
  - Visit `/privacy` → stays; renders EN.
- Build; curl `/sitemap.xml`; verify every TZ page has both URLs, slug-correct per locale,
  with `hreflang` alternates.
- Commit:
  ```
  test(web): e2e and sitemap verification for per-locale slugs
  ```

### Task I — Final verification (same as main plan's Task 10)

### Dropped from the original plan

- Task 2 (legacy-sw-redirects): replaced by Task B's `routeSlugRedirect`.
- The "legacy SW slug at root" cases in Task 1: replaced by Task C's slug-aware cases.

### Task count

A, B, C, D, E, F, G, H, I = 9 tasks. Baseline (committed) + spec/plan revision (committed) + these 9 = 11 commits before the finishing-a-development-branch handoff.
