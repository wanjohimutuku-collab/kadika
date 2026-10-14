# 013 — Phase 1: core API and QR crypto decisions

Status: accepted

## On-card ids use the _tail_ of the UUID (deviation from §6.1 wording)

§6.1 says the QR carries `eventId8` and `guestId8`. All ids are UUIDv7 (§5), whose first 48 bits are a millisecond timestamp: the first 8 hex characters are identical for everything created within about a minute, so a whole imported guest list would share one on-card id. The QR therefore carries the **last 8 hex characters** (the random part) of each UUID (`shortId()` in `@harusi/crypto`, `guests.guest_short`). The signature still covers the **full** ids, so a prefix collision can never be exploited; a unique index `(event_id, guest_short)` prevents duplicates within an event and creation retries on the (≈ 1-in-4-billion per pair) collision. The mock QR payload in `api-client` uses the same rule.

## Crypto package

- `@noble/ed25519` v2 with `@noble/hashes` for SHA-512 (sync API; works in Node, browsers and React Native). Message signed: `v1|eventId|guestId|partySize|version` (full ids).
- Verification order is shape → event → signature → guest → revocation, so forged tokens never reveal whether a guest exists; an unknown guest and a forgery both return `bad_signature`.
- The signed party size is the guest's **allowed** maximum (RSVP changes never need a new signature); `version` bumps on reissue and old QRs fail as `revoked` once the gate bundle carries the new version.
- Guest card tokens: 128-bit random (base64url, 22 chars); only the SHA-256 hash is stored; comparison is constant-time.
- Event private keys are encrypted at rest with AES-256-GCM (`KEY_ENC_SECRET`, 32 bytes base64) in `apps/api/src/crypto-at-rest.ts`.

## API (Hono + zod, `/v1`)

Implemented now: `POST auth/otp/request|verify`, `auth/refresh`, `auth/logout`, `GET/PATCH me`, events (list/create/get/patch + `public-key`), members (list/invite/remove), guests (list/create/get/patch/delete, `import` with `dryRun`, `reissue`, `qr`). Everything else in §8 arrives with its phase.

- **Auth**: phone + OTP; access JWT (HS256, 15 min) + rotating opaque refresh token (30 days, hashed in `refresh_tokens`). Reuse of a spent refresh token revokes the user's whole token family. OTP: 6 digits, stored hashed, 5 min TTL, single use, 30 s resend, 5 requests/hour, 5 wrong tries → 10 min lock. The OTP store is in-memory (one API instance); it moves to Redis with the other rate limits in Phase 7.
- **Email + password login** (§3) is not built: phone-first is the Tanzania flow and §1 names no email user.
- **Suspended users** are refused at login, refresh and on every request.
- **Roles**: owner / committee / gate per event. Non-members get 404 (not 403) so event ids cannot be probed. Gate agents cannot manage guests.
- **Invitations**: new table `event_invites`; an invite to an existing user becomes a membership immediately, otherwise it is accepted at that phone's first login (the gap found in ADR 012).
- **Import** reuses the parsing/dedupe domain code from `@harusi/api-client` (same behaviour as the web preview); moving it into `@harusi/schemas` is a worthwhile cleanup.
- **Errors** use the §8 shape; internal errors never log tokens, OTPs, keys or full phone numbers.
- `DEV_LOG_OTP=1` prints the OTP SMS to the API log in non-production only (§12 otherwise forbids logging OTPs).
- No SMS gateway yet: `FakeMessagingProvider` (Phase 3 adds Beem/Africa's Talking/NextSMS adapters).

## Database changes (migrations 0001–0002)

`users`: `staff_role`, `status`, `suspended_reason`, `last_login_at`; `guests.guest_short` (backfilled); new `refresh_tokens` and `event_invites` tables. `Db` is now a driver-agnostic Drizzle type so tests run real SQL on PGlite (in-process Postgres) without Docker; migrations were also applied to the compose Postgres.

## Pagination and idempotency (§8)

- `GET /v1/events/:id/guests` is cursor-paginated (`limit` 1–200, default 50, opaque `cursor`, `nextCursor`), ordered by name then id, so inserts between pages never skip or repeat a guest. Status filtering happens in SQL.
- `Idempotency-Key` (8–128 chars, per user) on guest create, import and reissue: the first 2xx response is stored in `idempotency_keys` and replayed with `Idempotent-Replayed: true`. One-time secrets (the card token) are never stored, so a replay returns the guest without it. The same key on a different method/path is a 409.

## Public guest card API (Phase 2 backend)

- `GET /v1/c/:token` (no login) returns the card: event essentials, the guest's own name/party/short code, a **freshly signed QR payload**, RSVP state, `rsvpOpen` and `eventPassed`. It never returns phones, other guests, the token hash or any key. Opening a card moves the invitation to `opened` (never backwards).
- `POST /v1/c/:token/rsvp` `{ attending, partySize }` is naturally idempotent: repeating an answer changes nothing, a changed answer replaces the old one, the party size is capped at the guest's allowed maximum. Closed after the RSVP deadline (+1 day grace) or 12 h after the wedding start (`409 rsvp_closed`), and for archived events.
- A reissue moves the old token hash to `retired_card_tokens`, so the old link answers `reissued` (GET) / `409 reissued` (RSVP) instead of looking invalid. Unknown tokens answer `invalid` / `404`. Deleted guests' cards read as invalid.
- Both endpoints are rate-limited per client IP and per token prefix (reads 120/min, RSVP 20/min). The limiter is in-memory; it moves to Redis in Phase 7.
- Not in this slice: pay (`/c/:token/pay`), short-link resolution (`/s/:code`, needs an opaque per-guest slug, ADR 007), calendar/OG data, and the opened/RSVP event fan-out to the dashboard activity feed.

## Not yet in Phase 1

Pagination on other list endpoints (events, members), idempotency on the send/pay/sync endpoints (built with their phases), OpenAPI generation (`@hono/zod-openapi`) and the generated client, Better Auth (replaced here by a small purpose-built phone-OTP flow), per-IP rate limiting, audit-log writes for admin actions, and the guest-card/RSVP/pay endpoints (Phase 2). The web app's `HttpRepository` is wired to what exists (tests run it against the real routes and SQL in `apps/api/src/http-repository.test.ts`).
