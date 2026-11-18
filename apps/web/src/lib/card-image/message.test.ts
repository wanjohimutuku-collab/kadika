import { describe, expect, it } from 'vitest';
import { cardMessageFromWhatsapp, defaultWhatsappTemplate, withoutLink } from './message';

const vars = {
  guest: 'Asha Mwinyi',
  hosts: 'Yusuf & Kelly',
  date: 'Friday, 23 Oct 2026',
  venue: 'Maili Sita Hall',
  sender: 'The Yusuf family',
};

describe('withoutLink', () => {
  it('drops the sentence that carries the link', () => {
    expect(
      withoutLink('Hello {guest}! {hosts} invite you: {date}, {venue}. Open your card: {link}'),
    ).toBe('Hello {guest}! {hosts} invite you: {date}, {venue}.');
    expect(withoutLink('Habari {mgeni}! Fungua kadi yako: {kiungo} Karibu sana.')).toBe(
      'Habari {mgeni}! Karibu sana.',
    );
  });

  it('keeps line breaks and drops a line that is only the link', () => {
    expect(withoutLink('Hello {guest}!\n{link}\nSee you there.')).toBe(
      'Hello {guest}!\nSee you there.',
    );
  });

  it('removes pasted URLs too', () => {
    expect(withoutLink('Karibu! Kadi: https://kadisasa.com/c/abc')).toBe('Karibu!');
  });

  it('leaves a message without a link alone', () => {
    expect(withoutLink('Karibu sana {guest}.')).toBe('Karibu sana {guest}.');
  });
});

describe('cardMessageFromWhatsapp', () => {
  it('renders the saved WhatsApp message without its link', () => {
    expect(
      cardMessageFromWhatsapp('Dear {guest}, {hosts} would love you there. Card: {link}', vars),
    ).toBe('Dear Asha Mwinyi, Yusuf & Kelly would love you there.');
  });

  it('falls back to the default message for the card kind and language', () => {
    expect(cardMessageFromWhatsapp(undefined, vars, { locale: 'en' })).toBe(
      'Hello Asha Mwinyi! Yusuf & Kelly invite you: Friday, 23 Oct 2026, Maili Sita Hall.',
    );
    expect(cardMessageFromWhatsapp('', vars, { locale: 'en', contribution: true })).toBe(
      'The Yusuf family kindly requests your contribution for Yusuf & Kelly.',
    );
    expect(defaultWhatsappTemplate('sw', 'invite')).toContain('{kiungo}');
  });
});
