# 022 — Phase 5 gate scanner (offline-first)

Status: accepted

## What was built

- **Server (`apps/api/src/services/gate.ts`):** gate link + PIN (`gate_links`, scrypt-hashed PIN, 5 wrong tries lock the link for 15 minutes, unknown/revoked/expired links all answer 404), device registration (`gate_devices`), a **gate token** (valid until its link expires, max 3 days) scoped to one event and accepted only on that event's `/gate/*` routes, `GET /gate/bundle` (guests with last-four phone digits only, public key, token versions as the revocation list; ETag/304), `GET /gate/admitted`, and `POST /gate/scans/sync` (idempotent by `clientId`, at most 500 per call).
- **Conflict rule:** the device reports what it saw (`reported_result`); the server then orders all admission claims for a guest by `scanned_at` and keeps the earliest as `ok`/`manual_ok`, turning every later one into `duplicate`, whatever order devices sync in. The invitation becomes `checked_in`. A committee/owner override (re-admitting someone already in, with a reason) is stored separately and never reordered; a gate agent's override attempt is recorded as a duplicate.
- **Device engine (`packages/gate`):** offline QR verification with the event public key (shape, event, signature, guest, revocation), lookup by card number, name and last four digits, duplicate detection against the downloaded admissions plus local scans, a sync queue with exponential backoff (5 s doubling to 5 min), bundle refresh by ETag so a reissue kills the old QR, and correction of a device's own record when another device's earlier scan wins. Storage is an interface: `MemoryGateStore` (tests, web preview) and `SqliteGateStore` (phone).
- **App:** scanner screen (viewfinder, torch, typed number, search sheet, full-screen ADMIT/DUPLICATE/DENY result with icon and word, haptics toggle, keep-awake, camera-denied screen with the non-camera fallbacks, sync sheet); the Lango tab for owner/committee/gate members; `gate-join/<code>` for link + PIN agents, who then open straight into a kiosk scanner; the owner creates a link and PIN from the Team screen (PIN shown once).

## Decisions

- **Gate result colours are darkened** to ADMIT `#075E20`, DUPLICATE `#7A4A00`, DENY `#8C1D17` (`gateColorsAaa`), because the §17.2 fills only reach 4.2–6.5:1 and §17.14 asks for AAA. A test asserts ≥ 7:1 with white. CLAUDE.md §17.2 still lists the old values; the spec owner should update it.
- **Search is an in-memory scan of the bundle**, not SQLite FTS (§6.2 mentions FTS). For a few thousand guests it is instant and avoids an FTS dependency; revisit above ~10,000 guests.
- **A typed card number is logged as `manual_ok`** (reason `code`): there is no signature to check, so it is not a verified scan.
- **Sound** is generated in code (sine-tone WAVs written to the cache and played with `expo-audio`): rising two-tone for admit, one beep for duplicate, a long low buzz for deny, with a remembered on/off toggle. The generator is unit-tested; playback has not been heard on a device.
- **Gate tokens last until their link expires (event day + 2), capped at 3 days, so they do not expire mid-event.** If one is revoked or expires the agent must join again; scans already on the phone are kept and sync after re-joining.
- Revoked and forged cards both log as `invalid_sig` on the server (the enum has no separate value); the device shows the specific reason.

## Verified

API integration tests (real routes, PGlite, real engine): lockout and scoped tokens; 200 mixed scans in airplane mode with correct on-device results, a failing then backed-off sync, zero lost scans, matching server log and idempotent resend; two devices scanning the same guest offline (earliest wins, loser corrected); forged, wrong-event, revoked and unknown cards; override rules; no full phone numbers in the bundle. In the browser (web build, in-memory store, real API): join with a wrong then right PIN, bundle download, typed-number admit, duplicate overlay with the gate label and time, no override button for a gate agent, background sync.

## Not verified

The Android bundle compiles (`expo export --platform android`), but nothing has run on Android. No Android device or emulator: camera scanning, torch, haptics, SQLite persistence across restarts, keep-awake, the 100 ms overlay target, usability with three first-time agents and the 2 GB RAM check are all untested. Multi-device behaviour was tested through the API, not with two physical phones.

## Found on real devices (and fixed)

- The engine's default `crypto.randomUUID` does not exist in Hermes, so the first scan would have crashed on a phone; the app now passes `expo-crypto`'s.
- On Android (edge-to-edge) the keyboard covered the footer button and the sheets' buttons, so a typed number or PIN could not be submitted; screens and sheets now use `KeyboardAvoidingView`, and Enter submits the typed number.
- Gate API calls had no timeout, so a dead network could hang the sync loop; they now fail after 12 s and back off.
- The dev self-test (`/dev/gate-selftest`, dev builds only) runs 200 scans against the real SQLite store and Hermes crypto; it must not stay in the navigation stack because Fast Refresh reruns it and starves the UI.

## Verified on hardware (Phase 5 sign-off status)

Samsung Galaxy A17 (Android 16) with Expo Go SDK 53 against a dev API on the same Wi-Fi: real camera decode of a signed QR, offline verification, sync, vibration and sound events, SQLite survival across a force-stop, a real network outage (API frozen) with a later cross-device conflict resolved by earliest scan. Still open: two physical phones, a release build on a 2 GB device, the three-person usability test.
