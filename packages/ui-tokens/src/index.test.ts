import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from './contrast';
import { tokensCss } from './css';
import { darkColors, gateColors, lightColors } from './index';
import { themeContrastIssues, themeIds, themes } from './themes';
import {
  mixHex,
  normalizeHex,
  paletteContrastIssues,
  resolvePalette,
  sanitizeOverrides,
} from './palette';

describe('ui tokens', () => {
  it('defines the same tokens in light and dark', () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
  });
  it('uses the §17.2 emerald primary', () => {
    expect(lightColors.primary).toBe('#0F5C4D');
  });
  it('tokens.css is in sync with the TS tokens', () => {
    const file = readFileSync(new URL('../tokens.css', import.meta.url), 'utf8');
    expect(file).toBe(tokensCss());
  });
});

describe('contrast', () => {
  it('computes black on white as 21:1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  });
  // §17.2 claims >= 7:1 but its own values give 4.2-6.5:1; tracked in ADR 006 for Phase 5.
  it('gate fills reach at least the large-text AA ratio with white text', () => {
    for (const fill of Object.values(gateColors)) {
      expect(contrastRatio('#FFFFFF', fill)).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('theme contrast guard', () => {
  it('all four presets pass', () => {
    expect(themeIds).toHaveLength(4);
    for (const id of themeIds) expect(themeContrastIssues(themes[id])).toEqual([]);
  });
  it('rejects a low-contrast theme', () => {
    const issues = themeContrastIssues({
      primary: '#F5E6A8',
      onPrimary: '#FFFFFF',
      accent: '#F0E0C0',
    });
    expect(issues.map((i) => i.pair)).toContain('onPrimary/primary');
  });
});

describe('palette customisation', () => {
  it('normalises hex and drops junk overrides', () => {
    expect(normalizeHex('abc')).toBe('#AABBCC');
    expect(normalizeHex('#0f5c4d')).toBe('#0F5C4D');
    expect(normalizeHex('red;background:url(x)')).toBeNull();
    expect(sanitizeOverrides({ primary: '#123', bogus: '#000000', ink: 'nope' })).toEqual({
      primary: '#112233',
    });
  });

  it('every preset theme is a valid palette', () => {
    for (const id of themeIds) expect(paletteContrastIssues(resolvePalette(id))).toEqual([]);
  });

  it('overrides win, and unreadable combinations are reported', () => {
    const p = resolvePalette('emerald-gold', { bg: '#101820', surface: '#16222E', ink: '#F5F1E8' });
    expect(p.surface).toBe('#16222E');
    expect(p.primary).toBe('#0F5C4D');
    // dark surface with the default emerald primary and muted grey is not readable
    const issues = paletteContrastIssues(p).map((i) => i.pair);
    expect(issues).toContain('primary/surface');
    expect(issues).toContain('muted/surface');
    const bad = resolvePalette('emerald-gold', { ink: '#EEEEEE' });
    expect(paletteContrastIssues(bad).map((i) => i.pair)).toContain('ink/surface');
  });

  it('mixes tints', () => {
    expect(mixHex('#FFFFFF', '#000000', 0.5)).toBe('#808080');
  });
});
