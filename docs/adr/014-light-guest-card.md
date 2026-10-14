# 014 — Light guest card: static HTML route instead of the React page

Status: accepted (answers the open conflict in ADR 009)

## Decision

`/c/[token]` is now a Next.js **route handler** (`apps/web/app/c/[token]/route.ts`) that returns one HTML document built by `src/lib/light-card/render.ts`: inline CSS (system fonts, no webfont), the QR as an inline SVG path, and one small vanilla script (`src/lib/light-card/client-script.ts`, ~10 KB) for RSVP, the party stepper, QR PNG download, `.ics`, install hint, print, language chip and the service-worker registration. No React or Next client runtime is shipped to guests.

Why: §7.3 asks for an initial load under 100 KB on 3G. The Next.js App Router runtime alone is 103 KB gz (ADR 009), so no React page could meet it. Measured now: the card is ~30 KB of HTML uncompressed (well under 15 KB gzipped) and loads no other JS. The console (`/app`, `/ops`) keeps Next.js and React; only the guest card changed.

## Behaviour kept from the React card

- All §17.6 sections and states: trust strip (sender, committee phone, domain, call button), RSVP with party stepper limited to `partySizeAllowed`, QR promoted below the trust strip after a "yes", brightness hint, pledge summary and pay link, footer with language, privacy and committee phone, invalid / reissued / error pages, event-passed and RSVP-closed banners, offline banner.
- Offline: the service worker (`public/sw.js`) caches the page by path; an RSVP given offline is stored in the outbox (`harusi.card.outbox.<token>`) and replayed when the connection returns.
- Same `data-testid`s, so the existing e2e selectors still apply.
- The QR block is always black on white (§17.2), rendered server-side with error correction M and a 4-module quiet zone.

## Data

The server fetches the `CardView` through `createHttpRepository(API_URL).getCard()` (real mode) or the mock seed (`NEXT_PUBLIC_USE_MOCKS`). In real mode the script posts RSVPs straight to `POST /v1/c/:token/rsvp` (the API needs `CORS_ORIGINS` to include the web origin). In mock mode the script reads and writes the browser's demo state; when that state does not exist yet it stores an overlay (`harusi.card.overlay.<token>`) which `MockRepository` folds in on load, so the console still sees the answer.

## Security

Every dynamic value is HTML-escaped; the script's data travels as JSON in `<script type="application/json">` with `<` escaped, never interpolated into script source; cover gradients are checked against an allow-list pattern before they reach a `style` attribute. The page is `no-store` and `noindex`.

## Consequences

- `GuestCard` (React) remains only for `/dev/states` and Storybook-style state coverage; it is no longer served to guests and can be deleted once `/dev/states` renders the light card in an iframe.
- API mode gaps: the API card does not yet return the committee phone, greeting, pledge summary or `pledgesEnabled`, so those blocks are empty there until the API adds them.
- `/s/[code]`, `/c/[token]/pay`, the manifest and the OG image still use the mock seed on the server (HANDOFF step 3).
