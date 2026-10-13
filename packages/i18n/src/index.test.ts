import { describe, expect, it } from 'vitest';
import en from './en.json';
import sw from './sw.json';
import { t } from './index';

function keys(obj: unknown, prefix = ''): string[] {
  if (!obj || typeof obj !== 'object') return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe('i18n', () => {
  it('defaults to Swahili', () => {
    expect(t('card.rsvpYes')).toBe('Nitahudhuria');
  });
  it('has the same keys in sw and en (except _meta)', () => {
    const swKeys = keys(sw).filter((k) => !k.startsWith('_meta'));
    expect(keys(en).sort()).toEqual(swKeys.sort());
  });
  it('marks Swahili as not yet reviewed by a native speaker', () => {
    expect(sw._meta.reviewed).toBe(false);
  });
  it('has no empty strings', () => {
    for (const [file, msgs] of [
      ['sw', sw],
      ['en', en],
    ] as const) {
      const empty = keys(msgs).filter((k) => {
        const v = k.split('.').reduce<unknown>((n, p) => (n as Record<string, unknown>)[p], msgs);
        return v === '';
      });
      expect(empty, file).toEqual([]);
    }
  });
});
