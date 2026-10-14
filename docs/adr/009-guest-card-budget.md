# 009 — Guest card performance budget

Status: accepted (with a recorded conflict)

## Measurements (production build, `next build`)

| Route                                               | First-load JS (gzip)         |
| --------------------------------------------------- | ---------------------------- |
| `/c/[token]`                                        | 116 KB (Next reports 119 kB) |
| `/`                                                 | 105 KB                       |
| Next.js 15 + React 19 runtime shared by every route | 103 KB                       |

## What we did to fit < 120 KB gz JS

- **No i18n runtime on the card.** next-intl's client runtime (~12 KB gz) is replaced on `/c/[token]` by a ~1 KB ICU-subset formatter (`src/lib/tiny-intl.tsx`) fed with the same `packages/i18n` messages from the server. A unit test checks it against `intl-messageformat` for every card/common/states string in both locales.
- **QR rendered on the server.** The page computes the SVG path for the signed payload; the encoder (~7 KB gz) only loads when the payload differs (offline copy, reissue) or for the PNG download.
- **No timezone library on the card** (see ADR 008).
- **Repository and mock data load after first paint** via dynamic `import()`; in mock mode that chunk includes the seed generator and zod. `HttpRepository` will be much smaller.
- The dev panel's i18n runtime loads only when the panel is opened.

## Conflict

`CLAUDE.md` §7.3 asks for an initial load < 100 KB, and the brief repeats it as "< 100 KB transfer". With the stack mandated in §3 (Next.js App Router), the framework runtime alone is 103 KB gz, so < 100 KB total transfer is not achievable on this stack. We meet the §10 JS budget (< 120 KB gz) and keep HTML + CSS + font small. Options if the 100 KB target is firm: (a) serve `/c/[token]` as a static HTML + ~10 KB vanilla-JS page from a route handler, keeping Next.js for the console; (b) wait for a lighter React runtime. Decision deferred to the spec owner.

## No web font on the guest card (decision)

The display serif is optional in §17.2. Loading it (Cormorant Garamond via `next/font`) cost the guest card about 0.1 Lighthouse points: the couple names are the LCP element and the font download sat in its path. Preloading it, `font-display: optional` and `swap` were all tried (scores 0.78–0.88). With the font removed, the card falls back to the Georgia/Times serif stack and scores **0.93–0.95** (landing page 0.94–0.97), LCP 2.2 s, in the same simulated slow-4G mobile profile. The font stays in the console, where it only decorates the card/print previews and is not on a performance-critical path. Revisit with a self-hosted, subset (≤ 30 KB) woff2 inlined as base64 only if brand fidelity on the guest card is required.

## Lighthouse status

Mobile simulated slow 4G, 3 runs each: `/` 0.94–0.97, `/c/[token]` 0.93–0.95 (target 0.90, met). The < 100 KB initial-load target is still unmet (see Conflict above): the card ships 116 KB gz of JavaScript.
