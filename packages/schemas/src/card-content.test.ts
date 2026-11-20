import { describe, expect, it } from 'vitest';
import {
  cardContentSchema,
  flag,
  pick,
  renderTemplate,
  senderKindOf,
  splitName,
  templatePlaceholders,
  templateProblem,
} from './card-content';
import { smsBodySchema, smsCampaignProblem } from './sms';
import { defaultSender } from './domain';

describe('message templates', () => {
  it('finds placeholders and fills them, tidying the gaps left by empty values', () => {
    expect(templatePlaceholders('Hi {guest}, {link} {guest}')).toEqual(['guest', 'link', 'guest']);
    expect(
      renderTemplate('Karibu {guest}, {venue} {link}', { guest: 'Asha', link: 'x.co/1' }),
    ).toBe('Karibu Asha, x.co/1');
    expect(renderTemplate('Date: {date}.', { date: '14 Des' })).toBe('Date: 14 Des.');
    expect(renderTemplate('{missing}!', {})).toBe('!');
  });

  it('resolves Swahili placeholder aliases seamlessly in templates', () => {
    expect(templateProblem('inviteSms', 'Habari {mgeni}, fungua {kiungo}')).toBeNull();
    expect(templateProblem('inviteWhatsapp', 'Habari {mgeni}, fungua {kiungo}')).toBeNull();
    expect(
      renderTemplate(
        'Habari {mgeni}, harusi ya {wenyeji} tarehe {tarehe} {ukumbi}: {kiungo} ({kadi})',
        {
          guest: 'Asha Mwinyi',
          hosts: 'Asha & Juma',
          date: '14 Des 2026',
          venue: 'Mlimani City',
          link: 'https://kadisasa.com/s/KH-4826',
          code: 'KH-4826',
        },
      ),
    ).toBe(
      'Habari Asha Mwinyi, harusi ya Asha & Juma tarehe 14 Des 2026 Mlimani City: https://kadisasa.com/s/KH-4826 (KH-4826)',
    );
  });

  it('rejects unknown placeholders and a message without the link', () => {
    expect(templateProblem('inviteSms', 'Karibu {guest} {link}')).toBeNull();
    expect(templateProblem('inviteSms', 'Karibu {nope} {link}')).toBe(
      'content.placeholder_unknown:nope',
    );
    expect(templateProblem('inviteSms', 'Karibu {guest}')).toBe('content.link_required');
    expect(templateProblem('contributionSms', 'Changia {target} {link}')).toBeNull();
    expect(templateProblem('inviteSms', 'Karibu {target} {link}')).toBe(
      'content.placeholder_unknown:target',
    );
    expect(templateProblem('inviteSms', '   ')).toBeNull();
  });

  it('splits names and validates bulk SMS placeholders without requiring {link}', () => {
    expect(splitName('Asha Juma')).toEqual({ firstName: 'Asha', lastName: 'Juma' });
    expect(splitName('Neema')).toEqual({ firstName: 'Neema', lastName: '' });
    expect(splitName('  Juma   Ali Hassan  ')).toEqual({
      firstName: 'Juma',
      lastName: 'Ali Hassan',
    });
    expect(smsCampaignProblem('Habari {firstName} {lastName}, ukumbi: {venue}')).toBeNull();
    expect(smsCampaignProblem('Karibu {group} saa {time} {date}')).toBeNull();
    expect(smsCampaignProblem('Habari {nope}')).toBe('placeholder_unknown:nope');
    expect(smsBodySchema.safeParse('Habari {firstName}, tukutane {venue}').success).toBe(true);
    expect(smsBodySchema.safeParse('Habari {nope}').success).toBe(false);
  });
});

describe('card content schema', () => {
  it('accepts an empty object and a rich one', () => {
    expect(cardContentSchema.safeParse({}).success).toBe(true);
    const rich = {
      sender: { kind: 'family', name: 'Familia ya Mzee Mwinyi', phone: '0712345678' },
      invitation: {
        eyebrow: { sw: 'Karibu kwenye harusi ya' },
        body: { sw: 'Tunamshukuru Mungu...', en: 'We thank God...' },
        programme: [{ time: '10:00', title: 'Ibada' }],
        show: { qr: true, pledge: false },
      },
      contribution: {
        title: { sw: 'Changia harusi' },
        suggestedAmounts: [10000, 20000],
        deadline: '2027-01-10',
      },
      messages: { inviteSms: { sw: 'Karibu {guest}: {link}' } },
    };
    expect(cardContentSchema.safeParse(rich).success).toBe(true);
  });

  it('rejects unknown keys, bad placeholders, long texts and bad dates', () => {
    expect(cardContentSchema.safeParse({ nope: 1 }).success).toBe(false);
    expect(cardContentSchema.safeParse({ invitation: { nope: 1 } }).success).toBe(false);
    const bad = cardContentSchema.safeParse({ messages: { inviteSms: { sw: 'Karibu {guest}' } } });
    expect(bad.success).toBe(false);
    expect(
      cardContentSchema.safeParse({ messages: { inviteSms: { sw: 'Karibu {x} {link}' } } }).success,
    ).toBe(false);
    expect(
      cardContentSchema.safeParse({ invitation: { body: { sw: 'x'.repeat(1201) } } }).success,
    ).toBe(false);
    expect(cardContentSchema.safeParse({ contribution: { deadline: '10/01/2027' } }).success).toBe(
      false,
    );
    expect(
      cardContentSchema.safeParse({
        invitation: { programme: Array(13).fill({ time: '1', title: 't' }) },
      }).success,
    ).toBe(false);
    expect(cardContentSchema.safeParse({ sender: { kind: 'boss' } }).success).toBe(false);
  });
});

describe('picking texts and toggles', () => {
  it('falls back to the other language and treats blank as unset', () => {
    expect(pick({ sw: 'Habari', en: 'Hello' }, 'en')).toBe('Hello');
    expect(pick({ sw: 'Habari' }, 'en')).toBe('Habari');
    expect(pick({ sw: '  ', en: '' }, 'sw')).toBeUndefined();
    expect(pick(undefined, 'sw')).toBeUndefined();
  });
  it('defaults sections on and public totals off', () => {
    expect(flag(undefined, 'map')).toBe(true);
    expect(flag({ map: false }, 'map')).toBe(false);
    expect(flag(undefined, 'progress', false)).toBe(false);
  });
  it('treats older events as committee-sent and new defaults as family', () => {
    expect(senderKindOf(undefined)).toBe('committee');
    expect(senderKindOf({})).toBe('committee');
    expect(senderKindOf({ sender: { kind: 'family' } })).toBe('family');
  });
});

describe('default sender line', () => {
  it('keeps the committee wording and adds family, couple and host', () => {
    expect(defaultSender('Harusi', 'Asha & Juma')).toBe('The wedding committee of Asha & Juma');
    expect(defaultSender(undefined, 'Neema')).toBe('The Neema committee');
    expect(defaultSender('Harusi', 'Asha & Juma', 'committee', 'sw')).toBe(
      'Kamati ya Harusi ya Asha & Juma',
    );
    expect(defaultSender(undefined, 'Neema', 'committee', 'sw')).toBe('Kamati ya Neema');
    expect(defaultSender('Harusi', 'Asha & Juma', 'family', 'sw')).toBe('Familia ya Asha & Juma');
    expect(defaultSender('Harusi', 'Asha & Juma', 'family', 'en')).toBe('The Asha & Juma family');
    expect(defaultSender('Harusi', 'Asha & Juma', 'couple')).toBe('Asha & Juma');
  });
});

describe('custom card design schema', () => {
  it('validates a custom card design with elements, free fonts, images, and backgrounds', () => {
    const custom = {
      template: 'custom' as const,
      title: { sw: 'Ujumbe maalum' },
      custom: {
        background: {
          type: 'gradient' as const,
          gradient: 'linear-gradient(135deg, #1A3628 0%, #0A1C14 100%)',
          overlayOpacity: 15,
        },
        frame: {
          show: true,
          style: 'double' as const,
          color: '#E8B66B',
          width: 2,
          inset: 20,
        },
        textColor: '#FFFFFF',
        accentColor: '#E8B66B',
        elements: [
          {
            id: 'names-1',
            type: 'names' as const,
            x: 50,
            y: 20,
            fontFamily: 'playfair' as const,
            fontSize: 40,
            fontWeight: 'bold' as const,
            color: '#E8B66B',
            textAlign: 'center' as const,
          },
          {
            id: 'free-text-1',
            type: 'freeText' as const,
            x: 50,
            y: 35,
            fontFamily: 'script' as const,
            fontSize: 24,
            content: { sw: 'Karibuni Wote', en: 'All Are Welcome' },
            textAlign: 'center' as const,
          },
          {
            id: 'custom-img-1',
            type: 'image' as const,
            x: 50,
            y: 50,
            width: 30,
            height: 20,
            imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            borderRadius: 50,
            opacity: 90,
          },
          {
            id: 'qr-1',
            type: 'qr' as const,
            x: 50,
            y: 80,
            visible: true,
          },
        ],
      },
    };

    const parsed = cardContentSchema.safeParse({ design: custom });
    expect(parsed.success).toBe(true);
  });
});
