import { describe, expect, it } from 'vitest';
import { locales, t } from './index';

describe('i18n', () => {
  it('defaults to Swahili', () => {
    expect(t('rsvp.yes')).toBe('Nitahudhuria');
  });
  it('has the same keys in sw and en', () => {
    expect(Object.keys(locales.en).sort()).toEqual(Object.keys(locales.sw).sort());
  });
});
