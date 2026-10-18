import { describe, expect, it } from 'vitest';
import { occasionOf } from './domain';

describe('occasionOf', () => {
  it('maps the three card categories', () => {
    expect(occasionOf('Harusi')).toBe('wedding');
    expect(occasionOf(null)).toBe('wedding');
    expect(occasionOf('Uchumba')).toBe('engagement');
    expect(occasionOf('Send-off')).toBe('sendoff');
    expect(occasionOf('Graduation')).toBe('other');
  });
});
