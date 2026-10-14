import { describe, expect, it } from 'vitest';
import { ALL_PAGES } from './index';

const words = (s: string) => s.trim().split(/\s+/).length;

describe('content pages', () => {
  it('has unique slugs and valid related links', () => {
    const slugs = ALL_PAGES.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const p of ALL_PAGES)
      for (const r of p.related) expect(slugs, `${p.slug} -> ${r}`).toContain(r);
  });

  it.each(ALL_PAGES.map((p) => [p.slug, p] as const))(
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
});
