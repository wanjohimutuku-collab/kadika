import { describe, expect, it } from 'vitest';
import { IntlMessageFormat } from 'intl-messageformat';
import sw from '@harusi/i18n/sw.json';
import en from '@harusi/i18n/en.json';
import { formatIcu } from './tiny-intl';

describe('tiny ICU formatter', () => {
  it('interpolates and pluralises', () => {
    expect(formatIcu('Hello {name}', { name: 'Asha' })).toBe('Hello Asha');
    const p = '{count, plural, =0 {Leo} one {mtu #} other {watu #}}';
    expect(formatIcu(p, { count: 0 })).toBe('Leo');
    expect(formatIcu(p, { count: 1 })).toBe('mtu 1');
    expect(formatIcu(p, { count: 4 })).toBe('watu 4');
    expect(
      formatIcu('Unaweza kuja na hadi {max, plural, one {mtu #} other {watu #}}', { max: 3 }),
    ).toBe('Unaweza kuja na hadi watu 3');
  });
  it('matches intl-messageformat for every card/pay/common string in both locales', () => {
    const values = {
      count: 3,
      max: 2,
      people: 'watu 2',
      guest: 'Asha',
      sender: 'Kamati',
      phone: '0754 000 222',
      domain: 'x',
      couple: 'A & J',
      date: '14 Des',
      venue: 'V',
      weekday: 'Jumamosi',
      time: '10:00',
      dressCode: 'Kijani',
      code: 'KH-4826',
      pledged: 'TZS 1',
      paid: 'TZS 1',
      balance: 'TZS 0',
      lang: 'English',
      amount: 'TZS 5',
      provider: 'M-Pesa',
      seconds: 30,
      n: 2,
      group: 'Marafiki',
      kind: 'Harusi',
      kindOf: 'Harusi ya',
      target: 'TZS 1,000,000',
      collected: 'TZS 250,000',
      failed: 3,
      total: 120,
    };
    for (const [loc, msgs] of [
      ['sw', sw],
      ['en', en],
    ] as const) {
      for (const ns of ['card', 'common', 'states'] as const) {
        for (const [k, v] of Object.entries(msgs[ns])) {
          if (typeof v !== 'string') continue;
          const expected = new IntlMessageFormat(v, loc).format(values) as string;
          expect(formatIcu(v, values), `${loc}.${ns}.${k}`).toBe(expected);
        }
      }
    }
  });
});
