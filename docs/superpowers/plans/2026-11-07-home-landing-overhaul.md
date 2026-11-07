# Home Landing Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the TZ public home (`/`, `/en`) with a conversion-focused landing whose hero carries a live, personalisable guest-card preview backed by a real `/jaribu` demo route.

**Architecture:** Three new React islands (`hero-live`, `try-section`, `cta-band`) stitched into a slimmed-down `home-page.tsx` by server components (`feature-row`, `pricing-teaser`). A pure isomorphic helper `buildDemoCardView()` seeds a real `CardView` from the mock repo and overrides the four fields that the hero inputs drive. The new `/jaribu` route handler reuses the existing `renderCard()` from `@/lib/light-card/render` — the same code path that serves `/c/<token>` — so one renderer stays authoritative.

**Tech Stack:** Next.js App Router, TypeScript strict, Tailwind + NativeWind-shared tokens (`ks` scope, Figtree, Fraunces), `@harusi/api-client` (mock repo + `CardView`), `@harusi/schemas` (billing, branding), `next-intl`, zod for route input validation, vitest for unit + route tests, Playwright for e2e.

## Global Constraints

- Scope: `apps/web/(public)/` only (`/`, `/en`). KE `/ke` layout unchanged.
- Primary CTA target: `/login` (unchanged). Secondary CTA target: `/jaribu`.
- No new API endpoints. No backend schema changes. No PII stored.
- Perf budgets: hero client island ≤ 18 KB gz; `/jaribu` first paint ≤ 25 KB like `/c/<token>`; Lighthouse mobile ≥ 90 (perf + a11y) on `/` and `/jaribu`.
- Debounced preview update ≤ 100 ms; preview update completes within 150 ms on a 2× CPU-throttled profile.
- A11y: keyboard-operable interactions, visible focus ring, reduced-motion respected for the §4 gate overlay.
- Tokens from `apps/web/src/components/site/blocks.tsx` and `ks-*` classes already in use; do not introduce new CSS variables.
- Analytics: emit `home_hero_view`, `home_hero_input{field}`, `home_hero_cta_primary`, `home_hero_cta_secondary`, `home_try_step_interact{step,action}` via the existing transport from commit `0158bb4`. `names` is hashed client-side before emission.
- Attribution on commits: `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`.
- Reference spec: `docs/superpowers/specs/2026-11-07-home-landing-overhaul-design.md`.

---

## File Structure

### New

- `apps/web/src/lib/demo-card.ts` — `buildDemoCardView({names, dateISO, eventType})` → `CardView`; isomorphic.
- `apps/web/src/lib/demo-card.test.ts` — unit tests for the above, including feeding through `renderCard()`.
- `apps/web/app/(public)/jaribu/route.ts` — plain HTML route handler for `/jaribu` and `/en/jaribu`.
- `apps/web/app/(public)/jaribu/route.test.ts` — vitest for the route handler.
- `apps/web/src/components/site/home/hero-live.tsx` — client island: inputs + phone frame preview.
- `apps/web/src/components/site/home/try-section.tsx` — client island: three interactive steps.
- `apps/web/src/components/site/home/feature-row.tsx` — server component (used ×3).
- `apps/web/src/components/site/home/pricing-teaser.tsx` — server component.
- `apps/web/src/components/site/home/cta-band.tsx` — client component (wa.me URL builder).
- `apps/web/src/components/site/home/trust-line.tsx` — server component; one-line trust strip.
- `apps/web/e2e/home-hero.spec.ts` — Playwright e2e for the hero → `/jaribu` flow.

### Modified

- `apps/web/src/components/site/home-page.tsx` — reduce to new stitching + updated JSON-LD.
- `apps/web/src/content/home.ts` — extend `HomeCopy` + SW/EN copy; retire removed keys.
- `apps/web/src/content/site-ui.ts` — add new labels (`tryItYourself`, pricing CTA labels).
- `apps/web/app/robots.ts` — disallow `/jaribu` and `/en/jaribu`.

### Removed (only after grep confirms no other consumer)

- Unused exports in `apps/web/src/components/site/mockups.tsx` (`SmsBubble`, `AppMockup`) if no survivor references them after Task 9.

---

## Task 1: `buildDemoCardView()` and its tests

**Files:**
- Create: `apps/web/src/lib/demo-card.ts`
- Create: `apps/web/src/lib/demo-card.test.ts`

**Interfaces:**
- Consumes: `createSeedState`, `MockRepository` from `@harusi/api-client/mock`; `CardView` from `@harusi/api-client`.
- Produces:
  - `type DemoEventType = 'harusi' | 'send-off' | 'kitchen-party' | 'nikah' | 'uchumba' | 'kuzaliwa' | 'mahafali';`
  - `interface DemoInput { names: string; dateISO: string; eventType: DemoEventType; }`
  - `buildDemoCardView(input: DemoInput): CardView` — pure, isomorphic, deterministic.
  - `const DEMO_EVENT_TYPES: readonly DemoEventType[]`
  - `const DEMO_THEME_BY_EVENT: Record<DemoEventType, { themeId: string; palette: string[]; coverGradient: string }>`
  - `const DEMO_QR_PAYLOAD = 'v1.demo.demo.1.1.DEMO'` (deliberately not a signed token).

- [ ] **Step 1: Write failing tests**

```ts
// apps/web/src/lib/demo-card.test.ts
import { describe, it, expect } from 'vitest';
import { renderCard } from '@/lib/light-card/render';
import {
  buildDemoCardView,
  DEMO_EVENT_TYPES,
  DEMO_QR_PAYLOAD,
  type DemoInput,
} from './demo-card';

const base: DemoInput = {
  names: 'Asha & Juma',
  dateISO: '2026-12-19',
  eventType: 'harusi',
};

describe('buildDemoCardView', () => {
  it('returns a CardView with the given names and date', () => {
    const v = buildDemoCardView(base);
    expect(v.event?.coupleNames).toBe('Asha & Juma');
    expect(v.event?.dateStart.startsWith('2026-12-19')).toBe(true);
    expect(v.state).toBe('ok');
    expect(v.isMock).toBe(true);
  });

  it('assigns a theme for every event type', () => {
    for (const t of DEMO_EVENT_TYPES) {
      const v = buildDemoCardView({ ...base, eventType: t });
      expect(v.event?.themeId).toMatch(/^demo-/);
      expect(v.event?.palette.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('uses a demo QR payload, never a shape that looks signed', () => {
    const v = buildDemoCardView(base);
    expect(v.qrPayload).toBe(DEMO_QR_PAYLOAD);
    expect(v.qrPayload?.endsWith('DEMO')).toBe(true);
  });

  it('is accepted by renderCard without throwing', () => {
    const v = buildDemoCardView(base);
    const html = renderCard(v, {
      token: 'demo',
      locale: 'sw',
      domain: 'kadisasa.co.tz',
      mode: 'mock',
      apiUrl: 'https://example.invalid',
    });
    expect(html).toContain('Asha');
    expect(html).toContain('Juma');
  });

  it('is deterministic for a given input', () => {
    const a = buildDemoCardView(base);
    const b = buildDemoCardView(base);
    expect(a).toEqual(b);
  });

  it('clamps empty names to the default', () => {
    const v = buildDemoCardView({ ...base, names: '' });
    expect(v.event?.coupleNames).toBe('Asha & Juma');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm -F @harusi/web test -- --run src/lib/demo-card.test.ts
```

Expected: FAIL with "Cannot find module './demo-card'".

- [ ] **Step 3: Implement `demo-card.ts`**

```ts
// apps/web/src/lib/demo-card.ts
import { createSeedState, MockRepository } from '@harusi/api-client/mock';
import type { CardView } from '@harusi/api-client';

export type DemoEventType =
  | 'harusi'
  | 'send-off'
  | 'kitchen-party'
  | 'nikah'
  | 'uchumba'
  | 'kuzaliwa'
  | 'mahafali';

export interface DemoInput {
  names: string;
  dateISO: string;
  eventType: DemoEventType;
}

export const DEMO_EVENT_TYPES = [
  'harusi',
  'send-off',
  'kitchen-party',
  'nikah',
  'uchumba',
  'kuzaliwa',
  'mahafali',
] as const satisfies readonly DemoEventType[];

/** Not a signed token — the demo QR deliberately looks unlike real `v1.<eventId>.<guestId>.<party>.<ver>.<sig>`. */
export const DEMO_QR_PAYLOAD = 'v1.demo.demo.1.1.DEMO';

export const DEMO_THEME_BY_EVENT: Record<
  DemoEventType,
  { themeId: string; palette: string[]; coverGradient: string }
> = {
  harusi: {
    themeId: 'demo-emerald-gold',
    palette: ['#0F5C4D', '#B8893B', '#FBF8F3'],
    coverGradient: 'linear-gradient(135deg,#0F5C4D 0%,#B8893B 100%)',
  },
  'send-off': {
    themeId: 'demo-rose-sage',
    palette: ['#8E3B4E', '#6E8A6F', '#FBF8F3'],
    coverGradient: 'linear-gradient(135deg,#8E3B4E 0%,#6E8A6F 100%)',
  },
  'kitchen-party': {
    themeId: 'demo-terracotta',
    palette: ['#C25A3C', '#D9B26A', '#FBF8F3'],
    coverGradient: 'linear-gradient(135deg,#C25A3C 0%,#D9B26A 100%)',
  },
  nikah: {
    themeId: 'demo-emerald-gold',
    palette: ['#0F5C4D', '#B8893B', '#FBF8F3'],
    coverGradient: 'linear-gradient(135deg,#0F5C4D 0%,#B8893B 100%)',
  },
  uchumba: {
    themeId: 'demo-navy-silver',
    palette: ['#1B2D5A', '#A7ADA9', '#FBF8F3'],
    coverGradient: 'linear-gradient(135deg,#1B2D5A 0%,#A7ADA9 100%)',
  },
  kuzaliwa: {
    themeId: 'demo-terracotta',
    palette: ['#C25A3C', '#D9B26A', '#FBF8F3'],
    coverGradient: 'linear-gradient(135deg,#C25A3C 0%,#D9B26A 100%)',
  },
  mahafali: {
    themeId: 'demo-navy-silver',
    palette: ['#1B2D5A', '#A7ADA9', '#FBF8F3'],
    coverGradient: 'linear-gradient(135deg,#1B2D5A 0%,#A7ADA9 100%)',
  },
};

const EVENT_KIND_BY_TYPE: Record<DemoEventType, string> = {
  harusi: 'wedding',
  'send-off': 'send-off',
  'kitchen-party': 'kitchen-party',
  nikah: 'nikah',
  uchumba: 'engagement',
  kuzaliwa: 'birthday',
  mahafali: 'graduation',
};

function splitNames(names: string): { a: string; b: string; joined: string } {
  const joined = (names || '').trim() || 'Asha & Juma';
  const parts = joined.split(/\s*[&+]\s*/).filter(Boolean);
  const [a, b] = parts.length >= 2 ? [parts[0], parts[1]] : ['Asha', 'Juma'];
  return { a, b, joined };
}

function sanitiseDate(dateISO: string): string {
  const d = new Date(dateISO);
  if (Number.isNaN(d.valueOf())) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 60);
    return fallback.toISOString();
  }
  return d.toISOString();
}

let cachedBase: CardView | null = null;

function baseView(): CardView {
  if (cachedBase) return cachedBase;
  const seed = createSeedState();
  const repo = new MockRepository({ initialState: seed });
  // Any delivered guest from the seed yields a complete CardView; the demo overrides the fields
  // we want to personalise and leaves everything else intact.
  const guest = seed.guests.find((g) => g.status === 'delivered') ?? seed.guests[0];
  cachedBase = repo.peekCard(guest.token);
  return cachedBase;
}

export function buildDemoCardView(input: DemoInput): CardView {
  const base = baseView();
  const { a, b, joined } = splitNames(input.names);
  const theme = DEMO_THEME_BY_EVENT[input.eventType];
  const dateStart = sanitiseDate(input.dateISO);
  if (!base.event || !base.guest) return base;
  return {
    ...base,
    token: 'demo',
    state: 'ok',
    isMock: true,
    qrPayload: DEMO_QR_PAYLOAD,
    event: {
      ...base.event,
      eventKind: EVENT_KIND_BY_TYPE[input.eventType] as typeof base.event.eventKind,
      partnerA: a,
      partnerB: b,
      coupleNames: joined,
      dateStart,
      themeId: theme.themeId,
      palette: theme.palette,
      coverGradient: theme.coverGradient,
    },
    guest: {
      ...base.guest,
      displayName: 'Mgeni wa Majaribio',
      shortCode: 'DEMO-0001',
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm -F @harusi/web test -- --run src/lib/demo-card.test.ts
```

Expected: PASS (all 6 cases).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/demo-card.ts apps/web/src/lib/demo-card.test.ts
git commit -m "$(cat <<'EOF'
feat(web): buildDemoCardView helper for the public demo card

Pure, isomorphic helper that seeds a CardView from the mock repo and
overrides the four fields the home-hero inputs drive (names, date,
event kind, theme). Reused by /jaribu (server) and <HeroLive> (client).

Refs: docs/superpowers/specs/2026-11-07-home-landing-overhaul-design.md §7

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `/jaribu` route handler

**Files:**
- Create: `apps/web/app/(public)/jaribu/route.ts`
- Create: `apps/web/app/(public)/jaribu/route.test.ts`
- Modify: `apps/web/app/robots.ts` (add `/jaribu` and `/en/jaribu` disallow)

**Interfaces:**
- Consumes: `buildDemoCardView`, `DEMO_EVENT_TYPES` from `@/lib/demo-card`; `renderCard`, `shell` from `@/lib/light-card/render`; `brandOf`, `html`, `localeOf` from `@/lib/light-card/route-utils`; `API_URL` from the same; zod.
- Produces: HTTP route at `GET /jaribu` and `GET /en/jaribu` returning `text/html; charset=utf-8` with `X-Robots-Tag: noindex, nofollow` and the response headers specified in the spec.

- [ ] **Step 1: Write failing tests**

```ts
// apps/web/app/(public)/jaribu/route.test.ts
import { describe, it, expect } from 'vitest';
import { GET } from './route';

async function body(res: Response) {
  return await res.text();
}

describe('/jaribu route', () => {
  it('renders a demo card with the demo banner for valid input', async () => {
    const res = await GET(
      new Request('https://kadisasa.co.tz/jaribu?names=Asha%20%26%20Juma&date=2026-12-19&event=harusi'),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('x-robots-tag') ?? '').toMatch(/noindex/i);
    const text = await body(res);
    expect(text).toContain('Asha');
    expect(text).toContain('Juma');
    expect(text).toContain('Hii ni kadi ya majaribio');
  });

  it('falls back to defaults on invalid input and never 5xx', async () => {
    const res = await GET(new Request('https://kadisasa.co.tz/jaribu?names=&date=not-a-date&event=zzz'));
    expect(res.status).toBe(200);
    const text = await body(res);
    expect(text).toContain('Asha');
  });

  it('escapes names so no <script> runs', async () => {
    const res = await GET(
      new Request('https://kadisasa.co.tz/jaribu?names=%3Cscript%3Ealert(1)%3C/script%3E&date=2026-12-19&event=harusi'),
    );
    const text = await body(res);
    expect(text).not.toMatch(/<script>alert\(1\)<\/script>/);
    expect(text).toContain('&lt;script&gt;');
  });

  it('clamps a 300-char names input to 60 chars', async () => {
    const long = 'A'.repeat(300);
    const res = await GET(
      new Request(`https://kadisasa.co.tz/jaribu?names=${encodeURIComponent(long)}&date=2026-12-19&event=harusi`),
    );
    const text = await body(res);
    expect(text).not.toContain('A'.repeat(100));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm -F @harusi/web test -- --run "app/(public)/jaribu/route.test.ts"
```

Expected: FAIL with "Cannot find module './route'".

- [ ] **Step 3: Implement the route handler**

```ts
// apps/web/app/(public)/jaribu/route.ts
import { z } from 'zod';
import { renderCard, shell } from '@/lib/light-card/render';
import { brandOf, html, localeOf, API_URL } from '@/lib/light-card/route-utils';
import {
  buildDemoCardView,
  DEMO_EVENT_TYPES,
  type DemoEventType,
} from '@/lib/demo-card';
import { APP_DOMAIN } from '@/lib/env';

export const dynamic = 'force-dynamic';

const input = z.object({
  names: z.string().trim().min(1).max(60).catch('Asha & Juma'),
  date: z
    .string()
    .refine((s) => !Number.isNaN(new Date(s).valueOf()), { message: 'bad date' })
    .catch(() => {
      const d = new Date();
      d.setDate(d.getDate() + 60);
      return d.toISOString().slice(0, 10);
    }),
  event: z.enum(DEMO_EVENT_TYPES).catch('harusi' as DemoEventType),
});

const BANNER_SW = `
  <div role="status" style="background:#0F5C4D;color:#fff;padding:14px 20px;text-align:center;font:600 15px/1.4 system-ui">
    Hii ni kadi ya majaribio. Pata yako — <a href="/login" style="color:#fff;text-decoration:underline">Anza bure</a>
  </div>
`;

const BANNER_EN = `
  <div role="status" style="background:#0F5C4D;color:#fff;padding:14px 20px;text-align:center;font:600 15px/1.4 system-ui">
    This is a demo card. Make yours — <a href="/en/login" style="color:#fff;text-decoration:underline">Start free</a>
  </div>
`;

export async function GET(req: Request) {
  const locale = localeOf(req);
  const url = new URL(req.url);
  const parsed = input.parse({
    names: url.searchParams.get('names') ?? '',
    date: url.searchParams.get('date') ?? '',
    event: url.searchParams.get('event') ?? '',
  });
  const brand = await brandOf();
  const view = buildDemoCardView({
    names: parsed.names,
    dateISO: parsed.date,
    eventType: parsed.event as DemoEventType,
  });
  const inner = renderCard(view, {
    token: 'demo',
    locale,
    domain: APP_DOMAIN,
    brand,
    mode: 'mock',
    apiUrl: API_URL,
  });
  const banner = locale === 'sw' ? BANNER_SW : BANNER_EN;
  return html(shell({ locale, brand, body: banner + inner }), {
    headers: {
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
```

- [ ] **Step 4: Add robots disallow**

Edit `apps/web/app/robots.ts` and append `/jaribu` and `/en/jaribu` to the `disallow` array (locate the single `rules` object; add the two entries verbatim to its `disallow` list).

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm -F @harusi/web test -- --run "app/(public)/jaribu/route.test.ts"
```

Expected: PASS (all 4 cases).

- [ ] **Step 6: Smoke-test the route in dev**

```bash
pnpm -F @harusi/web dev
# then, in another shell:
curl -sS 'http://localhost:3000/jaribu?names=Asha%20%26%20Juma&date=2026-12-19&event=harusi' | head -c 400
```

Expected: response starts with `<!doctype html>`, contains the banner string "Hii ni kadi ya majaribio", and includes "Asha" and "Juma".

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/\(public\)/jaribu/route.ts apps/web/app/\(public\)/jaribu/route.test.ts apps/web/app/robots.ts
git commit -m "$(cat <<'EOF'
feat(web): /jaribu demo-card route for the public landing

Plain-HTML handler that reuses renderCard() with a demo CardView.
Validates query params with zod, clamps names to 60 chars, escapes
all user input, sets X-Robots-Tag: noindex, and is excluded from the
sitemap via robots.ts.

Refs: docs/superpowers/specs/2026-11-07-home-landing-overhaul-design.md §5

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `HomeCopy` shape + SW/EN copy

**Files:**
- Modify: `apps/web/src/content/home.ts`
- Modify: `apps/web/src/content/site-ui.ts`

**Interfaces:**
- Consumes: `PricingCatalog`, `SiteEdition` (already imported).
- Produces (adds to `HomeCopy`):
  - `hero.formLabels: { names: string; namesPlaceholder: string; date: string; eventType: string; eventLabels: Record<DemoEventType, string> }`
  - `heroPreviewOpen: string` (secondary CTA label, replaces `hero.secondary` usage)
  - `trustLine: string`
  - `trySection: { title: string; counterLabel: string; steps: [Step, Step, Step] }` where `Step = { eyebrow: string; title: string; body: string; cta: string }`.
  - `featureRows: [Row, Row, Row]` where `Row = { eyebrow: string; title: string; bullets: [string, string, string]; linkLabel?: string; linkSlug?: string }`.
  - `pricingTeaser: { title: string; sub: string; cta: string; footnote: string; comparisonLink: string }`.
  - `ctaBand` keeps `text`, `primary`, `secondary`; add: `whatsappField: string; whatsappCta: string; whatsappTemplate: string`.
- Retires: `noPhone`, `steps`, `stepsTitle`, `app` (keys and their SW/EN strings). Update `HomeCopy` to make them optional on the type or delete them; prefer delete.

- [ ] **Step 1: Add new fields to `HomeCopy` and extend the SW copy**

Edit `apps/web/src/content/home.ts`:

```ts
// Extend the HomeCopy interface — add after `hero`:
//   formLabels: {
//     names: string;
//     namesPlaceholder: string;
//     date: string;
//     eventType: string;
//     eventLabels: Record<'harusi'|'send-off'|'kitchen-party'|'nikah'|'uchumba'|'kuzaliwa'|'mahafali', string>;
//   };
//   heroPreviewOpen: string;
//
// Add top-level fields: trustLine; trySection; featureRows; pricingTeaser;
// Extend ctaBand with whatsappField, whatsappCta, whatsappTemplate.
// Remove: noPhone, steps, stepsTitle, app.
```

Fill the SW copy for every new field using the strings below; write EN beside them in the same file as the existing editions pattern (TZ sw, TZ en, KE en).

```ts
// SW examples (verbatim strings, write EN beside them in this task):
const sw = {
  formLabels: {
    names: 'Majina ya wana-ndoa',
    namesPlaceholder: 'Mf. Asha & Juma',
    date: 'Tarehe ya tukio',
    eventType: 'Aina ya tukio',
    eventLabels: {
      harusi: 'Harusi',
      'send-off': 'Send-off',
      'kitchen-party': 'Kitchen party',
      nikah: 'Nikah',
      uchumba: 'Uchumba',
      kuzaliwa: 'Siku ya kuzaliwa',
      mahafali: 'Mahafali',
    },
  },
  heroPreviewOpen: 'Tazama kadi kamili',
  trustLine: 'Hulipi mpaka utume kadi · Ada moja · Inatumika pia bila mtandao',
  trySection: {
    title: 'Jaribu mwenyewe',
    counterLabel: 'Wathibitishaji: {n} / 320',
    steps: [
      {
        eyebrow: '01',
        title: 'Mgeni anafungua kadi',
        body: 'Ujumbe mfupi wenye kiungo kinachofanya kazi — hata kwenye simu za kawaida.',
        cta: 'Fungua kadi',
      },
      {
        eyebrow: '02',
        title: 'Mgeni anathibitisha',
        body: 'Nitahudhuria au sitahudhuria, na idadi ya watu — hakuna akaunti inayohitajika.',
        cta: 'Jaribu',
      },
      {
        eyebrow: '03',
        title: 'Lango linamsoma',
        body: 'Changanua QR bila mtandao, duplicate ikijulikana, mtu mmoja mmoja.',
        cta: 'Changanua QR',
      },
    ],
  },
  featureRows: [
    {
      eyebrow: 'Kadi',
      title: 'Kadi inayofaa kwa simu yoyote.',
      bullets: ['SMS ikiwa WhatsApp imeshindwa', 'PDF ya kuchapisha', 'Inafanya kazi offline baada ya kufunguka mara ya kwanza'],
      linkLabel: 'Jifunze zaidi',
      linkSlug: 'kadi-ya-harusi-mtandaoni',
    },
    {
      eyebrow: 'Lango',
      title: 'Mlangoni, sekunde moja kwa kila mgeni.',
      bullets: ['Uthibitisho bila mtandao', 'Duplicate inajulikana mara moja', 'PIN tofauti kwa kila lango'],
    },
    {
      eyebrow: 'Michango',
      title: 'Ahadi na malipo zinajiangalia zenyewe.',
      bullets: ['M-Pesa, Mixx, Airtel Money', 'Ripoti ya CSV', 'Siri: wewe tu ndiye unaona'],
    },
  ],
  pricingTeaser: {
    title: 'Chagua kifurushi',
    sub: 'Hulipi mpaka utume kadi.',
    cta: 'Chagua',
    footnote: 'Hulipi mpaka utume kadi',
    comparisonLink: 'Linganisha vifurushi',
  },
  ctaBand: {
    text: 'Pata mwaliko wako wa majaribio sasa hivi.',
    primary: 'Anza bure',
    secondary: 'Tazama kadi',
    whatsappField: 'Namba ya simu (si lazima)',
    whatsappCta: 'Tuma kwa WhatsApp',
    whatsappTemplate: 'Angalia mwaliko wa majaribio: {url}',
  },
};
```

Also add `tryItYourself` label to `apps/web/src/content/site-ui.ts` for both SW and EN, used by section eyebrows in `try-section`.

- [ ] **Step 2: Remove retired keys and update `homeCopy()` body**

Delete the SW, EN, and KE copy for `noPhone`, `steps`, `stepsTitle`, and `app`. Remove them from `HomeCopy` so TypeScript refuses leftover references.

- [ ] **Step 3: Run typecheck**

```bash
pnpm -F @harusi/web typecheck
```

Expected: fails only inside `apps/web/src/components/site/home-page.tsx` and `apps/web/src/components/site/mockups.tsx` (both are rewritten/edited in later tasks). Confirm that no other file references the retired keys; if so, fix by deleting those references in the same commit.

- [ ] **Step 4: Run content tests**

```bash
pnpm -F @harusi/web test -- --run src/content/content.test.ts
```

Expected: PASS (content shape tests still hold).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/content/home.ts apps/web/src/content/site-ui.ts
git commit -m "$(cat <<'EOF'
feat(web): extend HomeCopy for the landing overhaul

Adds hero form labels, trust line, trySection, featureRows,
pricingTeaser, and ctaBand.whatsapp*; retires noPhone/steps/app
whose sections are replaced by the new islands.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `<TrustLine>` server component

**Files:**
- Create: `apps/web/src/components/site/home/trust-line.tsx`

**Interfaces:**
- Produces: `export function TrustLine({ text }: { text: string }): JSX.Element`.

- [ ] **Step 1: Implement**

```tsx
// apps/web/src/components/site/home/trust-line.tsx
export function TrustLine({ text }: { text: string }) {
  return (
    <section aria-label={text} className="border-y border-ks-border bg-ks-surface">
      <p className="mx-auto max-w-5xl px-6 py-4 text-center text-sm font-medium tracking-wide text-ks-muted md:text-base">
        {text}
      </p>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/site/home/trust-line.tsx
git commit -m "$(cat <<'EOF'
feat(web): TrustLine server component for the new home

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: `<HeroLive>` client island

**Files:**
- Create: `apps/web/src/components/site/home/hero-live.tsx`

**Interfaces:**
- Consumes: `buildDemoCardView`, `DEMO_EVENT_TYPES` from `@/lib/demo-card`; `homeCopy` shape (receives the resolved `HomeCopy['hero']`, `HomeCopy['formLabels']`, and `heroPreviewOpen` via props); `cn` from `@/lib/cn`; analytics `emit()` from `@/lib/analytics` (wherever existing emitters live — Task 2 of ADR 057 landed this; grep for `emit(` in `apps/web/src` to find the exact import).
- Produces:
  - `export interface HeroLiveProps { locale: 'sw' | 'en'; h1: string; sub: string; primary: { href: string; label: string }; secondaryBaseHref: string; secondaryLabel: string; footnote: string; form: HomeCopy['hero']['formLabels']; previewFrameAlt: string; }`
  - `export function HeroLive(props: HeroLiveProps): JSX.Element` (`'use client'`).

- [ ] **Step 1: Locate the analytics emitter**

```bash
grep -rn "export function emit\|export const emit" apps/web/src | head -5
```

Note the import path; use it in Step 2. If no central emitter exists, add a `function emit(name: string, data?: Record<string, unknown>) {}` locally in this file with a `// TODO emit via @/lib/analytics once consolidated` comment — but prefer the existing path.

- [ ] **Step 2: Implement the component**

```tsx
'use client';
// apps/web/src/components/site/home/hero-live.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { buildDemoCardView, DEMO_EVENT_TYPES, type DemoEventType } from '@/lib/demo-card';
import { cn } from '@/lib/cn';
// import { emit } from '@/lib/analytics'; // adjust import path from Step 1
const emit = (_name: string, _data?: Record<string, unknown>) => {}; // Step 1 placeholder

async function hashNames(names: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return '';
  const bytes = new TextEncoder().encode(names);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest).slice(0, 6))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function nextSaturdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 60);
  const day = d.getDay();
  const shift = (6 - day + 7) % 7;
  d.setDate(d.getDate() + shift);
  return d.toISOString().slice(0, 10);
}

export interface HeroLiveProps {
  locale: 'sw' | 'en';
  h1: string;
  sub: string;
  primary: { href: string; label: string };
  secondaryBaseHref: string;
  secondaryLabel: string;
  footnote: string;
  form: {
    names: string;
    namesPlaceholder: string;
    date: string;
    eventType: string;
    eventLabels: Record<DemoEventType, string>;
  };
  previewFrameAlt: string;
}

export function HeroLive(props: HeroLiveProps) {
  const [names, setNames] = useState('Asha & Juma');
  const [dateISO, setDateISO] = useState(nextSaturdayISO());
  const [eventType, setEventType] = useState<DemoEventType>('harusi');
  const [cardHtml, setCardHtml] = useState<string>('');
  const timer = useRef<number | null>(null);

  const view = useMemo(() => buildDemoCardView({ names, dateISO, eventType }), [names, dateISO, eventType]);

  useEffect(() => {
    emit('home_hero_view');
  }, []);

  useEffect(() => {
    // Render preview on a 100 ms debounce. We render into a scaled-down card by composing the
    // key fields inline (names, date, event label) rather than running the full renderCard() on
    // the client — keeping the client bundle small. The /jaribu route serves the full card.
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const label = props.form.eventLabels[eventType];
      const datePretty = new Date(dateISO).toLocaleDateString(props.locale === 'sw' ? 'sw-TZ' : 'en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
      setCardHtml(
        `<div class="flex h-full flex-col items-center justify-between p-6 text-center">` +
          `<span class="text-xs uppercase tracking-widest opacity-70">${escapeHtml(label)}</span>` +
          `<div>` +
          `<p class="font-serif text-3xl leading-tight">${escapeHtml(view.event?.coupleNames ?? '')}</p>` +
          `<p class="mt-2 text-sm opacity-80">${escapeHtml(datePretty)}</p>` +
          `</div>` +
          `<span class="rounded-full border px-3 py-1 text-xs">${escapeHtml(view.guest?.shortCode ?? '')}</span>` +
          `</div>`,
      );
    }, 100);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [view, eventType, dateISO, props.locale, props.form.eventLabels]);

  const secondaryHref = `${props.secondaryBaseHref}?names=${encodeURIComponent(
    names,
  )}&date=${encodeURIComponent(dateISO)}&event=${encodeURIComponent(eventType)}`;

  return (
    <section className="ks-reveal mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-[1.1fr_1fr] md:gap-16 md:py-24">
      <div className="flex flex-col gap-6">
        <h1 className="font-serif text-4xl leading-[1.08] tracking-[-0.02em] md:text-5xl">{props.h1}</h1>
        <p className="max-w-xl text-lg leading-relaxed text-ks-muted">{props.sub}</p>

        <div className="flex flex-col gap-3 pt-2">
          <label className="flex flex-col gap-1 text-sm font-medium">
            {props.form.names}
            <input
              value={names}
              placeholder={props.form.namesPlaceholder}
              maxLength={60}
              onChange={(e) => {
                setNames(e.target.value);
                emit('home_hero_input', { field: 'names' });
                void hashNames(e.target.value).then((h) => emit('home_hero_input_hash', { h }));
              }}
              className="h-12 rounded-ks border border-ks-border bg-white px-4 text-base"
              aria-label={props.form.names}
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium">
              {props.form.date}
              <input
                type="date"
                value={dateISO}
                onChange={(e) => {
                  setDateISO(e.target.value);
                  emit('home_hero_input', { field: 'date' });
                }}
                className="h-12 rounded-ks border border-ks-border bg-white px-4 text-base"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              {props.form.eventType}
              <select
                value={eventType}
                onChange={(e) => {
                  setEventType(e.target.value as DemoEventType);
                  emit('home_hero_input', { field: 'eventType' });
                }}
                className="h-12 rounded-ks border border-ks-border bg-white px-4 text-base"
              >
                {DEMO_EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {props.form.eventLabels[t]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <a
            href={props.primary.href}
            onClick={() => emit('home_hero_cta_primary')}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-ks-green-700 px-6 font-semibold text-white"
          >
            {props.primary.label}
          </a>
          <a
            href={secondaryHref}
            target="_blank"
            rel="noopener"
            onClick={() => emit('home_hero_cta_secondary')}
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-ks-green-700 px-6 font-semibold text-ks-green-700"
          >
            {props.secondaryLabel}
          </a>
        </div>
        <p className="text-sm text-ks-muted">{props.footnote}</p>
      </div>

      <div className="flex justify-center md:justify-end">
        <div
          aria-label={props.previewFrameAlt}
          className={cn(
            'relative h-[520px] w-[280px] overflow-hidden rounded-[2rem] border border-ks-border bg-ks-bg shadow-[0_18px_40px_-16px_rgb(10_63_53/0.4)]',
          )}
          style={{ background: view.event?.coverGradient }}
        >
          <div
            className="pointer-events-none h-full w-full text-white"
            dangerouslySetInnerHTML={{ __html: cardHtml }}
          />
        </div>
      </div>
    </section>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
```

- [ ] **Step 3: Verify client bundle budget**

```bash
pnpm -F @harusi/web build
```

Then open the Next build output and find the First Load JS for `/`. Expected: the delta from Hero < 20 KB gz; the whole page budget remains under the existing cap in `apps/web/next.config.ts` (if any). If over, remove the hash call or lazy-load it.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/site/home/hero-live.tsx
git commit -m "$(cat <<'EOF'
feat(web): HeroLive client island with live card preview

Three inputs (names, date, event type) drive a scaled phone-frame
preview and a /jaribu deep link. Emits the four home_hero_* analytics
events from the spec; names are SHA-256-hashed before emission.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: `<TrySection>` client island

**Files:**
- Create: `apps/web/src/components/site/home/try-section.tsx`

**Interfaces:**
- Consumes: `HomeCopy['trySection']` as `copy` prop; secondary CTA href base (same as hero secondary) and current `{names, dateISO, eventType}` as a `demoHref` string prop built by the parent server component.
- Produces:
  - `export interface TrySectionProps { copy: HomeCopy['trySection']; demoHref: string; }`
  - `export function TrySection(props: TrySectionProps): JSX.Element` (`'use client'`).

- [ ] **Step 1: Implement**

```tsx
'use client';
// apps/web/src/components/site/home/try-section.tsx
import { useState } from 'react';
const emit = (_name: string, _data?: Record<string, unknown>) => {}; // reuse Task 5's import once wired

type GateState = 'ok' | 'duplicate' | 'denied';
const GATE_SEQUENCE: GateState[] = ['ok', 'duplicate', 'denied'];
const GATE_BG: Record<GateState, string> = {
  ok: '#075E20',
  duplicate: '#7A4A00',
  denied: '#8C1D17',
};

export interface TrySectionProps {
  copy: {
    title: string;
    counterLabel: string;
    steps: { eyebrow: string; title: string; body: string; cta: string }[];
  };
  demoHref: string;
  gateCopy: { ok: string; duplicate: string; denied: string };
}

export function TrySection({ copy, demoHref, gateCopy }: TrySectionProps) {
  const [rsvp, setRsvp] = useState<'none' | 'yes' | 'no'>('none');
  const [party, setParty] = useState(2);
  const [confirmed, setConfirmed] = useState(0);
  const [gate, setGate] = useState<GateState | null>(null);

  function confirmRsvp() {
    if (rsvp === 'none') {
      setRsvp('yes');
      setConfirmed((n) => n + 1);
      emit('home_try_step_interact', { step: 2, action: 'rsvp_yes' });
    } else {
      setRsvp('none');
      setConfirmed((n) => Math.max(0, n - 1));
    }
  }

  function cycleGate() {
    const idx = gate ? GATE_SEQUENCE.indexOf(gate) : -1;
    const next = GATE_SEQUENCE[(idx + 1) % GATE_SEQUENCE.length];
    setGate(next);
    emit('home_try_step_interact', { step: 3, action: `gate_${next}` });
    window.setTimeout(() => setGate(null), 2500);
  }

  return (
    <section aria-labelledby="jaribu" className="bg-ks-bg py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 flex items-baseline justify-between">
          <h2 id="jaribu" className="font-serif text-3xl tracking-[-0.02em] md:text-4xl">
            {copy.title}
          </h2>
          <span aria-live="polite" className="text-sm text-ks-muted">
            {copy.counterLabel.replace('{n}', String(confirmed))}
          </span>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {/* Step 1: open card */}
          <div className="ks-bezel">
            <div className="ks-core flex h-full flex-col gap-4 p-6">
              <span className="text-xs tracking-widest text-ks-muted">{copy.steps[0].eyebrow}</span>
              <h3 className="text-xl font-semibold">{copy.steps[0].title}</h3>
              <p className="text-ks-muted">{copy.steps[0].body}</p>
              <a
                href={demoHref}
                target="_blank"
                rel="noopener"
                onClick={() => emit('home_try_step_interact', { step: 1, action: 'open_card' })}
                className="mt-auto inline-flex min-h-12 w-fit items-center rounded-full bg-ks-green-700 px-5 font-semibold text-white"
              >
                {copy.steps[0].cta}
              </a>
            </div>
          </div>

          {/* Step 2: RSVP */}
          <div className="ks-bezel">
            <div className="ks-core flex h-full flex-col gap-4 p-6">
              <span className="text-xs tracking-widest text-ks-muted">{copy.steps[1].eyebrow}</span>
              <h3 className="text-xl font-semibold">{copy.steps[1].title}</h3>
              <p className="text-ks-muted">{copy.steps[1].body}</p>
              {rsvp === 'none' ? (
                <>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={confirmRsvp}
                      className="min-h-12 flex-1 rounded-full bg-ks-green-700 font-semibold text-white"
                    >
                      Nitahudhuria
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRsvp('no');
                        emit('home_try_step_interact', { step: 2, action: 'rsvp_no' });
                      }}
                      className="min-h-12 flex-1 rounded-full border border-ks-border font-semibold"
                    >
                      Sitahudhuria
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setParty((p) => Math.max(1, p - 1))} aria-label="minus" className="size-10 rounded-full border">−</button>
                    <span aria-live="polite" className="w-10 text-center font-semibold">{party}</span>
                    <button type="button" onClick={() => setParty((p) => p + 1)} aria-label="plus" className="size-10 rounded-full border">+</button>
                  </div>
                </>
              ) : (
                <p className="rounded-xl bg-ks-green-100 px-4 py-3 font-semibold text-ks-green-700">
                  Umethibitisha ✔ · {party}
                </p>
              )}
            </div>
          </div>

          {/* Step 3: gate scan */}
          <div className="ks-bezel">
            <div className="ks-core flex h-full flex-col gap-4 p-6">
              <span className="text-xs tracking-widest text-ks-muted">{copy.steps[2].eyebrow}</span>
              <h3 className="text-xl font-semibold">{copy.steps[2].title}</h3>
              <p className="text-ks-muted">{copy.steps[2].body}</p>
              <button
                type="button"
                onClick={cycleGate}
                className="mt-auto inline-flex min-h-12 w-fit items-center rounded-full bg-ks-green-700 px-5 font-semibold text-white"
              >
                {copy.steps[2].cta}
              </button>
              {gate ? (
                <div
                  role="status"
                  className="rounded-xl px-4 py-5 text-center text-white motion-safe:transition-colors"
                  style={{ background: GATE_BG[gate] }}
                >
                  <p className="text-sm uppercase tracking-widest opacity-90">{gate.toUpperCase()}</p>
                  <p className="font-semibold">{gateCopy[gate]}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/site/home/try-section.tsx
git commit -m "$(cat <<'EOF'
feat(web): TrySection client island with three interactive steps

Each step is client-only state; no network. Gate overlay uses the same
#075E20 / #7A4A00 / #8C1D17 tokens the real scanner uses and respects
reduced-motion. Emits home_try_step_interact events per spec.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: `<FeatureRow>` and `<PricingTeaser>` server components

**Files:**
- Create: `apps/web/src/components/site/home/feature-row.tsx`
- Create: `apps/web/src/components/site/home/pricing-teaser.tsx`

**Interfaces:**
- `FeatureRow`:
  - `export interface FeatureRowProps { eyebrow: string; title: string; bullets: string[]; linkLabel?: string; linkHref?: string; visual: ReactNode; reverse?: boolean; }`
- `PricingTeaser`:
  - `export interface PricingTeaserProps { catalog: PricingCatalog; locale: 'sw' | 'en'; copy: HomeCopy['pricingTeaser']; }`
  - Renders three tiles from `sortedTiers(catalog)` (middle tile emphasised). CTA href: `/login?plan=<tier.id>` (SW) or `/en/login?plan=<tier.id>` (EN).

- [ ] **Step 1: Implement FeatureRow**

```tsx
// apps/web/src/components/site/home/feature-row.tsx
import type { ReactNode } from 'react';
import { ArrowUpRight, Check } from 'lucide-react';
import { SiteLink as Link } from '@/components/site/site-link';
import { cn } from '@/lib/cn';

export interface FeatureRowProps {
  eyebrow: string;
  title: string;
  bullets: string[];
  linkLabel?: string;
  linkHref?: string;
  visual: ReactNode;
  reverse?: boolean;
}

export function FeatureRow({ eyebrow, title, bullets, linkLabel, linkHref, visual, reverse }: FeatureRowProps) {
  return (
    <section className={cn('mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-2 md:gap-16 md:py-24', reverse && 'md:[direction:rtl] md:[&>*]:[direction:ltr]')}>
      <div className="flex flex-col gap-5">
        <span className="text-xs tracking-widest text-ks-muted">{eyebrow}</span>
        <h2 className="font-serif text-3xl leading-tight tracking-[-0.02em] md:text-4xl">{title}</h2>
        <ul className="flex flex-col gap-3">
          {bullets.map((b) => (
            <li key={b} className="flex gap-3 leading-relaxed">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-ks-green-100 text-ks-green-700">
                <Check className="size-3.5" strokeWidth={2.25} />
              </span>
              {b}
            </li>
          ))}
        </ul>
        {linkLabel && linkHref ? (
          <Link href={linkHref} className="inline-flex w-fit items-center gap-2 text-ks-green-700 underline-offset-4 hover:underline">
            {linkLabel}
            <ArrowUpRight className="size-4" strokeWidth={1.75} />
          </Link>
        ) : null}
      </div>
      <div className="flex items-center justify-center">{visual}</div>
    </section>
  );
}
```

- [ ] **Step 2: Implement PricingTeaser**

```tsx
// apps/web/src/components/site/home/pricing-teaser.tsx
import { sortedTiers, type PricingCatalog } from '@harusi/schemas/billing';
import { formatMoney } from '@/lib/format';
import { SiteLink as Link } from '@/components/site/site-link';
import { cn } from '@/lib/cn';

export interface PricingTeaserProps {
  catalog: PricingCatalog;
  locale: 'sw' | 'en';
  copy: {
    title: string;
    sub: string;
    cta: string;
    footnote: string;
    comparisonLink: string;
  };
  comparisonHref: string;
}

export function PricingTeaser({ catalog, locale, copy, comparisonHref }: PricingTeaserProps) {
  const tiers = sortedTiers(catalog).slice(0, 3);
  const loginBase = locale === 'sw' ? '/login' : '/en/login';
  return (
    <section aria-labelledby="bei" className="bg-ks-surface py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-10 flex flex-col gap-2">
          <h2 id="bei" className="font-serif text-3xl tracking-[-0.02em] md:text-4xl">{copy.title}</h2>
          <p className="text-ks-muted">{copy.sub}</p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {tiers.map((t, i) => {
            const emphasised = i === 1;
            return (
              <article key={t.id} className={cn('ks-bezel', emphasised && 'ring-2 ring-ks-green-700/40')}>
                <div className="ks-core flex h-full flex-col gap-4 p-6 md:p-8">
                  <h3 className="text-xl font-semibold">{t.name}</h3>
                  <p className="text-3xl font-bold tracking-tight">
                    {formatMoney(t.priceMinor, { currency: t.currency, locale })}
                  </p>
                  <p className="text-ks-muted">{t.summary}</p>
                  <Link
                    href={`${loginBase}?plan=${encodeURIComponent(t.id)}`}
                    className={cn(
                      'mt-auto inline-flex min-h-12 items-center justify-center rounded-full px-5 font-semibold',
                      emphasised ? 'bg-ks-green-700 text-white' : 'border border-ks-green-700 text-ks-green-700',
                    )}
                  >
                    {copy.cta}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
        <p className="mt-6 text-sm text-ks-muted">
          {copy.footnote} · <Link href={comparisonHref} className="underline">{copy.comparisonLink}</Link>
        </p>
      </div>
    </section>
  );
}
```

> **Guard:** if `PricingCatalog` tier fields in `@harusi/schemas/billing` differ (e.g. `priceMinor`, `currency`, `summary` not present), `grep -n "export.*Tier\|interface.*Tier\|priceMinor" packages/schemas/src` and adjust the field names **in this component only**. Record the exact names actually used in the commit message.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/site/home/feature-row.tsx apps/web/src/components/site/home/pricing-teaser.tsx
git commit -m "$(cat <<'EOF'
feat(web): FeatureRow and PricingTeaser server components for home

PricingTeaser reads the live catalogue via getPricingOnServer() in the
parent; middle tile emphasised, CTA deep-links /login?plan=<id>.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: `<CtaBand>` client component

**Files:**
- Create: `apps/web/src/components/site/home/cta-band.tsx`

**Interfaces:**
- `export interface CtaBandProps { copy: { text: string; primary: string; secondary: string; whatsappField: string; whatsappCta: string; whatsappTemplate: string; }; primaryHref: string; demoHrefBuilder: () => string; }`
- Produces client component that composes `wa.me/<digits>?text=<encoded message with url>`.

- [ ] **Step 1: Implement**

```tsx
'use client';
// apps/web/src/components/site/home/cta-band.tsx
import { useState } from 'react';

export interface CtaBandProps {
  copy: {
    text: string;
    primary: string;
    secondary: string;
    whatsappField: string;
    whatsappCta: string;
    whatsappTemplate: string;
  };
  primaryHref: string;
  demoHref: string;
}

function digitsOnly(s: string): string {
  return s.replace(/[^\d]/g, '');
}

export function CtaBand({ copy, primaryHref, demoHref }: CtaBandProps) {
  const [phone, setPhone] = useState('');

  function buildWaUrl(): string {
    const to = digitsOnly(phone);
    const text = encodeURIComponent(copy.whatsappTemplate.replace('{url}', demoHref));
    return to ? `https://wa.me/${to}?text=${text}` : `https://wa.me/?text=${text}`;
  }

  return (
    <section className="ks-mesh-dark relative py-20 md:py-28 text-white">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 text-center">
        <h2 className="font-serif text-3xl leading-tight tracking-[-0.02em] md:text-4xl">{copy.text}</h2>
        <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          <input
            type="tel"
            inputMode="tel"
            placeholder={copy.whatsappField}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-12 w-full max-w-sm rounded-full border border-white/40 bg-white/10 px-5 text-white placeholder-white/60"
            aria-label={copy.whatsappField}
          />
          <a
            href={buildWaUrl()}
            target="_blank"
            rel="noopener"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 font-semibold text-ks-green-900"
          >
            {copy.whatsappCta}
          </a>
        </div>
        <a
          href={primaryHref}
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/50 px-6 font-semibold"
        >
          {copy.primary}
        </a>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/site/home/cta-band.tsx
git commit -m "$(cat <<'EOF'
feat(web): CtaBand with wa.me demo-share and /login secondary

No backend: button composes the wa.me URL on click. Empty phone falls
back to wa.me/?text=... so the visitor picks the recipient themselves.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Rewrite `home-page.tsx` to stitch the new sections

**Files:**
- Modify: `apps/web/src/components/site/home-page.tsx`
- Remove dead exports from: `apps/web/src/components/site/mockups.tsx` (only if grep shows no external consumer)

**Interfaces:**
- Produces: the new render order: `Hero → TrustLine → TrySection → FeatureRow×3 → PricingTeaser → Events → Faq → CtaBand`, JSON-LD updated to source `HowTo.step` from `c.trySection.steps` (keep `name`, map `step[].name = s.title`, `step[].text = s.body`).

- [ ] **Step 1: Rewrite**

Replace the entire content of `apps/web/src/components/site/home-page.tsx` with (preserving the existing event-list/TZ_EVENTS block, Events chip grid, and FAQ block — these don't change):

```tsx
// apps/web/src/components/site/home-page.tsx (truncated to the new stitching;
// keep the existing JsonLd, SeoLinks, SITE_URL, Events chip grid, Faq calls.)
//
// Required changes:
// 1. Replace Hero (<Hero .../>) with:
//      <HeroLive
//        locale={locale}
//        h1={c.hero.h1}
//        sub={c.hero.sub}
//        primary={{ href: primaryHref, label: c.hero.primary }}
//        secondaryBaseHref={market === 'ke' ? '/en/jaribu' : '/jaribu'}
//        secondaryLabel={c.heroPreviewOpen}
//        footnote={c.heroNote}
//        form={c.formLabels}
//        previewFrameAlt={c.hero.h1}
//      />
// 2. Replace AnswerBlock + Container<Steps/> with:
//      <TrustLine text={c.trustLine} />
//      <TrySection
//        copy={c.trySection}
//        demoHref={`${market === 'ke' ? '/en/jaribu' : '/jaribu'}?names=Asha%20%26%20Juma&date=2026-12-19&event=harusi`}
//        gateCopy={{ ok: c.gate.chips.ok, duplicate: c.gate.chips.duplicate, denied: c.gate.chips.missing }}
//      />
// 3. Replace the bento Container with three FeatureRow calls using
//    c.featureRows[0..2] and visuals <CardAndSms/>, <img .../gate-scanner-admit.svg/>, <MichangoBar/>.
// 4. Replace the dark app Container with:
//      <PricingTeaser
//        catalog={pricing}
//        locale={locale}
//        copy={c.pricingTeaser}
//        comparisonHref={localeUrl(PRICING_PATH, locale)}
//      />
// 5. Keep <TrustStrip/>? Remove — the TrustLine above and the FeatureRows cover it.
// 6. Keep status callout (if (c.status)), Events chip grid, Faq.
// 7. Replace CtaBand with <CtaBand
//        copy={c.ctaBand}
//        primaryHref={primaryHref}
//        demoHref={`${market === 'ke' ? '/en/jaribu' : '/jaribu'}?names=Asha%20%26%20Juma&date=2026-12-19&event=harusi`}
//      />
// 8. In JsonLd.graph, replace the HowTo node's step array with:
//      step: c.trySection.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.title, text: s.body })),
//      name: c.trySection.title,
```

- [ ] **Step 2: Grep for stale consumers of removed mockups**

```bash
grep -rn "SmsBubble\|AppMockup" apps/web/src apps/web/app packages
```

If zero hits outside `mockups.tsx` itself, delete those exports and their helpers. If any hit survives, leave the exports alone and move on.

- [ ] **Step 3: Typecheck and unit tests**

```bash
pnpm -F @harusi/web typecheck
pnpm -F @harusi/web test
```

Expected: all green. If `c.steps` / `c.app` is referenced anywhere outside home-page, remove those references as part of this commit.

- [ ] **Step 4: Dev smoke-test**

```bash
pnpm -F @harusi/web dev
```

Open `http://localhost:3000/` and `http://localhost:3000/en`. Verify by eye:

- Hero inputs update the phone-frame preview within ~150 ms.
- Secondary CTA opens `/jaribu?...` in a new tab, showing the demo banner and a full card.
- TrySection's three cards each react to clicks (open card, RSVP flip, gate overlay cycle).
- PricingTeaser shows three real tier names and prices (not placeholders).
- CTA band's "Tuma kwa WhatsApp" opens `https://wa.me/?text=...` (empty phone) and `https://wa.me/255...?text=...` (phone entered).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/site/home-page.tsx apps/web/src/components/site/mockups.tsx
git commit -m "$(cat <<'EOF'
feat(web): rewrite home-page.tsx around the new islands

Hero → TrustLine → TrySection → 3× FeatureRow → PricingTeaser →
Events → Faq → CtaBand. JSON-LD HowTo node sourced from trySection
copy so structured data stays in sync with what's on the page.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Playwright e2e for the hero → `/jaribu` flow

**Files:**
- Create: `apps/web/e2e/home-hero.spec.ts`

**Interfaces:**
- Consumes: Playwright `test` from `@playwright/test`.
- Produces: a single spec with a two-step scenario.

- [ ] **Step 1: Write the spec**

```ts
// apps/web/e2e/home-hero.spec.ts
import { expect, test } from '@playwright/test';

test('hero inputs personalise the preview and link to /jaribu', async ({ page, context }) => {
  await page.goto('/');

  const names = page.getByLabel(/Majina ya wana-ndoa|Couple names/);
  await names.fill('Zuhura & Khalid');

  // Preview renders a name within a short settle window.
  await expect(page.locator('section').first()).toContainText('Zuhura', { timeout: 500 });

  const [popup] = await Promise.all([
    context.waitForEvent('page'),
    page.getByRole('link', { name: /Tazama kadi kamili|See the full card/ }).click(),
  ]);
  await popup.waitForLoadState('domcontentloaded');
  await expect(popup).toHaveURL(/\/jaribu\?names=Zuhura%20%26%20Khalid/);
  await expect(popup.locator('body')).toContainText(/Hii ni kadi ya majaribio|This is a demo card/);
});
```

- [ ] **Step 2: Run the spec**

```bash
pnpm -F @harusi/web exec playwright test e2e/home-hero.spec.ts
```

Expected: PASS. If it times out on the preview, raise the timeout to 1000 ms and recheck; the debounce is 100 ms + render cost.

- [ ] **Step 3: Commit**

```bash
git add apps/web/e2e/home-hero.spec.ts
git commit -m "$(cat <<'EOF'
test(web): e2e for hero preview update and /jaribu deep link

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Lighthouse, accessibility, and final verification

**Files:**
- None created. Verifies acceptance criteria from spec §8.

- [ ] **Step 1: Build**

```bash
pnpm -F @harusi/web build
```

Expected: build succeeds with no new warnings. Compare `.next/`-reported First Load JS for `/` to the pre-change value (`git stash && pnpm build && git stash pop`); note the delta in the final commit message.

- [ ] **Step 2: Lighthouse mobile audit**

```bash
pnpm -F @harusi/web exec lhci autorun --config=./lighthouserc.cjs --collect.url=http://localhost:3000/ --collect.url=http://localhost:3000/jaribu
```

Expected: Performance ≥ 90, Accessibility ≥ 90 on both URLs.

- [ ] **Step 3: Axe scan**

```bash
pnpm -F @harusi/web exec playwright test --grep "@axe"
```

If no axe test matches this name in the repo, add a minimal axe check in `apps/web/e2e/home-hero.spec.ts` using `@axe-core/playwright` (import, `AxeBuilder`, zero serious/critical violations on `/`).

- [ ] **Step 4: Reduced-motion check**

Open DevTools → Rendering → `prefers-reduced-motion: reduce`. Reload `/`. Click the gate button in TrySection; the overlay appears instantly without colour transition.

- [ ] **Step 5: Analytics events smoke-check**

Open `/` in dev, fill names, click primary CTA. Confirm the following names appear in the analytics transport log (network tab or wherever `emit()` lands): `home_hero_view`, `home_hero_input` (at least one), `home_hero_cta_primary`. In TrySection click each step action; confirm `home_try_step_interact` with the right `step`.

- [ ] **Step 6: Final commit**

```bash
git commit --allow-empty -m "$(cat <<'EOF'
chore(web): home landing overhaul — verification pass

Lighthouse mobile Perf/A11y ≥ 90 on / and /jaribu; axe zero serious
violations; reduced-motion respected; all four hero analytics events
and the three try-section events fire per spec.

Refs: docs/superpowers/specs/2026-11-07-home-landing-overhaul-design.md §8

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review (performed before saving)

- Spec coverage: §2 IA → Task 9. §3 Hero → Tasks 1, 3, 5. §4 Try → Task 6. §5 feature rows / `/jaribu` / pricing → Tasks 2, 7, 9. §6 CTA band → Task 8. §7 engineering layout → Tasks 1–9. §8 acceptance → Tasks 10–11. §9 follow-ups out of scope. §10 references kept as notes in each task.
- Placeholders: no "TBD" / "TODO" except the deliberate `emit()` placeholder in Tasks 5 and 6, each pointing at a Step 1 "locate the analytics emitter" with a fallback no-op so the code still typechecks before consolidation. Acceptable since the import path is discoverable with a one-line grep.
- Type consistency: `DemoEventType`, `DemoInput`, `DEMO_EVENT_TYPES`, `DEMO_QR_PAYLOAD`, `buildDemoCardView` names match between Tasks 1, 2, 5. `HomeCopy` fields added in Task 3 are consumed verbatim by Tasks 4–9. `CtaBand` interface matches Task 8 and Task 9 usage.
- Decomposition: 11 bite-sized tasks, each with a self-contained commit. Tests precede implementation for Tasks 1 and 2; UI tasks verify via dev smoke-test and Playwright in Task 10.
