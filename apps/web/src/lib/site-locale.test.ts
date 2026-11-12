import { describe, expect, it } from 'vitest';
import { editionOfPath, routeSiteLocale, stripEnPrefix } from './site-locale';
import { hreflangMap, localeUrl } from './seo';

const SITE = 'https://kadisasa.com';

describe('routeSiteLocale', () => {
  it('serves Tanzania paths in Swahili', () => {
    expect(routeSiteLocale('/', '')).toEqual({ action: 'next', locale: 'sw', market: 'tz' });
    expect(routeSiteLocale('/bei', '')).toEqual({ action: 'next', locale: 'sw', market: 'tz' });
  });

  it('rewrites /en paths to the same route in English', () => {
    expect(routeSiteLocale('/en', '')).toEqual({
      action: 'rewrite',
      path: '/',
      locale: 'en',
      market: 'tz',
    });
    expect(routeSiteLocale('/en/michango-ya-harusi', '')).toMatchObject({
      action: 'rewrite',
      path: '/michango-ya-harusi',
      locale: 'en',
    });
  });

  it('serves Kenya in English only', () => {
    expect(routeSiteLocale('/ke', '')).toEqual({ action: 'next', locale: 'en', market: 'ke' });
    expect(routeSiteLocale('/ke/pricing', '')).toMatchObject({ locale: 'en', market: 'ke' });
  });

  it('permanently redirects the old ?lang= scheme', () => {
    expect(routeSiteLocale('/', '?lang=en')).toEqual({ action: 'redirect', location: '/en' });
    expect(routeSiteLocale('/bei', '?lang=en&x=1')).toEqual({
      action: 'redirect',
      location: '/en/bei?x=1',
    });
    expect(routeSiteLocale('/bei', '?lang=sw')).toEqual({ action: 'redirect', location: '/bei' });
    expect(routeSiteLocale('/ke/pricing', '?lang=sw')).toEqual({
      action: 'redirect',
      location: '/ke/pricing',
    });
    expect(routeSiteLocale('/en/bei', '?lang=sw')).toEqual({
      action: 'redirect',
      location: '/bei',
    });
    expect(routeSiteLocale('/en/ke', '')).toEqual({ action: 'redirect', location: '/ke' });
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
    expect(routeSiteLocale('/en/login', ''), '/en/login').toBeNull();
    expect(routeSiteLocale('/en/c/abc', '')).toBeNull();
  });

  it('strips only a whole /en segment', () => {
    expect(stripEnPrefix('/en')).toBe('/');
    expect(stripEnPrefix('/en/kuhusu')).toBe('/kuhusu');
    expect(stripEnPrefix('/english')).toBe('/english');
  });
});

describe('localeUrl and hreflang', () => {
  it('puts English Tanzania under /en and keeps Kenya unprefixed', () => {
    expect(localeUrl('/', 'sw')).toBe('/');
    expect(localeUrl('/', 'en')).toBe('/en');
    expect(localeUrl('/bei', 'en')).toBe('/en/bei');
    expect(localeUrl('/ke/pricing', 'en')).toBe('/ke/pricing');
    expect(localeUrl('/ke/pricing', 'sw')).toBe('/ke/pricing');
  });

  it('emits sw-TZ, en-TZ and x-default for a Tanzania-only page', () => {
    expect(hreflangMap('/bei')).toEqual({
      'sw-TZ': `${SITE}/bei`,
      'en-TZ': `${SITE}/en/bei`,
      'x-default': `${SITE}/bei`,
    });
  });

  it('adds en-KE when there is a Kenya counterpart, the same from either side', () => {
    const fromTz = hreflangMap('/michango-ya-harusi', '/ke/wedding-contributions-guide');
    const fromKe = hreflangMap('/ke/wedding-contributions-guide', '/michango-ya-harusi');
    expect(fromTz).toEqual(fromKe);
    expect(fromTz['en-KE']).toBe(`${SITE}/ke/wedding-contributions-guide`);
    expect(fromTz['x-default']).toBe(`${SITE}/michango-ya-harusi`);
    expect(fromTz).not.toHaveProperty('sw-KE');
  });

  it('uses the Kenya page as x-default when there is no Tanzania page', () => {
    expect(hreflangMap('/ke/pricing')).toEqual({
      'en-KE': `${SITE}/ke/pricing`,
      'x-default': `${SITE}/ke/pricing`,
    });
  });
});

describe('editionOfPath', () => {
  it('tells the three editions apart, ignoring query and hash', () => {
    expect(editionOfPath('/')).toBe('sw');
    expect(editionOfPath('/bei?x=1')).toBe('sw');
    expect(editionOfPath('/en')).toBe('en');
    expect(editionOfPath('/en/bei#faq')).toBe('en');
    expect(editionOfPath('/english')).toBe('sw');
    expect(editionOfPath('/ke/pricing')).toBe('ke');
    expect(editionOfPath('/en/ke')).toBe('ke');
  });
});
