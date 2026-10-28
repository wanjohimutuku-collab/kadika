# ADR 049: Sign-in code settings live in /ops, encrypted, with the environment as fallback

Status: accepted. Built with tests. Follows ADR 048 (Firebase Phone Auth) and the settings pattern of
ADR 031 (SMS/WhatsApp) and ADR 036 (payments).

## Context

ADR 048 put the sign-in switch (`AUTH_OTP_PROVIDER`) and the Firebase web config (`FIREBASE_*`) in
Coolify variables. Changing them meant a redeploy, only people with server access could do it, and
nothing recorded who changed what. The SMS, WhatsApp and payment providers already moved into the
staff panel for the same reasons.

## Decision

1. **/ops → Settings → Sign-in** (admin staff only, after the TOTP second factor, ADR 040): choose who
   sends login codes (our SMS route or Firebase Phone Auth) and enter the Firebase project: project ID,
   web API key, app ID and optional auth domain.
2. **Storage**: one row in `signin_settings`; the Firebase fields are kept as JSON encrypted with
   `KEY_ENC_SECRET` (AES-GCM, `crypto-at-rest`), like the other provider settings. The web API key is
   public by Firebase's design, but it is still treated as a secret here: shown as `…abcd`, never sent
   back to the panel, and an empty field keeps the saved value.
3. **Audit**: every save, reset and test is in the staff audit log (`ops.signin.*`) with the provider
   change and the names of the fields that changed, never their values.
4. **Apply**: a save takes effect at once on the instance that took it, and on every other API
   instance within a minute (the same refresh loop as payments). `GET /v1/auth/config`, the Firebase
   token check and the SMS-code refusal all read the effective settings.
5. **Stage, test, then switch**: the Firebase fields can be saved while codes still go by SMS.
   **Test with Firebase** asks Firebase's own project lookup
   (`identitytoolkit.googleapis.com/v1/projects?key=…`) which project the key belongs to and which
   domains are authorized, and flags any of our web hosts (`CORS_ORIGINS` / `CORS_EXTRA_ORIGINS`) that
   are missing. No SMS is sent.
6. **Fallback and break-glass**: with nothing saved, `AUTH_OTP_PROVIDER` and `FIREBASE_*` still apply
   (first start, local dev, tests). "Back to the server environment" deletes the saved row.
   `AUTH_FORCE_SMS=1` on the API sends codes by SMS whatever is saved, because a broken Firebase setup
   would otherwise also lock staff out of the panel that fixes it.

## Consequences

- The Coolify `FIREBASE_*` and `AUTH_OTP_PROVIDER` variables are optional; they can be removed once the
  settings are saved in /ops.
- Losing `KEY_ENC_SECRET` loses the saved settings (as for every other encrypted setting); the
  environment fallback then applies.
- The Android `google-services.json` cannot move into the panel: it is compiled into the APK
  (ADR 048).
