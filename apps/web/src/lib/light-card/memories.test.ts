import { describe, expect, it } from 'vitest';
import type { CardView, GuestMemoriesView } from '@harusi/api-client';
import { renderCard } from './render';
import { renderMemories, renderMemoriesUnavailable } from './memories';

const opts = {
  token: 'tok_abcdefghijklmnop',
  locale: 'sw' as const,
  domain: 'kadisasa.com',
  mode: 'api' as const,
  apiUrl: 'https://api.example',
};

const card = (over: Partial<CardView> = {}): CardView =>
  ({
    token: opts.token,
    state: 'ok',
    event: {
      id: 'e1',
      partnerA: 'Asha',
      partnerB: 'Juma',
      coupleNames: 'Asha & Juma',
      dateStart: '2026-12-05T07:00:00.000Z',
      venueName: 'Ukumbi wa Mwanga',
      venueMapUrl: '',
      dressCode: '',
      themeId: 'emerald-gold',
      coverGradient: '',
      rsvpDeadline: null,
      senderName: 'Kamati ya Harusi',
      committeePhone: '+255754000222',
      pledgesEnabled: false,
      greeting: '',
      extraNote: '',
      timezone: 'Africa/Dar_es_Salaam',
    },
    guest: {
      displayName: 'Bibi Pendo',
      partySizeAllowed: 2,
      shortCode: 'KH-4821',
      groupLabel: '',
      language: 'sw',
    },
    qrPayload: 'v1.aaaaaaaa.bbbbbbbb.2.1.c2ln',
    rsvp: { status: 'pending', partySize: null },
    pledge: null,
    rsvpOpen: true,
    eventPassed: false,
    isMock: false,
    ...over,
  }) as CardView;

const view: GuestMemoriesView = {
  card: card(),
  memories: [
    {
      id: 'm1',
      caption: 'Tulipokutana <b>',
      takenOn: '2019-03-02',
      sortOrder: 0,
      width: 1280,
      height: 853,
    },
    { id: 'm2', caption: null, takenOn: null, sortOrder: 1, width: 853, height: 1280 },
  ],
};

describe('Kumbukumbu guest page (ADR 050)', () => {
  it('lists photos with escaped captions, sizes, lazy loading and token-scoped URLs', () => {
    const html = renderMemories(view, opts);
    expect(html).toContain('noindex,nofollow');
    expect(html).toContain('Tulipokutana &lt;b&gt;');
    expect(html).not.toContain('Tulipokutana <b>');
    const base = 'https://api.example/v1/c/tok_abcdefghijklmnop/memories/m1';
    expect(html).toContain(`src="${base}/medium"`);
    // sharp on 2-3× screens: the browser picks from all three sizes
    expect(html).toContain(`srcset="${base}/thumb 320w, ${base}/medium 640w, ${base}/full 1280w"`);
    expect(html).toContain('sizes="(min-width: 32rem) 472px, calc(100vw - 40px)"');
    expect(html).toContain('href="https://api.example/v1/c/tok_abcdefghijklmnop/memories/m1/full"');
    expect(html).toContain('width="1280" height="853"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('href="/c/tok_abcdefghijklmnop"');
    expect(html).toContain('data-testid="memories-list"');
    expect(html).toContain('2 Machi 2019');
    expect(html).toContain('Picha ya kumbukumbu'); // alt text for the photo without a caption
  });

  it('carries the trust strip and the hosts in the title', () => {
    const html = renderMemories(view, opts);
    expect(html).toContain('data-testid="trust-strip"');
    expect(html).toContain('Kumbukumbu za Asha &amp; Juma');
  });

  it('can point photos elsewhere (mock mode)', () => {
    const html = renderMemories(view, { ...opts, photoUrl: (id) => `/dev/memories/${id}.webp` });
    expect(html).toContain('src="/dev/memories/m1.webp"');
  });

  it('renders the unavailable state', () => {
    const html = renderMemoriesUnavailable(opts);
    expect(html).toContain('data-testid="memories-unavailable"');
    expect(html).toContain('Ukurasa huu haupatikani kwa sasa');
  });

  it('the card links to the page only when it has photos', () => {
    expect(renderCard(card({ memoriesAvailable: true }), opts)).toContain(
      'href="/c/tok_abcdefghijklmnop/kumbukumbu"',
    );
    expect(renderCard(card({ memoriesAvailable: false }), opts)).not.toContain('card-memories');
  });
});
