# Harusi Pass — Claude Code instructions

> Working name: **Harusi Pass**. A Tanzanian wedding invitation, RSVP, contribution (michango) and gate-check-in platform. Mobile-first, offline-capable, Swahili-first.

Full spec lives in `docs/spec/`. Read **only** what the task needs — this root file stays minimal on purpose.

## Spec map (load on demand)

- [docs/spec/product.md](docs/spec/product.md) — Goal, user problems (P1–P11), roles, success metrics, open decisions, out-of-scope.
- [docs/spec/stack.md](docs/spec/stack.md) — Stack choices and rejections.
- [docs/spec/schema.md](docs/spec/schema.md) — Postgres domain model.
- [docs/spec/qr.md](docs/spec/qr.md) — QR payload, signing, print spec, revocation.
- [docs/spec/flows.md](docs/spec/flows.md) — Onboarding, delivery, RSVP, pledges, gate, dashboards.
- [docs/spec/api.md](docs/spec/api.md) — Hono REST endpoints under `/v1`.
- [docs/spec/security.md](docs/spec/security.md) — Security, performance budgets, localisation.
- [docs/spec/devops.md](docs/spec/devops.md) — Environments, Docker, CI, backups, env vars.
- [docs/spec/phases.md](docs/spec/phases.md) — Build phases 0–7 and acceptance criteria.
- [docs/spec/ui.md](docs/spec/ui.md) — Full UI/UX spec: principles, tokens, navigation, every screen, states, microcopy, a11y.

Also: `docs/adr/` for decisions, `docs/ui/PLAN.md` and `docs/ui/HANDOFF.md` for current UI status.

## Monorepo layout

```
harusi-pass/
├─ CLAUDE.md                  # this file
├─ docs/spec/                 # full build spec (load on demand)
├─ package.json  pnpm-workspace.yaml  turbo.json  tsconfig.base.json
├─ apps/
│  ├─ api/                    # Hono API + BullMQ workers
│  ├─ web/                    # Next.js: guest card, RSVP, pay, organizer console
│  └─ mobile/                 # Expo app: organizer + gate scanner
├─ packages/
│  ├─ db/                     # Drizzle schema + migrations + seed
│  ├─ schemas/                # zod schemas (shared)
│  ├─ api-client/             # generated typed client
│  ├─ crypto/                 # QR payload sign/verify (isomorphic, works in RN)
│  ├─ messaging/              # WhatsApp + SMS provider adapters
│  ├─ payments/               # PaymentProvider adapters
│  ├─ ui-tokens/              # colors, spacing
│  └─ i18n/                   # sw.json, en.json
├─ infra/
│  ├─ docker/                 # Dockerfile.api, Dockerfile.web
│  └─ coolify/                # env templates, deploy notes
└─ .github/workflows/         # ci.yml, build-push.yml, mobile-eas.yml
```

## Engineering conventions (apply to every change)

- TypeScript strict, ESLint + Prettier, `no-explicit-any`.
- Conventional Commits; small PRs; one branch per phase.
- Every external provider behind an interface (`MessagingProvider`, `PaymentProvider`) with a **fake in-memory implementation** for tests and local dev.
- Business logic in service modules, not route handlers.
- Money in integer TZS; times stored UTC; timezone `Africa/Dar_es_Salaam`; currency formatting via `CurrencyText`.
- Tests alongside features; minimum unit tests for crypto, code generation, phone normalisation, pledge math, scan conflict resolution.
- Never log tokens, OTPs, private keys, or full phone numbers.
- Never send attachments/APKs; never ask guests for passwords or OTPs. Landing pages show sender + domain.
- Record non-trivial decisions in `docs/adr/NNN-title.md`.

## When to open which spec file

| Doing | Open |
|---|---|
| Schema / migration change | `schema.md` |
| QR, signing, short codes, print PDF | `qr.md` |
| New endpoint or route change | `api.md` |
| UI work (any screen) | `ui.md` + relevant ADRs |
| CI, Docker, Coolify, env vars | `devops.md` |
| Feature flow / behaviour | `flows.md` |
| New phase or acceptance check | `phases.md` |
| Scope / roles / product questions | `product.md` |
| Rate-limit, auth, PDPA, performance | `security.md` |
