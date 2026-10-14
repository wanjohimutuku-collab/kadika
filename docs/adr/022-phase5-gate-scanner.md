# 022 — Phase 5 gate scanner (offline-first)

Status: accepted

## What was built

- **Server (`apps/api/src/services/gate.ts`):** gate link + PIN (`gate_links`, scrypt-hashed PIN, 5 wrong tries lock the link for 15 minutes, unknown/revoked/expired links all answer 404), device registration (`gate_devices`), a 24-hour **gate token** scoped to one event and accepted only on that event's `/gate/*` routes, `GET /gate/bundle` (guests with last-four phone digits only, public key, token versions as the revocation list; ETag/304), `GET /gate/admitted`, and `POST /gate/scans/sync` (idempotent by `clientId`, at most 500 per call).
- **Conflict rule:** the device reports what it saw (`reported_result`); the server then orders all admission claims for a guest by `scanned_at` and keeps the earliest as `ok`/`manual_ok`, turning every later one into `duplicate`, whatever order devices sync in. The invitation becomes `checked_in`. A committee/owner override (re-admitting someone already in, with a reason) is stored separately and never reordered; a gate agent's override attempt is recorded as a duplicate.
- **Device engine (`packages/gate`):** offline QR verification with the event public key (shape, event, signature, guest, revocation), lookup by card number, name and last four digits, duplicate detection against the downloaded admissions plus local scans, a sync queue with exponential backoff (5 s doubling to 5 min), bundle refresh by ETag so a reissue kills the old QR, and correction of a device's own record when another device's earlier scan wins. Storage is an interface: `MemoryGateStore` (tests, web preview) and `SqliteGateStore` (phone).
- **App:** scanner screen (viewfinder, torch, typed number, search sheet, full-screen ADMIT/DUPLICATE/DENY result with icon and word, haptics toggle, keep-awake, camera-denied screen with the non-camera fallbacks, sync sheet); the Lango tab for owner/committee/gate members; `gate-join/<code>` for link + PIN agents, who then open straight into a kiosk scanner; the owner creates a link and PIN from the Team screen (PIN shown once).

## Decisions

- **Gate result colours are darkened** to ADMIT `#075E20`, DUPLICATE `#7A4A00`, DENY `#8C1D17` (`gateColorsAaa`), because the §17.2 fills only reach 4.2–6.5:1 and §17.14 asks for AAA. A test asserts ≥ 7:1 with white. CLAUDE.md §17.2 still lists the old values; the spec owner should update it.
- **Search is an in-memory scan of the bundle**, not SQLite FTS (§6.2 mentions FTS). For a few thousand guests it is instant and avoids an FTS dependency; revisit above ~10,000 guests.
- **A typed card number is logged as `manual_ok`** (reason `code`): there is no signature to check, so it is not a verified scan.
- **No sound.** Haptics and a visual result only; audio feedback is not implemented.
- **Gate tokens last 24 hours and are not refreshed.** If one expires mid-event the agent must join again; scans already on the phone are kept and sync after re-joining.
- Revoked and forged cards both log as `invalid_sig` on the server (the enum has no separate value); the device shows the specific reason.

## Verified

API integration tests (real routes, PGlite, real engine): lockout and scoped tokens; 200 mixed scans in airplane mode with correct on-device results, a failing then backed-off sync, zero lost scans, matching server log and idempotent resend; two devices scanning the same guest offline (earliest wins, loser corrected); forged, wrong-event, revoked and unknown cards; override rules; no full phone numbers in the bundle. In the browser (web build, in-memory store, real API): join with a wrong then right PIN, bundle download, typed-number admit, duplicate overlay with the gate label and time, no override button for a gate agent, background sync.

## Not verified

No Android device or emulator: camera scanning, torch, haptics, SQLite persistence across restarts, keep-awake, the 100 ms overlay target, usability with three first-time agents and the 2 GB RAM check are all untested. Multi-device behaviour was tested through the API, not with two physical phones.
