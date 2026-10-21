# ADR 040: Staff second factor (authenticator app)

Status: accepted. Built in the API, the HTTP client, the web sign-in and tests.

## Context

CLAUDE.md §17.8 and ADR 012 say staff sign in to `/ops` with a second factor. Only the mock repository
did that (fixed code 654321). On the real API, `verifyOtp` gave staff (`users.role_global = admin`) an
access token and a 30-day refresh token after the SMS code alone. Staff can read every customer, reveal
phone numbers and change SMS, WhatsApp and payment settings, so one SIM swap or one intercepted SMS was
enough to reach all of it. The October 2026 security review rated this High (finding H-01).

## Decision

- **Factor: TOTP (RFC 6238)** in an authenticator app: HMAC-SHA1, 30-second steps, 6 digits, one step
  of clock drift either way (`apps/api/src/auth/totp.ts`, tested against the RFC vectors). Every
  authenticator supports these settings, it works without data on the phone, and it does not depend on
  the SMS network the first factor already uses. A code is accepted once: the last good step is stored
  and older or equal steps are refused.
- **Storage**: `users.staff_totp_secret` holds the 20-byte secret in base32, encrypted with AES-GCM under
  `KEY_ENC_SECRET` (`crypto-at-rest.ts`, like the provider settings). `staff_totp_enrolled_at` is set
  when the first code is confirmed. Wrong tries and the lock time are columns too
  (`staff_totp_failed_attempts`, `staff_totp_locked_until`), so a lockout survives restarts, applies on
  every API instance, and is not reset by asking for a new SMS code. Migration 0021.
- **Two-step sign-in**: for staff, `POST /v1/auth/otp/verify` returns
  `{ secondFactor: { challenge, enrolled, expiresAt }, user }` and no tokens. The challenge is a JWT
  with `typ: staff_2fa` that lasts 5 minutes. `verifyAccessToken` refuses any token with a `typ`, so it
  cannot be used as an access token (gate tokens were already refused because they have no subject).
- **Endpoints** (no access token; the challenge goes in the body, like the refresh token):
  - `POST /v1/auth/staff/totp/enrol { challenge }` → `{ secret, otpauthUrl }` while no authenticator is
    confirmed; each call replaces the pending secret. After enrolment it answers 409.
  - `POST /v1/auth/staff/totp/verify { challenge, code }` → the normal `{ accessToken, refreshToken,
user }`. The first good code also completes enrolment.
  - Both are limited to 10 requests a minute per client. Five wrong codes lock the account's second
    factor for 15 minutes (423 `locked` with `until`), as the SMS code does; `staff.totp_locked` and
    `staff.totp_enrolled` go to the audit log.
- **`mfa` claim**: access tokens issued after the second factor carry `mfa: true`, and the refresh
  token row records `mfa`. Refreshing keeps the claim. A staff account can only be refreshed from an
  `mfa` row, so customer sessions from before someone was made staff, and every staff session from
  before this change, end at their next refresh and must sign in again.
- **Enforcement**: `requireStaff` and `requireSettingsAdmin` take a `StaffCaller { userId, mfa }` and
  refuse staff without `mfa` with 403 `second_factor_required` (non-staff still get `Staff only`). A
  middleware on `/v1/ops/*` runs `requireStaff` before any route reads its input, so a missing second
  factor is refused the same way on every route; the services repeat the check with the exact level.
  A test walks every registered `/v1/ops` route with a token that lacks the claim.
- **Enrolment happens at the first staff sign-in**: the second-factor step of `/login` (on the way to
  `/ops`) shows the QR code (the `otpauth://` link, drawn with the same black-on-white `QrBlock` as
  cards) and the key in groups of four for typing in, then asks for the first code. It has to come before
  `/ops` itself, because `/ops` needs the second factor. The issuer shown in the app is the business
  name from branding (ADR 036).
- **Client**: `HttpRepository.verifyOtp` keeps the challenge in memory (never in storage) and returns a
  session with `needsSecondFactor` and `secondFactorEnrolled`; `startStaffEnrolment` and
  `verifyStaffSecondFactor` call the endpoints above. The mock keeps code 654321 and treats demo staff
  as enrolled.
- **Recovery**: `pnpm --filter @harusi/db make-staff <phone> reset-2fa` clears the authenticator and
  ends that person's sessions; they set up a new one at their next sign-in. `remove` clears it too.

## Consequences and limits

- First enrolment is trust-on-first-use: whoever holds the staff phone's SMS code when the account
  first signs in as staff sets up the authenticator. Make someone staff only when they are about to sign
  in, and use `reset-2fa` if a phone is lost. An admin-only reset screen in `/ops` is not built.
- The mobile app has no second-factor step; staff accounts cannot sign in there (they get no tokens).
  Staff use the web console.
- No backup codes yet; recovery is `reset-2fa` by someone with database access.
- The per-client limit uses the shared rate store (Redis when configured); the lockout is per account
  in Postgres.
