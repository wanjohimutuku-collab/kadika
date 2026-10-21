import { describe, expect, it } from 'vitest';
import type { CardView } from '@harusi/api-client';
import { renderCard, renderProblem } from './render';

const opts = {
  token: 'tok_abcdefghijklmnop',
  locale: 'sw' as const,
  domain: 'harusipass.co.tz',
  mode: 'api' as const,
  apiUrl: 'http://localhost:3001',
};

function view(over: Partial<CardView> = {}): CardView {
  return {
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
      dressCode: 'Kijani',
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
  } as CardView;
}

describe('business brand on the guest card (ADR 036)', () => {
  const brand = { name: 'Kadi Sasa', logoSrc: '/brand/logo.svg' };

  it('shows the logo in the footer, as a small image with a fixed height and the name as its text', () => {
    const html = renderCard(view(), { ...opts, brand });
    expect(html).toContain('data-testid="card-brand"');
    expect(html).toContain('<img src="/brand/logo.svg" alt="Kadi Sasa" height="28"');
    expect(html.indexOf('card-brand')).toBeGreaterThan(html.indexOf('<footer'));
  });

  it('shows nothing when there is no logo, and works without any brand at all', () => {
    expect(
      renderCard(view(), { ...opts, brand: { name: 'Kadi Sasa', logoSrc: null } }),
    ).not.toContain('card-brand');
    expect(renderCard(view(), opts)).not.toContain('card-brand');
  });

  it('is on the problem pages too', () => {
    for (const state of ['invalid', 'reissued', 'error'] as const)
      expect(renderProblem(state, { locale: 'sw', domain: 'x', brand })).toContain('card-brand');
    expect(renderProblem('invalid', { locale: 'sw', domain: 'x' })).not.toContain('card-brand');
  });

  it('escapes the name and the address, so a hostile brand cannot break out of the markup', () => {
    const html = renderCard(view(), {
      ...opts,
      brand: { name: '"><script>alert(1)</script>', logoSrc: '/x" onerror="alert(1)' },
    });
    expect(html).not.toContain('<script>alert(1)');
    expect(html).not.toContain('onerror="alert(1)"');
    expect(html).toContain('&quot;&gt;&lt;script&gt;');
  });

  it('adds only a few hundred bytes, because the logo is linked and not inlined', () => {
    const base = renderCard(view(), opts).length;
    expect(renderCard(view(), { ...opts, brand }).length - base).toBeLessThan(400);
  });
});

describe('light guest card', () => {
  it('renders the §17.6 essentials with a black-on-white QR and the short code', () => {
    const html = renderCard(view(), opts);
    expect(html).toContain('data-testid="trust-strip"');
    expect(html).toContain('KH-4821');
    expect(html).toMatch(/<rect[^>]*fill="#FFFFFF"\/><path d="[^"]+" fill="#000000"\/>/);
    expect(html).toContain('id="hp-yes"');
    expect(html).toContain('data-testid="stop-reminders"'); // reminders opt-out (§7.4)
  });

  it('escapes guest-supplied text and keeps the data block inert', () => {
    const evil = `<img src=x onerror=alert(1)>"</script><script>alert(2)</script>`;
    const html = renderCard(
      view({
        guest: { ...view().guest!, displayName: evil },
        event: { ...view().event!, venueName: evil },
      }),
      opts,
    );
    expect(html).not.toContain('<img src=x');
    expect(html.match(/<script>alert\(2\)/g)).toBeNull();
    const json = /<script type="application\/json" id="hp-data">([\s\S]*?)<\/script>/.exec(
      html,
    )![1]!;
    expect(json).not.toContain('<');
    expect(JSON.parse(json).s.venue).toBe(evil);
  });

  it('drops cover gradients that are not a plain gradient', () => {
    const bad = renderCard(
      view({ event: { ...view().event!, coverGradient: 'red;background:url(//evil)' } }),
      opts,
    );
    expect(bad).not.toContain('evil');
    const ok = renderCard(
      view({
        event: { ...view().event!, coverGradient: 'linear-gradient(135deg, #0F5C4D, #123456)' },
      }),
      opts,
    );
    expect(ok).toContain('linear-gradient(135deg, #0F5C4D, #123456)');
  });

  it('hides the QR for a declined answer and closes RSVP after the event', () => {
    expect(renderCard(view({ rsvp: { status: 'declined', partySize: 0 } }), opts)).toMatch(
      /id="hp-qr"[^>]* hidden/,
    );
    const passed = renderCard(view({ eventPassed: true, rsvpOpen: false }), opts);
    expect(passed).not.toContain('id="hp-yes"');
  });

  it('is small: well under the 100 KB budget even before compression', () => {
    expect(Buffer.byteLength(renderCard(view(), opts))).toBeLessThan(50_000);
  });

  it('renders invalid and reissued pages in both languages', () => {
    expect(renderProblem('invalid', { locale: 'sw', domain: 'x' })).toContain(
      'Kiungo hiki si sahihi',
    );
    expect(renderProblem('reissued', { locale: 'en', domain: 'x' })).toContain(
      'data-testid="card-reissued"',
    );
  });

  it('applies the event palette to the card and ignores anything that is not a hex colour', () => {
    const palette = {
      bg: '#101820',
      surface: '#16222E',
      ink: '#F5F1E8',
      primary: '#7FD1B9',
      onPrimary: '#08241D',
      accent: '#E0B34A',
      muted: '#C9CED6',
      // junk must never reach the stylesheet
      evil: 'red;}body{display:none',
      border: 'expression(alert(1))',
    };
    const html = renderCard(view({ event: { ...view().event!, palette } }), opts);
    const css = /<style>(:root\{[^}]*\})/.exec(html)![1]!;
    expect(css).toContain('--surface:#16222E');
    expect(css).toContain('--ink:#F5F1E8');
    expect(css).toContain('--hp-primary:#7FD1B9');
    expect(css).toContain('--border:#E6DFD3'); // invalid override falls back to the preset
    expect(html).not.toContain('body{display:none');
    expect(html).not.toContain('expression(');
    expect(html).toContain('content="#7FD1B9"'); // browser theme-color follows the palette
    // the QR block stays black on white whatever the palette
    expect(html).toMatch(/<rect[^>]*fill="#FFFFFF"\/><path d="[^"]+" fill="#000000"\/>/);
  });
});
