import { radius, spacing, type ColorToken } from '@harusi/ui-tokens';

const gateDarkColors: Record<ColorToken, string> = {
  bg: '#0B0E11',
  surface: '#171C22',
  ink: '#FFFFFF',
  muted: '#8B95A1',
  primary: '#1FE086',
  onPrimary: '#061A10',
  accent: '#1FE086',
  border: '#242C35',
  success: '#1FE086',
  warning: '#F5A623',
  danger: '#FF5A5F',
  info: '#4DA3FF',
};

const gateBrandExtras = {
  deepEmerald: '#12171D',
  primarySoft: '#132B22',
  gold: '#1FE086',
  goldSoft: '#162620',
  saffron: '#F5A623',
  saffronSoft: '#2A2115',
  magenta: '#EC5B99',
  magentaSoft: '#2E1824',
  bezel: '#13181E',
} as const;

export type Colors = Record<ColorToken, string> & Record<keyof typeof gateBrandExtras, string>;

/** Sleek dark + vibrant mint-green check-in theme for the Gate Agent app. */
export function useColors(): Colors {
  return { ...gateDarkColors, ...gateBrandExtras };
}

export function useIsDark(): boolean {
  return true;
}

export { radius, spacing };
