// Design tokens from CLAUDE.md §17.2. Dark values apply to the mobile app only.
export const lightColors = {
  bg: '#FBF8F3',
  surface: '#FFFFFF',
  ink: '#1B1B1F',
  muted: '#5F6368',
  primary: '#0F5C4D',
  onPrimary: '#FFFFFF',
  accent: '#B8893B',
  border: '#E6DFD3',
  success: '#1E7D3A',
  warning: '#B26A00',
  danger: '#B3261E',
  info: '#0B63B6',
} as const;

export type ColorToken = keyof typeof lightColors;

export const darkColors: Record<ColorToken, string> = {
  bg: '#121413',
  surface: '#1C1F1D',
  ink: '#F2EFE9',
  muted: '#A7ADA9',
  primary: '#4CC2A6',
  onPrimary: '#08241D',
  accent: '#D9B26A',
  border: '#2C312E',
  success: '#5BD17F',
  warning: '#F0B34A',
  danger: '#FF8A80',
  info: '#7DB8F5',
};

/** Gate result fills (white text, contrast >= 7:1). Never colour alone: pair with icon + word. */
export const gateColors = { admit: '#0B7A2B', duplicate: '#B26A00', deny: '#B3261E' } as const;

/** 4-pt grid. */
/**
 * Gate result fills for the phone scanner: §17.2's values reach 4.2–6.5:1, below the 7:1 the spec
 * asks for (ADR 006). These are the darkened values that reach ≥ 7:1 with white text.
 */
export const gateColorsAaa = { admit: '#075E20', duplicate: '#7A4A00', deny: '#8C1D17' } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { card: 12, input: 8, pill: 999 } as const;
export const fontSizes = { sm: 14, body: 16, lg: 20, xl: 24, xxl: 28, display: 36 } as const;
