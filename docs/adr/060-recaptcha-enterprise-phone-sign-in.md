# 060 — reCAPTCHA Enterprise for phone sign-in (no image challenges)

Status: accepted (the project switch is an ops step: `docs/ops/recaptcha-enterprise-phone.md`)

## Context

Web sign-in sends the code through Firebase Phone Auth (ADR 048) with an invisible reCAPTCHA v2
widget. Invisible v2 still shows an image challenge ("select all images with crosswalks") whenever
Google doubts the visitor. That happens often on shared mobile IPs, VPNs and new phones, and the
puzzle drives organisers away at the first step.

Firebase Auth can use **reCAPTCHA Enterprise** for phone sign-in instead. It is score-based: the
visitor never sees a puzzle. The project setting `recaptchaConfig.phoneEnforcementState` controls it:

| State         | Web behaviour                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `OFF` (today) | Invisible v2; image challenge when in doubt.                                                                              |
| `AUDIT`       | Enterprise score first; if that token is missing or rejected, falls back to v2 (a challenge is still possible, but rare). |
| `ENFORCE`     | Enterprise only. Never a challenge; a low-scoring attempt is refused.                                                     |

## Decision

- The web client loads the project's reCAPTCHA config when the sign-in page opens
  (`prepareFirebaseSignIn` → `initializeRecaptchaConfig`). This saves a round trip on "Send code" and
  lets Enterprise see the page before it scores the attempt. When Enterprise is off for the project,
  the call fails harmlessly and the SDK keeps using invisible v2.
- The invisible v2 widget stays in the page: it is the fallback for `OFF` and `AUDIT`.
- An Enterprise refusal (`auth/invalid-app-credential`, `auth/missing-recaptcha-token`, …) is shown
  as its own message (`auth.signInBlocked`: turn off VPN/proxy, try again) instead of the generic
  error.
- Roll out `AUDIT` first, then `ENFORCE` once the Android app is confirmed to still sign in. The
  native app (React Native Firebase) verifies with Play Integrity, and an Android build that cannot
  send an Enterprise token would be refused under `ENFORCE`.
- SMS toll-fraud protection (`useSmsTollFraudProtection`) is switched on with it, as a second guard
  next to our own per-number and per-IP limits (finding 23).

## Consequences

- The fix only lands once the project setting is changed; the code is safe under every state.
- Under `ENFORCE`, a genuine visitor with a very low score is refused rather than challenged. Watch
  the refusal rate in the reCAPTCHA console. Going back to `AUDIT` is a single API call.
- reCAPTCHA Enterprise is billed per assessment beyond its free monthly allowance.
