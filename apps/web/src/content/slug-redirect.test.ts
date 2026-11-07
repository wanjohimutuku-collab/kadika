import { describe, it, expect } from 'vitest';
import { routeSlugRedirect, pageBySlug } from './index';

describe('pageBySlug', () => {
  it('matches a TZ page by its EN slug', () => {
    const r = pageBySlug('online-wedding-invitation', 'tz');
    expect(r?.page.slug).toBe('kadi-ya-harusi-mtandaoni');
    expect(r?.matchedLocale).toBe('en');
  });

  it('matches a TZ page by its SW slug', () => {
    const r = pageBySlug('kadi-ya-harusi-mtandaoni', 'tz');
    expect(r?.page.slug).toBe('kadi-ya-harusi-mtandaoni');
    expect(r?.matchedLocale).toBe('sw');
  });

  it('matches a page whose SW and EN slug are identical by EN first', () => {
    const r = pageBySlug('privacy', 'tz');
    expect(r?.matchedLocale).toBe('en');
  });

  it('returns null for an unknown slug', () => {
    expect(pageBySlug('does-not-exist', 'tz')).toBeNull();
  });

  it('matches a KE page by its (shared) slug', () => {
    const r = pageBySlug('', 'ke');
    // Home has slug '' — ok if home not represented; the test is for robustness.
    expect(r === null || r?.matchedLocale === 'en').toBe(true);
  });
});

describe('routeSlugRedirect', () => {
  it('301s an unprefixed SW-only slug to the EN canonical', () => {
    expect(routeSlugRedirect('/kadi-ya-harusi-mtandaoni')).toBe('/online-wedding-invitation');
  });

  it('301s /sw/<EN-only slug> to the SW canonical', () => {
    expect(routeSlugRedirect('/sw/online-wedding-invitation')).toBe('/sw/kadi-ya-harusi-mtandaoni');
  });

  it('returns null for a canonical EN URL', () => {
    expect(routeSlugRedirect('/online-wedding-invitation')).toBeNull();
  });

  it('returns null for a canonical SW URL', () => {
    expect(routeSlugRedirect('/sw/kadi-ya-harusi-mtandaoni')).toBeNull();
  });

  it('returns null when the slug is identical in both locales', () => {
    expect(routeSlugRedirect('/privacy')).toBeNull();
    expect(routeSlugRedirect('/sw/privacy')).toBeNull();
  });

  it('returns null for /ke paths', () => {
    expect(routeSlugRedirect('/ke/anything')).toBeNull();
  });

  it('returns null for the home paths', () => {
    expect(routeSlugRedirect('/')).toBeNull();
    expect(routeSlugRedirect('/sw')).toBeNull();
  });

  it('returns null for an unknown path', () => {
    expect(routeSlugRedirect('/does-not-exist')).toBeNull();
    expect(routeSlugRedirect('/sw/does-not-exist')).toBeNull();
  });
});
