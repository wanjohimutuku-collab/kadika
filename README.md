# Harusi Pass

Wedding invitations, RSVPs, contributions (michango) and gate check-in for Tanzania, built mobile-first, offline-capable and Swahili-first. _Harusi Pass is the working name._

A guest gets one card that works on a smartphone, on a feature phone (SMS with a short code) and on paper (a printable card with the same QR and a human-readable code). The same card ties to a pledge and to entry at the gate, which still works with no internet.

> **Status:** everything is built and tested locally, but nothing is deployed yet and the real WhatsApp, SMS and payment providers have not been run against live accounts. See [docs/TODO.md](docs/TODO.md) for exactly what is done, what is unverified and what needs an outside party.

## What is in the repo

| Piece                          | What it does                                                                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Guest card** (`/c/<token>`)  | A static HTML page of about 30 KB: couple, venue, map, RSVP, inline QR, short code, calendar file, pledge and pay button. Works offline after the first open.                        |
| **Organiser console** (`/app`) | Web console for events, guests (paste, CSV or contacts import), sending, card design and print PDFs, pledges and payments, gate monitor, team and reports.                           |
| **Mobile app**                 | Expo app for Android: the organiser tools plus the offline-first gate scanner (signed QR checked on the phone, code and name fallbacks, duplicate detection, sync when back online). |
| **API**                        | Hono REST API with zod validation, phone-OTP login, background worker for sending, reminders and payment reconciliation.                                                             |
| **Staff panel** (`/ops`)       | For Harusi Pass employees: customers, weddings, payments, support lookups and audit log.                                                                                             |

Sending goes by WhatsApp or SMS with automatic fallback, and a guest can hold either an **invitation card** (RSVP, QR, gate entry) or a **contribution card** (contribution only). Kenya support is built but switched off behind `KENYA_ENABLED`.

The full product and build specification is in [CLAUDE.md](CLAUDE.md), and the reasoning behind each decision is in [docs/adr](docs/adr).

## Repository layout

```
apps/
  api/        Hono API and background worker
  web/        Next.js: guest card, organiser console, staff panel, public pages
  mobile/     Expo app: organiser tools and gate scanner
packages/
  api-client/ typed client, mock repository and shared domain logic
  crypto/     Ed25519 signing and verification of QR tokens (also runs in React Native)
  db/         Drizzle schema, migrations and seed
  gate/       gate check-in engine shared by the app and the tests
  i18n/       Swahili and English strings
  messaging/  WhatsApp and SMS provider adapters, plus a fake provider
  payments/   payment provider adapters, plus a fake provider
  schemas/    zod schemas and shared helpers
  ui-tokens/  colours, spacing and palette rules
infra/        Dockerfiles, backup script, deploy and restore notes
docs/         ADRs, TODO, QA checklists, operations runbooks, UI notes
```

## Getting started

**Requirements:** Node 22 or newer (`.nvmrc` says 22) and pnpm 9.15 (`corepack enable` will pick the right one). Docker is only needed for the full stack below.

```bash
pnpm install
```

Pick how much of the system you want to run.

### 1. The web app on mock data (no backend)

The web app uses an in-browser mock backend unless told otherwise, so this needs nothing else:

```bash
pnpm --filter @harusi/web dev
```

Open <http://localhost:3000> and sign in as the demo organiser with `0712 000 001` and the code `123456`. Staff sign-in hints for `/ops` are shown on the login page.

### 2. The real API without Docker

This runs the real API on an in-memory PGlite database with fake messaging and payment providers. Data is lost on restart and sign-in codes are printed in the API log.

```bash
pnpm --filter @harusi/api exec tsx src/dev-pglite.ts
NEXT_PUBLIC_USE_MOCKS=0 NEXT_PUBLIC_API_URL=http://localhost:3001 pnpm --filter @harusi/web dev
```

The API listens on `API_PORT` (default 3001).

### 3. The full stack

```bash
cp .env.example .env     # the defaults are for local development only
pnpm infra:up            # Postgres 16, Redis 7, S3-compatible storage, Mailpit
pnpm db:migrate
pnpm db:seed
./scripts/dev.sh         # API on :3001 and web on :3000
```

Set `DEV_LOG_OTP=1` in `.env` to print sign-in codes in the API log. Never enable it in production. Local ports: Postgres 5432, Redis 6379, S3 8333, Mailpit UI 8025.

### Mobile app

```bash
pnpm --filter @harusi/mobile dev      # Expo dev server
pnpm --filter @harusi/mobile android  # open on a connected Android device or emulator
```

Point the app at an API with `EXPO_PUBLIC_API_URL`.

## Everyday commands

| Command                                          | What it does                                           |
| ------------------------------------------------ | ------------------------------------------------------ |
| `pnpm typecheck`                                 | TypeScript across every package                        |
| `pnpm lint`                                      | ESLint across every package                            |
| `pnpm format` / `pnpm format:check`              | Prettier write / check                                 |
| `pnpm test`                                      | Unit tests across every package                        |
| `pnpm build`                                     | Build everything                                       |
| `pnpm --filter @harusi/web storybook`            | Component stories on :6006                             |
| `pnpm --filter @harusi/web e2e:build` then `e2e` | Playwright end-to-end and accessibility tests          |
| `pnpm db:generate`                               | Generate a Drizzle migration after changing the schema |

The API tests each start their own in-memory Postgres and run every migration, so the API suite takes a couple of minutes. Run a single file with `pnpm --filter @harusi/api exec vitest run src/<file>.test.ts`.

CI (`.github/workflows/ci.yml`) runs install, typecheck, lint, format check, tests, build, the Storybook build and a production dependency audit, then Playwright and Lighthouse for the web app.

## Configuration

All settings are environment variables, documented in [.env.example](.env.example). Providers sit behind interfaces with fake implementations, so nothing real is contacted until you set them:

- **WhatsApp:** `WHATSAPP_PROVIDER` chooses between the official Cloud API and a self-hosted Evolution API (see [ADR 020](docs/adr/020-whatsapp-two-providers.md)).
- **SMS:** `SMS_PROVIDER` is `fake` or `nextsms`.
- **Payments:** `PAYMENT_PROVIDER` is `fake`, `selcom`, `azampay` or `clickpesa`.

Never commit `.env`. It is already git-ignored.

## Documentation

- [CLAUDE.md](CLAUDE.md): product and build specification
- [docs/TODO.md](docs/TODO.md): current status and what is left
- [docs/adr](docs/adr): architecture decision records
- [docs/ops](docs/ops): Kenya pilot runbook and WhatsApp template notes
- [docs/qa](docs/qa): print test and gate device checklists
- [infra/coolify](infra/coolify): deployment and restore notes (still a placeholder)

## Contributing

Use Conventional Commits and keep pull requests small. Before opening one, run `pnpm typecheck`, `pnpm lint`, `pnpm format:check` and `pnpm test`. Strings live in `packages/i18n`; keep the Swahili and English files in step, and note that the Swahili text still needs a native speaker's review.

## License

No license has been chosen yet.
