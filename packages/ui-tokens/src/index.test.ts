import { describe, expect, it } from 'vitest';
import { darkColors, lightColors } from './index';

describe('ui tokens', () => {
  it('defines the same tokens in light and dark', () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
  });
  it('uses the §17.2 emerald primary', () => {
    expect(lightColors.primary).toBe('#0F5C4D');
  });
});
