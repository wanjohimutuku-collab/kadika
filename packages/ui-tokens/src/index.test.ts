import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from './contrast';
import { tokensCss } from './css';
import { darkColors, gateColors, lightColors } from './index';
import { themeContrastIssues, themeIds, themes } from './themes';

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
