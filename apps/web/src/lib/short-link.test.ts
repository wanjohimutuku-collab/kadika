import { describe, expect, it } from 'vitest';
import { cardTokenFromShortPath } from './short-link';

describe('cardTokenFromShortPath', () => {
  it('treats a 128-bit card token as a card link', () => {
    expect(cardTokenFromShortPath('nZbAafPt-xRABH0Qo6s6Z4')).toBe('nZbAafPt-xRABH0Qo6s6Z4');
  });
  it('does not treat short codes or junk as tokens', () => {
    expect(cardTokenFromShortPath('KH-4821')).toBeNull();
    expect(cardTokenFromShortPath('kh4821')).toBeNull();
    expect(cardTokenFromShortPath('abc')).toBeNull();
    expect(cardTokenFromShortPath('a%2Fb%2Fc%2Fd%2Fe%2Ff%2Fg%2Fh%2Fi')).toBeNull();
  });
});
