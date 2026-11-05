## 12. Engineering conventions

- TypeScript strict, ESLint + Prettier, `no-explicit-any`.
- Conventional Commits; small PRs; one branch per phase.
- Every external provider behind an interface (`MessagingProvider`, `PaymentProvider`) with a **fake in-memory implementation** for tests and local dev.
- Business logic in service modules, not route handlers.
- Money in integer TZS; times stored UTC.
- Tests alongside features; minimum unit tests for crypto, code generation, phone normalisation, pledge math, scan conflict resolution.
- Never log tokens, OTPs, private keys, or full phone numbers.
- Record decisions in `docs/adr/NNN-title.md`.

---

