import { describe, expect, it } from 'vitest';
import type { CardView } from '@harusi/api-client';
import type { CardContent } from '@harusi/schemas';
import { renderCard } from './render';

const opts = {
  token: 'tok_abcdefghijklmnop',
  locale: 'sw' as const,
  domain: 'kadisasa.com',
  mode: 'api' as const,
  apiUrl: 'http://localhost:3001',
};

function view(
  content: CardContent = {},
  over: Partial<CardView> = {},
  kind: CardView['cardKind'] = 'invitation',
): CardView {
  return {
    token: opts.token,
    state: 'ok',
    cardKind: kind,
    event: {
      id: 'e1',
      eventKind: 'Harusi',
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
      senderName: 'Familia ya Asha & Juma',
      committeePhone: '+255754000222',
      pledgesEnabled: true,
      onlinePay: false,
      greeting: '',
      extraNote: '',
      cardContent: content,
      contributionTarget: 2_000_000,
      country: 'TZ',
      currency: 'TZS',
      timezone: 'Africa/Dar_es_Salaam',
    },
    guest: {
      displayName: 'Bibi Pendo',
      partySizeAllowed: 2,
      shortCode: 'KH-4821',
      groupLabel: '',
      language: 'sw',
    },
    qrPayload: kind === 'contribution' ? null : 'v1.aaaaaaaa.bbbbbbbb.2.1.c2ln',
    rsvp: { status: 'pending', partySize: null },
    pledge: null,
    rsvpOpen: kind === 'invitation',
    eventPassed: false,
    isMock: false,
    ...over,
  } as CardView;
}

/** The page as a guest sees it: no head (meta tags) and no script data block. */
const visible = (html: string) =>
  html.replace(/<head>[\s\S]*?<\/head>/, '').replace(/<script[\s\S]*?<\/script>/g, '');

describe('customised invitation card', () => {
  it('shows the organiser’s heading, greeting, message, programme and closing', () => {
    const html = renderCard(
      view({
        invitation: {
          eyebrow: { sw: 'Karibu kwenye harusi ya mtoto wetu' },
          greeting: { sw: 'Mpendwa {guest}, familia inakukaribisha' },
          body: { sw: 'Tunamshukuru Mungu.\nTunakuomba uje na familia yako.' },
          programme: [
            { time: '10:00', title: 'Ibada' },
            { time: '13:00', title: 'Chakula' },
          ],
          venueNote: { sw: 'Ukumbi uko nyuma ya soko.' },
          dressNote: { sw: 'Rangi za kijani zinapendeza.' },
          closing: { sw: 'Asanteni sana.' },
          footerNote: { sw: 'Hakuna zawadi za pesa mlangoni.' },
          rsvpQuestion: { sw: 'Utakuja?' },
          rsvpYesLabel: { sw: 'Nitakuja' },
          rsvpNoLabel: { sw: 'Siwezi' },
        },
      }),
      opts,
    );
    expect(html).toContain('Karibu kwenye harusi ya mtoto wetu');
    expect(html).toContain('Mpendwa Bibi Pendo, familia inakukaribisha');
    expect(html).toContain('<p>Tunamshukuru Mungu.</p><p>Tunakuomba uje na familia yako.</p>');
    expect(html).toContain('data-testid="programme"');
    expect(html).toContain('<b>10:00</b><span>Ibada</span>');
    expect(html).toContain('Ukumbi uko nyuma ya soko.');
    expect(html).toContain('Rangi za kijani zinapendeza.');
    expect(html).toContain('data-testid="closing"');
    expect(html).toContain('Hakuna zawadi za pesa mlangoni.');
    expect(html).toContain('Utakuja?');
    expect(html).toMatch(/id="hp-yes"[^>]*>Nitakuja</);
    expect(html).toMatch(/id="hp-no"[^>]*>Siwezi</);
  });

  it('uses the built-in wording of the engagement and send-off categories', () => {
    const kind = (k: string) => {
      const v = view();
      v.event!.eventKind = k;
      return v;
    };
    expect(renderCard(kind('Uchumba'), opts)).toContain('uchumba wetu');
    expect(renderCard(kind('Send-off'), opts)).toContain('kuaga (send-off)');
    expect(renderCard(kind(''), opts)).not.toContain('class="msg"');
  });

  it('falls back to the other language and to the built-in text', () => {
    const html = renderCard(view({ invitation: { body: { en: 'Only in English' } } }), opts);
    expect(html).toContain('Only in English');
    const plain = renderCard(view(), opts);
    expect(plain).toContain('harusi yetu'); // built-in wedding wording
    expect(plain).toContain('Harusi ya'); // built-in eyebrow
  });

  it('hides the sections the organiser switched off', () => {
    const html = renderCard(
      view({
        invitation: { show: { map: false, dressCode: false, calendar: false, pledge: false } },
      }),
      opts,
    );
    const page = visible(html);
    expect(page).not.toContain('openstreetmap');
    expect(page).not.toContain('Mavazi');
    expect(page).not.toContain('id="hp-cal"');
    expect(page).not.toContain('data-testid="pay-link"');
    expect(renderCard(view({ invitation: { show: { rsvp: false } } }), opts)).not.toContain(
      'id="hp-yes"',
    );
    expect(renderCard(view({ invitation: { show: { qr: false } } }), opts)).not.toContain(
      'data-testid="qr-block"',
    );
  });

  it('is sent by the family: its name and the generic contact wording, not the committee’s', () => {
    const html = renderCard(
      view({ sender: { kind: 'family', name: 'Familia ya Mzee Mwinyi', phone: '0712 000 111' } }),
      opts,
    );
    expect(html).toContain('Familia ya Mzee Mwinyi');
    expect(html).toContain('Simu ya mawasiliano: 0712 000 111');
    expect(html).toContain('href="tel:0712000111"');
    expect(html).not.toContain('Simu ya kamati');
    const committee = renderCard(view({ sender: { kind: 'committee' } }), opts);
    expect(committee).toContain('Simu ya kamati');
  });

  it('lets the organiser rewrite the whole trust line', () => {
    const html = renderCard(
      view({ sender: { trustLine: { sw: 'Kadi hii imetoka kwa {sender} wenyewe' } } }),
      opts,
    );
    expect(html).toContain('Kadi hii imetoka kwa Familia ya Asha &amp; Juma wenyewe');
  });

  it('escapes everything the organiser writes', () => {
    const evil = '<img src=x onerror=alert(1)>';
    const html = renderCard(
      view({
        invitation: {
          body: { sw: evil },
          programme: [{ time: evil, title: evil }],
          closing: { sw: evil },
        },
      }),
      opts,
    );
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x');
  });
});

describe('invitation card', () => {
  it('never asks for a contribution, even with a pledge and contributions on', () => {
    const html = renderCard(
      view(
        { invitation: { show: { pledge: true } } },
        { pledge: { amount: 50_000, paid: 10_000, balance: 40_000, status: 'partial' } },
      ),
      opts,
    );
    expect(html).toContain('data-card-kind="invitation"');
    expect(html).not.toContain('data-testid="pledge-summary"');
    expect(html).not.toContain('data-testid="pay-link"');
    expect(html).not.toContain('data-testid="pay-to"');
    expect(html).not.toContain('TZS 40,000');
  });
});

describe('contribution card', () => {
  const contribution = (c: CardContent = {}, over: Partial<CardView> = {}) =>
    view(c, over, 'contribution');

  it('has no QR, no RSVP and no pay button: it says where to send the money (ADR 043)', () => {
    const html = renderCard(
      contribution({
        contribution: { payTo: [{ label: 'M-Pesa', account: '0754 111 222', name: 'Asha Juma' }] },
      }),
      opts,
    );
    expect(html).toContain('data-card-kind="contribution"');
    expect(html).toContain('Mchango wa harusi');
    expect(html).toContain('data-testid="contribution-section"');
    expect(html).not.toContain('data-testid="pay-link"');
    expect(html).toContain('data-testid="pay-to"');
    expect(html).toContain('<b>M-Pesa</b>');
    expect(html).toContain('0754 111 222');
    expect(html).toContain('(Asha Juma)');
    expect(html).toContain('Mchango unaenda moja kwa moja kwa wenyeji');
    expect(html).toContain('data-testid="contribution-target"');
    expect(html).toContain('Lengo la michango: TZS 2,000,000');
    expect(html).not.toContain('data-testid="qr-block"');
    expect(html).not.toContain('id="hp-yes"');
    expect(html).not.toContain('id="hp-rsvp-section"');
    expect(html).toContain('"cardKind":"contribution"');
    expect(html).toContain(
      'Habari Bibi Pendo. Tunakuomba uchangie katika harusi ya Asha &amp; Juma.',
    );
  });

  it('uses the organiser’s words, suggested amounts, deadline and payment note', () => {
    const html = renderCard(
      contribution({
        contribution: {
          eyebrow: { sw: 'Changia harusi ya Asha na Juma' },
          title: { sw: 'Mchango wa familia' },
          greeting: { sw: 'Karibu {guest}, tunaomba mkono wako' },
          message: { sw: 'Harusi ni gharama kubwa.\nChochote kinasaidia.' },
          payNote: { sw: 'Baada ya kulipa, hifadhi ujumbe wa uthibitisho.' },
          thanks: { sw: 'Mungu akubariki.' },
          suggestedAmounts: [10000, 25000],
          deadline: '2026-11-20',
        },
      }),
      opts,
    );
    expect(html).toContain('Changia harusi ya Asha na Juma');
    expect(html).toContain('Mchango wa familia');
    expect(html).toContain('Karibu Bibi Pendo, tunaomba mkono wako');
    expect(html).toContain('<p>Harusi ni gharama kubwa.</p><p>Chochote kinasaidia.</p>');
    // Amounts are suggestions only: there is nothing to pay on our side (ADR 043).
    expect(html).not.toContain('/pay?amount=');
    expect(html).toContain('TZS 25,000');
    expect(html).toContain('Wasiliana na kamati kujua namba ya kutuma mchango.');
    expect(html).toContain('Mwisho wa kuchangia: 20 Nov 2026');
    expect(html).toContain('Baada ya kulipa, hifadhi ujumbe wa uthibitisho.');
    expect(html).toContain('Mungu akubariki.');
  });

  it('links to the checkout only when paying through us is switched on', () => {
    const base = contribution({ contribution: { suggestedAmounts: [10000] } });
    const html = renderCard({ ...base, event: { ...base.event!, onlinePay: true } }, opts);
    expect(html).toContain('data-testid="pay-link"');
    expect(html).toContain('/pay?amount=10000');
    expect(html).not.toContain('data-testid="pay-to"');
  });

  it('shows the progress bar only when the organiser asks for it', () => {
    const quiet = renderCard(contribution({}, { contributionCollected: 500_000 }), opts);
    expect(quiet).not.toContain('role="progressbar"');
    const shown = renderCard(
      contribution(
        { contribution: { show: { progress: true } } },
        { contributionCollected: 500_000 },
      ),
      opts,
    );
    expect(shown).toContain('role="progressbar"');
    expect(shown).toContain('aria-valuenow="25"');
    expect(shown).toContain('Imekusanywa TZS 500,000 kati ya TZS 2,000,000');
  });

  it('can hide the event details and the goal, and says so when contributions are closed', () => {
    const hidden = renderCard(
      contribution({ contribution: { show: { eventDetails: false, target: false } } }),
      opts,
    );
    expect(visible(hidden)).not.toContain('Ukumbi wa Mwanga');
    expect(hidden).not.toContain('data-testid="contribution-target"');
    const closed = renderCard(
      contribution({}, { event: { ...view().event!, pledgesEnabled: false } }),
      opts,
    );
    expect(closed).toContain('Michango haipokelewi kwa sasa');
    expect(closed).not.toContain('data-testid="pay-link"');
  });

  it('says "wa" after uchumba and "wedding of" in English, never "uchumba ya" (ADR 041)', () => {
    const uchumba = { ...view().event!, eventKind: 'Uchumba' };
    const sw = renderCard(contribution({}, { event: uchumba }), opts);
    expect(visible(sw)).toContain('Tunakuomba uchangie katika uchumba wa Asha &amp; Juma');
    expect(sw).toContain('Mchango wa uchumba');
    expect(sw).not.toContain('uchumba ya');
    expect(sw).not.toContain('uchumba yetu');
    const en = renderCard(contribution({}, { event: uchumba }), { ...opts, locale: 'en' });
    expect(visible(en)).toContain('contribute to the engagement of Asha &amp; Juma');
    const invite = renderCard(view({}, { event: uchumba }), opts);
    expect(invite).toContain('Mwaliko wa Uchumba wa Asha &amp; Juma');
    expect(invite).not.toContain('Uchumba ya');
  });

  it('words the default sender in English for an English reader, but keeps the organiser’s own', () => {
    const family = { cardContent: { sender: { kind: 'family' as const } } };
    const event = { ...view().event!, ...family };
    const en = renderCard(contribution({}, { event }), { ...opts, locale: 'en' });
    expect(visible(en)).toContain('The Asha &amp; Juma family');
    expect(visible(en)).not.toContain('Familia ya');
    const sw = renderCard(contribution({}, { event }), opts);
    expect(visible(sw)).toContain('Familia ya Asha &amp; Juma');
    const own = { cardContent: { sender: { kind: 'family' as const, name: 'Kamati ya Mwanga' } } };
    const kept = renderCard(contribution({}, { event: { ...view().event!, ...own } }), {
      ...opts,
      locale: 'en',
    });
    expect(visible(kept)).toContain('Kamati ya Mwanga');
  });

  it('uses Kenya’s privacy page and the guest’s language for a Kenyan event', () => {
    const ke = renderCard(
      contribution(
        {},
        {
          event: {
            ...view().event!,
            country: 'KE',
            currency: 'KES',
            committeePhone: '+254712345678',
          },
        },
      ),
      { ...opts, locale: 'en' },
    );
    expect(ke).toContain('href="/ke/privacy"');
    // an English reader gets "wedding" for the stored "Harusi" (ADR 041)
    expect(ke).toContain('Contribution for the wedding');
    expect(ke).toContain('Contribution goal: KES 2,000,000');
  });
});
