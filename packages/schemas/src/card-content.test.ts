import { describe, expect, it } from 'vitest';
import {
  cardContentSchema,
  flag,
  pick,
  renderTemplate,
  senderKindOf,
  templatePlaceholders,
  templateProblem,
} from './card-content';
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
    expect(defaultSender('Harusi', 'Asha & Juma')).toBe('Wedding committee of Asha & Juma');
    expect(defaultSender(undefined, 'Neema')).toBe('Committee of Neema');
    expect(defaultSender('Harusi', 'Asha & Juma', 'committee', 'sw')).toBe(
      'Kamati ya Harusi ya Asha & Juma',
    );
    expect(defaultSender(undefined, 'Neema', 'committee', 'sw')).toBe('Kamati ya Neema');
    expect(defaultSender('Harusi', 'Asha & Juma', 'family', 'sw')).toBe('Familia ya Asha & Juma');
    expect(defaultSender('Harusi', 'Asha & Juma', 'family', 'en')).toBe('The Asha & Juma family');
    expect(defaultSender('Harusi', 'Asha & Juma', 'couple')).toBe('Asha & Juma');
  });
});
