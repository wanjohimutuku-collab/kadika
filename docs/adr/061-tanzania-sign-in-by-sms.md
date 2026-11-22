# 061 — Tanzanian numbers sign in with our own SMS code (NextSMS)

Status: accepted

## Context

Web sign-in moved to Firebase Phone Auth only (ADR 048, commit 345a4ca). For Tanzania that has gone
badly: Firebase refuses many numbers with a 503 "Error code: 39", throttles them with
`TOO_MANY_ATTEMPTS_TRY_LATER`, and under reCAPTCHA (ADR 060) shows picture puzzles. Tanzania is the
main market, and we already have a working, paid SMS route there: NextSMS (`sms_tz`).

## Decision

- `AUTH_SMS_COUNTRIES` (comma-separated, default `TZ`) lists countries whose numbers get our own
  6-digit code even while Firebase is the sign-in provider. `none` puts every country on Firebase.
- `GET /v1/auth/config` returns them as `smsCountries` next to the Firebase config.
- Web and mobile send a number from those countries to `POST /v1/auth/otp/request` and check it with
  `/v1/auth/otp/verify`; every other number keeps Firebase.
- The API sends those codes straight on the country's SMS route (NextSMS for Tanzania), not on
  WhatsApp first. Other countries keep WhatsApp first with SMS fallback.
- Our own limits still apply: per-number resend and hourly caps, per-IP and global hourly budgets,
  and the per-client lockout after wrong codes.

## Consequences

- Tanzanian sign-in no longer depends on Firebase's SMS delivery, its anti-abuse blocks or reCAPTCHA.
- Every Tanzanian sign-in code is an SMS we pay NextSMS for.
- A Kenyan number typed while Tanzania is selected (0797… read as +255797…) is now sent to NextSMS
  as a Tanzanian number and does not arrive. The visitor has to pick Kenya, as the form asks.
- Kenya and other countries are unchanged (Firebase, ADR 048 and 060).
