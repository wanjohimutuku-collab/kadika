import { describe, expect, it } from 'vitest';
import { composeSms, composeWhatsapp, type MessageInput } from './messages';

const input = (messages: Record<string, { sw?: string; en?: string }> = {}): MessageInput =>
  ({
    event: {
      coupleNames: 'Yusuf & Kelly',
      eventKind: 'Harusi',
      title: 'Harusi',
      dateStart: new Date('2026-12-12T14:00:00Z'),
      timezone: 'Africa/Dar_es_Salaam',
      venueName: 'Maili Sita Hall',
      venueMapUrl: '',
      dressCode: '',
      senderName: '',
      committeePhone: '',
      country: 'TZ',
      contributionTarget: 0,
      currency: 'TZS',
      cardContent: { messages },
    },
    guest: { displayName: 'Asha Mwinyi', language: 'en', shortCode: 'KH-4826', groupLabel: '' },
    link: 'https://kadisasa.com/s/abc',
  }) as unknown as MessageInput;

describe('SMS text follows the custom WhatsApp text', () => {
  it('sends the organiser’s WhatsApp invitation text by SMS too', () => {
    const i = input({ inviteWhatsapp: { en: 'Dear {guest}, {hosts} invite you. Card: {link}' } });
    expect(composeSms('invite', i)).toBe(composeWhatsapp('invite', i));
    expect(composeSms('invite', i)).toBe(
      'Dear Asha Mwinyi, Yusuf & Kelly invite you. Card: https://kadisasa.com/s/abc',
    );
  });

  it('does the same for reminders and contribution cards', () => {
    const i = input({
      reminderWhatsapp: { en: 'Reminder {guest}: {link}' },
      contributionWhatsapp: { en: 'Support {hosts}: {link}' },
    });
    expect(composeSms('reminder', i)).toBe('Reminder Asha Mwinyi: https://kadisasa.com/s/abc');
    expect(composeSms('contribution', i)).toBe('Support Yusuf & Kelly: https://kadisasa.com/s/abc');
  });

  it('prefers the WhatsApp text over an older, different SMS text', () => {
    const i = input({
      inviteWhatsapp: { en: 'New text {link}' },
      inviteSms: { en: 'Old SMS text {link}' },
    });
    expect(composeSms('invite', i)).toBe('New text https://kadisasa.com/s/abc');
  });

  it('keeps a custom SMS text when there is no custom WhatsApp text', () => {
    const i = input({ inviteSms: { en: 'Only SMS {link}' } });
    expect(composeSms('invite', i)).toBe('Only SMS https://kadisasa.com/s/abc');
  });

  it('falls back across languages exactly as WhatsApp does', () => {
    const i = input({ inviteWhatsapp: { sw: 'Karibu {link}' } });
    expect(composeSms('invite', i)).toBe(composeWhatsapp('invite', i));
  });
});
