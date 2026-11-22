# Turn on reCAPTCHA Enterprise for phone sign-in

Removes the "select all images with crosswalks" challenge from web sign-in (ADR 060). Run it from a
machine where `gcloud` is signed in as an owner/editor of the Firebase project. The commands are
PowerShell.

**Shortcut:** `infra/ops/recaptcha-phone-enforcement.ps1` does steps 1–4 in one go. It signs in to
gcloud if needed, enables the API, sets the state and reads it back:

```powershell
.\infra\ops\recaptcha-phone-enforcement.ps1 -ReadOnly          # show the current setting
.\infra\ops\recaptcha-phone-enforcement.ps1                    # AUDIT
.\infra\ops\recaptcha-phone-enforcement.ps1 -State ENFORCE     # after the Android check
.\infra\ops\recaptcha-phone-enforcement.ps1 -State OFF         # roll back
```

Production (`kadisasa-1adb3`) was switched to **AUDIT** on 22 Nov 2026.

`$P` is the Firebase project id: the `projectId` that `GET /v1/auth/config` returns, also shown in
Firebase console → Project settings.

```powershell
$P = "your-firebase-project-id"
gcloud config set project $P
```

## 1. Enable the reCAPTCHA Enterprise API

```powershell
gcloud services enable recaptchaenterprise.googleapis.com --project $P
```

## 2. Read the current setting

```powershell
$h = @{ Authorization = "Bearer $(gcloud auth print-access-token)"; "X-Goog-User-Project" = $P }
(Invoke-RestMethod -Headers $h "https://identitytoolkit.googleapis.com/admin/v2/projects/$P/config").recaptchaConfig
```

An empty result or `phoneEnforcementState: OFF` means invisible v2, the cause of the image challenges.

## 3. Switch to AUDIT

```powershell
$body = '{"recaptchaConfig":{"phoneEnforcementState":"AUDIT","useSmsTollFraudProtection":true}}'
Invoke-RestMethod -Method Patch -Headers $h -ContentType "application/json" -Body $body `
  "https://identitytoolkit.googleapis.com/admin/v2/projects/$P/config?updateMask=recaptchaConfig.phoneEnforcementState,recaptchaConfig.useSmsTollFraudProtection"
```

Then check all three:

- **Web:** sign in at `app.kadisasa.com/login` from a phone on mobile data. You should get no puzzle,
  and a "protected by reCAPTCHA" badge.
- **Android app:** sign in with a test number and with a real one.
- **Google Cloud console → Security → reCAPTCHA:** the Firebase key shows assessments and a score
  distribution.

## 4. Switch to ENFORCE (no puzzle ever)

Only after the Android app has been confirmed to sign in under AUDIT:

```powershell
$body = '{"recaptchaConfig":{"phoneEnforcementState":"ENFORCE","useSmsTollFraudProtection":true}}'
Invoke-RestMethod -Method Patch -Headers $h -ContentType "application/json" -Body $body `
  "https://identitytoolkit.googleapis.com/admin/v2/projects/$P/config?updateMask=recaptchaConfig.phoneEnforcementState,recaptchaConfig.useSmsTollFraudProtection"
```

Refused attempts show the "couldn't confirm this sign-in" message (`auth.signInBlocked`).

## Roll back

Run step 3 again (AUDIT), or set `"phoneEnforcementState":"OFF"` to go back to invisible v2. It takes
effect within a few minutes. No deploy is needed.
