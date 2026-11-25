import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { renderIndex, sitemapEntries } = await import('./sitemap');
const { editionTargets } = await import('./site-nav');

const PRIVATE = /\/(k|c|s|login|app|ops|dev)(\/|$)/;

describe('sitemaps', () => {
  it('indexes one child sitemap per edition with lastmod dates', () => {
    const xml = renderIndex();
    for (const e of ['sw', 'en', 'ke', 'ug']) expect(xml).toContain(`/sitemaps/${e}.xml</loc>`);
    expect(xml).toContain('<lastmod>2026-11-25</lastmod>');
  });

  it('gives core pages explicit lastmod dates', () => {
    const en = sitemapEntries('en');
    for (const path of ['/', '/bei', '/programu']) {
      const hit = en.find((e) => new URL(e.loc).pathname === path);
      expect(hit?.lastmod, path).toBe('2026-11-25');
    }
  });

  it('lists each edition in its own language and leaves private surfaces out', () => {
    const sw = sitemapEntries('sw');
    const en = sitemapEntries('en');
    const ke = sitemapEntries('ke');
    const ug = sitemapEntries('ug');
    expect(sw.length).toBe(en.length);
    expect(sw.every((e) => new URL(e.loc).pathname.startsWith('/sw'))).toBe(true);
    expect(en.every((e) => !new URL(e.loc).pathname.startsWith('/sw'))).toBe(true);
    expect(ke.every((e) => new URL(e.loc).pathname.startsWith('/ke'))).toBe(true);
    expect(ug.every((e) => new URL(e.loc).pathname.startsWith('/ug'))).toBe(true);
    for (const e of [...sw, ...en, ...ke, ...ug])
      expect(new URL(e.loc).pathname, e.loc).not.toMatch(PRIVATE);
  });

  it('pairs the market homes, and never offers Swahili for a Kenya or Uganda page', () => {
    const home = sitemapEntries('ke').find((e) => new URL(e.loc).pathname === '/ke')!;
    const ugHome = sitemapEntries('ug').find((e) => new URL(e.loc).pathname === '/ug')!;
    expect(home.alternates['x-default']).toBeDefined();
    expect(ugHome.alternates['en-UG']).toBeDefined();
    for (const e of sitemapEntries('ke')) expect(e.alternates).not.toHaveProperty('sw-KE');
    for (const e of sitemapEntries('ug')) expect(e.alternates).not.toHaveProperty('sw-UG');
  });
});

describe('locale switch targets', () => {
  it('links the same page in each edition, or the other market home', () => {
    expect(editionTargets('/', 'en')).toEqual({ sw: '/sw', en: '/', ke: '/ke', ug: '/ug' });
    expect(editionTargets('/bei', 'en')).toEqual({
      sw: '/sw/bei',
      en: '/bei',
      ke: '/ke',
      ug: '/ug',
    });
    expect(editionTargets('/ug', 'en')).toEqual({ sw: '/sw', en: '/', ke: '/ke', ug: '/ug' });
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
