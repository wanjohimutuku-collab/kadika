import { contrastRatio, MIN_NON_TEXT_CONTRAST, MIN_TEXT_CONTRAST } from './contrast';
import { lightColors } from './colors';

/** Guest-card themes (§17.2). Only primary, onPrimary, accent and the pattern change. */
export type ThemeId = 'emerald-gold' | 'navy-silver' | 'terracotta' | 'rose-sage';

export interface CardTheme {
  id: ThemeId;
  primary: string;
  onPrimary: string;
  accent: string;
  /** Tint used for the decorative border pattern. */
  pattern: string;
}

export const themes: Record<ThemeId, CardTheme> = {
  'emerald-gold': {
    id: 'emerald-gold',
    primary: lightColors.primary,
    onPrimary: lightColors.onPrimary,
    accent: lightColors.accent,
    pattern: '#B8893B',
  },
  'navy-silver': {
    id: 'navy-silver',
    primary: '#1F3A5F',
    onPrimary: '#FFFFFF',
    accent: '#6B7785',
    pattern: '#8A96A3',
  },
  terracotta: {
    id: 'terracotta',
    primary: '#9A3B1F',
    onPrimary: '#FFFFFF',
    accent: '#A0662A',
    pattern: '#C98A5A',
  },
  'rose-sage': {
    id: 'rose-sage',
    primary: '#8C3B57',
    onPrimary: '#FFFFFF',
    accent: '#5E7A5E',
    pattern: '#9DB39A',
  },
};

export const themeIds = Object.keys(themes) as ThemeId[];
export const defaultThemeId: ThemeId = 'emerald-gold';

export interface ContrastIssue {
  pair: string;
  ratio: number;
}

/**
 * Returns contrast failures for a theme; empty means the theme is allowed.
 * Text pairs need 4.5:1. The accent is decorative only (ornaments, rules, rings), so it needs the
 * 3:1 non-text ratio (WCAG 1.4.11) — see ADR 006.
 */
export function themeContrastIssues(
  theme: Pick<CardTheme, 'primary' | 'onPrimary' | 'accent'>,
): ContrastIssue[] {
  const checks: [string, string, string, number][] = [
    ['onPrimary/primary', theme.onPrimary, theme.primary, MIN_TEXT_CONTRAST],
    ['primary/bg', theme.primary, lightColors.bg, MIN_TEXT_CONTRAST],
    ['primary/surface', theme.primary, lightColors.surface, MIN_TEXT_CONTRAST],
    ['accent/surface', theme.accent, lightColors.surface, MIN_NON_TEXT_CONTRAST],
  ];
  return checks
    .map(([pair, fg, bg, min]) => ({ pair, ratio: contrastRatio(fg, bg), min }))
    .filter((c) => c.ratio < c.min)
    .map(({ pair, ratio }) => ({ pair, ratio }));
}

export function resolveTheme(id: string | null | undefined): CardTheme {
  return id && id in themes ? themes[id as ThemeId] : themes[defaultThemeId];
}
