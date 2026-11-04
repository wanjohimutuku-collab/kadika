import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { renderIndex, sitemapEntries } = await import('./sitemap');
const { editionTargets } = await import('./site-nav');

const PRIVATE = /\/(k|c|s|login|app|ops|dev)(\/|$)/;

describe('sitemaps', () => {
  it('indexes one child sitemap per edition', () => {
    const xml = renderIndex();
    for (const e of ['sw', 'en', 'ke']) expect(xml).toContain(`/sitemaps/${e}.xml</loc>`);
  });

  it('lists each edition in its own language and leaves private surfaces out', () => {
    const sw = sitemapEntries('sw');
    const en = sitemapEntries('en');
    const ke = sitemapEntries('ke');
    expect(sw.length).toBe(en.length);
    expect(sw.every((e) => !new URL(e.loc).pathname.startsWith('/en'))).toBe(true);
    expect(en.every((e) => /\/en(\/|$)/.test(new URL(e.loc).pathname))).toBe(true);
    expect(ke.every((e) => new URL(e.loc).pathname.startsWith('/ke'))).toBe(true);
    for (const e of [...sw, ...en, ...ke])
      expect(new URL(e.loc).pathname, e.loc).not.toMatch(PRIVATE);
  });

  it('pairs the two homes, and never offers Swahili for a Kenya page', () => {
    const home = sitemapEntries('ke').find((e) => new URL(e.loc).pathname === '/ke')!;
    expect(new URL(home.alternates['sw-TZ']!).pathname).toBe('/');
    for (const e of sitemapEntries('ke')) expect(e.alternates).not.toHaveProperty('sw-KE');
  });
});

describe('locale switch targets', () => {
  it('links the same page in each edition, or the other market home', () => {
    expect(editionTargets('/')).toEqual({ sw: '/', en: '/en', ke: '/ke' });
    expect(editionTargets('/bei')).toEqual({ sw: '/bei', en: '/en/bei', ke: '/ke' });
    expect(editionTargets('/michango-ya-harusi').ke).toBe('/ke/wedding-contributions-guide');
    expect(editionTargets('/ke/wedding-contributions-guide')).toMatchObject({
      sw: '/michango-ya-harusi',
      en: '/en/michango-ya-harusi',
    });
    expect(editionTargets('/ke/pricing-not-built').sw).toBe('/');
    expect(editionTargets('/ke/privacy').sw).toBe('/privacy');
  });
});
