import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import robots, { SEARCH_BOTS } from '../../app/robots';
import { SITEMAP_EDITIONS, sitemapEntries } from './sitemap';

type Rule = { allow: boolean; pattern: string };

/** A robots path pattern as Google reads it: a prefix, `*` for any run of characters, `$` for the end. */
function matches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith('$');
  const body = (anchored ? pattern.slice(0, -1) : pattern)
    .split('*')
    .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${body}${anchored ? '$' : ''}`).test(path);
}

/** Google's rule: the longest matching pattern wins, and on a tie `Allow` wins. */
function allowed(rules: Rule[], path: string): boolean {
  let best: Rule | null = null;
  for (const r of rules) {
    if (!matches(r.pattern, path)) continue;
    if (
      !best ||
      r.pattern.length > best.pattern.length ||
      (r.pattern.length === best.pattern.length && r.allow)
    )
      best = r;
  }
  return !best || best.allow;
}

const list = (v: string | string[] | undefined) => (v === undefined ? [] : [v].flat());

function rulesFor(agent: string): Rule[] {
  const groups = [robots().rules].flat();
  const group =
    groups.find((g) => list(g.userAgent).includes(agent)) ??
    groups.find((g) => list(g.userAgent).includes('*'));
  if (!group) throw new Error(`no robots group for ${agent}`);
  return [
    ...list(group.allow).map((pattern) => ({ allow: true, pattern })),
    ...list(group.disallow).map((pattern) => ({ allow: false, pattern })),
  ];
}

const sitemapPaths = SITEMAP_EDITIONS.flatMap((e) => sitemapEntries(e)).map(
  (e) => new URL(e.loc).pathname,
);

describe('robots.txt', () => {
  it.each([...SEARCH_BOTS, '*'])('lets %s crawl every sitemap URL', (agent) => {
    const rules = rulesFor(agent);
    expect(sitemapPaths.length).toBeGreaterThan(40);
    expect(sitemapPaths.filter((p) => !allowed(rules, p))).toEqual([]);
  });

  it('lets crawlers fetch the logo the structured data names', () => {
    expect(allowed(rulesFor('Googlebot'), '/icons/512.png')).toBe(true);
  });

  it.each([
    '/app',
    '/app/events',
    '/ops',
    '/c/abc',
    '/s/KH4826',
    '/k',
    '/en/k',
    '/login',
    '/api/x',
  ])('keeps %s out', (path) => {
    expect(allowed(rulesFor('Googlebot'), path)).toBe(false);
    expect(allowed(rulesFor('*'), path)).toBe(false);
  });

  it.each(['/ke', '/ke/privacy', '/kuhusu', '/kadi-ya-harusi-mtandaoni', '/en/kuhusu'])(
    'does not block %s by prefix',
    (path) => {
      expect(allowed(rulesFor('*'), path)).toBe(true);
    },
  );
});
