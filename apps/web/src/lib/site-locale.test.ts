import { describe, expect, it } from 'vitest';
import { editionOfPath, routeSiteLocale, stripSwPrefix } from './site-locale';
import { hreflangMap, localeUrl } from './seo';

const SITE = 'https://kadisasa.com';

describe('routeSiteLocale — English-default scheme', () => {
  it('serves TZ paths in English at the root', () => {
    expect(routeSiteLocale('/', '')).toEqual({ action: 'next', locale: 'en', market: 'tz' });
    expect(routeSiteLocale('/bei', '')).toEqual({ action: 'next', locale: 'en', market: 'tz' });
  });

  it('rewrites /sw paths to the same route in Swahili', () => {
    expect(routeSiteLocale('/sw', '')).toEqual({
      action: 'rewrite',
      path: '/',
      locale: 'sw',
      market: 'tz',
    });
    expect(routeSiteLocale('/sw/michango-ya-harusi', '')).toMatchObject({
      action: 'rewrite',
      path: '/michango-ya-harusi',
      locale: 'sw',
    });
  });

  it('301s /en and /en/<slug> to the canonical', () => {
    expect(routeSiteLocale('/en', '')).toEqual({ action: 'redirect', location: '/' });
    expect(routeSiteLocale('/en/bei', '')).toEqual({ action: 'redirect', location: '/bei' });
  });

  it('301s an unprefixed SW-only slug to the EN canonical', () => {
    expect(routeSiteLocale('/kadi-ya-harusi-mtandaoni', '')).toEqual({
      action: 'redirect',
      location: '/online-wedding-invitation',
    });
  });

  it('301s /sw/<EN-only slug> to the SW canonical', () => {
    expect(routeSiteLocale('/sw/online-wedding-invitation', '')).toEqual({
      action: 'redirect',
      location: '/sw/kadi-ya-harusi-mtandaoni',
    });
  });

  it('301s /en/<SW-only slug> directly to the EN canonical (single hop)', () => {
    expect(routeSiteLocale('/en/kadi-ya-harusi-mtandaoni', '')).toEqual({
      action: 'redirect',
      location: '/online-wedding-invitation',
    });
  });

  it('passes slugs that are identical in both locales through unchanged', () => {
    expect(routeSiteLocale('/privacy', '')).toEqual({ action: 'next', locale: 'en', market: 'tz' });
    expect(routeSiteLocale('/sw/privacy', '')).toEqual({
      action: 'rewrite',
      path: '/privacy',
      locale: 'sw',
      market: 'tz',
    });
  });

  it('serves Kenya in English only', () => {
    expect(routeSiteLocale('/ke', '')).toEqual({ action: 'next', locale: 'en', market: 'ke' });
    expect(routeSiteLocale('/ke/pricing', '')).toMatchObject({ locale: 'en', market: 'ke' });
  });

  it('permanently redirects the old ?lang= scheme', () => {
    expect(routeSiteLocale('/', '?lang=sw')).toEqual({ action: 'redirect', location: '/sw' });
    expect(routeSiteLocale('/bei', '?lang=sw&x=1')).toEqual({
      action: 'redirect',
      location: '/sw/bei?x=1',
    });
    expect(routeSiteLocale('/bei', '?lang=en')).toEqual({ action: 'redirect', location: '/bei' });
    expect(routeSiteLocale('/ke/pricing', '?lang=sw')).toEqual({
      action: 'redirect',
      location: '/ke/pricing',
    });
    expect(routeSiteLocale('/sw/bei', '?lang=en')).toEqual({
      action: 'redirect',
      location: '/bei',
    });
  });

  it('leaves the card, console, staff panel, sign-in and dev routes alone', () => {
    for (const p of [
      '/c/abc',
      '/s/x',
      '/k',
      '/app',
      '/ops',
      '/login',
      '/dev/states',
      '/gate-join/x',
    ])
      expect(routeSiteLocale(p, '?lang=en'), p).toBeNull();
  });

  it('strips only a whole /sw segment', () => {
    expect(stripSwPrefix('/sw')).toBe('/');
    expect(stripSwPrefix('/sw/kuhusu')).toBe('/kuhusu');
    expect(stripSwPrefix('/swahili')).toBe('/swahili');
  });
});

describe('localeUrl and hreflang — English-default', () => {
  it('puts Swahili TZ under /sw and keeps Kenya unprefixed', () => {
    expect(localeUrl('/', 'en')).toBe('/');
    expect(localeUrl('/', 'sw')).toBe('/sw');
    expect(localeUrl('/bei', 'sw')).toBe('/sw/bei');
    expect(localeUrl('/ke/pricing', 'en')).toBe('/ke/pricing');
    expect(localeUrl('/ke/pricing', 'sw')).toBe('/ke/pricing');
  });

  it('emits en-TZ, sw-TZ and x-default pointing to EN', () => {
    expect(hreflangMap('/bei')).toEqual({
      'en-TZ': `${SITE}/bei`,
      'sw-TZ': `${SITE}/sw/bei`,
      'x-default': `${SITE}/bei`,
    });
  });

  it('adds en-KE when there is a Kenya counterpart, the same from either side', () => {
    const fromTz = hreflangMap('/wedding-contributions', '/ke/wedding-contributions-guide');
    const fromKe = hreflangMap('/ke/wedding-contributions-guide', '/wedding-contributions');
    expect(fromTz).toEqual(fromKe);
    expect(fromTz['en-KE']).toBe(`${SITE}/ke/wedding-contributions-guide`);
    expect(fromTz['x-default']).toBe(`${SITE}/wedding-contributions`);
    expect(fromTz).not.toHaveProperty('sw-KE');
  });

  it('uses the Kenya page as x-default when there is no Tanzania page', () => {
    expect(hreflangMap('/ke/pricing')).toEqual({
      'en-KE': `${SITE}/ke/pricing`,
      'x-default': `${SITE}/ke/pricing`,
    });
  });
});

describe('editionOfPath — English-default', () => {
  it('tells the three editions apart, ignoring query and hash', () => {
    expect(editionOfPath('/')).toBe('en');
    expect(editionOfPath('/bei?x=1')).toBe('en');
    expect(editionOfPath('/sw')).toBe('sw');
    expect(editionOfPath('/sw/bei#faq')).toBe('sw');
    expect(editionOfPath('/swahili')).toBe('en');
    expect(editionOfPath('/ke/pricing')).toBe('ke');
  });
});
