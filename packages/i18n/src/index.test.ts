import { describe, expect, it } from 'vitest';
import en from './en.json';
import sw from './sw.json';
import { messages, messagesFor, pickMessages, t, variants } from './index';

function keys(obj: unknown, prefix = ''): string[] {
  if (!obj || typeof obj !== 'object') return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe('i18n', () => {
  it('defaults to English and still serves Swahili on request', () => {
    expect(t('card.rsvpYes')).toBe('I will attend');
    expect(t('card.rsvpYes', 'sw')).toBe('Nitahudhuria');
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

describe('country variants (ADR 028)', () => {
  const leaves = (o: unknown, p: string[] = []): { path: string[]; v: string }[] =>
    typeof o === 'string'
      ? [{ path: p, v: o }]
      : o && typeof o === 'object'
        ? Object.entries(o).flatMap(([k, v]) => leaves(v, [...p, k]))
        : [];
  const at = (o: unknown, path: string[]) =>
    path.reduce<unknown>((n, k) => (n as Record<string, unknown> | undefined)?.[k], o);
  const params = (s: string) => [...s.matchAll(/\{(\w+)/g)].map((m) => m[1]).sort();

  it('only overrides keys that exist in the base text, with the same parameters', () => {
    for (const locale of ['sw', 'en'] as const) {
      for (const country of ['KE'] as const) {
        for (const { path, v } of leaves(variants[country][locale])) {
          const base = at(messages[locale], path);
          expect(typeof base, `${country}.${locale}.${path.join('.')}`).toBe('string');
          expect(params(v), `${country}.${locale}.${path.join('.')}`).toEqual(
            params(base as string),
          );
        }
      }
    }
  });

  it('leaves Tanzania untouched and merges Kenya on top', () => {
    expect(messagesFor('en', 'TZ')).toBe(messages.en);
    expect(messagesFor('en')).toBe(messages.en);
    expect(messagesFor('en', 'KE').pay.amount).toBe('Amount (KES)');
    expect(messagesFor('en', 'KE').pay.title).toBe(messages.en.pay.title);
    expect(messagesFor('sw', 'KE').pledges.amount).toBe('Kiasi (KES)');
    expect(messages.en.pay.amount).toBe('Amount (TZS)');
  });

  it('picks namespaces with the country wording', () => {
    expect(pickMessages('en', ['pay'], 'KE').pay.amount).toBe('Amount (KES)');
    expect(pickMessages('en', ['pay']).pay.amount).toBe('Amount (TZS)');
  });
});
