import type { CSSProperties } from 'react';
import { resolveTheme } from '@harusi/ui-tokens/themes';

/** CSS variables that re-theme a subtree (guest card, previews). The QR block ignores them. */
export function themeStyle(themeId: string | null | undefined): CSSProperties {
  const t = resolveTheme(themeId);
  return {
    '--hp-primary': t.primary,
    '--hp-on-primary': t.onPrimary,
    '--hp-accent': t.accent,
    '--hp-pattern': t.pattern,
  } as CSSProperties;
}
