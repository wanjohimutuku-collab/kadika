import { describe, expect, it } from 'vitest';
import {
  SHORT_CODE_DIGITS,
  SHORT_CODE_LETTERS,
  SHORT_CODE_PATTERN,
  generateShortCode,
  normalizeShortCode,
} from './short-code';

describe('short codes', () => {
  it('alphabet has no ambiguous characters', () => {
    for (const ch of ['0', 'O', '1', 'I', 'L']) {
      expect(SHORT_CODE_LETTERS + SHORT_CODE_DIGITS).not.toContain(ch);
    }
  });
  it('generates valid codes', () => {
    let seed = 1;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < 1000; i++) expect(generateShortCode(rnd)).toMatch(SHORT_CODE_PATTERN);
  });
  it('normalises typed input', () => {
    expect(normalizeShortCode('kh 4829')).toBe('KH-4829');
    expect(normalizeShortCode('KH4829')).toBe('KH-4829');
    expect(normalizeShortCode('KO-4829')).toBeNull();
    expect(normalizeShortCode('KH-48')).toBeNull();
  });
});
