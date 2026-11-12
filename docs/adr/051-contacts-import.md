# ADR 051: Importing guests from phone, Google and iPhone contacts

Status: accepted. Parser, web console sheet and import page, mobile import screen and tests are built.
Google Contacts on the web needs an OAuth client (below) before it shows.

## Context

Organizers keep their guest list in their phone's address book. Typing or pasting hundreds of names is the
slowest step of onboarding (§7.1 already lists a contacts picker). Contacts are personal data of people who
never agreed to anything with us (Tanzania PDPA, §9), so the import must read as little as possible, keep
nothing the organizer did not pick, and never hold a long-lived credential to someone's address book.

## Decision

1. **Mobile app (Android and iPhone): the phone's own address book** via `expo-contacts`. This covers
   Google accounts synced to an Android phone and iCloud contacts on an iPhone, with no Google or Apple
   sign-in. The import screen gains a source "Anwani za simu" next to "Bandika orodha". We ask for read
   permission only when the organizer taps _Soma anwani_, request only the `name` and `phoneNumbers`
   fields, and show a searchable list with **nobody preselected**. Picked people go through the usual
   preview (validation, duplicates against the event) and nothing is sent until _Thibitisha_.
   - Android: `READ_CONTACTS` only. `WRITE_CONTACTS`, which the library's plugin adds, is removed with
     `android.blockedPermissions`.
   - iPhone: the permission text says what is read and that nothing leaves the phone until confirmed.
     iOS 18 "limited access" is supported (banner plus `presentAccessPickerAsync` to allow more).
   - Denied permission shows the §17.10 state: open settings (or ask again) plus the paste fallback.
2. **Web console: three sources in the contacts sheet**, all read in the browser:
   - _This phone's contacts_: the Contact Picker API, where the browser has it (Android Chrome). The
     person already chose in the system picker, so those are preselected.
   - _Google Contacts_: Google Identity Services token flow, scope `contacts.readonly` only, consent
     prompt every time. The browser calls the People API (`personFields=names,phoneNumbers`) directly,
     then revokes the token. The token never reaches our servers, is never stored, and is not refreshable.
   - _Contacts file_: a vCard (`.vcf`, versions 2.1, 3.0 and 4.0) or a Google Contacts CSV. This is the
     iPhone/iCloud path on a computer (icloud.com → Export vCard), since Apple has no web contacts API.
     The import page's file upload accepts the same files and feeds them into the preview.
     The old sample list now shows only in mock mode; production never shows made-up contacts.
3. **One parser** in `@harusi/schemas` (`contacts.ts`): `parseVCard`, `fromGoogleContactsCsv`,
   `pickPhone` (a mobile-labelled number first) and `cleanContacts` (drops nameless entries and repeated
   numbers, caps at 5,000). Photos, addresses, notes and every other vCard property are skipped while
   parsing, not kept. Files over 5 MB are refused before reading.
4. **No API change.** Imports use `POST /v1/events/:id/guests/import` as before, so the server-side
   validation, dedupe, idempotency and quota apply unchanged. The address book itself never reaches the
   API, logs or Sentry, and the web sheet forgets it when closed.
5. **Configuration:** `GOOGLE_CONTACTS_CLIENT_ID` on the `web` service, read at runtime by
   `GET /app/contacts-config` (images are built once for all environments). Empty hides the Google option.
   The value must look like `….apps.googleusercontent.com`.

## Setting up Google Contacts

1. In the Google Cloud console of the Firebase project, enable the **People API**.
2. OAuth consent screen: app name Kadi Sasa, support email, privacy policy `https://kadisasa.com/privacy`,
   authorised domain `kadisasa.com`, scope `.../auth/contacts.readonly`.
3. Credentials → OAuth client ID → _Web application_. Authorised JavaScript origins:
   `https://app.kadisasa.com`, the staging console origin, and `http://localhost:3000` for development.
   No redirect URIs (the token flow uses a popup).
4. Put the client ID in `GOOGLE_CONTACTS_CLIENT_ID` and restart the `web` service.
5. `contacts.readonly` is a sensitive scope: until Google verifies the app, only test users listed on the
   consent screen can use it and they see an "unverified app" warning. Submit for verification before
   launch; the privacy policy already carries the Limited Use statement Google requires (§3.2).

## Consequences

- iPhone users on the web use a vCard export; in the Android app and on an iPhone with the app, they pick
  directly from the phone.
- The mobile app now has a contacts permission. It is asked for only on use, and the app works fully
  without it.
- Google verification is an external dependency with its own timeline; the feature degrades to the file
  path without it.
- A new Expo native module means the next Android build must be an EAS build, not an OTA update.
