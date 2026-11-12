# ADR 045: Android APK downloads from GitHub Releases, built on EAS

Status: accepted. Needs the `EXPO_TOKEN` secret and the `ANDROID_APK_URL` setting before the button appears.

## Context

`/programu` (ADR 040) shows a download button once `ANDROID_APK_URL` is set, but nothing built the app:
`app.json` was at version 0.0.0 with no icon, `eas.json` pointed at placeholder API hosts, and the EAS
workflow was a stub. Hosts and gate agents need an Android app they can install today, before a Google
Play listing exists. The repository is public, so its release assets are a free, stable download host
on a domain people recognise.

## Decision

1. **App config.** `app.json` gets the version, the launcher icon (`assets/icon.png`, the brand mark on
   ivory `#FBF8F3`), an Android adaptive icon (`assets/adaptive-icon.png`, the mark inside the safe zone
   on the same ivory) and a splash screen in the same colours. Package id and scheme are unchanged
   (ADR 040).
2. **Profiles.** `eas.json` points `preview` at staging and `apk` and `production` at
   `https://api.kadisasa.com`. `apk` builds an installable APK; `production` builds the Play app bundle.
   Both use EAS's remote version code with auto-increment, so every APK installs over the last.
3. **Workflow.** On each `v*.*.*` tag (or by hand with a tag), `mobile-eas.yml` stamps the tag's version
   into `app.json`, links the EAS project, builds the `apk` profile on EAS, and attaches `kadi-sasa.apk`
   to the version's release and to a fixed `android-app` pre-release. The fixed release gives one link
   that never changes, so `ANDROID_APK_URL` is set once. It is a pre-release so it never becomes the
   repository's "Latest".
4. **Never blocks a release.** Without `EXPO_TOKEN` the job leaves a notice and passes. It runs apart
   from `build-push.yml`, so a failed app build never holds back the web and API deploy.
5. **Signing.** EAS generates and keeps the Android keystore. The owner downloads a copy once; losing it
   would stop installed apps from updating.

## Consequences

- One secret and one Coolify setting turn on the download; each release then refreshes the APK.
- Each release spends one EAS build (the free plan has a monthly allowance) and about 15–25 minutes
  of runner time waiting for it; standard runners are free on a public repository.
- Sideloaded installs need "install unknown apps" allowed; `/programu` already says no password, PIN
  or payment is asked to download.
- Not done here: Google Play listing, iOS, and over-the-air updates.
