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

## Not yet in Phase 1

Cursor pagination and idempotency keys on list/send endpoints, OpenAPI generation (`@hono/zod-openapi`) and the generated client, Better Auth (replaced here by a small purpose-built phone-OTP flow), per-IP rate limiting, audit-log writes for admin actions, and wiring the web app's `HttpRepository` to these endpoints.
