import { describe, expect, it } from 'vitest';
import { ALL_PAGES, counterpartOf, getPage, marketOf, pagePath, resolveRelated } from './index';

const words = (s: string) => s.trim().split(/\s+/).length;

describe('content pages', () => {
  it('has unique slugs per market, valid related links and counterparts', () => {
    const keys = ALL_PAGES.map((p) => `${marketOf(p)}:${p.slug}`);
    expect(new Set(keys).size).toBe(keys.length);
    const paths = ALL_PAGES.map(pagePath);
    expect(new Set(paths).size).toBe(paths.length);
    for (const p of ALL_PAGES) {
      for (const r of p.related) expect(resolveRelated(p, r), `${p.slug} -> ${r}`).toBeDefined();
      if (p.counterpart) {
        const c = getPage(p.counterpart.slug, p.counterpart.market);
        expect(c, `${p.slug} counterpart`).toBeDefined();
        expect(marketOf(c!)).not.toBe(marketOf(p));
      }
    }
  });

  it.each(ALL_PAGES.map((p) => [pagePath(p), p] as const))(
    '%s is complete in both languages',
    (_slug, p) => {
      for (const l of ['sw', 'en'] as const) {
        const t = p[l];
        expect(t.title.length, `${l} title`).toBeLessThanOrEqual(70);
        expect(t.description.length, `${l} description`).toBeGreaterThanOrEqual(80);
        expect(t.description.length, `${l} description`).toBeLessThanOrEqual(175);
        expect(words(t.answer), `${l} answer words`).toBeGreaterThanOrEqual(25);
        expect(words(t.answer), `${l} answer words`).toBeLessThanOrEqual(75);
        const ids = t.sections.map((s) => s.id);
        expect(new Set(ids).size).toBe(ids.length);
      }
      expect(p.sw.sections.length).toBe(p.en.sections.length);
      expect(p.sw.faq?.length ?? 0).toBe(p.en.faq?.length ?? 0);
    },
  );

  it('makes counterparts reciprocal', () => {
    for (const p of ALL_PAGES) {
      const c = counterpartOf(p);
      if (c) expect(counterpartOf(c), `${pagePath(p)} <-> ${pagePath(c)}`).toBe(p);
    }
  });
});
