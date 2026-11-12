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
    expect(sw.every((e) => new URL(e.loc).pathname.startsWith('/sw'))).toBe(true);
    expect(en.every((e) => !new URL(e.loc).pathname.startsWith('/sw'))).toBe(true);
    expect(ke.every((e) => new URL(e.loc).pathname.startsWith('/ke'))).toBe(true);
    for (const e of [...sw, ...en, ...ke])
      expect(new URL(e.loc).pathname, e.loc).not.toMatch(PRIVATE);
  });

  it('pairs the two homes, and never offers Swahili for a Kenya page', () => {
    const home = sitemapEntries('ke').find((e) => new URL(e.loc).pathname === '/ke')!;
    // x-default on a KE-only entry stays on KE; a paired KE page would also have sw-TZ.
    expect(home.alternates['x-default']).toBeDefined();
    for (const e of sitemapEntries('ke')) expect(e.alternates).not.toHaveProperty('sw-KE');
  });
});

describe('locale switch targets', () => {
  it('links the same page in each edition, or the other market home', () => {
    expect(editionTargets('/', 'en')).toEqual({ sw: '/sw', en: '/', ke: '/ke' });
    expect(editionTargets('/bei', 'en')).toEqual({ sw: '/sw/bei', en: '/bei', ke: '/ke' });
    expect(editionTargets('/wedding-contributions', 'en').ke).toBe(
      '/ke/wedding-contributions-guide',
    );
    expect(editionTargets('/ke/wedding-contributions-guide', 'en')).toMatchObject({
      sw: '/sw/michango-ya-harusi',
      en: '/wedding-contributions',
    });
    expect(editionTargets('/ke/pricing-not-built', 'en').en).toBe('/');
    expect(editionTargets('/ke/privacy', 'en').en).toBe('/privacy');
    expect(editionTargets('/ke/privacy', 'en').sw).toBe('/sw/privacy');
  });
});
