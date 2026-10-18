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

describe('eventKindLabel', () => {
  it('shows the three known kinds in the reader language and leaves custom kinds alone', async () => {
    const { eventKindLabel } = await import('./domain');
    expect(eventKindLabel('Wedding', 'sw')).toBe('Harusi');
    expect(eventKindLabel('Uchumba', 'en')).toBe('Engagement');
    expect(eventKindLabel('', 'en')).toBe('Wedding');
    expect(eventKindLabel('Kitchen party', 'sw')).toBe('Kitchen party');
  });
});
