# 006 — Contrast of §17.2 tokens

Status: accepted (open item for Phase 5)

Measured with `packages/ui-tokens/src/contrast.ts`:

| Pair                              | Ratio  | Needed           |
| --------------------------------- | ------ | ---------------- |
| accent `#B8893B` on white         | 3.14:1 | 4.5:1 for text   |
| warning `#B26A00` on white        | 4.24:1 | 4.5:1 for text   |
| white on gate ADMIT `#0B7A2B`     | 5.48:1 | §17.2 says ≥ 7:1 |
| white on gate DUPLICATE `#B26A00` | 4.24:1 | §17.2 says ≥ 7:1 |
| white on gate DENY `#B3261E`      | 6.54:1 | §17.2 says ≥ 7:1 |

`CLAUDE.md` wins on values, so the tokens are unchanged. To stay WCAG AA on the web:

- **Accent is decorative only** (ornaments, rules, progress rings, focus accents). It is never used for text. The theme guard checks it against the 3:1 non-text ratio (WCAG 1.4.11); text pairs (on-primary/primary, primary/background) must reach 4.5:1.
- **Warning** is used as an icon/border/tint colour; warning text uses `ink` on a warning-tinted background.
- **Gate fills** are not used as text backgrounds on the web; scan-result pills use tinted backgrounds with `ink` text plus an icon and a word. The full-screen gate overlay is in the Android app (Phase 5). **Phase 5 must darken the gate fills** (e.g. ADMIT `#075E20`, DUPLICATE `#7A4A00`, DENY `#8C1D17` all reach ≥ 7:1) and update §17.2; flagged rather than changed here because the spec owner should confirm.
