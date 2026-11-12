# UI/UX specification

## 17.1 Principles

1. **Swahili-first**, English one tap away (language chip in every header/footer).
2. **Thumb-first, one-handed.** Baseline viewport **360×640**. Primary action in the bottom third. Touch targets ≥ **48 dp**.
3. **Slow or no data is normal.** Skeletons not blocking spinners; cached last-known data always shown; every network action has an offline/queued state.
4. **Trust is visible.** Sender name, domain and committee phone on every guest-facing screen (P1, P7).
5. **Gate screen is readable at arm's length, in sun and at night.** Result colour fills the screen; text ≥ 32 sp.
6. **Max 3 taps** from app launch to the primary action of each role (organizer: send; gate: scan; guest: RSVP).
7. **No dark patterns, no ads, no upsell inside guest flows.**

## 17.2 Design tokens (`packages/ui-tokens`, consumed by Tailwind and NativeWind)

| Token               | Light                  | Dark (mobile app only) |
| ------------------- | ---------------------- | ---------------------- |
| `bg`                | `#FBF8F3` (warm ivory) | `#121413`              |
| `surface`           | `#FFFFFF`              | `#1C1F1D`              |
| `ink`               | `#1B1B1F`              | `#F2EFE9`              |
| `muted`             | `#5F6368`              | `#A7ADA9`              |
| `primary` (emerald) | `#0F5C4D`              | `#4CC2A6`              |
| `on-primary`        | `#FFFFFF`              | `#08241D`              |
| `accent` (gold)     | `#B8893B`              | `#D9B26A`              |
| `border`            | `#E6DFD3`              | `#2C312E`              |
| `success`           | `#1E7D3A`              | `#5BD17F`              |
| `warning`           | `#B26A00`              | `#F0B34A`              |
| `danger`            | `#B3261E`              | `#FF8A80`              |
| `info`              | `#0B63B6`              | `#7DB8F5`              |

- **Gate result fills:** ADMIT `#075E20`, DUPLICATE `#7A4A00`, DENY `#8C1D17`, text white. Contrast ≥ 7:1 (the earlier `#0B7A2B` / `#B26A00` / `#B3261E` measured only 4.2–6.5:1; see `docs/adr/006-token-contrast.md` and `docs/adr/022-phase5-gate-scanner.md`). Never rely on colour alone: each state also has an icon and a word.
- **Event theming:** `events.brand_theme` may override only `primary`, `accent` and a decorative pattern on the **guest card**, from 4 preset themes (Emerald & Gold default, Navy & Silver, Terracotta, Rose & Sage) plus an optional cover photo. The QR block is always black on white regardless of theme. Reject themes failing 4.5:1 text contrast.
- **Type:** body uses the system font stack (no webfont for body, for speed). One optional display serif (e.g. Cormorant Garamond), subsetted woff2 ≤ 30 KB, `font-display: swap`, used only for couple names/headings on the guest card and print card. Scale: 14 / 16 (body, inputs never below 16) / 20 / 24 / 28 / 36 (display). Gate name: 36 bold.
- **Spacing:** 4-pt grid (4, 8, 12, 16, 24, 32, 48). Radius: 12 cards, 8 inputs, 999 pills. Elevation: borders over shadows.
- **Icons:** Lucide (`lucide-react`, `lucide-react-native`), 24 px, 2 px stroke.

## 17.3 Navigation architecture (Expo Router)

```
app/
├─ (auth)/ welcome → phone → otp
├─ (app)/
│  ├─ events/index                 # event list + "Harusi mpya"
│  └─ event/[id]/
│     ├─ (tabs)/
│     │  ├─ index        Muhtasari  (Overview)
│     │  ├─ guests       Wageni
│     │  ├─ send         Tuma
│     │  ├─ gate         Lango
│     │  └─ pledges      Michango
│     ├─ guest/[gid]                # detail
│     ├─ guests/import              # paste / CSV / contacts
│     ├─ cards/preview              # card template + print PDF
│     ├─ members                    # invite committee / gate agents
│     └─ settings                   # Mipangilio: event info, theme, language, policy toggles
└─ gate-join/[code]                 # deep link for gate agents (PIN entry)
```

- Bottom tab bar: 5 tabs, icon + label, active = primary colour. Event switcher + language chip + sync indicator in the header.
- **Role-based shell:** `gate` role sees only the Gate screen (kiosk-style, no tab bar). `committee` hides event settings and member management. Financial data hidden from `gate`.
- Android hardware back always works; destructive actions need a confirmation sheet.

## 17.4 Organizer mobile screens (wireframes, 360 dp wide)

**Overview (Muhtasari)**

```
┌────────────────────────────┐
│ ▾ Asha & Juma     SW|EN  ⟳ │  header: event switcher, lang, sync
├────────────────────────────┤
│ 14 Des 2026 · Kibaha  [52d]│  date, venue, countdown pill
│ ┌────────┬────────┬───────┐│
│ │ Waalikwa│Wamethibitisha│Wamefika││ KPI tiles (3)
│ │  320   │  214   │   0   ││
│ └────────┴────────┴───────┘│
│ Funnel: ▓▓▓▓▓▓░░ sent→opened→RSVP │ horizontal funnel bar
│ Michango  TZS 8.4M / 12M   │ progress bar (hidden for gate role)
│ ▸ Hatua inayofuata:        │ "Next step" card (e.g. "Tuma kadi kwa
│   Tuma kadi kwa wageni 40  │  wageni 40 waliobaki")
└────────────────────────────┘
```

**Guests (Wageni):** search field (name/phone/code), filter chips (Wote · Hawajatumiwa · Wamethibitisha · Hawajajibu · Wamekataa · Hawana smartphone), list rows: avatar initials, name, group, status pill, channel icon (WhatsApp/SMS/Print). FAB **＋ Ongeza mgeni** with sheet: _Andika mmoja · Ingiza orodha · Kutoka kwenye anwani_. Swipe row: left = tuma tena, right = badilisha. Long-press = multi-select with bottom action bar (Tuma, Chapisha, Futa).

**Guest detail:** header (name, phone, short code with copy button), status timeline (iliyoundwa → imetumwa → imefika → imefunguliwa → imethibitishwa → amefika), party size stepper, channel picker, pledge summary, buttons: _Tuma tena_, _Onyesha QR_, _Toa kadi mpya (reissue)_ (confirm sheet), _Pakua kadi ya kuchapisha_.

**Import:** 3-step wizard (Chagua chanzo → Hakiki → Thibitisha). Preview table flags invalid phones (red), duplicates (amber), and shows counts; "Rekebisha" inline edit; nothing is saved until confirmed.

**Send (Tuma):** segmented target (Wote waliobaki · Kikundi · Waliochaguliwa), channel choice cards (WhatsApp, SMS, Chapisha) with per-channel guest counts and estimated SMS cost in TZS, live message preview, **Tuma sasa** (sticky bottom button) → progress screen with per-status counters updating live and a "Tuma tena zilizoshindwa" action.

**Pledges (Michango):** summary header (lengo, kilichokusanywa, salio), list by guest with paid/partial/pending pill, FAB **＋ Rekodi malipo** (guest search → amount → method: M-Pesa/Mixx/Airtel/Cash/Bank → note). Export button.

**Card preview:** carousel of 4 themes, live preview of guest card and print card, toggle for cover photo, "Chapisha PDF" and "Kipimo cha majaribio (test sheet)".

## 17.5 Gate scanner screens (Lango) — offline-first

```
┌────────────────────────────┐
│ Lango A · ● Nje ya mtandao │  status: online/offline + pending sync count
│ Wamefika 87 / 214          │
├────────────────────────────┤
│                            │
│     [ camera viewfinder ]  │  centered square frame + corner marks
│        ┌──────────┐        │
│        │          │        │
│        └──────────┘        │
│   🔦 Taa     ⌨ Weka namba   │  torch, manual code entry
├────────────────────────────┤
│ 🔍 Tafuta jina / namba     │  opens search sheet
└────────────────────────────┘
```

**Result overlay (full screen, auto-dismiss after 2.5 s or tap):**

- **ADMIT (green):** ✔ icon, "KARIBU NDANI", guest name (36 bold), "Watu: 2", group, short haptic + rising tone.
- **DUPLICATE (amber):** ⚠ "TAYARI AMEINGIA", name, "Saa 14:32 · Lango B", two buttons _Sawa_ and _Ruhusu kwa sababu…_ (committee/owner only).
- **DENY (red):** ✖ "KADI SI HALALI" with reason line (imebadilishwa / si ya harusi hii / saini batili), long buzz, button _Tafuta kwa jina_.
- Scanning is continuous; the next scan is accepted only after the overlay is dismissed (prevents double scans).
- **Manual search sheet:** input with instant local results (name, last 4 digits, code); tap a row → confirmation card with _Ingiza_ button (logged as `manual_ok`).
- **Sync indicator:** tap to see queue (n scans waiting, last sync time, "Sawazisha sasa"). Never block scanning on sync.
- **First-run join:** gate link → enter PIN (numeric keypad) → "Inapakua orodha… 320/320" progress → ready. Show "Imekamilika, unaweza kufanya kazi bila mtandao".
- Keep-awake enabled; screen brightness not forced; orientation locked portrait; volume/haptics toggle in a header menu.
- Camera permission denied state: explanatory screen with _Fungua mipangilio_ button and the manual-entry fallback still available.

## 17.6 Guest card (web, `/c/<token>`) — mobile-first single column

```
┌────────────────────────────┐
│ [cover photo / pattern]    │  ≤ 40 KB, lazy, blurred placeholder
│    Asha  &  Juma           │  display serif
│    Jumamosi 14 Des 2026    │
│    Saa 10:00 jioni         │
├────────────────────────────┤
│ ✔ Mwaliko huu umetumwa na  │  trust strip: sender, committee phone,
│   Kamati ya Harusi · 07XX… │  domain, [Piga simu]
├────────────────────────────┤
│ 📍 Ukumbi wa Mwanga, Kibaha│
│ [ Fungua ramani ]          │  geo: / maps link
│ 👔 Mavazi: Kijani na dhahabu│
├────────────────────────────┤
│ Je, utahudhuria?           │
│ [ Nitahudhuria ] [Sitahudhuria] │  big buttons; after choice shows
│ Idadi ya watu: [ − 2 + ]   │  party stepper (≤ allowed)
├────────────────────────────┤
│  ┌──────────┐              │
│  │  QR (SVG)│  Namba: KH-4821 │  black on white, ≥ 220 px, white
│  └──────────┘              │  padding ≥ 4 modules
│ Ongeza mwangaza wa skrini  │  brightness hint
│ [Pakua picha] [Ongeza kalenda] │
├────────────────────────────┤
│ Mchango: Ahadi 50,000 · Salio 20,000 │ only if pledges enabled
│ [ Lipa kwa simu ]          │
├────────────────────────────┤
│ SW | EN · Faragha · Kamati │  footer: language, privacy, contact
└────────────────────────────┘
```

- After RSVP: success banner, buttons switch to a compact "Umethibitisha ✔ · Badilisha"; QR section is promoted.
- **Visible states:** loading skeleton, token invalid/expired ("Kiungo hiki si sahihi. Wasiliana na kamati." + phone), card reissued ("Kadi hii imebadilishwa; tumia kiungo kipya"), offline ("Unaona nakala iliyohifadhiwa" banner, QR still shown), event passed (RSVP disabled).
- Pay flow: amount field (prefilled with balance) → phone number → "Thibitisha kwenye simu yako" waiting state with 60 s countdown and _Nimeshalipa_ check → success/failure screen. Never ask for PINs or OTPs; show the provider name only.
- No animation by default; a CSS-only fade-in at most. `prefers-reduced-motion` respected.

## 17.7 Print card (PDF) layout

- Formats: **A6 portrait** (default) and **A5**; 3 mm bleed, safe margin 8 mm, CMYK-safe colours, embedded fonts.
- Layout top→bottom: ornament/pattern, couple names (display serif), line "Wanawaalika {guest name}" (personalised), date/time/venue, dress code, RSVP/contact phone, then bottom band with **QR (≥ 25 mm, black on white, quiet zone ≥ 4 modules)** and the short code at ≥ 12 pt beside it.
- Batch PDF: one card per page for print shops, plus a **cut-and-collate sheet** (4× A6 per A4) and a test sheet (see [qr.md §6.4](qr.md#64-print-spec-enforced-in-pdf-generator)). File name: `{event}-{guest-code}.pdf`.

## 17.8 Web organizer console (`apps/web`, `/app`)

Decided in ADR 005 (answers open decision 6): v1 ships a full responsive organizer console at `/app` — events, create wizard, Muhtasari, Wageni (table/list, import, detail, reissue), Tuma, Kadi (print preview with [qr.md §6.4](qr.md#64-print-spec-enforced-in-pdf-generator) enforcement), Michango, Lango (monitor + manual check-in; camera scanning stays in the Android app), Timu, Ripoti, Mipangilio, Akaunti. Same tokens and microcopy; left nav ≥ 768 px, five bottom tabs below plus a header "Zaidi" sheet (ADR 010). Gate agents have no console access. No feature may exist only in the web console that the mobile app needs.

**SMS reminders only** (ADR 055): a customer can buy bulk SMS without cards (`events.product = 'sms'`, chosen at `/app/events/new/sms`). Their event gets a different console: Muhtasari, Wapokeaji (`/sms/contacts`), Tuma SMS (`/sms/compose`), Historia (`/sms/history`), Vifurushi (SMS packs only) and Mipangilio; card screens redirect away. Staff manage them in the same panel at `/ops/sms` (credits, usage, Add SMS). One reminder credit per SMS part.

Guest-facing web routes: `/c/[token]` (+ `/pay`, `/kumbukumbu`: the couple's photos, ADR 050), `/s/[code]` (SMS short link; `/s/[token]/k` opens Kumbukumbu), `/k` (enter card number). Public: `/`, `/privacy`, `/terms`, `/login`, `/programu` (Android app; ADR 040). Dev only: `/dev/states`. Plan, status and handoff: `docs/ui/PLAN.md`, `docs/ui/HANDOFF.md`; related ADRs 005–011.

**Staff (ops) panel, `/ops`** (ADR 012): Harusi Pass employees only (`users.role_global = 'admin'`). Overview, customers (suspend/reactivate with reason), weddings (mark paid), usage and costs, payments, support lookup (phones masked; revealing one needs a reason and is audited), PDPA data requests, staff audit log, SMS and WhatsApp provider settings (admin staff only; encrypted, secrets masked, env variables as fallback; ADR 031). Staff have three levels (support / billing / admin) and sign in with a second factor. Every staff action touching customer data is audit-logged.

## 17.9 Component inventory (build once, reuse)

Button (primary/secondary/ghost/danger, loading, disabled), IconButton, TextField (with prefix `+255`, inline error), PhoneField (normalises to E.164), OtpField (6 cells, auto-advance, SMS autofill), Stepper, SegmentedControl, Chip, StatusPill, Avatar (initials), ListRow (swipe actions), Card, KpiTile, ProgressBar, FunnelBar, Timeline, BottomSheet, ConfirmSheet, Toast/Snackbar, Banner (info/warn/offline), EmptyState, Skeleton, Tabs, Header (event switcher, language, sync), QrBlock, ResultOverlay (gate), SearchSheet, FilePicker/ContactPicker, CurrencyText (`TZS 1,200,000`), DateText (Swahili month names, `Africa/Dar_es_Salaam`).

## 17.10 State matrix (every screen implements all)

| State             | Behaviour                                                                                                      |
| ----------------- | -------------------------------------------------------------------------------------------------------------- |
| Loading           | Skeleton matching final layout, no full-screen spinner                                                         |
| Empty             | Illustration-free: icon, one sentence, one primary action (e.g. "Hakuna wageni bado · Ingiza orodha")          |
| Error             | Plain-language message, _Jaribu tena_, error code in small text, never raw stack traces                        |
| Offline           | Persistent slim banner "Hakuna mtandao — mabadiliko yatatumwa baadaye"; writes queue locally; reads from cache |
| Partial failure   | Per-item status (e.g. 3 of 120 messages failed) with retry-failed action                                       |
| Permission denied | Explain why + deep-link to settings + a non-camera fallback                                                    |
| Destructive       | Confirmation sheet naming the object and consequence; undo snackbar where reversible                           |

## 17.11 Microcopy (Swahili default; have a native speaker review before launch)

| Key                | SW                                              | EN                                            |
| ------------------ | ----------------------------------------------- | --------------------------------------------- |
| tab.overview       | Muhtasari                                       | Overview                                      |
| tab.guests         | Wageni                                          | Guests                                        |
| tab.send           | Tuma                                            | Send                                          |
| tab.gate           | Lango                                           | Gate                                          |
| tab.pledges        | Michango                                        | Pledges                                       |
| rsvp.yes / rsvp.no | Nitahudhuria / Sitahudhuria                     | I will attend / I can't attend                |
| trust.sender       | Mwaliko huu umetumwa na {sender}                | This invitation was sent by {sender}          |
| gate.admit         | Karibu ndani                                    | Welcome in                                    |
| gate.duplicate     | Tayari ameingia                                 | Already checked in                            |
| gate.invalid       | Kadi si halali                                  | Invalid card                                  |
| offline.banner     | Hakuna mtandao — mabadiliko yatatumwa baadaye   | No network — changes will sync later          |
| sync.pending       | Inasubiri kusawazisha ({n})                     | Waiting to sync ({n})                         |
| perm.camera        | Ruhusa ya kamera inahitajika                    | Camera permission needed                      |
| guest.add          | Ongeza mgeni                                    | Add guest                                     |
| import             | Ingiza orodha                                   | Import list                                   |
| search             | Tafuta jina au namba                            | Search name or number                         |
| pledge             | Ahadi                                           | Pledge                                        |
| paid / balance     | Imelipwa / Salio                                | Paid / Balance                                |
| brightness.hint    | Ongeza mwangaza wa skrini kabla ya kuonyesha QR | Raise screen brightness before showing the QR |

Tone: warm, respectful (use "Karibu", "Tafadhali"), no slang, no emoji in system errors. Elders are addressed formally.

## 17.12 Accessibility and inclusivity

- WCAG 2.2 AA minimum; gate result screens AAA contrast. Support system font scaling up to 200% without clipping (use flexible layouts, test at 1.5×).
- Every icon-only control has an accessible label; focus order matches visual order; screen-reader labels on QR block ("Msimbo wa QR wa kuingia; namba KH-4821").
- Colour never the sole signal (icon + text on all statuses).
- Haptics/sound are optional toggles; flashing/strobing effects are forbidden.
- Forms: visible labels (not placeholder-only), numeric keypad for phone/PIN/amount, `autocomplete` and SMS OTP autofill.
- Low-literacy friendliness: short sentences, icons paired with words, consistent placement of primary actions.

## 17.13 Motion

Duration 150–200 ms, ease-out; sheets slide up; list changes fade. Gate overlay appears instantly (≤ 50 ms) with no transition. Respect reduced-motion on web and OS settings on mobile.

## 17.14 UI acceptance criteria (add to the phase "Done when")

- **Phase 2:** guest card matches §17.6 at 360 px and 412 px, passes axe with zero serious issues, all states in §17.10 reachable via a Storybook/test route, trust strip present, QR contrast ≥ 21:1 (black on white) and not dimmed by any theme.
- **Phase 3:** print card PDF matches §17.7; QR and code sizes asserted in tests.
- **Phase 4:** every screen in §17.4 implemented with the §17.10 states; navigation matches [§17.3](#173-navigation-architecture-expo-router); role-based shell verified for owner, committee, gate; usable at 1.5× font scale on a 360×640 device.
- **Phase 5:** gate screens match §17.5; result overlay appears ≤ 100 ms after a decode; a first-time gate agent can join and scan with no instructions (usability check with 3 people).
- **Phase 7:** Swahili strings reviewed by a native speaker; usability test with at least 5 organizers and 5 guests aged 50+ (Swahili, mid-range Android) with findings logged in `docs/ux/test-report.md`.
