# Harusi Pass (Kadi Sasa)

Tanzanian wedding invitation, RSVP, contribution (michango) and gate check-in platform. Mobile-first, offline-capable, Swahili-first. pnpm + Turborepo monorepo: Hono API `apps/api`, Next.js `apps/web`, Expo `apps/mobile`, shared code in `packages/`.

**The spec lives in `docs/spec/` ([index](docs/spec/README.md)). Read the relevant section before building; build UI from §17, not guesswork.** `CLAUDE.md §N` anywhere in the repo means section N there. Do not `@`-import spec files here: imports load every session.

## Commands

- Run scripts with `corepack pnpm -r <script>` (typecheck, lint, test, build). Turbo has hung on Windows through a corepack shim.
- Prettier: format only files you changed; whole-folder runs on Windows rewrite line endings.

## Hard rules

- TypeScript strict, no `any`. zod-validate every API input. Business logic in services, not route handlers.
- Money is integer TZS; times stored UTC. Every external provider sits behind an interface with a fake.
- Never log tokens, OTPs, private keys or full phone numbers. Private signing keys never leave the server. Never ask guests for passwords or OTPs.
- QR: black on white, error correction M, quiet zone ≥ 4 modules, ≥ 25 mm printed (§6.4).
- Conventional Commits, small PRs. Record decisions in `docs/adr/NNN-title.md`.

## Where to look

| Task | Read |
|---|---|
| API, data | §5, §8, `apps/api`, `packages/db`, `packages/schemas` |
| Guest card | §7.3, §17.6 (`17b`) |
| Organizer screens | §17.3 (`17a`), §17.4 (`17b`), §17.10 (`17d`) |
| Web console, ops, SMS product | §17.8 (`17c`) |
| Gate scanner | §6, §7.6, §17.5 (`17b`), `packages/gate` |
| Print cards | §6.4, §17.7 (`17b`) |
| Pledges, payments | §7.5, §9 |
| Deploy, CI | §11, `docs/ops`, `infra/` |
| Strings | §17.11 (`17d`), `packages/i18n/fragments` |
| Why something is so | `docs/adr/` (grep; don't read all), `docs/ui/HANDOFF.md` |
| Design language | `DESIGN.md`, `PRODUCT.md` |

Costly to read: `pnpm-lock.yaml`, `packages/db/drizzle/meta`, `packages/i18n/src/{sw,en}.json`, `packages/api-client/src/mock/mock-repository.ts`, `docs/ui/screenshots`. Grep these instead.
