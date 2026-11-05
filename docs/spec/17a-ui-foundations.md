## 17. UI/UX specification

### 17.1 Principles

1. **Swahili-first**, English one tap away (language chip in every header/footer).
2. **Thumb-first, one-handed.** Baseline viewport **360×640**. Primary action in the bottom third. Touch targets ≥ **48 dp**.
3. **Slow or no data is normal.** Skeletons not blocking spinners; cached last-known data always shown; every network action has an offline/queued state.
4. **Trust is visible.** Sender name, domain and committee phone on every guest-facing screen (P1, P7).
5. **Gate screen is readable at arm's length, in sun and at night.** Result colour fills the screen; text ≥ 32 sp.
6. **Max 3 taps** from app launch to the primary action of each role (organizer: send; gate: scan; guest: RSVP).
7. **No dark patterns, no ads, no upsell inside guest flows.**

### 17.2 Design tokens (`packages/ui-tokens`, consumed by Tailwind and NativeWind)

| Token | Light | Dark (mobile app only) |
|---|---|---|
| `bg` | `#FBF8F3` (warm ivory) | `#121413` |
| `surface` | `#FFFFFF` | `#1C1F1D` |
| `ink` | `#1B1B1F` | `#F2EFE9` |
| `muted` | `#5F6368` | `#A7ADA9` |
| `primary` (emerald) | `#0F5C4D` | `#4CC2A6` |
| `on-primary` | `#FFFFFF` | `#08241D` |
| `accent` (gold) | `#B8893B` | `#D9B26A` |
| `border` | `#E6DFD3` | `#2C312E` |
| `success` | `#1E7D3A` | `#5BD17F` |
| `warning` | `#B26A00` | `#F0B34A` |
| `danger` | `#B3261E` | `#FF8A80` |
| `info` | `#0B63B6` | `#7DB8F5` |

- **Gate result fills:** ADMIT `#075E20`, DUPLICATE `#7A4A00`, DENY `#8C1D17`, text white. Contrast ≥ 7:1 (the earlier `#0B7A2B` / `#B26A00` / `#B3261E` measured only 4.2–6.5:1; see `docs/adr/006-token-contrast.md` and `docs/adr/022-phase5-gate-scanner.md`). Never rely on colour alone: each state also has an icon and a word.
- **Event theming:** `events.brand_theme` may override only `primary`, `accent` and a decorative pattern on the **guest card**, from 4 preset themes (Emerald & Gold default, Navy & Silver, Terracotta, Rose & Sage) plus an optional cover photo. The QR block is always black on white regardless of theme. Reject themes failing 4.5:1 text contrast.
- **Type:** body uses the system font stack (no webfont for body, for speed). One optional display serif (e.g. Cormorant Garamond), subsetted woff2 ≤ 30 KB, `font-display: swap`, used only for couple names/headings on the guest card and print card. Scale: 14 / 16 (body, inputs never below 16) / 20 / 24 / 28 / 36 (display). Gate name: 36 bold.
- **Spacing:** 4-pt grid (4, 8, 12, 16, 24, 32, 48). Radius: 12 cards, 8 inputs, 999 pills. Elevation: borders over shadows.
- **Icons:** Lucide (`lucide-react`, `lucide-react-native`), 24 px, 2 px stroke.

### 17.3 Navigation architecture (Expo Router)

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

