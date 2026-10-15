import { contrastRatio, MIN_NON_TEXT_CONTRAST, MIN_TEXT_CONTRAST } from './contrast';
import { lightColors } from './colors';
import { resolveTheme, type ContrastIssue } from './themes';

/**
 * Full colour customisation of a wedding's digital card and print card. A preset theme supplies
 * the base; an event may override any of these keys. Never customisable: the QR block (always
 * black on white, §6.4) and the status colours (success/warning/danger/info).
 */
export const PALETTE_KEYS = [
  'primary',
  'onPrimary',
  'accent',
  'bg',
  'surface',
  'ink',
  'muted',
  'border',
  'pattern',
] as const;
export type PaletteKey = (typeof PALETTE_KEYS)[number];
export type Palette = Record<PaletteKey, string>;
export type PaletteOverrides = Partial<Palette>;

/** The border ornament is decoration with no meaning; it only has to be visible. */
const MIN_DECORATION_CONTRAST = 1.5;

const HEX6 = /^#[0-9a-f]{6}$/i;

/** `#abc`, `abc`, `#AABBCC` → `#AABBCC`; anything else → null. */
export function normalizeHex(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  let v = value.trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(v)) v = v.replace(/./g, (c) => c + c);
  const out = `#${v}`;
  return HEX6.test(out) ? out.toUpperCase() : null;
}

/** Keeps only known keys with valid colours (untrusted input from storage or the API). */
export function sanitizeOverrides(raw: unknown): PaletteOverrides {
  const out: PaletteOverrides = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const k of PALETTE_KEYS) {
    const hex = normalizeHex((raw as Record<string, unknown>)[k]);
    if (hex) out[k] = hex;
  }
  return out;
}

/** The theme's own colours, with the neutral tokens from §17.2 for everything it does not set. */
export function themePalette(themeId: string | null | undefined): Palette {
  const t = resolveTheme(themeId);
  return {
    primary: t.primary,
    onPrimary: t.onPrimary,
    accent: t.accent,
    pattern: t.pattern,
    bg: lightColors.bg,
    surface: lightColors.surface,
    ink: lightColors.ink,
    muted: lightColors.muted,
    border: lightColors.border,
  };
}

export function resolvePalette(
  themeId: string | null | undefined,
  overrides?: PaletteOverrides | null,
): Palette {
  return { ...themePalette(themeId), ...sanitizeOverrides(overrides) };
}

/**
 * Contrast failures for a palette; empty means it may be saved. Text pairs need 4.5:1; the accent
 * and the success tick (trust strip) are decorative or icons and need 3:1 (ADR 006).
 */
export function paletteContrastIssues(p: Palette): ContrastIssue[] {
  const checks: [string, string, string, number][] = [
    ['onPrimary/primary', p.onPrimary, p.primary, MIN_TEXT_CONTRAST],
    ['primary/surface', p.primary, p.surface, MIN_TEXT_CONTRAST],
    ['primary/bg', p.primary, p.bg, MIN_TEXT_CONTRAST],
    ['ink/surface', p.ink, p.surface, MIN_TEXT_CONTRAST],
    ['ink/bg', p.ink, p.bg, MIN_TEXT_CONTRAST],
    ['muted/surface', p.muted, p.surface, MIN_TEXT_CONTRAST],
    ['muted/bg', p.muted, p.bg, MIN_TEXT_CONTRAST],
    ['accent/surface', p.accent, p.surface, MIN_NON_TEXT_CONTRAST],
    ['pattern/surface', p.pattern, p.surface, MIN_DECORATION_CONTRAST],
    ['success/surface', lightColors.success, p.surface, MIN_NON_TEXT_CONTRAST],
  ];
  return checks
    .map(([pair, fg, bg, min]) => ({ pair, ratio: contrastRatio(fg, bg), min }))
    .filter((c) => c.ratio < c.min)
    .map(({ pair, ratio }) => ({ pair, ratio }));
}

/** `base` mixed with `over` at `amount` (0–1): used for soft banner tints on any surface colour. */
export function mixHex(base: string, over: string, amount: number): string {
  const a = parseInt(base.slice(1), 16);
  const b = parseInt(over.slice(1), 16);
  const ch = (shift: number) =>
    Math.round(((a >> shift) & 255) * (1 - amount) + ((b >> shift) & 255) * amount);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`.toUpperCase();
}
