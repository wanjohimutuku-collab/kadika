import { describe, expect, it } from 'vitest';
import {
  defaultEventTitle,
  defaultSender,
  EVENT_KIND_SUGGESTIONS,
  eventKindLabel,
  eventKindOf,
  eventKindSuggestions,
} from './domain';

describe('event kinds (ADR 024, 041)', () => {
  it('names the known kinds in the language of whoever reads them', () => {
    expect(eventKindLabel('Harusi', 'en')).toBe('Wedding');
    expect(eventKindLabel('wedding', 'sw')).toBe('Harusi');
    expect(eventKindLabel('Uchumba', 'en')).toBe('Engagement');
    expect(eventKindLabel('engagement', 'sw')).toBe('Uchumba');
    expect(eventKindLabel('Send-off', 'en')).toBe('Send-off');
    expect(eventKindLabel('send off', 'sw')).toBe('Send-off');
    expect(eventKindLabel(' Sendoff ', 'en')).toBe('Send-off');
  });

  it('shows anything else as written, and falls back to a wedding', () => {
    expect(eventKindLabel('Kitchen party', 'en')).toBe('Kitchen party');
    expect(eventKindLabel('Kitchen party', 'sw')).toBe('Kitchen party');
    expect(eventKindLabel('', 'en')).toBe('Wedding');
    expect(eventKindLabel(null, 'sw')).toBe('Harusi');
  });

  it('offers the same three suggestions in both languages', () => {
    expect(eventKindSuggestions('sw')).toEqual(['Harusi', 'Send-off', 'Uchumba']);
    expect(eventKindSuggestions('en')).toEqual(['Wedding', 'Send-off', 'Engagement']);
    expect([...EVENT_KIND_SUGGESTIONS]).toEqual(eventKindSuggestions('en'));
  });
});

describe('wording that follows the language (ADR 041)', () => {
  it('starts a new event with a title in the language of the screen', () => {
    expect(defaultEventTitle('Uchumba', 'Asha & Juma', 'sw')).toBe('Uchumba wa Asha & Juma');
    expect(defaultEventTitle('Uchumba', 'Asha & Juma', 'en')).toBe('Engagement of Asha & Juma');
    expect(defaultEventTitle('', 'Asha & Juma', 'en')).toBe('Wedding of Asha & Juma');
    expect(defaultEventTitle('Kitchen party', 'Neema', 'en')).toBe('Kitchen party of Neema');
  });

  it('names a committee sender in English for an English reader, not in Swahili', () => {
    expect(defaultSender('Harusi', 'Asha & Juma', 'committee', 'en')).toBe(
      'The wedding committee of Asha & Juma',
    );
    expect(defaultSender('Uchumba', 'Asha & Juma', 'committee', 'en')).toBe(
      'The engagement committee of Asha & Juma',
    );
    expect(defaultSender(undefined, 'Neema', 'committee', 'en')).toBe('The Neema committee');
    // Swahili is unchanged, and an English-typed kind is named in Swahili for a Swahili reader
    expect(defaultSender('Harusi', 'Asha & Juma', 'committee', 'sw')).toBe(
      'Kamati ya Harusi ya Asha & Juma',
    );
    expect(defaultSender('Wedding', 'Asha & Juma', 'committee', 'sw')).toBe(
      'Kamati ya Harusi ya Asha & Juma',
    );
  });
});

describe('the "of" that agrees with the kind (ADR 041)', () => {
  it('says "wa" after uchumba and "ya" after the other Swahili kinds', () => {
    expect(eventKindOf('Uchumba', 'sw')).toBe('Uchumba wa');
    expect(eventKindOf('engagement', 'sw')).toBe('Uchumba wa');
    expect(eventKindOf('Harusi', 'sw')).toBe('Harusi ya');
    expect(eventKindOf('Send-off', 'sw')).toBe('Send-off ya');
    expect(eventKindOf('Kitchen party', 'sw')).toBe('Kitchen party ya');
    expect(eventKindOf(null, 'sw')).toBe('Harusi ya');
  });

  it('reads "<kind> of" in English, with the kind named in English', () => {
    expect(eventKindOf('Uchumba', 'en')).toBe('Engagement of');
    expect(eventKindOf('Harusi', 'en')).toBe('Wedding of');
    expect(eventKindOf('Send-off', 'en')).toBe('Send-off of');
    expect(eventKindOf('', 'en')).toBe('Wedding of');
  });

  it('flows into the default title and sender', () => {
    expect(defaultEventTitle('Uchumba', 'Neema & Daudi', 'sw')).toBe('Uchumba wa Neema & Daudi');
    expect(defaultSender('Uchumba', 'Neema & Daudi', 'committee', 'sw')).toBe(
      'Kamati ya Uchumba wa Neema & Daudi',
    );
    expect(defaultSender('Harusi', 'Asha & Juma', 'committee', 'sw')).toBe(
      'Kamati ya Harusi ya Asha & Juma',
    );
  });
});
