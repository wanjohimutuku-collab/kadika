# Gate scanner: device test runbook (Phase 5 acceptance)

Everything here was run once on a Galaxy A17 except the items marked OPEN. Repeat it on each release candidate.

## Setup (10 minutes)

1. Start the API without Docker: `cd apps/api && npx tsx src/dev-pglite.ts` (OTP codes print in its log).
2. Seed an event with 3+ guests and create a gate link: owner signs in, imports guests, Team → *Tengeneza kiungo cha lango* (the PIN shows once).
3. Start the app on the LAN: `cd apps/mobile && EXPO_PUBLIC_API_URL=http://<mac-ip>:3001 npx expo start --port 8082`. The phone needs Expo Go for **SDK 53** (the version in the Play Store may be newer; install `Expo-Go-2.33.22.apk` from github.com/expo/expo-go-releases).
4. Open `exp://<mac-ip>:8082/--/gate-join/<CODE>` on the phone, enter the PIN, allow the camera.
5. Show a guest's QR full-screen on a laptop (any QR library with error correction M and a 4-module quiet zone).

## Checks

| # | Check | Pass when | Status |
|---|---|---|---|
| 1 | Scan a valid QR | green KARIBU NDANI, name, party, one vibration and a rising two-tone | done |
| 2 | Scan it again | amber TAYARI AMEINGIA with the time and gate of the first scan, single beep, no override button for a gate agent | done |
| 3 | Scan a tampered QR (flip one character) and another wedding's QR | red KADI SI HALALI with the right reason, long low buzz | OPEN on device (engine-tested) |
| 4 | Typed card number and name / last-4 search | admits as manual; unknown number is denied | done |
| 5 | Airplane mode or `kill -STOP` the API, scan, restore | scan accepted offline, header shows pending, syncs after restore | done |
| 6 | Force-stop the app and reopen it with no network | opens straight into the gate with the saved list and admissions | done |
| 7 | Torch button | the camera LED lights, and turns off on the second press | OPEN (toggled; LED not observed) |
| 8 | Camera permission denied | explanation screen, "Fungua mipangilio", typed number and search still work | done in Expo Go emulator; OPEN with *Don't ask again* on a phone |
| 9 | Two phones, same guest, both offline | after both sync: one admit and one duplicate, earliest `scanned_at` wins, the loser's next scan shows who was first | OPEN with two phones (done with phone + scripted device) |
| 10 | Timing: open `/dev/gate-selftest` with `EXPO_PUBLIC_GATE_SELFTEST=1 npx expo start --no-dev --minify` | 200 scans correct; "verify only" and "one SQLite insert" lines readable; scan ≤ 100 ms | 74–76 ms per scan twice; verify ≈ 60 ms vs SQLite insert ≈ 7 ms; one cold run took 790 ms per scan, so re-measure warm: PARTLY done |

## Reading results

- Server side: `GET /v1/events/:id/gate/admitted` with a gate token lists each guest's winning admission and device.
- Phone side: `adb logcat -d | grep GATE_SELFTEST`, and `adb shell dumpsys vibrator_manager` / `dumpsys audio` for vibration and sound events from `host.exp.exponent`.
- `adb shell pm clear host.exp.exponent` wipes the saved gate session and camera permission (a clean first run).
