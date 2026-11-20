import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { radius, spacing, type ColorToken } from '@harusi/ui-tokens';

const STORAGE_KEY = '@harusi/mobile:branding_theme';

export interface BrandingTheme {
  id: string;
  name: string;
  primary: string;
  onPrimary: string;
  accent: string;
  bg: string;
  surface: string;
  border: string;
}

export const BRAND_PRESETS: BrandingTheme[] = [
  {
    id: 'kadisasa',
    name: 'Kadisasa Red & Black',
    primary: '#ED1C24',
    onPrimary: '#FFFFFF',
    accent: '#ED1C24',
    bg: '#0A0A07',
    surface: '#161614',
    border: '#2A2A26',
  },
  {
    id: 'emerald',
    name: 'Emerald & Mint',
    primary: '#1FE086',
    onPrimary: '#061A10',
    accent: '#1FE086',
    bg: '#0B0E11',
    surface: '#171C22',
    border: '#242C35',
  },
  {
    id: 'navy',
    name: 'Navy & Blue',
    primary: '#3B82F6',
    onPrimary: '#FFFFFF',
    accent: '#60A5FA',
    bg: '#0A0E1A',
    surface: '#141A29',
    border: '#222B3D',
  },
  {
    id: 'terracotta',
    name: 'Sunset Terracotta',
    primary: '#C1552C',
    onPrimary: '#FFFFFF',
    accent: '#D9A441',
    bg: '#140D0B',
    surface: '#201614',
    border: '#332320',
  },
];

export const DEFAULT_THEME = BRAND_PRESETS[0]!;

export function buildColors(theme: BrandingTheme): Colors {
  const baseDark: Record<ColorToken, string> = {
    bg: theme.bg,
    surface: theme.surface,
    ink: '#FFFFFF',
    muted: '#8E8E88',
    primary: theme.primary,
    onPrimary: theme.onPrimary,
    accent: theme.accent,
    border: theme.border,
    success: '#1FE086',
    warning: '#F5A623',
    danger: '#FF5A5F',
    info: '#4DA3FF',
  };

  const extras = {
    deepEmerald: '#12171D',
    primarySoft: theme.primary === '#ED1C24' ? '#300E11' : '#132B22',
    gold: theme.accent,
    goldSoft: '#162620',
    saffron: '#F5A623',
    saffronSoft: '#2A2115',
    magenta: '#EC5B99',
    magentaSoft: '#2E1824',
    bezel: theme.surface,
  };

  return { ...baseDark, ...extras };
}

export type Colors = Record<ColorToken, string> & {
  deepEmerald: string;
  primarySoft: string;
  gold: string;
  goldSoft: string;
  saffron: string;
  saffronSoft: string;
  magenta: string;
  magentaSoft: string;
  bezel: string;
};

interface ThemeContextValue {
  colors: Colors;
  activePresetId: string;
  currentTheme: BrandingTheme;
  presets: BrandingTheme[];
  setPreset: (id: string) => Promise<void>;
  setCustomTheme: (primary: string, bg?: string, accent?: string) => Promise<void>;
  resetTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [activeTheme, setActiveTheme] = useState<BrandingTheme>(DEFAULT_THEME);

  useEffect(() => {
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as BrandingTheme;
          if (parsed && typeof parsed.primary === 'string') {
            setActiveTheme(parsed);
          }
        }
      } catch {
        // use default theme
      }
    })();
  }, []);

  const setPreset = async (id: string) => {
    const found = BRAND_PRESETS.find((p) => p.id === id) ?? DEFAULT_THEME;
    setActiveTheme(found);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(found));
    } catch {
      // ignore
    }
  };

  const setCustomTheme = async (primary: string, bg?: string, accent?: string) => {
    const custom: BrandingTheme = {
      id: 'custom',
      name: 'Custom',
      primary: primary.trim(),
      onPrimary: '#FFFFFF',
      accent: accent?.trim() || primary.trim(),
      bg: bg?.trim() || '#0A0A07',
      surface: '#161614',
      border: '#2A2A26',
    };
    setActiveTheme(custom);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
    } catch {
      // ignore
    }
  };

  const resetTheme = async () => {
    setActiveTheme(DEFAULT_THEME);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const colors = useMemo(() => buildColors(activeTheme), [activeTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors,
      activePresetId: activeTheme.id,
      currentTheme: activeTheme,
      presets: BRAND_PRESETS,
      setPreset,
      setCustomTheme,
      resetTheme,
    }),
    [colors, activeTheme],
  );

  return React.createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    const defaultColors = buildColors(DEFAULT_THEME);
    return {
      colors: defaultColors,
      activePresetId: DEFAULT_THEME.id,
      currentTheme: DEFAULT_THEME,
      presets: BRAND_PRESETS,
      setPreset: async () => {},
      setCustomTheme: async () => {},
      resetTheme: async () => {},
    };
  }
  return ctx;
}

export function useColors(): Colors {
  const ctx = useContext(ThemeContext);
  return ctx ? ctx.colors : buildColors(DEFAULT_THEME);
}

export function useIsDark(): boolean {
  return true;
}

export { radius, spacing };
