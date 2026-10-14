import type { CSSProperties } from 'react';
import { resolvePalette, type PaletteOverrides } from '@harusi/ui-tokens/palette';

/**
 * CSS variables that re-theme a subtree (guest card, previews, print card): the preset theme plus
 * the event's colour overrides (every key of the palette). The QR block ignores them.
 */
export function themeStyle(
  themeId: string | null | undefined,
  palette?: PaletteOverrides | null,
): CSSProperties {
  const p = resolvePalette(themeId, palette);
  return {
    '--hp-primary': p.primary,
    '--hp-on-primary': p.onPrimary,
    '--hp-accent': p.accent,
    '--hp-pattern': p.pattern,
    '--hp-bg': p.bg,
    '--hp-surface': p.surface,
    '--hp-ink': p.ink,
    '--hp-muted': p.muted,
    '--hp-border': p.border,
  } as CSSProperties;
}
