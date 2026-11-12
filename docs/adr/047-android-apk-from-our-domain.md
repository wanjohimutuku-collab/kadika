# ADR 047: The Android APK downloads from our own domain

Status: accepted. Built with tests.

## Context

`/programu` (ADR 040) could only link to an APK hosted elsewhere through `ANDROID_APK_URL`. The obvious
free host, a GitHub release, has two problems: hosts see an unfamiliar domain on a file that asks to
be installed (the trust problem in §1 P1/P7), and GitHub downloads are slow from Tanzania (about
12 KB/s measured from Dar es Salaam). Production has no object storage.

## Decision

1. **Admin staff upload the signed APK** in /ops → Settings → Android app, with its version (`1.2.3`).
   The API refuses anything that is not an APK (zip header and an `AndroidManifest.xml` entry), files
   under 1 MB or over 150 MB, and non-admin staff. Each upload and removal is audit-logged with the
   version, size and SHA-256.
2. **Storage** is a persistent volume on the API (`appfiles`, mounted at `/data/app-files`,
   `APP_FILES_DIR`). The file and its details are replaced atomically, so a download in progress never
   mixes two versions. There is one current APK; uploading again replaces it.
3. **Download** is `https://kadisasa.com/programu/kadi-sasa.apk`: a web route that streams the file
   from `GET /v1/app/android.apk`, so people only ever see our address. It is served as
   `application/vnd.android.package-archive`, named `kadi-sasa-<version>.apk`, with an ETag.
4. **/programu** shows the download as soon as an APK is uploaded (within a minute), with the version,
   size and SHA-256 so careful users can check the file. `ANDROID_APK_URL` remains a fallback when
   nothing has been uploaded. No Coolify variable or redeploy is needed for a new version.
5. **Signing.** APKs are signed with the Kadi Sasa release key, kept by the owner outside the
   repository (certificate SHA-256 `77:14:37:3C:EF:5B:E7:A8:FC:EE:53:D8:A2:BF:C5:8A:B7:B3:80:1C:5E:A4:87:F6:E7:81:5E:36:E6:05:F2:2F`).
   Every later APK must be signed with the same key or installed apps will not update.

## Consequences

- The volume holds one file of about 60 MB; backups do not need it (the APK can be rebuilt and
  re-uploaded).
- Downloads go through the web and API containers; at pilot volumes that is fine. A CDN or object
  storage can replace the volume later without changing the public URL.
- A Google Play listing later still uses `ANDROID_PLAY_URL`.
