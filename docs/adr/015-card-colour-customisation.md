# 015 — Full colour customisation of the digital and print card

Status: accepted. Supersedes the "only `primary`, `accent` and a pattern" wording in CLAUDE.md §17.2 (the owner asked for complete customisation).

## Decision

An event's look is a **preset style** (the four themes of §17.2) plus optional **palette overrides**. Every colour of the card can be overridden: `primary`, `onPrimary`, `accent`, `pattern` (border ornament), `bg` (page background), `surface` (card paper), `ink` (text), `muted` (soft text) and `border`. The same palette drives the phone card (`/c/[token]` light card, pay page, OG image) and the printed card preview, so the two always match.

Never customisable:

- **The QR block and the card number next to it.** Black on white with a 4-module quiet zone (§6.4). On the print card the QR and code sit on their own white panel, so a dark paper colour cannot reduce the scan contrast.
- **Status colours** (success, warning, danger, info). They carry meaning in banners; banner tints are computed from them over the chosen `surface` (`mixHex`), so they stay legible on dark papers too.

## Where it lives

- `@harusi/ui-tokens/palette`: `PALETTE_KEYS`, `normalizeHex`, `sanitizeOverrides` (drops unknown keys and non-hex values), `themePalette`, `resolvePalette`, `paletteContrastIssues`, `mixHex`. Pure and shared by API, web and mock.
- Storage: `events.brand_theme` JSON `{ themeId, coverGradient, palette }`; no migration. `PATCH` merges the keys it sends, so changing the cover cannot wipe the palette (`mergeBrandTheme` in the API).
- Types: `WeddingEvent.palette` and `CardView.event.palette` (`PaletteOverrides`); `eventInputSchema.palette`.
- UI: Kadi page, "Card colours" (`PaletteEditor`): colour picker + hex box per key, per-key reset, reset all, live contrast report; both previews update live.

## Guard rails

Overrides are accepted only if the resolved palette passes WCAG contrast: text pairs at 4.5:1 (`onPrimary/primary`, `primary/surface`, `primary/bg`, `ink/surface`, `ink/bg`, `muted/surface`, `muted/bg`), accent and the success tick at 3:1, the decorative border at 1.5:1 (it only has to be visible; the presets were never held to more). The editor disables saving and lists the failing pairs; the API (`400 validation`, `details.reason = palette.contrast`) and the mock repository enforce the same rule, so a hand-made request cannot store an unreadable card.

Colour values are validated as `#RRGGBB` on the way in and again on the way out (the light card sanitises whatever the API returns), then written into a `:root{...}` block the server builds itself; free text never reaches the stylesheet.

## Print

The print preview uses the palette on the card paper. Screens and printers differ: dark papers, edge-to-edge fills and saturated colours can print differently (and §17.7 asks for CMYK-safe colours). The editor says so, and the existing test sheet remains the way to check a print run. Real CMYK conversion belongs with the batch-PDF generator in Phase 3.

## Consequences

- The wizard (`/app/events/new`) still offers only the presets; custom colours are edited afterwards on the Kadi page.
- In mock mode the light card is rendered on the server from the seed, so a palette edited in the browser shows in the console previews but not on `/c/[token]`; with the real API it is served on the card.
- The Swahili strings for the editor (`cards.palette*`, `cards.swatch.*`) need the native-speaker review that all `sw.json` strings are waiting for.
