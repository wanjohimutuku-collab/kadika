# Web MVP — handoff

The web app (`apps/web`) runs end to end on mock data: public site, guest card + pay flow, and the organizer console. This note covers what to change when the API exists, what is known to be missing, and how to review the Swahili.

## Run it

```bash
pnpm i
pnpm --filter @harusi/web dev            # http://localhost:3000
```

- Sign in at `/login` with **0712 000 001** and the code **123456** (mock). Any other number creates a new, empty organizer.
- The wrench button (bottom-left on phones, bottom-right on desktop) opens the **dev panel**: role (owner/committee/gate), language, network (online/slow/offline), injected failures (0/10/30 %), payment outcome (success/declined/timeout/duplicate webhook), reset data, sample card links.
- `/dev/states` shows every screen in every §17.10 state.
- Storybook: `pnpm --filter @harusi/web storybook` (port 6006).

## Swap `MockRepository` for the real API

Phase 1 of the API is live (ADR 013) and `HttpRepository` is wired to it: auth (OTP, refresh), events, members and guests (CRUD, import, reissue). Run both sides:

```bash
# API (needs docker compose up for Postgres; DEV_LOG_OTP=1 prints the SMS code in its log)
DEV_LOG_OTP=1 CORS_ORIGINS=http://localhost:3300 DATABASE_URL=postgres://harusi:harusi@localhost:5432/harusi \
  JWT_SECRET=dev-secret-dev-secret KEY_ENC_SECRET=$(openssl rand -base64 32) pnpm --filter @harusi/api dev
# Web against the real API
NEXT_PUBLIC_USE_MOCKS=0 NEXT_PUBLIC_API_URL=http://localhost:3001 pnpm --filter @harusi/web dev -p 3300
```

Verified in a browser: login with a real SMS code, wedding list, guest list and add-guest form all go through the API. Methods the API does not have yet (sending, pledges, gate, reports, public card/RSVP/payment, activity, gate links) reject with `not_implemented`, so those screens show their error state in this mode until their phases land. The public card endpoints (`GET /v1/c/:token`, `POST /v1/c/:token/rsvp`) exist too, so the guest card page works against the real API (view, QR, RSVP, reissued/invalid states); pay, `/s/:code` and the pledge section still need their phases.

1. Implement `HttpRepository` in `packages/api-client/src/http-repository.ts` against `/v1` (§8). Every method is typed by `Repository` in `src/repository.ts`; return the same view types (`WeddingEvent`, `Guest`, `CardView`, …) and throw `RepositoryError` with the §8 error codes (`offline`, `not_found`, `invalid_token`, `reissued`, `rate_limited`, `validation`, `unauthorized`, `forbidden`, `conflict`, `locked`, `server`).
2. Set `NEXT_PUBLIC_USE_MOCKS=0` and `NEXT_PUBLIC_API_URL`. `apps/web/src/lib/repo.ts` is the only place that picks the implementation.
3. Server rendering of the guest card: `app/c/[token]/page.tsx` currently calls `peekCardOnServer` (mock seed). Replace it with a server-side `GET /v1/c/:token` (and do the same in `opengraph-image.tsx`, `manifest.webmanifest/route.ts` and `/s/[code]`).
4. Auth: the mock keeps the session in localStorage. The real app should use the Better Auth session cookie (§3); `useSession()` in `src/lib/queries.ts` is the single read point. Role comes from `event_members`, not the dev panel.
5. Things the mock does that the API must also do:
   - RSVP idempotency by key; the card replays a stored answer (`harusi.card.outbox.<token>`) after a reload or reconnect.
   - Payment webhook idempotency by provider reference (duplicate notices counted once).
   - Send jobs: `sendInvitations` returns a job; the UI polls `getSendJob` every 700 ms until `status === 'done'`, then offers `retryFailed`.
   - `getGuestCardLink` exists only so the console can open a guest's card in mocks. The real API never exposes raw tokens; replace it with a "resend link" action.
6. Delete `packages/api-client/src/mock`, `apps/web/src/lib/server-mock.ts`, the dev panel and `/dev/states` from production builds (they are gated by `NEXT_PUBLIC_USE_MOCKS`).

## Staff panel (`/ops`)

Harusi Pass employees run the business from `/ops` (ADR 012): overview, customers (suspend/reactivate), weddings (mark paid), usage and costs, payments, support lookup, data requests, staff audit log. In mocks, sign in with **0700 000 999** (admin), **0700 000 998** (support) or **0700 000 997** (billing) + `123456`, then the staff second code `654321`. The `Repository` methods are the `ops*` group in `packages/api-client/src/repository.ts`; the real API must enforce `users.role_global = 'admin'`, mask phones by default, require a reason to reveal a full number, and write every reveal, suspension, plan change and request resolution to an audit table.

## Known gaps

- **Lighthouse** is met (0.93–0.97 mobile) because the guest card uses a system serif instead of the web font; re-adding it costs ~0.1 (ADR 009).
- **Guest card "< 100 KB initial load"** (§7.3) is not achievable with Next.js App Router: the framework runtime alone is 103 KB gz. The card meets the 120 KB gz JS budget (§10) at 116 KB. See ADR 009 for options.
- **Mock-mode bundle**: in mock mode the repository chunk (seed generator + zod) loads after first paint on the guest card. The real `HttpRepository` will be much smaller.
- **Cover photos** are mocked with gradients; real uploads need S3 (§3) and image optimisation (AVIF/WebP, ≤ 40 KB).
- **PDF export** returns a one-line mock PDF. The real batch PDF (A6/A5, A4 4-up, test sheet) is Phase 3 and must keep the §6.4 assertions; the console already blocks layouts with a QR below 25 mm or modules below 0.8 mm.
- **Contacts picker** uses the Contact Picker API on Android Chrome; elsewhere it shows sample contacts.
- **Reminder scheduler** (T-14/T-7/T-1) is configuration only; the BullMQ scheduler is Phase 3.
- **Staff panel** has no pricing, invoices or refunds yet (ADR 012). Staff sub-roles and a second factor exist in the mock.
- **Gate scanner** is not on the web (by design, ADR 005/010); the web Lango page is a monitor with manual check-in.
- **Storybook** covers the framework-agnostic `src/components/ui` set. `ConsoleShell`, headers and `LanguageChip` depend on next-intl/router and are covered by Playwright screenshots and `/dev/states` (ADR 011).
- **Token contrast**: §17.2 gate fills and the gold accent don't reach the ratios the spec claims (ADR 006). The web uses the accent decoratively only; the Android gate overlay (Phase 5) must darken the fills.

## Swahili review checklist (before launch)

All strings live in `packages/i18n/src/sw.json`, which is marked `"_meta": { "reviewed": false }`. A native speaker should check, and then set `reviewed` to `true`:

- [ ] Tone: warm and respectful, formal for elders ("Karibu", "Tafadhali", "Mpendwa"), no slang (§17.11).
- [ ] Every key in §17.11 matches the spec wording (tabs, RSVP, trust line, gate results, offline banner, sync, permissions, brightness hint).
- [ ] Plurals read naturally: `mtu 1 / watu 2`, `mgeni 1 / wageni 2`, `Siku 1 imebaki / Siku 52 zimebaki`, `Ujumbe 3 haukufika`.
- [ ] Swahili time on the card: "Saa 10:00 jioni (16:00)" — confirm elders read it as intended (ADR 008).
- [ ] Payment copy never asks for a PIN; "Thibitisha kwenye simu yako" flow is clear for M-Pesa, Mixx by Yas, Airtel Money, HaloPesa users.
- [ ] Legal pages (`legal.*`) are placeholders marked "Rasimu"; they need a lawyer as well as a language review.
- [ ] SMS templates (`packages/api-client/src/domain/sms.ts`) stay ≤ 160 GSM-7 characters with real names.
