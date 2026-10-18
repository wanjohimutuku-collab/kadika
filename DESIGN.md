---
name: Kadi Sasa
description: Wedding invitations, RSVP, michango and gate check-in that work on any phone, on paper, and offline.
colors:
  primary: '#0F5C4D'
  on-primary: '#FFFFFF'
  accent: '#B8893B'
  pattern: '#B8893B'
  bg: '#FBF8F3'
  surface: '#FFFFFF'
  ink: '#1B1B1F'
  muted: '#5F6368'
  border: '#E6DFD3'
  success: '#1E7D3A'
  warning: '#B26A00'
  danger: '#B3261E'
  info: '#0B63B6'
  gate-admit: '#075E20'
  gate-duplicate: '#7A4A00'
  gate-deny: '#8C1D17'
  qr-ink: '#000000'
  qr-paper: '#FFFFFF'
typography:
  display:
    fontFamily: "Cormorant Garamond, Georgia, Cambria, 'Times New Roman', serif"
    fontSize: '44px'
    fontWeight: 600
    lineHeight: 1.1
  headline:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans', Ubuntu, sans-serif"
    fontSize: '28px'
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans', Ubuntu, sans-serif"
    fontSize: '20px'
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans', Ubuntu, sans-serif"
    fontSize: '16px'
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans', Ubuntu, sans-serif"
    fontSize: '14px'
    fontWeight: 600
    lineHeight: 1.4
  eyebrow:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans', Ubuntu, sans-serif"
    fontSize: '14px'
    fontWeight: 500
    letterSpacing: '0.2em'
  code:
    fontFamily: "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace"
    fontSize: '36px'
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: '0.18em'
  gate-name:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: '36px'
    fontWeight: 700
    lineHeight: 1.1
rounded:
  input: '8px'
  card: '12px'
  sheet: '16px'
  pill: '999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '12px'
  lg: '16px'
  xl: '24px'
  xxl: '32px'
  xxxl: '48px'
components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    typography: '{typography.label}'
    rounded: '{rounded.input}'
    padding: '0 16px'
    height: '48px'
  button-secondary:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.input}'
    padding: '0 16px'
    height: '48px'
  button-ghost:
    textColor: '{colors.primary}'
    rounded: '{rounded.input}'
    padding: '0 16px'
    height: '48px'
  button-danger:
    backgroundColor: '{colors.danger}'
    textColor: '{colors.on-primary}'
    rounded: '{rounded.input}'
    padding: '0 16px'
    height: '48px'
  input:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
    rounded: '{rounded.input}'
    padding: '0 12px'
    height: '48px'
  chip:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.pill}'
    padding: '0 14px'
    height: '40px'
  chip-pressed:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    rounded: '{rounded.pill}'
  card:
    backgroundColor: '{colors.surface}'
    rounded: '{rounded.card}'
    padding: '16px'
  status-pill:
    textColor: '{colors.ink}'
    rounded: '{rounded.pill}'
    padding: '4px 10px'
  qr-block:
    backgroundColor: '{colors.qr-paper}'
    textColor: '{colors.qr-ink}'
    rounded: '{rounded.card}'
    padding: '12px'
  gate-admit:
    backgroundColor: '{colors.gate-admit}'
    textColor: '{colors.on-primary}'
    typography: '{typography.gate-name}'
---

# Design System: Kadi Sasa

## Overview

**Creative North Star: "The Kamati's Ledger"**

Kadi Sasa should look like a wedding committee's well-kept ledger: calm, exact and trustworthy, with every figure in its column. The organiser counts guests and shillings, the gate agent admits a queue, and the guest checks that the invitation is real. None of them need decoration. They need the right number, the right name and the right next step, readable on a cheap Android phone in bright sun. Most of the system is plain tools: warm ivory paper, ink, and one deep emerald that marks where to act.

Ceremony has one home: the guest card and the printed card. There, the couple's names are set in a display serif, an East African-inspired ornament band runs in gold, and the cover takes the event's theme colour. Elsewhere the serif and ornament appear only as previews of that card. The console, the ops panel and the gate are crisp and precise. Edges are bordered and flat, figures are tabular, labels are short, and targets are large enough to hit without looking twice.

This system rejects three looks. It is not a generic SaaS dashboard: no purple gradients, glass cards or decorative charts. It is not a flashy wedding template: no glitter, script fonts, florals or ornamental motion. And it is not a government or bank form: nothing cold or bureaucratic that would intimidate an elder holding a printed card.

**Key Characteristics:**

- Warm ivory ground (`bg`) under white working surfaces, separated by linen borders rather than shadows.
- One action colour (deep emerald). Gold is decoration only and never carries text.
- System sans for everything operational. The display serif is reserved for names on cards.
- Tabular figures wherever money, counts or codes appear.
- Every status is shown with colour, an icon and a word together.
- The QR is always pure black on pure white, whatever the theme.
- Touch targets are 48 px or more, inputs are never below 16 px, and the layout works at 360 px first.

## Colors

The palette is restrained and warm-neutral: ivory, ink and linen carry the page, emerald carries action, gold carries ceremony, and four semantic hues carry state.

### Primary

- **Kamati Emerald** (`primary`): primary buttons, the active nav item, pressed chips, focus rings, links, KPI progress and the guest card cover. On the 1280 px overview it appears only on the active nav row, the "next step" action, the countdown pill and the funnel bars.
- **On Emerald** (`on-primary`): text and icons on emerald fills.

### Secondary

- **Ledger Gold** (`accent`): decorative only. Used for ornament rules, rings, the brightness-hint tint and the default `pattern`. It passes 3:1 against white as a non-text element (ADR 006) and must never carry body text.
- **Ornament Thread** (`pattern`): the tint of the guest card ornament band and print corner marks. Themes change it, and it only needs to be visible (1.5:1).

### Neutral

- **Warm Ivory** (`bg`): page ground on every web surface, footers, field prefixes/suffixes and disabled inputs.
- **Paper White** (`surface`): cards, sheets, inputs, menus and the guest card body.
- **Ledger Ink** (`ink`): all body text. A tint of `ink` at 6–8% gives neutral fills (segmented control track, hover, count badges).
- **Pencil Grey** (`muted`): secondary text, hints, captions and metadata. It meets 4.5:1 on both `bg` and `surface`.
- **Linen Rule** (`border`): every card, input, divider and table rule. This is the main depth device.

### Semantic

- **Paid Green** (`success`), **Pending Amber** (`warning`), **Refusal Red** (`danger`), **Notice Blue** (`info`). Used at full strength for icons and dots, and as soft 8–15% tints behind pills and banners, with `ink` text on top.
- **Gate fills** (`gate-admit`, `gate-duplicate`, `gate-deny`): darkened values that reach 7:1 or better with white text (ADR 006, ADR 022). They fill the whole gate result screen and nothing else uses them.

### Card themes

The guest card and print card may change only `primary`, `on-primary`, `accent` and `pattern`, picked from four presets: Emerald & Gold (default), Navy & Silver (`#1F3A5F` / `#6B7785`), Terracotta (`#9A3B1F` / `#A0662A`) and Rose & Sage (`#8C3B57` / `#5E7A5E`). Full palette overrides are allowed only through `paletteContrastIssues`, which rejects text pairs below 4.5:1.

**The One Ink of Action Rule.** Emerald means "act here or you are here". Don't use it for decoration, headings or large background areas in the console. If everything is emerald, nothing is clickable.

**The Gold Never Speaks Rule.** Gold is never used for text, icons with meaning, or status. It decorates only.

**The Black-on-White QR Rule.** The QR block is `#000000` on `#FFFFFF` in every theme, palette override, dark mode and print. No tint, gradient, logo or pattern goes behind it or inside it.

## Typography

**Display Font:** Cormorant Garamond 600, latin subset, `font-display: swap` (falls back to Georgia, Cambria, Times New Roman)
**Body Font:** the system UI stack (system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu)
**Mono Font:** ui-monospace stack, used for short codes

**Character:** a working sans that loads instantly on 3G, paired with one formal serif kept for the couple's names. The pairing reads like a ledger with an engraved title page.

### Hierarchy

- **Display** (600, 44 px on the guest card cover, 1.1): couple names on the guest card, print card and their console previews. Nowhere else.
- **Headline** (700, 28 px, 1.2): page titles in the console (the event name on Muhtasari) and KPI values at 28 px on desktop (24 px on mobile).
- **Title** (600, 18–20 px, 1.3): card and section headings, the venue name on the guest card.
- **Body** (400, 16 px, 1.5): all running text and every input. Never below 16 px in a form control.
- **Label** (600, 14 px): field labels, button text at small size and tab labels. Captions and hints use the same size in 400 `muted`.
- **Eyebrow** (500, 14 px, 0.2em tracking, uppercase): "HARUSI YA" above the names on the card cover, and menu group labels (12 px) in the console.
- **Code** (mono 700, 36 px, 0.18em tracking): the guest's short code (`KH-4821`) beside the QR. The print card uses 12 pt or more.
- **Gate name** (700, 36 px): the guest's name on the gate result screen.

**The Serif Is for Names Rule.** The display serif sets people's names on cards and nothing else: no console headings, buttons or marketing body text.

**The Tabular Figures Rule.** Money, counts, percentages, countdowns and codes use tabular numerals (`.tabular`) so columns stay aligned.

## Layout

- **Mobile first at 360×640.** The primary action sits in the bottom third. Sticky action bars sit above the five-tab bottom bar on phones.
- **Console:** a fixed 248 px left nav from 768 px up (Harusi Pass/Kadi Sasa wordmark, five core sections, a gap, then four secondary ones, with the language chip at the foot). A 64 px header holds the event switcher, sync state, language chip and account. Below 768 px there are five bottom tabs plus a header "Zaidi" sheet. Content uses a 4-pt grid: KPI tiles in a 4-up row on desktop and 2-up on mobile, then a full-width "next step" card, then two-column cards.
- **Guest card:** a single column at most 32 rem (512 px) wide, full-bleed on phones. From 768 px it becomes a centred bordered sheet (16 px radius) with 24 px top margin. Sections stack and are separated by full-width linen rules.
- **Spacing rhythm:** 4/8/12/16/24/32/48. Cards pad 16 px on mobile and 20 px on desktop. Field stacks use 6 px between label and control and 16–24 px between fields.
- **Density:** the console is comfortable rather than dense. Rows and menu items are at least 48 px tall, which keeps tables thumb-safe and still reads as a ledger.

## Elevation & Depth

The system is flat. Depth comes from tone (ivory ground → white surface) and 1 px linen borders, not shadows. Shadows appear only on things that float above the page because of a state change: dropdown menus, toasts, the bottom sheet, the sticky bulk-action bar, and a hover lift on event cards in the list.

### Shadow Vocabulary

- **Menu float** (`shadow-lg`: `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`): dropdown menus, toasts and the sticky action bar.
- **Sheet float** (`shadow-xl`: `0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`): bottom sheets and the phone frame in card previews.
- **Hover lift** (`shadow-md`): event list cards on hover only.
- **Segment lift** (`shadow-sm`): the selected segment in a segmented control.

**The Flat-at-Rest Rule.** Nothing has a shadow at rest. A shadow means the element is floating above the page because of something the user did.

## Shapes

Gentle, consistent corners: 8 px on anything you type into or press (inputs, buttons, menu rows), 12 px on containers (cards, banners, the QR box), 16 px on the top of sheets and the desktop guest card, and full pills for chips, status pills, the language chip, the countdown and progress bars. Icon buttons are 48 px circles. Borders are 1 px linen. Emphasis containers (the "next step" card, the trust strip) use a 1–2 px border in the primary or success hue instead of a heavier fill. The guest card's one signature shape is the ornament band: an 18 px repeating strip of triangles and dots. It is original and inspired by East African textile borders without copying any specific kanga.

## Components

### Buttons

Crisp, solid and plainly labelled. One primary per view.

- **Shape:** gently rounded (8 px). Height is at least 48 px at every size on phones (`sm` drops to 40 px only on pointer-precise screens). `lg` is 56 px with 18 px text.
- **Primary:** emerald fill, white 600 text, 16 px side padding. Hover darkens to 90% and active to 80%.
- **Secondary:** white with a linen border and ink text. Hover fills ivory.
- **Ghost:** emerald text with no fill. Hover tints emerald at 8%.
- **Danger:** red fill with white text, only for destructive confirmation.
- **Accent (outline):** a 2 px emerald border on white, for the second most important action beside a primary.
- **Loading:** a spinner replaces the icon, the label changes to the loading verb ("Inahifadhi…") and `aria-busy` is set. **Disabled:** 55% opacity with a not-allowed cursor.
- **Focus:** a 3 px emerald outline at a 2 px offset, the same on every focusable element.

### Chips

- **Style:** pill, 40 px tall, linen border, white fill, 14 px 500 text, with an optional tabular count badge.
- **State:** pressed chips fill emerald with white text and the count badge goes white at 20%. Used for filters (Wote · Hawajatumiwa · Wamethibitisha …).

### Status Pills

Soft tint at 6–15% of the tone, ink text, plus a 8 px dot or a 16 px icon. The colour is never the only signal.

### Cards / Containers

- **Corner Style:** 12 px.
- **Background:** white on the ivory ground.
- **Shadow Strategy:** none at rest (see Elevation).
- **Border:** 1 px linen.
- **Internal Padding:** 16 px, or 20 px from 768 px. The header row holds an 18 px title and an optional action.
- **KPI tile:** an icon and 14 px muted label, a tabular 24–28 px bold value, and a 14 px muted sub-line.

### Inputs / Fields

- **Style:** white fill, 1 px linen border, 8 px radius, at least 48 px tall, 16 px text. The label is always visible above (14 px 600) and an optional "(hiari)" marker is muted.
- **Prefix/suffix:** an ivory slab joined to the field (for example `+255`).
- **Focus:** the global 3 px emerald outline.
- **Error / Disabled:** a red border and a red 14 px message linked by `aria-describedby` and announced as an alert. Disabled fields fill ivory with muted text.
- Native `<select>` is used deliberately, as the most reliable control on low-end Android.

### Navigation

- **Desktop:** a left rail of 48 px rows with a 24 px Lucide icon and a 16 px label. The active row gets an emerald-tinted fill and emerald icon and text. Inactive rows are ink and hover in a 6% ink tint.
- **Mobile:** five bottom tabs with icon and label, active in emerald. "Zaidi" opens a sheet for the remaining sections.
- **Tabs:** 48 px with a 2 px emerald underline on the active tab. Inactive tabs are muted.
- **Segmented control:** an ink-6% track. The selected segment is a white lifted pill.

### Banners

Full-width, 12 px radius, a 1 px tinted border and a soft tint fill, with a 20 px tone icon, an optional bold title, 14 px body and an optional trailing action. Tones are info, warning, offline (ink), error and success.

### QR Block (signature)

White paper with a linen border, 12 px radius and 12 px padding. Inside, the QR is black on white at 220 px or more with a quiet zone of at least 4 modules, and the short code in the mono code style sits beside or below it. A gold-tinted pill underneath gives the brightness hint. It has a screen-reader label ("Msimbo wa QR wa kuingia; namba KH-4821").

### Trust Strip (signature)

A success-tinted container with a success border, a 20 px shield-check icon, the sender line in bold, the committee phone, the official domain in muted text, the "we will never ask for a PIN" line, and a full-width secondary _Piga simu_ button. It appears on every guest-facing screen, directly below the cover.

### Gate Result (signature)

The result colour (`gate-admit`, `gate-duplicate`, `gate-deny`) fills the whole screen on the phone app, with white text, a large icon, the uppercase word (KARIBU NDANI / TAYARI AMEINGIA / KADI SI HALALI), the guest name in the gate-name style, and the party size. It appears instantly with no transition. The web console's manual check-in shows a softer sheet version: a success-tinted panel with an outlined success icon, the name and a primary _Imekamilika_ button.

## Do's and Don'ts

### Do:

- **Do** keep at most one emerald primary button per view, and keep the page ground ivory (`#FBF8F3`) with white working surfaces.
- **Do** separate surfaces with a 1 px `#E6DFD3` border. Use a shadow only for menus, sheets, toasts and floating action bars.
- **Do** pair every status colour with an icon and a word (StatusPill, Banner, gate result).
- **Do** set money, counts and codes in tabular figures, and format money with the event's currency (`TZS 1,200,000`).
- **Do** keep every touch target at least 48 px tall and every input at least 16 px.
- **Do** reserve Cormorant Garamond 600 for couple names on the guest card, print card and their previews.
- **Do** keep the QR pure black on white with a quiet zone of at least 4 modules and the short code beside it.
- **Do** keep motion to 150–200 ms ease-out fades and sheet slides, and honour `prefers-reduced-motion`.

### Don't:

- **Don't** build a generic SaaS dashboard: no purple or multi-hue gradients, glassmorphism, glowing cards or decorative charts.
- **Don't** build a flashy wedding template: no glitter, script fonts, florals, confetti or ornamental animation, even on the guest card.
- **Don't** make it feel like a government or bank form: no dense grey grids, all-caps legalese or cold, unexplained error codes.
- **Don't** set text in gold (`#B8893B`) or use it for a status.
- **Don't** put the display serif in the console, on buttons or in body copy.
- **Don't** let a theme or palette override touch the QR, the semantic colours or the gate fills.
- **Don't** use a full-screen spinner. Use skeletons that match the final layout.
- **Don't** add flashing, strobing or looping attention animations anywhere.

## Known exceptions

- **The guest card's names are set in Georgia, not Cormorant Garamond, on purpose.** The couple's names are the LCP element, and loading the web font cost the card about 0.1 in the Lighthouse performance score (ADR 009). Cormorant Garamond appears only in the console's card and print previews. Change this only with a self-hosted, subset woff2 of 30 KB or less that keeps Lighthouse mobile at 0.90 or above.
- **Copy still says Harusi Pass in many places.** The wordmark (`common.appName`) reads Kadi Sasa, but many sentences in `packages/i18n` and the guest card's official-link domain (`harusipass.co.tz`) still use the old name. That is part of the rename tracked in PRODUCT.md, not a visual token.
