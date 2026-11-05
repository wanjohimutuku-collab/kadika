### 17.9 Component inventory (build once, reuse)

Button (primary/secondary/ghost/danger, loading, disabled), IconButton, TextField (with prefix `+255`, inline error), PhoneField (normalises to E.164), OtpField (6 cells, auto-advance, SMS autofill), Stepper, SegmentedControl, Chip, StatusPill, Avatar (initials), ListRow (swipe actions), Card, KpiTile, ProgressBar, FunnelBar, Timeline, BottomSheet, ConfirmSheet, Toast/Snackbar, Banner (info/warn/offline), EmptyState, Skeleton, Tabs, Header (event switcher, language, sync), QrBlock, ResultOverlay (gate), SearchSheet, FilePicker/ContactPicker, CurrencyText (`TZS 1,200,000`), DateText (Swahili month names, `Africa/Dar_es_Salaam`).

### 17.10 State matrix (every screen implements all)

| State | Behaviour |
|---|---|
| Loading | Skeleton matching final layout, no full-screen spinner |
| Empty | Illustration-free: icon, one sentence, one primary action (e.g. "Hakuna wageni bado · Ingiza orodha") |
| Error | Plain-language message, *Jaribu tena*, error code in small text, never raw stack traces |
| Offline | Persistent slim banner "Hakuna mtandao — mabadiliko yatatumwa baadaye"; writes queue locally; reads from cache |
| Partial failure | Per-item status (e.g. 3 of 120 messages failed) with retry-failed action |
| Permission denied | Explain why + deep-link to settings + a non-camera fallback |
| Destructive | Confirmation sheet naming the object and consequence; undo snackbar where reversible |

### 17.11 Microcopy (Swahili default; have a native speaker review before launch)

| Key | SW | EN |
|---|---|---|
| tab.overview | Muhtasari | Overview |
| tab.guests | Wageni | Guests |
| tab.send | Tuma | Send |
| tab.gate | Lango | Gate |
| tab.pledges | Michango | Pledges |
| rsvp.yes / rsvp.no | Nitahudhuria / Sitahudhuria | I will attend / I can't attend |
| trust.sender | Mwaliko huu umetumwa na {sender} | This invitation was sent by {sender} |
| gate.admit | Karibu ndani | Welcome in |
| gate.duplicate | Tayari ameingia | Already checked in |
| gate.invalid | Kadi si halali | Invalid card |
| offline.banner | Hakuna mtandao — mabadiliko yatatumwa baadaye | No network — changes will sync later |
| sync.pending | Inasubiri kusawazisha ({n}) | Waiting to sync ({n}) |
| perm.camera | Ruhusa ya kamera inahitajika | Camera permission needed |
| guest.add | Ongeza mgeni | Add guest |
| import | Ingiza orodha | Import list |
| search | Tafuta jina au namba | Search name or number |
| pledge | Ahadi | Pledge |
| paid / balance | Imelipwa / Salio | Paid / Balance |
| brightness.hint | Ongeza mwangaza wa skrini kabla ya kuonyesha QR | Raise screen brightness before showing the QR |

Tone: warm, respectful (use "Karibu", "Tafadhali"), no slang, no emoji in system errors. Elders are addressed formally.

### 17.12 Accessibility and inclusivity

- WCAG 2.2 AA minimum; gate result screens AAA contrast. Support system font scaling up to 200% without clipping (use flexible layouts, test at 1.5×).
- Every icon-only control has an accessible label; focus order matches visual order; screen-reader labels on QR block ("Msimbo wa QR wa kuingia; namba KH-4821").
- Colour never the sole signal (icon + text on all statuses).
- Haptics/sound are optional toggles; flashing/strobing effects are forbidden.
- Forms: visible labels (not placeholder-only), numeric keypad for phone/PIN/amount, `autocomplete` and SMS OTP autofill.
- Low-literacy friendliness: short sentences, icons paired with words, consistent placement of primary actions.

### 17.13 Motion

Duration 150–200 ms, ease-out; sheets slide up; list changes fade. Gate overlay appears instantly (≤ 50 ms) with no transition. Respect reduced-motion on web and OS settings on mobile.

### 17.14 UI acceptance criteria (add to the phase "Done when")

- **Phase 2:** guest card matches §17.6 at 360 px and 412 px, passes axe with zero serious issues, all states in §17.10 reachable via a Storybook/test route, trust strip present, QR contrast ≥ 21:1 (black on white) and not dimmed by any theme.
- **Phase 3:** print card PDF matches §17.7; QR and code sizes asserted in tests.
- **Phase 4:** every screen in §17.4 implemented with the §17.10 states; navigation matches §17.3; role-based shell verified for owner, committee, gate; usable at 1.5× font scale on a 360×640 device.
- **Phase 5:** gate screens match §17.5; result overlay appears ≤ 100 ms after a decode; a first-time gate agent can join and scan with no instructions (usability check with 3 people).
- **Phase 7:** Swahili strings reviewed by a native speaker; usability test with at least 5 organizers and 5 guests aged 50+ (Swahili, mid-range Android) with findings logged in `docs/ux/test-report.md`.
