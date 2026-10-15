# Gate scanner: first-time usability test (Phase 5 acceptance, §17.14)

**Goal:** a first-time gate agent can join and scan with no instructions. Three people, one at a time, on a mid-range Android phone with the app already installed.

## Before each session

- Fresh install state (`pm clear`), phone on Wi-Fi, volume up, a laptop showing three guests' QR codes (one valid, the same one again, one for another wedding).
- The owner has created a gate link; you hold the link and PIN on paper. Do not explain the app.
- One observer with a stopwatch and this sheet. No coaching; say only "think aloud, and tell me when you think you're done".

## Tasks (read aloud, one at a time)

1. "You are working the gate at a wedding. Open this link and get ready to scan guests." (link opened on the phone, PIN on paper) — _time to first scan screen_
2. "A guest shows you this QR on a screen. Let them in." — _time from camera ready to result_
3. "The same guest comes back. What happens, and what would you tell them?"
4. "This guest's card does not work. Find them another way." (the guest's name is on paper)
5. "The signal is gone. Keep letting guests in." (airplane mode on)

## Record for each participant

| Measure                                                  | P1  | P2  | P3  |
| -------------------------------------------------------- | --- | --- | --- |
| Age, role, Swahili/English used, phone model             |     |     |     |
| Task 1 completed unaided (Y/N), seconds                  |     |     |     |
| Task 2 completed unaided, seconds to result              |     |     |     |
| Task 3: said the guest was already in (Y/N)              |     |     |     |
| Task 4: found the guest by name or number (Y/N), seconds |     |     |     |
| Task 5: understood nothing is lost offline (Y/N)         |     |     |     |
| Hesitations, wrong taps, quotes                          |     |     |     |
| Could read the result in daylight at arm's length (Y/N)  |     |     |     |

## Pass criteria

- All three complete tasks 1–4 without help, and median task 2 is under 8 seconds (§14).
- Nobody mistakes the amber screen for success, or the red screen for a system error.
- Any task needing help becomes a finding in `docs/ux/test-report.md` with a fix before launch.

## After

Write the findings in `docs/ux/test-report.md` (create it), tick the usability item in `docs/TODO.md`, and note the Swahili strings people stumbled on for the native-speaker review.
