### 17.4 Organizer mobile screens (wireframes, 360 dp wide)

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

**Guests (Wageni):** search field (name/phone/code), filter chips (Wote · Hawajatumiwa · Wamethibitisha · Hawajajibu · Wamekataa · Hawana smartphone), list rows: avatar initials, name, group, status pill, channel icon (WhatsApp/SMS/Print). FAB **＋ Ongeza mgeni** with sheet: *Andika mmoja · Ingiza orodha · Kutoka kwenye anwani*. Swipe row: left = tuma tena, right = badilisha. Long-press = multi-select with bottom action bar (Tuma, Chapisha, Futa).

**Guest detail:** header (name, phone, short code with copy button), status timeline (iliyoundwa → imetumwa → imefika → imefunguliwa → imethibitishwa → amefika), party size stepper, channel picker, pledge summary, buttons: *Tuma tena*, *Onyesha QR*, *Toa kadi mpya (reissue)* (confirm sheet), *Pakua kadi ya kuchapisha*.

**Import:** 3-step wizard (Chagua chanzo → Hakiki → Thibitisha). Preview table flags invalid phones (red), duplicates (amber), and shows counts; "Rekebisha" inline edit; nothing is saved until confirmed.

**Send (Tuma):** segmented target (Wote waliobaki · Kikundi · Waliochaguliwa), channel choice cards (WhatsApp, SMS, Chapisha) with per-channel guest counts and estimated SMS cost in TZS, live message preview, **Tuma sasa** (sticky bottom button) → progress screen with per-status counters updating live and a "Tuma tena zilizoshindwa" action.

**Pledges (Michango):** summary header (lengo, kilichokusanywa, salio), list by guest with paid/partial/pending pill, FAB **＋ Rekodi malipo** (guest search → amount → method: M-Pesa/Mixx/Airtel/Cash/Bank → note). Export button.

**Card preview:** carousel of 4 themes, live preview of guest card and print card, toggle for cover photo, "Chapisha PDF" and "Kipimo cha majaribio (test sheet)".

### 17.5 Gate scanner screens (Lango) — offline-first

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
- **DUPLICATE (amber):** ⚠ "TAYARI AMEINGIA", name, "Saa 14:32 · Lango B", two buttons *Sawa* and *Ruhusu kwa sababu…* (committee/owner only).
- **DENY (red):** ✖ "KADI SI HALALI" with reason line (imebadilishwa / si ya harusi hii / saini batili), long buzz, button *Tafuta kwa jina*.
- Scanning is continuous; the next scan is accepted only after the overlay is dismissed (prevents double scans).
- **Manual search sheet:** input with instant local results (name, last 4 digits, code); tap a row → confirmation card with *Ingiza* button (logged as `manual_ok`).
- **Sync indicator:** tap to see queue (n scans waiting, last sync time, "Sawazisha sasa"). Never block scanning on sync.
- **First-run join:** gate link → enter PIN (numeric keypad) → "Inapakua orodha… 320/320" progress → ready. Show "Imekamilika, unaweza kufanya kazi bila mtandao".
- Keep-awake enabled; screen brightness not forced; orientation locked portrait; volume/haptics toggle in a header menu.
- Camera permission denied state: explanatory screen with *Fungua mipangilio* button and the manual-entry fallback still available.

### 17.6 Guest card (web, `/c/<token>`) — mobile-first single column

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
- Pay flow: amount field (prefilled with balance) → phone number → "Thibitisha kwenye simu yako" waiting state with 60 s countdown and *Nimeshalipa* check → success/failure screen. Never ask for PINs or OTPs; show the provider name only.
- No animation by default; a CSS-only fade-in at most. `prefers-reduced-motion` respected.

### 17.7 Print card (PDF) layout

- Formats: **A6 portrait** (default) and **A5**; 3 mm bleed, safe margin 8 mm, CMYK-safe colours, embedded fonts.
- Layout top→bottom: ornament/pattern, couple names (display serif), line "Wanawaalika {guest name}" (personalised), date/time/venue, dress code, RSVP/contact phone, then bottom band with **QR (≥ 25 mm, black on white, quiet zone ≥ 4 modules)** and the short code at ≥ 12 pt beside it.
- Batch PDF: one card per page for print shops, plus a **cut-and-collate sheet** (4× A6 per A4) and a test sheet (§6.4). File name: `{event}-{guest-code}.pdf`.

