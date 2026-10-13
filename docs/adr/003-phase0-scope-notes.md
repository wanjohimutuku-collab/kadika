# 003 — Phase 0 scope notes

Status: accepted (Phase 0)

- `/health` is a liveness check only (no DB/Redis probe) so containers don't flap when dependencies restart. A readiness endpoint can follow in Phase 7.
- `build-push.yml` and `mobile-eas.yml` exist as manual-trigger placeholders to match §4; real logic arrives in Phases 7 and 4.
- Dockerfiles were written without a local Docker daemon available; they are untested until first CI/Coolify build.
- `packages/crypto`, `messaging`, `payments` are empty stubs (Phases 1, 3, 6).
- CLAUDE.md gained §17 (UI/UX) after the initial Phase 0 build. Only the parts that touch Phase 0 were applied: `packages/ui-tokens` now holds the §17.2 tokens (light, dark, gate fills, spacing, radius, type scale). Screens, navigation (§17.3) and microcopy (§17.11) are built in Phases 2–5; the Phase 0 shells keep their placeholder pages.
