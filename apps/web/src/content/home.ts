import { sortedTiers, type PricingCatalog } from '@harusi/schemas/billing';
import type { Currency } from '@harusi/schemas/country';
import { formatMoney, formatNumber } from '@/lib/format';
import type { SiteEdition } from '@/lib/site-nav';

/**
 * Home page copy for the three editions (kit content-tz.md and content-ke.md § Home), written to the
 * brand.md "Write like a person" checklist. Prices come from the live catalogue, never placeholders.
 *
 * Left out until they are real: "Kamati zinasema" testimonials, the proof counter, and the assisted
 * service teaser (no assisted service is offered yet).
 */

export interface HomeCopy {
  title: string;
  description: string;
  hero: { h1: string; sub: string; primary: string; secondary: string };
  answerLabel: string;
  answer: string;
  card: {
    names: string;
    date: string;
    venue: string;
    invites: string;
    code: string;
    qrLabel: string;
    numberLabel: string;
  };
  sms: { from: string; text: string };
  stepsTitle: string;
  steps: { title: string; body: string }[];
  noPhone: { h2: string; body: string; items: string[] };
  michango: {
    h2: string;
    body: string;
    items: string[];
    note: string;
    bar: { title: string; pledged: string; paid: string; total: string };
    rows: { name: string; pledged: number; paid: number }[];
  };
  gate: {
    h2: string;
    body: string;
    items: string[];
    chips: { ok: string; duplicate: string; missing: string };
  };
  trust: { title: string; items: string[]; cta: string };
  eventsTitle: string;
  /** Kenya only: where the service stands. */
  status?: { h2: string; body: string; cta: string };
  faqTitle: string;
  faq: { q: string; a: string }[];
  ctaBand: { text: string; primary: string; secondary: string };
}

interface PriceFacts {
  free: number;
  from: string;
  lowest: string;
  lowestMin: string;
  charging: boolean;
}

function priceFacts(c: PricingCatalog, currency: Currency): PriceFacts {
  const tiers = sortedTiers(c.cardTiers);
  const first = tiers[0]!;
  const last = tiers[tiers.length - 1]!;
  return {
    free: c.free.cards,
    from: formatMoney(first.price[currency], currency),
    lowest: formatMoney(last.price[currency], currency),
    lowestMin: formatNumber(last.minCards),
    charging: c.enforced,
  };
}

function sw(p: PriceFacts, domain: string): HomeCopy {
  const priceAnswer = p.charging
    ? `Kila tukio linaanza na kadi ${p.free} bure. Baada ya hapo ni ${p.from} kwa kadi, na bei inashuka hadi ${p.lowest} ukinunua kadi ${p.lowestMin} au zaidi. SMS za ziada zina vifurushi vyake.`
    : `Wakati wa majaribio huduma ni bure. Malipo yakianza, kadi itakuwa ${p.from}, na bei inashuka hadi ${p.lowest} ukinunua kadi ${p.lowestMin} au zaidi. Tutatangaza kabla.`;
  return {
    title: 'Kadi za Harusi za Kidigitali, Michango na Lango la QR | Kadi Sasa',
    description:
      'Kila mgeni anapata kadi yake kwa WhatsApp, SMS au karatasi. Kamati inaona nani amejibu, nani amechangia na nani ameingia, hata mtandao ukikatika.',
    hero: {
      h1: 'Kadi moja kwa kila mgeni. Michango wazi. Lango lisilokwama.',
      sub: 'Tuma kadi kwa WhatsApp, SMS au karatasi. Kamati inafuatilia majibu na michango, na mlangoni mnaskani hata bila mtandao.',
      primary: 'Anza bure',
      secondary: 'Nina namba ya kadi',
    },
    answerLabel: 'Kadi Sasa ni nini?',
    answer:
      'Kadi Sasa ni huduma ya Kitanzania ya kadi za mwaliko za kidijitali. Kila mgeni anapata kadi yake yenye QR na namba fupi kwa WhatsApp, SMS au karatasi. Kamati inaona majibu, michango na waliofika mlangoni, na lango linafanya kazi hata mtandao ukikatika.',
    card: {
      names: 'Asha & Juma',
      date: 'Jumamosi, 14 Des 2026 · Saa 10 jioni',
      venue: 'Ukumbi wa Mwanga, Kibaha',
      invites: 'Wanawaalika Bi. Mwanaidi Salim',
      code: 'KH-4826',
      qrLabel: 'Mfano wa QR ya kadi',
      numberLabel: 'Namba ya kadi',
    },
    sms: {
      from: 'KADISASA',
      text: `Karibu kwenye harusi ya Asha & Juma, 14 Des 2026. Kadi yako: ${domain}/s/7Hq2 Namba: KH-4826`,
    },
    stepsTitle: 'Inavyofanya kazi, kwa hatua nne',
    steps: [
      {
        title: 'Ongeza wageni',
        body: 'Andika majina, bandika orodha au chukua kutoka kwenye anwani za simu.',
      },
      {
        title: 'Tuma kadi',
        body: 'Kwa WhatsApp, SMS au karatasi. Kila mgeni anapata kadi yake mwenyewe.',
      },
      {
        title: 'Wageni wanajibu na kuchangia',
        body: 'Wanathibitisha watakuja watu wangapi. Kamati inarekodi ahadi zao.',
      },
      {
        title: 'Skani mlangoni',
        body: 'Simu ya mwanakamati yeyote inakuwa lango, hata bila mtandao.',
      },
    ],
    noPhone: {
      h2: 'Mgeni hana smartphone? Anaingia vilevile.',
      body: 'Bibi na babu hawahitaji WhatsApp. Kadi yao inawafikia kama SMS au karatasi, na mlangoni wanapatikana kwa sekunde.',
      items: [
        'SMS inayosomeka kwenye simu yoyote, hata ya tochi.',
        'Kadi ya karatasi yenye QR na namba fupi, mfano KH-4826.',
        'Mlangoni mnamtafuta kwa namba, jina au tarakimu nne za mwisho za simu yake.',
      ],
    },
    michango: {
      h2: 'Michango bila hesabu za daftari',
      body: 'Kila mgeni ana ahadi yake na kiasi alicholipa. Kabla ya kikao, mweka hazina ana ripoti tayari.',
      items: [
        'Ahadi dhidi ya walicholipa, kwa kila mgeni.',
        'Vikumbusho vya ahadi kwa SMS.',
        'Ripoti ya mweka hazina ya kusoma kwenye kikao.',
      ],
      note: 'Pesa inaenda moja kwa moja kwa wenye sherehe. Hatuchukui asilimia ya michango.',
      bar: { title: 'Michango ya Asha & Juma', pledged: 'Ahadi', paid: 'Imelipwa', total: 'Jumla' },
      rows: [
        { name: 'Bi. Mwanaidi Salim', pledged: 100_000, paid: 100_000 },
        { name: 'Mzee Hamisi Juma', pledged: 200_000, paid: 50_000 },
        { name: 'Neema Mushi', pledged: 50_000, paid: 30_000 },
      ],
    },
    gate: {
      h2: 'Lango linafanya kazi hata mtandao ukikatika',
      body: 'Orodha ya wageni inakaa ndani ya simu. Mtandao ukirudi, simu zote za lango zinasawazishana.',
      items: [
        'Kila QR inaingiza mara moja tu.',
        'Ikiskaniwa tena, simu inaonyesha saa aliyoingia na lango alilopitia.',
        'Mtu akileta picha ya QR ya mwenzake, simu inaonyesha kuwa kadi hiyo imeshatumika.',
      ],
      chips: { ok: 'Ameingia', duplicate: 'Tayari ameingia saa 6:42', missing: 'Kadi haipo' },
    },
    trust: {
      title: 'Kadi halali inaonekana hivi',
      items: [
        'Jina na simu ya kamati viko kwenye kila kadi.',
        'Hatumwombi mgeni PIN, nenosiri wala kutuma pesa kwetu.',
        `Kiungo cha kadi kinaanza na ${domain} tu.`,
      ],
      cta: 'Fungua kadi kwa namba yake',
    },
    eventsTitle: 'Kwa kila sherehe',
    faqTitle: 'Maswali tunayoulizwa',
    faq: [
      { q: 'Bei ni kiasi gani?', a: priceAnswer },
      {
        q: 'Mgeni asiye na smartphone atapataje kadi?',
        a: 'Anapata SMS yenye kiungo na namba ya kadi, au kadi ya karatasi yenye QR. Mlangoni mnamtafuta kwa namba, jina au tarakimu nne za mwisho za simu.',
      },
      {
        q: 'Mtandao ukikatika ukumbini?',
        a: 'Lango linaendelea kufanya kazi. Orodha iko kwenye simu, na skani zote zinatumwa mtandao ukirudi bila kupotea hata moja.',
      },
      {
        q: 'Michango inalipwa vipi?',
        a: 'Wageni wanalipa moja kwa moja kwa wenye sherehe kwa M-Pesa, Mixx by Yas, Airtel Money, HaloPesa au fedha taslimu. Kamati inarekodi kila malipo dhidi ya ahadi.',
      },
      {
        q: 'Mtu akipiga picha ya QR ya mwenzake?',
        a: 'QR moja inaingiza mara moja. Picha ikiskaniwa baada ya mwenye kadi kuingia, simu inaonyesha "Tayari ameingia" na saa aliyoingia.',
      },
    ],
    ctaBand: {
      text: 'Kikao kijacho, waonyeshe kamati.',
      primary: 'Anza bure',
      secondary: 'Nina namba ya kadi',
    },
  };
}

function en(p: PriceFacts, domain: string): HomeCopy {
  const priceAnswer = p.charging
    ? `Every event starts with ${p.free} free cards. After that it is ${p.from} a card, dropping to ${p.lowest} when you buy ${p.lowestMin} or more. Extra SMS reminders come in packs.`
    : `It is free during the pilot. When charging starts, a card will cost ${p.from}, dropping to ${p.lowest} when you buy ${p.lowestMin} or more. We will announce it first.`;
  return {
    title: 'Digital Wedding Cards, Michango and QR Gate Check-in | Kadi Sasa',
    description:
      'Every guest gets their own card by WhatsApp, SMS or paper. The committee sees who replied, who contributed and who came in, even when the network drops.',
    hero: {
      h1: 'One card for every guest. Michango in the open. A gate that keeps moving.',
      sub: 'Send cards by WhatsApp, SMS or paper. The committee tracks replies and pledges, and the gate scans guests in even without network.',
      primary: 'Start free',
      secondary: 'I have a card number',
    },
    answerLabel: 'What is Kadi Sasa?',
    answer:
      'Kadi Sasa is a Tanzanian service for digital invitation cards. Each guest gets their own card with a QR code and a short number by WhatsApp, SMS or paper. The committee sees replies, contributions and who has arrived, and the gate works even when the network drops.',
    card: {
      names: 'Asha & Juma',
      date: 'Saturday, 14 Dec 2026 · 4 pm',
      venue: 'Mwanga Hall, Kibaha',
      invites: 'Invite Mrs Mwanaidi Salim',
      code: 'KH-4826',
      qrLabel: 'Sample card QR code',
      numberLabel: 'Card number',
    },
    sms: {
      from: 'KADISASA',
      text: `Karibu to the wedding of Asha & Juma, 14 Dec 2026. Your card: ${domain}/s/7Hq2 Number: KH-4826`,
    },
    stepsTitle: 'How it works, in four steps',
    steps: [
      { title: 'Add guests', body: 'Type names, paste a list or pick from your phone contacts.' },
      {
        title: 'Send cards',
        body: 'By WhatsApp, SMS or paper. Every guest gets a card of their own.',
      },
      {
        title: 'Guests reply and pledge',
        body: 'They confirm how many are coming. The committee records their pledges.',
      },
      {
        title: 'Scan at the gate',
        body: 'Any committee member’s phone becomes the gate, even offline.',
      },
    ],
    noPhone: {
      h2: 'No smartphone? They still get in.',
      body: 'Grandparents don’t need WhatsApp. Their card arrives as an SMS or on paper, and the gate finds them in seconds.',
      items: [
        'An SMS that reads on any phone, even a basic one.',
        'A printed card with a QR and a short number, like KH-4826.',
        'At the gate, look them up by card number, name or the last four digits of their phone.',
      ],
    },
    michango: {
      h2: 'Michango without the notebook',
      body: 'Each guest has a pledge and an amount paid. Before every meeting the treasurer’s report is ready.',
      items: [
        'Pledged against paid, for every guest.',
        'SMS reminders for pledges.',
        'A treasurer’s report to read out at the meeting.',
      ],
      note: 'The money goes straight to the hosts. We take no percentage of contributions.',
      bar: { title: 'Asha & Juma’s michango', pledged: 'Pledged', paid: 'Paid', total: 'Total' },
      rows: [
        { name: 'Mrs Mwanaidi Salim', pledged: 100_000, paid: 100_000 },
        { name: 'Mzee Hamisi Juma', pledged: 200_000, paid: 50_000 },
        { name: 'Neema Mushi', pledged: 50_000, paid: 30_000 },
      ],
    },
    gate: {
      h2: 'The gate works even when the network drops',
      body: 'The guest list lives on the phone. When the network is back, every gate phone catches up.',
      items: [
        'Each QR lets one guest in, once.',
        'Scanned again, the phone shows the time they came in and which gate.',
        'Someone with a photo of another guest’s QR is shown as already admitted.',
      ],
      chips: { ok: 'Admitted', duplicate: 'Already admitted 6:42 pm', missing: 'Card not found' },
    },
    trust: {
      title: 'What a real card looks like',
      items: [
        'The committee’s name and phone number are on every card.',
        'We never ask a guest for a PIN, a password or to send us money.',
        `Card links only ever start with ${domain}.`,
      ],
      cta: 'Open a card by its number',
    },
    eventsTitle: 'For every celebration',
    faqTitle: 'Questions we get asked',
    faq: [
      { q: 'How much does it cost?', a: priceAnswer },
      {
        q: 'How does a guest without a smartphone get a card?',
        a: 'They get an SMS with a link and their card number, or a printed card with a QR. At the gate you find them by number, name or the last four digits of their phone.',
      },
      {
        q: 'What if the network drops at the venue?',
        a: 'The gate keeps working. The list is on the phone, and every scan is sent once the network is back, with none lost.',
      },
      {
        q: 'How are contributions paid?',
        a: 'Guests pay the hosts directly by M-Pesa, Mixx by Yas, Airtel Money, HaloPesa or cash. The committee records each payment against the pledge.',
      },
      {
        q: 'What if someone takes a photo of another guest’s QR?',
        a: 'One QR admits once. If the photo is scanned after the real guest is in, the phone shows "Already admitted" with the time.',
      },
    ],
    ctaBand: {
      text: 'Show it to the committee at the next meeting.',
      primary: 'Start free',
      secondary: 'I have a card number',
    },
  };
}

function ke(p: PriceFacts, domain: string): HomeCopy {
  return {
    title: 'Digital Wedding Invitations, Harambee & QR Check-in in Kenya | Kadi Sasa',
    description:
      'Send every guest their own card on WhatsApp or SMS, track harambee pledges on M-Pesa, and check guests in at the gate, even with no network.',
    hero: {
      h1: 'The wedding committee’s app. Invites, harambee and the gate.',
      sub: 'Every guest gets their own card on WhatsApp or SMS. The committee sees who’s coming, who’s pledged and who’s paid, and the gate works offline.',
      primary: 'Join the Kenya pilot',
      secondary: 'I have a card number',
    },
    answerLabel: 'What is Kadi Sasa?',
    answer:
      'Kadi Sasa is a digital invitation and guest check-in service for Kenyan weddings and events. Each guest gets a card with a QR code and short number on WhatsApp or SMS. Committees track RSVPs and M-Pesa harambee pledges, and the gate app checks guests in without network.',
    card: {
      names: 'Wanjiru & Otieno',
      date: 'Saturday, 12 Dec 2026 · 10 am',
      venue: 'PCEA Church, Ngong Road, Nairobi',
      invites: 'Invite Mr & Mrs Kamau',
      code: 'WK-3725',
      qrLabel: 'Sample card QR code',
      numberLabel: 'Card number',
    },
    sms: {
      from: 'KADISASA',
      text: `Karibu to the wedding of Wanjiru & Otieno, 12 Dec 2026. Your card: ${domain}/s/9Kp4 Number: WK-3725`,
    },
    stepsTitle: 'How it works',
    steps: [
      {
        title: 'Add guests',
        body: 'Paste the list from the committee WhatsApp group or pick from contacts.',
      },
      { title: 'Send cards', body: 'On WhatsApp or SMS. Every guest gets a card of their own.' },
      {
        title: 'Guests RSVP and pledge',
        body: 'They confirm plus-ones. The treasurer records each pledge.',
      },
      {
        title: 'Scan at the gate',
        body: 'Any committee member’s phone checks guests in, network or not.',
      },
    ],
    noPhone: {
      h2: 'Shosho doesn’t have a smartphone? Fine.',
      body: 'Her card arrives as an SMS or a printed card, and the gate finds her in seconds.',
      items: [
        'An SMS card that reads on any phone.',
        'A printable card with a QR and a short number.',
        'At the gate, find guests by card number, name or the last four digits of their phone.',
      ],
    },
    michango: {
      h2: 'Harambee without the notebook',
      body: 'Every pledge and every payment, per guest. Before each committee meeting, the treasurer’s report is ready.',
      items: [
        'Pledged against paid, for every guest.',
        'Guests pay to your own M-Pesa Paybill or Till.',
        'A treasurer’s report to share in the committee WhatsApp group.',
      ],
      note: 'We don’t take a cut, and we never hold the money.',
      bar: {
        title: 'Wanjiru & Otieno’s harambee',
        pledged: 'Pledged',
        paid: 'Paid',
        total: 'Total',
      },
      rows: [
        { name: 'Mr & Mrs Kamau', pledged: 20_000, paid: 20_000 },
        { name: 'Uncle Ochieng', pledged: 50_000, paid: 15_000 },
        { name: 'Achieng Atieno', pledged: 5_000, paid: 2_000 },
      ],
    },
    gate: {
      h2: 'The gate, even when the venue has no network',
      body: 'The guest list sits on the phone. When the network comes back, all gate phones sync up.',
      items: [
        'One QR, one entry.',
        'Scan it again and the phone shows who came in and when.',
        'A screenshot of someone else’s card shows up as already used.',
      ],
      chips: { ok: 'Admitted', duplicate: 'Already admitted 6:42 pm', missing: 'Card not found' },
    },
    trust: {
      title: 'How to tell a real card',
      items: [
        'The committee’s name and phone number are on every card.',
        'We never ask for your M-Pesa PIN.',
        `Card links only ever start with ${domain}.`,
      ],
      cta: 'Open a card by its number',
    },
    eventsTitle: 'Guides for Kenyan committees',
    status: {
      h2: 'Where Kenya stands',
      body: 'Kenya support is built and being tested: +254 numbers, KES, M-Pesa pledges, SMS and WhatsApp cards. It opens once live SMS and WhatsApp approvals, a payment provider and a Kenyan legal review are in place. Tell us if your committee wants to be in the first pilot.',
      cta: 'Join the Kenya pilot',
    },
    faqTitle: 'Questions committees ask',
    faq: [
      {
        q: 'How much will it cost?',
        a: `Kenya isn’t open yet. The planned price is ${p.from} a card, dropping to ${p.lowest} from ${p.lowestMin} cards, with ${p.free} free cards per event. We’ll publish the final prices before we charge anything.`,
      },
      {
        q: 'What about guests without smartphones?',
        a: 'They get the card by SMS or on paper. At the gate you find them by card number, name or the last four digits of their phone.',
      },
      {
        q: 'Will the gate work if the venue has no network?',
        a: 'Yes. The guest list is on the phone and scans sync when the network is back, with none lost.',
      },
      {
        q: 'How do pledges work with M-Pesa?',
        a: 'Guests pay to the family’s own Paybill or Till. The treasurer records each payment against the pledge, so the committee always sees who has paid and the balance.',
      },
      {
        q: 'What if someone screenshots a QR?',
        a: 'One QR admits once. If the screenshot comes after the real guest is in, the phone shows "Already admitted" with the time.',
      },
    ],
    ctaBand: {
      text: 'Show it at the next committee meeting.',
      primary: 'Join the Kenya pilot',
      secondary: 'I have a card number',
    },
  };
}

export function homeCopy(edition: SiteEdition, pricing: PricingCatalog, domain: string): HomeCopy {
  if (edition === 'ke') return ke(priceFacts(pricing, 'KES'), domain);
  const facts = priceFacts(pricing, 'TZS');
  return edition === 'sw' ? sw(facts, domain) : en(facts, domain);
}
