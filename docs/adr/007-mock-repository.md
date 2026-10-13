# 007 — UI on a mock Repository until the API exists

Status: accepted

## Decision

- `packages/api-client` defines `Repository` — one method per §8 endpoint plus read models the console needs (activity, reports, gate overview). Errors use the §8 shape (`RepositoryError { code, message, details }`).
- `MockRepository` implements it in the browser: in-memory state persisted to `localStorage` (`harusi.mock.v1`), simulated latency 200–600 ms (×4 on "slow"), failure injection (0/10/30 %), offline mode (reads served from local state, writes applied locally and queued; "Sawazisha sasa" flushes the queue), and selectable payment outcomes (success, declined, timeout, duplicate webhook).
- The seed is deterministic for the whole day (anchored to midnight EAT), so the server can render the same guest card the browser will hydrate. The server snapshot is used only for first paint and OG tags; the browser's local state wins.
- `HttpRepository` is a stub that throws `not_implemented`; `apps/web/src/lib/repo.ts` is the only place that chooses between them (`NEXT_PUBLIC_USE_MOCKS`, default on until the API exists).
- Short codes resolve by code alone in the mock (`/s/KH-4826`). The real short-link layer (§10, own short domain) should use an opaque per-guest slug so codes can repeat across events.
- Guest filtering/sorting runs client-side over the full event guest list (≤ a few thousand rows), using the same `applyGuestQuery` the mock uses, so `HttpRepository` can later push filters to the server without UI changes.
- SMS price is an assumption (TZS 25 per segment) until a gateway is chosen (§15.3).
- The mock QR payload is `v1.<event8>.<guest8>.<party>.<ver>.MOCKSIG`, clearly labelled on the card. The signed party size is the guest's **allowed** maximum, so an RSVP change never needs a new signature; a reissue bumps the version.
