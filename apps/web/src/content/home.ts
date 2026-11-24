import { sortedTiers, type PricingCatalog } from '@harusi/schemas/billing';
import type { Currency } from '@harusi/schemas/country';
import { formatMoney, formatNumber } from '@/lib/format';
import type { SiteEdition } from '@/lib/site-nav';
import type { AppMockupLabels } from '@/components/site/mockups';

/**
 * Home page copy for the three editions (kit content-tz.md and content-ke.md § Home), written to the
 * brand.md "Write like a person" checklist. Prices come from the live catalogue, never placeholders.
 *
 * Left out until they are real: "Kamati zinasema" testimonials, the proof counter, and the assisted
 * service teaser (no assisted service is offered yet).
 */

export interface HomeHeroFormLabels {
  names: string;
  namesPlaceholder: string;
  date: string;
  eventType: string;
  eventLabels: {
    harusi: string;
    'send-off': string;
    'kitchen-party': string;
    nikah: string;
    uchumba: string;
    kuzaliwa: string;
    mahafali: string;
    biashara: string;
  };
  themeLabel: string;
  themeNames: {
    'emerald-gold': string;
    'navy-silver': string;
    terracotta: string;
    'rose-sage': string;
  };
  downloadCta: string;
  downloadAria: string;
  shareCta: string;
  shareAria: string;
  shareDialogTitle: string;
  shareScanHint: string;
  shareCopy: string;
  shareCopied: string;
  shareClose: string;
  utilityTrayAria: string;
}

export interface TryStep {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
}

export interface TrySectionCopy {
  title: string;
  counterLabel: string;
  steps: [TryStep, TryStep, TryStep];
}

export interface FeatureRowCopy {
  eyebrow: string;
  title: string;
  bullets: [string, string, string];
  linkLabel?: string;
  linkSlug?: string;
}

export interface PricingTeaserCopy {
  title: string;
  sub: string;
  cta: string;
  footnote: string;
  comparisonLink: string;
}

export interface OccasionTabCopy {
  id: 'corporate' | 'weddings' | 'personal' | 'community';
  tabLabel: string;
  eyebrow: string;
  title: string;
  body: string;
  bullets: [string, string, string, string];
  note?: string;
  ctaLabel: string;
  demoEventType: 'biashara' | 'harusi' | 'kuzaliwa' | 'mahafali';
  demoNames: string;
  preview: {
    badge: string;
    eyebrow: string;
    title: string;
    date: string;
    venue: string;
    code: string;
    status: string;
    theme: 'navy-silver' | 'emerald-gold' | 'terracotta' | 'rose-sage';
  };
}

export interface OccasionShowcaseCopy {
  eyebrow: string;
  title: string;
  sub: string;
  secondaryCta: string;
  tabs: [OccasionTabCopy, OccasionTabCopy, OccasionTabCopy, OccasionTabCopy];
}

export interface HeroStatCardsCopy {
  guestsTitle: string;
  guestsInvited: string;
  guestsConfirmed: string;
  guestsAwaiting: string;
  michangoTitle: string;
  michangoPledged: string;
  michangoPledgedAmount: string;
  michangoReceived: string;
  michangoReceivedAmount: string;
  michangoPercent: string;
  checkedInTitle: string;
  checkedInOffline: string;
  previewEyebrow: string;
  previewDate: string;
  previewVenueLine1: string;
  previewVenueLine2: string;
  previewCodeLabel: string;
}

export interface HomeCopy {
  title: string;
  description: string;
  hero: { h1: string; sub: string; primary: string; secondary: string };
  /** One word inside hero.h1 that gets the gold-accent treatment; case-sensitive. */
  heroAccent: string;
  /** Text-only link beside the primary CTA, e.g. "See how it works" → `#jaribu-mwenyewe`. */
  heroHowLink: string;
  /** Short trust line placed tight under the hero CTA. */
  heroTrustLine: string;
  /** Six occasion labels in the hero kicker row, matched to the visitor's language. */
  kickerEvents: readonly [string, string, string, string, string, string];
  /** Labels on the three floating stat cards around the hero phone. */
  heroStatCards: HeroStatCardsCopy;
  /** Inputs on the live hero (ADR for the home overhaul). */
  formLabels: HomeHeroFormLabels;
  /** Secondary CTA label on the hero that opens the full card on /jaribu. */
  heroPreviewOpen: string;
  /** Headings for the Demo Studio island below the hero. */
  demoStudio: { eyebrow: string; title: string; sub: string };
  /** One-line trust strip under the hero. */
  trustLine: string;
  /** Three interactive steps the visitor can try before signing up. */
  trySection: TrySectionCopy;
  /** Three alternating feature rows between TrySection and PricingTeaser. */
  featureRows: [FeatureRowCopy, FeatureRowCopy, FeatureRowCopy];
  /** Promo tile shown alongside the FeatureStrip. */
  featurePromo: { title: string; body: string };
  /** Live pricing teaser shown on the home before the CTA band. */
  pricingTeaser: PricingTeaserCopy;
  /** Interactive showcase of all event categories including corporate. */
  occasionShowcase: OccasionShowcaseCopy;
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
    /** Alt text for the captured scanner screenshot (ADR 056 item 3). */
    screenshotAlt: string;
  };
  trust: { title: string; items: string[]; cta: string };
  eventsTitle: string;
  guidesEyebrow: string;
  guidesTitle: string;
  /** Kenya only: where the service stands. */
  status?: { h2: string; body: string; cta: string };
  /** Small tags shown over the section headings. */
  eyebrows: {
    hero: string;
    steps: string;
    features: string;
    app: string;
    events: string;
    faq: string;
    cta: string;
  };
  /** One reassurance line under the hero buttons. */
  heroNote: string;
  /** The organizer and gate app (Android). */
  app: {
    h2: string;
    body: string;
    items: string[];
    cta: string;
    secondary: string;
    mock: AppMockupLabels;
  };
  faqTitle: string;
  faq: { q: string; a: string }[];
  ctaBand: {
    badge: string;
    text: string;
    primary: string;
    secondary: string;
    /** Phone number input label on the CTA band's "Tuma kwa WhatsApp" composer. */
    whatsappField: string;
    whatsappCta: string;
    /** `{url}` is replaced with the demo /jaribu deep link. */
    whatsappTemplate: string;
  };
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
    title: 'Kadi za Mwaliko kwa Kila Tukio, Harusi na Kampuni | Kadi Sasa',
    description:
      'Tengeneza kadi za mwaliko wa harusi, matukio ya kampuni, makongamano, birthday na mahafali Tanzania. Tuma kwa WhatsApp, SMS au PDF, fuatilia RSVP na skani QR bila mtandao.',
    hero: {
      h1: 'Mialiko kwa kila tukio. Kuanzia harusi hadi makongamano.',
      sub: 'Tuma kadi zenye QR kwa WhatsApp, SMS au karatasi. Fuatilia majibu ya RSVP na michango, na skani wageni mlangoni hata bila mtandao.',
      primary: 'Anza bure',
      secondary: 'Nina namba ya kadi',
    },
    heroAccent: 'kila tukio',
    heroHowLink: 'Angalia jinsi inavyofanya kazi',
    heroTrustLine: 'Kadi 5 bure · Kwa harusi, sherehe na matukio ya kampuni',
    kickerEvents: ['Kampuni', 'Harusi', 'Send-off', 'Birthday', 'Mahafali', 'Kanisa'],
    heroStatCards: {
      guestsTitle: 'Orodha ya wageni',
      guestsInvited: '320 waalikwa',
      guestsConfirmed: '214 wamethibitisha',
      guestsAwaiting: '106 wanasubiriwa',
      michangoTitle: 'Michango',
      michangoPledged: 'Ahadi',
      michangoPledgedAmount: 'TZS 12M',
      michangoReceived: 'Imepokelewa',
      michangoReceivedAmount: 'TZS 8.4M',
      michangoPercent: '70% ya ahadi',
      checkedInTitle: 'Mgeni ameingia',
      checkedInOffline: 'Inafanya kazi bila mtandao',
      previewEyebrow: '~ Sherehe ya ~',
      previewDate: '14 · Desemba · 2026',
      previewVenueLine1: 'Ukumbi wa Mwanga,',
      previewVenueLine2: 'Kibaha',
      previewCodeLabel: 'Namba',
    },
    demoStudio: {
      eyebrow: 'Jaribu mwenyewe',
      title: 'Buni kadi yako mwenyewe.',
      sub: 'Badilisha majina, tarehe na mandhari. Kisha pakua au shiriki kadi ya majaribio.',
    },
    formLabels: {
      names: 'Majina au jina la tukio',
      namesPlaceholder: 'Mf. Asha & Juma au Mkutano wa Kampuni',
      date: 'Tarehe ya tukio',
      eventType: 'Aina ya tukio',
      eventLabels: {
        harusi: 'Harusi',
        'send-off': 'Send-off',
        'kitchen-party': 'Kitchen party',
        nikah: 'Nikah',
        uchumba: 'Uchumba',
        kuzaliwa: 'Siku ya kuzaliwa',
        mahafali: 'Mahafali',
        biashara: 'Biashara / Kampuni',
      },
      themeLabel: 'Mandhari',
      themeNames: {
        'emerald-gold': 'Kijani na dhahabu',
        'navy-silver': 'Buluu na fedha',
        terracotta: 'Terracotta',
        'rose-sage': 'Waridi na kijani',
      },
      downloadCta: 'Pakua picha',
      downloadAria: 'Pakua picha ya kadi',
      shareCta: 'Shiriki',
      shareAria: 'Shiriki kadi hii kwa simu yoyote',
      shareDialogTitle: 'Fungua kadi kwenye simu',
      shareScanHint: 'Changanua kwa kamera ya simu kufungua kadi',
      shareCopy: 'Nakili kiungo',
      shareCopied: 'Kimenakiliwa',
      shareClose: 'Funga',
      utilityTrayAria: 'Vitendo vya kadi ya majaribio',
    },
    heroPreviewOpen: 'Tazama kadi kamili',
    trustLine: 'Hulipi mpaka utume kadi · Ada moja · Inatumika pia bila mtandao',
    trySection: {
      title: 'Jaribu mwenyewe',
      counterLabel: 'Wathibitishaji: {n} / 320',
      steps: [
        {
          eyebrow: '01',
          title: 'Mgeni anafungua kadi',
          body: 'Ujumbe mfupi wenye kiungo kinachofanya kazi — hata kwenye simu za kawaida.',
          cta: 'Fungua kadi',
        },
        {
          eyebrow: '02',
          title: 'Mgeni anathibitisha',
          body: 'Nitahudhuria au sitahudhuria, na idadi ya watu — hakuna akaunti inayohitajika.',
          cta: 'Jaribu',
        },
        {
          eyebrow: '03',
          title: 'Lango linamsoma',
          body: 'Changanua QR bila mtandao, duplicate ikijulikana, mtu mmoja mmoja.',
          cta: 'Changanua QR',
        },
      ],
    },
    featureRows: [
      {
        eyebrow: 'Kadi',
        title: 'Kadi inayofaa kwa simu yoyote.',
        bullets: [
          'SMS ikiwa WhatsApp imeshindwa',
          'PDF ya kuchapisha',
          'Inafanya kazi offline baada ya kufunguka mara ya kwanza',
        ],
        linkLabel: 'Jifunze zaidi',
        linkSlug: 'kadi-ya-harusi-mtandaoni',
      },
      {
        eyebrow: 'Lango',
        title: 'Mlangoni, sekunde moja kwa kila mgeni.',
        bullets: [
          'Uthibitisho bila mtandao',
          'Duplicate inajulikana mara moja',
          'PIN tofauti kwa kila lango',
        ],
        linkLabel: 'Jifunze zaidi',
        linkSlug: 'lango-la-harusi-qr',
      },
      {
        eyebrow: 'Michango',
        title: 'Ahadi na malipo zinajiangalia zenyewe.',
        bullets: ['M-Pesa, Mixx, Airtel Money', 'Ripoti ya CSV', 'Siri: wewe tu ndiye unaona'],
        linkLabel: 'Jifunze zaidi',
        linkSlug: 'michango-ya-harusi',
      },
    ],
    featurePromo: {
      title: 'Kadi 5 BURE',
      body: 'Kuanza. Unalipa tu ukishaanza kutuma kadi.',
    },
    pricingTeaser: {
      title: 'Chagua kifurushi',
      sub: 'Hulipi mpaka utume kadi.',
      cta: 'Chagua',
      footnote: 'Hulipi mpaka utume kadi',
      comparisonLink: 'Linganisha vifurushi',
    },
    occasionShowcase: {
      eyebrow: 'Kwa kila aina ya tukio',
      title: 'Mwaliko unaofaa kwa harusi, sherehe au tukio la kampuni.',
      sub: 'Chagua aina ya tukio kuona jinsi kadi, majibu ya RSVP na mapokezi ya mlangoni yanavyofanya kazi.',
      secondaryCta: 'Anza bure',
      tabs: [
        {
          id: 'corporate',
          tabLabel: 'Kampuni & Makongamano',
          eyebrow: 'Matukio ya Biashara',
          title: 'Mialiko ya hadhi kwa makongamano, uzinduzi na hafla za kampuni.',
          body: 'Tuma mialiko binafsi kwa wageni wa heshima, wabia na wafanyakazi. Mapokezi yanaskani QR haraka bila kukwama hata mtandao ukisuasua.',
          bullets: [
            'Kila mgeni anapata pasi yake yenye QR na namba fupi — haiwezi kusambazwa mara mbili',
            'Orodha ya majibu (RSVP) na idadi ya wageni kwa ajili ya mapokezi na chakula',
            'Tuma kwa WhatsApp, SMS au chapisha beji na kadi za PDF',
            'Skani ya mlangoni bila mtandao kwa kutumia simu za walinzi au mapokezi',
          ],
          note: 'Kwa mialiko, majibu ya RSVP na kuingiza wageni mlangoni. Haiuzi tiketi wala kupanga viti.',
          ctaLabel: 'Jaribu kadi ya kampuni',
          demoEventType: 'biashara',
          demoNames: 'Serengeti Tech Summit',
          preview: {
            badge: 'Mgeni wa Heshima · VIP',
            eyebrow: 'Mwaliko wa Kampuni',
            title: 'Serengeti Tech Summit',
            date: '18 · Novemba · 2026',
            venue: 'Hyatt Regency, Dar es Salaam',
            code: 'KS-8042',
            status: 'RSVP · Amethibitisha',
            theme: 'navy-silver',
          },
        },
        {
          id: 'weddings',
          tabLabel: 'Harusi & Mila',
          eyebrow: 'Harusi, Send-off & Nikah',
          title: 'Kadi ya heshima kwa kila mgeni na daftari la michango.',
          body: 'Wageni wa WhatsApp, wa SMS na wazee wenye kadi za karatasi wote wanatumia mfumo mmoja. Kamati inaona ahadi, malipo na mahudhurio.',
          bullets: [
            'Tuma kwa WhatsApp, SMS kwa wasio na smartphone na PDF za A6/A5/A4',
            'Daftari la michango na ahadi bila kukata asilimia yoyote',
            'Vikumbusho vya ahadi na ripoti ya mweka hazina kwa sekunde',
            'Lango la QR lisilokwama hata ukumbini kusiwe na mtandao',
          ],
          ctaLabel: 'Jaribu kadi ya harusi',
          demoEventType: 'harusi',
          demoNames: 'Asha & Juma',
          preview: {
            badge: 'Bi. Mwanaidi Salim · ×2',
            eyebrow: '~ Sherehe ya Harusi ~',
            title: 'Asha & Juma',
            date: '14 · Desemba · 2026',
            venue: 'Ukumbi wa Mwanga, Kibaha',
            code: 'KH-4826',
            status: 'RSVP · VIP',
            theme: 'terracotta',
          },
        },
        {
          id: 'personal',
          tabLabel: 'Birthday & Mahafali',
          eyebrow: 'Sherehe Binafsi & Kitaaluma',
          title: 'Mialiko ya haraka kwa siku ya kuzaliwa, mahafali na hafla za familia.',
          body: 'Andika aina yoyote ya tukio, chagua rangi unazopenda, na tuma viungo vya mwaliko kwa marafiki na familia ndani ya dakika chache.',
          bullets: [
            'Jina la tukio unalolibuni mwenyewe (Birthday, Mahafali, Dinner)',
            'Wageni wanathibitisha idadi yao bila kufungua akaunti',
            'Zima kipengele cha michango kama tukio halihitaji michango',
            'Pakua picha ya kadi au tuma kiungo moja kwa moja WhatsApp',
          ],
          ctaLabel: 'Jaribu kadi ya sherehe',
          demoEventType: 'kuzaliwa',
          demoNames: 'Miaka 30 ya Neema',
          preview: {
            badge: 'Grace Mushi · ×2',
            eyebrow: 'Siku ya Kuzaliwa',
            title: 'Miaka 30 ya Neema',
            date: '22 · Novemba · 2026',
            venue: 'Sea Cliff Terrace, Msasani',
            code: 'KZ-1934',
            status: 'RSVP · Anakuja',
            theme: 'terracotta',
          },
        },
        {
          id: 'community',
          tabLabel: 'Kanisa & Jamii',
          eyebrow: 'Mikusanyiko & Taasisi',
          title: 'Mialiko inayomfikia kila mshiriki, hata asiye na smartphone.',
          body: 'Inafaa kwa shukrani, harambee, vikao vya jamii na matukio ya taasisi. Kila mtu anapokea SMS, WhatsApp au kadi iliyochapishwa.',
          bullets: [
            'SMS inayosomeka kwenye simu yoyote ya kawaida',
            'Kadi za karatasi za A4 zenye kadi 4 kwa kila ukurasa',
            'Ufuatiliaji wa ahadi na michango kwa uwazi kamili',
            'Kuingia mlangoni kwa namba fupi au jina la mgeni',
          ],
          ctaLabel: 'Jaribu kadi ya tukio',
          demoEventType: 'mahafali',
          demoNames: 'Shukrani ya Mwaka',
          preview: {
            badge: 'Mzee Yohana · ×1',
            eyebrow: 'Tukio la Jamii',
            title: 'Shukrani ya Mwaka',
            date: '06 · Desemba · 2026',
            venue: 'Ukumbi wa Parokia, Arusha',
            code: 'KN-5510',
            status: 'RSVP · Imethibitishwa',
            theme: 'rose-sage',
          },
        },
      ],
    },
    answerLabel: 'Kadi Sasa ni nini?',
    answer:
      'Kadi Sasa ni huduma ya Kitanzania ya kadi za mwaliko za kidijitali kwa kila aina ya tukio — kuanzia harusi, send-off, birthday na mahafali hadi mikutano, uzinduzi na hafla za kampuni. Kila mgeni anapata kadi yake yenye QR na namba fupi kwa WhatsApp, SMS au karatasi, huku mlango ukifanya kazi hata mtandao ukikatika.',
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
      screenshotAlt:
        'Picha ya simu inayoonyesha lango likimruhusu Fatuma Mwanga, watu wawili, kundi la Familia.',
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
    eventsTitle: 'Mialiko kwa kila tukio — binafsi na kampuni',
    guidesEyebrow: 'Miongozo',
    guidesTitle: 'Miongozo kwa waandaaji na kamati',
    eyebrows: {
      hero: 'Kadi za mwaliko za kidijitali · Tanzania',
      steps: 'Hatua nne',
      features: 'Kwa kila mgeni',
      app: 'Programu ya Android',
      events: 'Sherehe',
      faq: 'Maswali',
      cta: 'Kikao kijacho',
    },
    heroNote: p.charging
      ? `Kila tukio linaanza na kadi ${p.free} bure. Huhitaji kadi ya benki.`
      : 'Bure wakati wa majaribio. Huhitaji kadi ya benki kuanza.',
    app: {
      h2: 'Kamati nzima kwenye simu moja',
      body: 'Programu ya Android ni ya wenye sherehe, kamati na walinzi wa lango. Mnaongeza wageni, mnatuma kadi, mnarekodi michango na mnaskani mlangoni kwa simu ile ile.',
      items: [
        'Inafanya kazi kwenye Android 8 na kuendelea, hata simu za bei nafuu.',
        'Lango linapakua orodha mara moja, kisha linaskani bila mtandao.',
        'Mlinzi wa lango anaingia kwa kiungo na PIN. Hahitaji akaunti.',
      ],
      cta: 'Pakua programu',
      secondary: 'Tumia kwenye kivinjari',
      mock: {
        event: 'Asha & Juma',
        date: '14 Des 2026 · Kibaha',
        kpis: [
          { label: 'Waalikwa', value: '320' },
          { label: 'Wamethibitisha', value: '214' },
          { label: 'Wamefika', value: '0' },
        ],
        funnel: 'Imetumwa · Imefunguliwa · Imethibitishwa',
        michango: 'Michango',
        michangoValue: 'TZS 8.4M / 12M',
        tabs: ['Muhtasari', 'Wageni', 'Tuma', 'Lango', 'Michango'],
        gateTitle: 'Karibu ndani',
        gateName: 'Mwanaidi Salim',
        gateParty: 'Watu: 2 · Familia',
        offline: 'Nje ya mtandao',
      },
    },
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
      {
        q: 'Je, inafaa kwa send-off, birthday, mahafali au matukio ya biashara?',
        a: 'Ndiyo. Inafaa kwa harusi, send-off, kitchen party, nikah, birthday, mahafali na mialiko ya biashara. Kwa matukio ya biashara, inasimamia mialiko, majibu (RSVP) na kuingia mlangoni bila kuuza tiketi au kupanga viti.',
      },
      {
        q: 'Tunaweza kutuma kwa WhatsApp, SMS na kuchapisha pamoja?',
        a: 'Ndiyo. Kila mgeni anapata kadi yenye kiungo, namba ya kadi na QR ileile — unaweza kutuma kwa WhatsApp, kutuma SMS kwa wasio na smartphone, na kuchapisha PDF za A6, A5 au A4 kwa wazee.',
      },
    ],
    ctaBand: {
      badge: 'Tuma mialiko leo',
      text: 'Tuma kadi 5 za kwanza bure — kwa harusi, sherehe au tukio la kampuni.',
      primary: 'Anza bure',
      secondary: 'Nina namba ya kadi',
      whatsappField: 'Namba ya simu (si lazima)',
      whatsappCta: 'Tuma kwa WhatsApp',
      whatsappTemplate: 'Angalia mwaliko wa majaribio: {url}',
    },
  };
}

function en(p: PriceFacts, domain: string): HomeCopy {
  const priceAnswer = p.charging
    ? `Every event starts with ${p.free} free cards. After that it is ${p.from} a card, dropping to ${p.lowest} when you buy ${p.lowestMin} or more. Extra SMS reminders come in packs.`
    : `It is free during the pilot. When charging starts, a card will cost ${p.from}, dropping to ${p.lowest} when you buy ${p.lowestMin} or more. We will announce it first.`;
  return {
    title: 'E-Cards & Digital Invitations in Tanzania | Kadi Sasa',
    description:
      'Create digital e-cards and wedding invitations in Tanzania. Send via WhatsApp, SMS or PDF, track RSVPs & michango, and scan QR codes offline.',
    hero: {
      h1: 'Invitations for every event. From weddings to corporate galas.',
      sub: 'Send personalised QR cards by WhatsApp, SMS or paper. Track RSVPs, headcount and contributions, and check guests in at the door even without network.',
      primary: 'Start free',
      secondary: 'I have a card number',
    },
    heroAccent: 'every event',
    heroHowLink: 'See how it works',
    heroTrustLine: '5 cards free · Built for weddings, parties & corporate events',
    kickerEvents: ['Corporate', 'Wedding', 'Send-off', 'Birthday', 'Graduation', 'Church'],
    heroStatCards: {
      guestsTitle: 'Guest list',
      guestsInvited: '320 invited',
      guestsConfirmed: '214 confirmed',
      guestsAwaiting: '106 awaiting',
      michangoTitle: 'Contributions',
      michangoPledged: 'Pledged',
      michangoPledgedAmount: 'TZS 12M',
      michangoReceived: 'Received',
      michangoReceivedAmount: 'TZS 8.4M',
      michangoPercent: '70% of pledges',
      checkedInTitle: 'Guest checked in',
      checkedInOffline: 'Works offline',
      previewEyebrow: '~ Celebration of ~',
      previewDate: '14 · December · 2026',
      previewVenueLine1: 'Mwanga Hall,',
      previewVenueLine2: 'Kibaha',
      previewCodeLabel: 'Card No.',
    },
    demoStudio: {
      eyebrow: 'Try it yourself',
      title: 'Build your own card.',
      sub: 'Swap the names, date and theme. Then download or share the demo card.',
    },
    formLabels: {
      names: 'Host, couple, or event name',
      namesPlaceholder: 'e.g. Asha & Juma or Tech Summit',
      date: 'Event date',
      eventType: 'Event type',
      eventLabels: {
        harusi: 'Wedding',
        'send-off': 'Send-off',
        'kitchen-party': 'Kitchen party',
        nikah: 'Nikah',
        uchumba: 'Engagement',
        kuzaliwa: 'Birthday',
        mahafali: 'Graduation',
        biashara: 'Corporate / Business',
      },
      themeLabel: 'Theme',
      themeNames: {
        'emerald-gold': 'Emerald & Gold',
        'navy-silver': 'Navy & Silver',
        terracotta: 'Terracotta',
        'rose-sage': 'Rose & Sage',
      },
      downloadCta: 'Download card',
      downloadAria: 'Download card as image',
      shareCta: 'Share',
      shareAria: 'Share this card to any phone',
      shareDialogTitle: 'Open this card on a phone',
      shareScanHint: 'Scan with a phone camera to open the card',
      shareCopy: 'Copy link',
      shareCopied: 'Copied',
      shareClose: 'Close',
      utilityTrayAria: 'Demo card actions',
    },
    heroPreviewOpen: 'See the full card',
    trustLine: 'You don’t pay until you send · One fee · Works offline too',
    trySection: {
      title: 'Try it yourself',
      counterLabel: 'Confirmed: {n} / 320',
      steps: [
        {
          eyebrow: '01',
          title: 'The guest opens their card',
          body: 'A short message with a working link — even on a basic phone.',
          cta: 'Open card',
        },
        {
          eyebrow: '02',
          title: 'The guest confirms',
          body: 'Attending or not, and party size — no account needed.',
          cta: 'Try it',
        },
        {
          eyebrow: '03',
          title: 'The gate scans them in',
          body: 'QR verified offline, duplicates caught, one guest at a time.',
          cta: 'Scan QR',
        },
      ],
    },
    featureRows: [
      {
        eyebrow: 'Card',
        title: 'A card that works on any phone.',
        bullets: [
          'SMS falls in when WhatsApp doesn’t land',
          'Print-ready PDF',
          'Works offline once opened',
        ],
        linkLabel: 'Learn more',
        linkSlug: 'kadi-ya-harusi-mtandaoni',
      },
      {
        eyebrow: 'Gate',
        title: 'At the gate, one second per guest.',
        bullets: [
          'Offline verification',
          'Duplicates caught instantly',
          'A different PIN for every gate',
        ],
        linkLabel: 'Learn more',
        linkSlug: 'lango-la-harusi-qr',
      },
      {
        eyebrow: 'Michango',
        title: 'Pledges and payments that watch themselves.',
        bullets: ['M-Pesa, Mixx, Airtel Money', 'CSV reports', 'Private: only you see the figures'],
        linkLabel: 'Learn more',
        linkSlug: 'michango-ya-harusi',
      },
    ],
    featurePromo: {
      title: '5 FREE cards',
      body: 'To start. You only pay once you’re actually sending invitations.',
    },
    pricingTeaser: {
      title: 'Pick a pack',
      sub: 'You don’t pay until you send.',
      cta: 'Choose',
      footnote: 'You don’t pay until you send',
      comparisonLink: 'Compare packs',
    },
    occasionShowcase: {
      eyebrow: 'Built for every occasion',
      title: 'One platform for weddings, celebrations, and corporate events.',
      sub: 'Switch categories to see how your invitation pass, RSVP tracking, and door check-in adapt to each event.',
      secondaryCta: 'Start free',
      tabs: [
        {
          id: 'corporate',
          tabLabel: 'Corporate & Business',
          eyebrow: 'Conferences, Launches & Galas',
          title: 'Branded digital passes for conferences, AGMs, launches, and executive dinners.',
          body: 'Issue a unique QR pass to every delegate, VIP, or staff member. Track confirmed headcount before catering lock-in and run fast reception check-in even in basement or tent venues.',
          bullets: [
            'Unique QR pass and short code per guest — forwarded screenshots are flagged',
            'Real-time RSVP and headcount tracking with CSV guest & attendance exports',
            'Deliver via WhatsApp, SMS for feature phones, or print-ready A6/A5/A4 badges',
            'Offline-first Android reception scanner with dedicated gate PINs for staff',
          ],
          note: 'Designed for invitations, RSVPs, and reception check-in. Does not sell paid tickets or assign numbered seating.',
          ctaLabel: 'Try corporate pass',
          demoEventType: 'biashara',
          demoNames: 'Serengeti Tech Summit',
          preview: {
            badge: 'VIP Delegate · Admit 1',
            eyebrow: 'Corporate Invitation',
            title: 'Serengeti Tech Summit',
            date: '18 · November · 2026',
            venue: 'Hyatt Regency, Dar es Salaam',
            code: 'KS-8042',
            status: 'RSVP · Confirmed',
            theme: 'navy-silver',
          },
        },
        {
          id: 'weddings',
          tabLabel: 'Weddings & Traditional',
          eyebrow: 'Harusi, Send-off & Nikah',
          title: 'Respectful invitations for every guest and a clear michango ledger.',
          body: 'WhatsApp guests, SMS guests, and elders with printed cards all share one system. The committee tracks replies, pledges, and gate arrivals in real time.',
          bullets: [
            'WhatsApp links, SMS fallback, and printable A6/A5/A4 cards for elders',
            'Built-in Michango pledge & payment ledger with zero platform cut',
            'Automated pledge reminders and instant treasurer reports for meetings',
            'Offline QR gate check-in that catches duplicate or shared screenshots',
          ],
          ctaLabel: 'Try wedding card',
          demoEventType: 'harusi',
          demoNames: 'Asha & Juma',
          preview: {
            badge: 'Mrs Mwanaidi Salim · ×2',
            eyebrow: '~ Celebration of ~',
            title: 'Asha & Juma',
            date: '14 · December · 2026',
            venue: 'Mwanga Hall, Kibaha',
            code: 'KH-4826',
            status: 'RSVP · VIP',
            theme: 'terracotta',
          },
        },
        {
          id: 'personal',
          tabLabel: 'Birthdays & Graduations',
          eyebrow: 'Milestone Celebrations',
          title: 'Personalised invitations for birthdays, graduations, and private dinners.',
          body: 'Enter any event type, pick your colour theme, and send trackable links to friends and family in minutes — with no app download required for guests.',
          bullets: [
            'Custom event kind wording (Birthday, Graduation, Anniversary, Dinner)',
            'One-tap RSVP with party size — no guest account or login needed',
            'Turn off contributions when your event is invitation-only',
            'Download a shareable card image or send straight to WhatsApp',
          ],
          ctaLabel: 'Try birthday card',
          demoEventType: 'kuzaliwa',
          demoNames: "Neema's 30th",
          preview: {
            badge: 'Grace Mushi · ×2',
            eyebrow: 'Birthday Celebration',
            title: "Neema's 30th",
            date: '22 · November · 2026',
            venue: 'Sea Cliff Terrace, Msasani',
            code: 'KZ-1934',
            status: 'RSVP · Attending',
            theme: 'terracotta',
          },
        },
        {
          id: 'community',
          tabLabel: 'Church & Community',
          eyebrow: 'Faith & Institutional Gatherings',
          title: 'Invitations that reach every member — smartphone or feature phone.',
          body: 'Built for thanksgiving services, community fundraisers, alumni reunions, and institutional events. Every invitee gets a link, SMS code, or printed card.',
          bullets: [
            'Plain SMS delivery that reads clearly on any basic feature phone',
            '4-up A4 printable PDF sheets for easy local printing and handouts',
            'Optional pledge tracking for harambee and community drives',
            'Look up guests at the door by QR, short code, name, or phone digits',
          ],
          ctaLabel: 'Try community card',
          demoEventType: 'mahafali',
          demoNames: 'Annual Thanksgiving',
          preview: {
            badge: 'Elder Yohana · ×1',
            eyebrow: 'Community Gathering',
            title: 'Annual Thanksgiving',
            date: '06 · December · 2026',
            venue: 'Parish Hall, Arusha',
            code: 'KN-5510',
            status: 'RSVP · Confirmed',
            theme: 'rose-sage',
          },
        },
      ],
    },
    answerLabel: 'What is Kadi Sasa?',
    answer:
      'Kadi Sasa is a digital e-card and guest check-in platform in Tanzania for every type of event — weddings, send-offs, birthdays, graduations, community gatherings, and corporate events. Each guest gets a unique QR e-card and short code by WhatsApp, SMS or paper, while organisers track RSVPs, optional michango, and offline gate arrivals.',
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
      screenshotAlt:
        'A phone showing the gate admitting Fatuma Mwanga, party of two, from the Family group.',
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
    eventsTitle: 'Invitations for every event — personal & corporate',
    guidesEyebrow: 'Guides',
    guidesTitle: 'Guides for organisers and committees',
    eyebrows: {
      hero: 'Digital invitation cards · Tanzania',
      steps: 'Four steps',
      features: 'For every guest',
      app: 'Android app',
      events: 'Celebrations',
      faq: 'Questions',
      cta: 'Next committee meeting',
    },
    heroNote: p.charging
      ? `Every event starts with ${p.free} free cards. No bank card needed.`
      : 'Free during the pilot. No bank card needed to start.',
    app: {
      h2: 'The whole committee on one phone',
      body: 'The Android app is for the hosts, the committee and the gate team. Add guests, send cards, record contributions and scan at the door, all from the same phone.',
      items: [
        'Runs on Android 8 and newer, including low-cost phones.',
        'The gate downloads the guest list once, then scans with no network.',
        'Gate staff join with a link and a PIN. No account needed.',
      ],
      cta: 'Get the app',
      secondary: 'Use it in the browser',
      mock: {
        event: 'Asha & Juma',
        date: '14 Dec 2026 · Kibaha',
        kpis: [
          { label: 'Invited', value: '320' },
          { label: 'Confirmed', value: '214' },
          { label: 'Arrived', value: '0' },
        ],
        funnel: 'Sent · Opened · Confirmed',
        michango: 'Contributions',
        michangoValue: 'TZS 8.4M / 12M',
        tabs: ['Overview', 'Guests', 'Send', 'Gate', 'Pledges'],
        gateTitle: 'Welcome in',
        gateName: 'Mwanaidi Salim',
        gateParty: 'Party: 2 · Family',
        offline: 'Offline',
      },
    },
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
      {
        q: 'Does it work for birthdays, send-offs, graduations, or business events?',
        a: 'Yes. It works for weddings, send-offs, kitchen parties, nikah, birthdays, graduations, and corporate invitations. For business events, it handles invitations, RSVPs, and gate check-in without ticket sales or seating.',
      },
      {
        q: 'Can we send by WhatsApp, SMS, and printed cards together?',
        a: 'Yes. Every guest gets one card with the same link, short code, and QR — you can send on WhatsApp, reach feature phones by SMS, and print A6, A5, or A4 PDFs for elders.',
      },
    ],
    ctaBand: {
      badge: 'Send your invites',
      text: 'Start with 5 free cards — for your next wedding, party, or corporate event.',
      primary: 'Start free',
      secondary: 'I have a card number',
      whatsappField: 'Phone number (optional)',
      whatsappCta: 'Send on WhatsApp',
      whatsappTemplate: 'Have a look at the demo invitation: {url}',
    },
  };
}

function ke(p: PriceFacts, domain: string): HomeCopy {
  return {
    title: 'Digital Invitations for All Events, Weddings & Corporate in Kenya | Kadi Sasa',
    description:
      'Send digital invitations in Kenya for corporate events, weddings, ruracio, birthdays & graduations by WhatsApp, SMS or print. Track RSVPs, harambee pledges & scan QR offline.',
    hero: {
      h1: 'Invitations for every event. From weddings to corporate galas.',
      sub: 'Every guest gets their own QR card on WhatsApp, SMS or print. Track RSVPs, harambee pledges and reception check-in — even without network.',
      primary: 'Join the Kenya pilot',
      secondary: 'I have a card number',
    },
    heroAccent: 'every event',
    heroHowLink: 'See how it works',
    heroTrustLine: 'Kenya pilot · Weddings, parties & corporate events',
    kickerEvents: ['Corporate', 'Wedding', 'Ruracio', 'Birthday', 'Graduation', 'Church'],
    heroStatCards: {
      guestsTitle: 'Guest list',
      guestsInvited: '320 invited',
      guestsConfirmed: '214 confirmed',
      guestsAwaiting: '106 awaiting',
      michangoTitle: 'Harambee',
      michangoPledged: 'Pledged',
      michangoPledgedAmount: 'KES 1.2M',
      michangoReceived: 'Received',
      michangoReceivedAmount: 'KES 840K',
      michangoPercent: '70% of pledges',
      checkedInTitle: 'Guest checked in',
      checkedInOffline: 'Works offline',
      previewEyebrow: '~ Celebration of ~',
      previewDate: '14 · December · 2026',
      previewVenueLine1: 'Safari Park Gardens,',
      previewVenueLine2: 'Nairobi',
      previewCodeLabel: 'Card No.',
    },
    demoStudio: {
      eyebrow: 'Try it yourself',
      title: 'Build your own card.',
      sub: 'Swap the names, date and theme. Then download or share the demo card.',
    },
    formLabels: {
      names: 'Host, couple, or event name',
      namesPlaceholder: 'e.g. Wanjiru & Otieno or Nairobi Summit',
      date: 'Event date',
      eventType: 'Event type',
      eventLabels: {
        harusi: 'Wedding',
        'send-off': 'Send-off',
        'kitchen-party': 'Kitchen party',
        nikah: 'Nikah',
        uchumba: 'Engagement',
        kuzaliwa: 'Birthday',
        mahafali: 'Graduation',
        biashara: 'Corporate / Business',
      },
      themeLabel: 'Theme',
      themeNames: {
        'emerald-gold': 'Emerald & Gold',
        'navy-silver': 'Navy & Silver',
        terracotta: 'Terracotta',
        'rose-sage': 'Rose & Sage',
      },
      downloadCta: 'Download card',
      downloadAria: 'Download card as image',
      shareCta: 'Share',
      shareAria: 'Share this card to any phone',
      shareDialogTitle: 'Open this card on a phone',
      shareScanHint: 'Scan with a phone camera to open the card',
      shareCopy: 'Copy link',
      shareCopied: 'Copied',
      shareClose: 'Close',
      utilityTrayAria: 'Demo card actions',
    },
    heroPreviewOpen: 'See the full card',
    trustLine: 'Kenya pilot · One fee per card · Works offline too',
    trySection: {
      title: 'Try it yourself',
      counterLabel: 'Confirmed: {n} / 320',
      steps: [
        {
          eyebrow: '01',
          title: 'The guest opens their card',
          body: 'A short message with a working link — even on a basic phone.',
          cta: 'Open card',
        },
        {
          eyebrow: '02',
          title: 'The guest confirms',
          body: 'Attending or not, and party size — no account needed.',
          cta: 'Try it',
        },
        {
          eyebrow: '03',
          title: 'The gate scans them in',
          body: 'QR verified offline, duplicates caught, one guest at a time.',
          cta: 'Scan QR',
        },
      ],
    },
    featureRows: [
      {
        eyebrow: 'Card',
        title: 'A card that works on any phone.',
        bullets: [
          'SMS falls in when WhatsApp doesn’t land',
          'Print-ready PDF',
          'Works offline once opened',
        ],
        linkLabel: 'Learn more',
        linkSlug: 'wedding-invitation-wording',
      },
      {
        eyebrow: 'Gate',
        title: 'At the gate, one second per guest.',
        bullets: [
          'Offline verification',
          'Duplicates caught instantly',
          'A different PIN for every gate',
        ],
        linkLabel: 'Learn more',
        linkSlug: 'wedding-committee-guide',
      },
      {
        eyebrow: 'Harambee',
        title: 'Pledges and payments that watch themselves.',
        bullets: [
          'M-Pesa Paybill or Till',
          'CSV reports',
          'Private: only the committee sees figures',
        ],
        linkLabel: 'Learn more',
        linkSlug: 'wedding-contributions-guide',
      },
    ],
    featurePromo: {
      title: 'Join the Kenya pilot',
      body: 'Early committees ride along at zero cost while we shape the service.',
    },
    pricingTeaser: {
      title: 'Pick a pack',
      sub: 'You only pay for the cards you send.',
      cta: 'Choose',
      footnote: 'Kenya pricing is being finalised',
      comparisonLink: 'Compare packs',
    },
    occasionShowcase: {
      eyebrow: 'Built for every occasion',
      title: 'One platform for weddings, celebrations, and corporate events.',
      sub: 'Switch categories to see how your invitation pass, RSVP tracking, and door check-in adapt to each event.',
      secondaryCta: 'Join the Kenya pilot',
      tabs: [
        {
          id: 'corporate',
          tabLabel: 'Corporate & Business',
          eyebrow: 'Conferences, Launches & Galas',
          title: 'Branded digital passes for conferences, AGMs, launches, and executive dinners.',
          body: 'Issue a unique QR pass to every delegate, VIP, or staff member. Track confirmed headcount and run fast reception check-in even offline.',
          bullets: [
            'Unique QR pass and short code per guest — forwarded screenshots are flagged',
            'Real-time RSVP and headcount tracking with CSV guest & attendance exports',
            'Deliver via WhatsApp, SMS for feature phones, or print-ready badges',
            'Offline-first Android reception scanner with dedicated gate PINs for staff',
          ],
          note: 'Designed for invitations, RSVPs, and reception check-in. Does not sell paid tickets or assign numbered seating.',
          ctaLabel: 'Try corporate pass',
          demoEventType: 'biashara',
          demoNames: 'Nairobi FinTech Forum',
          preview: {
            badge: 'VIP Delegate · Admit 1',
            eyebrow: 'Corporate Invitation',
            title: 'Nairobi FinTech Forum',
            date: '18 · November · 2026',
            venue: 'Kempinski, Westlands',
            code: 'KS-8042',
            status: 'RSVP · Confirmed',
            theme: 'navy-silver',
          },
        },
        {
          id: 'weddings',
          tabLabel: 'Weddings & Ruracio',
          eyebrow: 'Weddings, Ruracio & Send-offs',
          title: 'Respectful invitations for every guest and a clear harambee ledger.',
          body: 'WhatsApp guests, SMS guests, and elders with printed cards all share one system. The committee tracks replies, pledges, and gate arrivals.',
          bullets: [
            'WhatsApp links, SMS fallback, and printable cards for elders',
            'Built-in Harambee pledge & M-Pesa payment ledger with zero platform cut',
            'Automated pledge reminders and instant treasurer reports',
            'Offline QR gate check-in that catches duplicate screenshots',
          ],
          ctaLabel: 'Try wedding card',
          demoEventType: 'harusi',
          demoNames: 'Wanjiru & Otieno',
          preview: {
            badge: 'Mr & Mrs Kamau · ×2',
            eyebrow: '~ Celebration of ~',
            title: 'Wanjiru & Otieno',
            date: '12 · December · 2026',
            venue: 'Safari Park Gardens, Nairobi',
            code: 'WK-3725',
            status: 'RSVP · VIP',
            theme: 'terracotta',
          },
        },
        {
          id: 'personal',
          tabLabel: 'Birthdays & Graduations',
          eyebrow: 'Milestone Celebrations',
          title: 'Personalised invitations for birthdays, graduations, and family dinners.',
          body: 'Enter any event type, pick your colour theme, and send trackable links to friends and family in minutes — no app download required.',
          bullets: [
            'Custom event kind wording (Birthday, Graduation, Anniversary, Dinner)',
            'One-tap RSVP with party size — no guest account needed',
            'Turn off harambee when your event is invitation-only',
            'Download a shareable card image or send straight to WhatsApp',
          ],
          ctaLabel: 'Try birthday card',
          demoEventType: 'kuzaliwa',
          demoNames: "Achieng's 30th",
          preview: {
            badge: 'Brian Ochieng · ×2',
            eyebrow: 'Birthday Celebration',
            title: "Achieng's 30th",
            date: '22 · November · 2026',
            venue: 'Karen Blixen Gardens',
            code: 'KZ-1934',
            status: 'RSVP · Attending',
            theme: 'terracotta',
          },
        },
        {
          id: 'community',
          tabLabel: 'Church & Community',
          eyebrow: 'Faith & Institutional Gatherings',
          title: 'Invitations that reach every member — smartphone or feature phone.',
          body: 'Built for thanksgiving services, community fundraisers, and institutional events. Every invitee gets a link, SMS code, or printed card.',
          bullets: [
            'Plain SMS delivery that reads clearly on any basic feature phone',
            '4-up A4 printable PDF sheets for easy local printing',
            'Optional pledge tracking for harambee and community drives',
            'Look up guests at the door by QR, short code, name, or phone digits',
          ],
          ctaLabel: 'Try community card',
          demoEventType: 'mahafali',
          demoNames: 'Annual Thanksgiving',
          preview: {
            badge: 'Elder Mwangi · ×1',
            eyebrow: 'Community Gathering',
            title: 'Annual Thanksgiving',
            date: '06 · December · 2026',
            venue: 'PCEA Hall, Ngong Road',
            code: 'KN-5510',
            status: 'RSVP · Confirmed',
            theme: 'rose-sage',
          },
        },
      ],
    },
    answerLabel: 'What is Kadi Sasa?',
    answer:
      'Kadi Sasa is a digital invitation and guest check-in service for every type of event in Kenya — weddings, ruracio, birthdays, graduations, community gatherings, and corporate events. Each guest gets a card with a QR code and short number on WhatsApp, SMS or paper, while organisers track RSVPs, optional harambee pledges, and offline gate arrivals.',
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
      screenshotAlt:
        'A phone showing the gate admitting Fatuma Mwanga, party of two, from the Family group.',
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
    guidesEyebrow: 'Guides',
    guidesTitle: 'Guides for Kenyan committees',
    status: {
      h2: 'Where Kenya stands',
      body: 'Kenya support is built and being tested: +254 numbers, KES, M-Pesa pledges, SMS and WhatsApp cards. It opens once live SMS and WhatsApp approvals, a payment provider and a Kenyan legal review are in place. Tell us if your committee wants to be in the first pilot.',
      cta: 'Join the Kenya pilot',
    },
    eyebrows: {
      hero: 'Digital invitation cards · Kenya',
      steps: 'Four steps',
      features: 'For every guest',
      app: 'Android app',
      events: 'Celebrations',
      faq: 'Questions',
      cta: 'Next committee meeting',
    },
    heroNote: 'Kenya is in pilot. Tell us about your event and we will set you up.',
    app: {
      h2: 'The whole committee on one phone',
      body: 'The Android app is for the hosts, the committee and the gate team. Add guests, send cards, record contributions and scan at the door, all from the same phone.',
      items: [
        'Runs on Android 8 and newer, including low-cost phones.',
        'The gate downloads the guest list once, then scans with no network.',
        'Gate staff join with a link and a PIN. No account needed.',
      ],
      cta: 'Get the app',
      secondary: 'Join the Kenya pilot',
      mock: {
        event: 'Wanjiku & Otieno',
        date: '6 Dec 2026 · Limuru',
        kpis: [
          { label: 'Invited', value: '320' },
          { label: 'Confirmed', value: '214' },
          { label: 'Arrived', value: '0' },
        ],
        funnel: 'Sent · Opened · Confirmed',
        michango: 'Harambee',
        michangoValue: 'KES 640K / 900K',
        tabs: ['Overview', 'Guests', 'Send', 'Gate', 'Pledges'],
        gateTitle: 'Welcome in',
        gateName: 'Mama Akinyi',
        gateParty: 'Party: 2 · Family',
        offline: 'Offline',
      },
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
      {
        q: 'Can we use it for ruracio, birthdays, graduations, or corporate events?',
        a: 'Yes. It supports weddings, ruracio, send-offs, birthdays, graduations, and corporate invitations. For business events, it handles invitations, RSVPs, and gate check-in without ticket sales or seating.',
      },
    ],
    ctaBand: {
      badge: 'Invite your guests',
      text: 'Start free with your next wedding, party, or corporate event.',
      primary: 'Join the Kenya pilot',
      secondary: 'I have a card number',
      whatsappField: 'Phone number (optional)',
      whatsappCta: 'Send on WhatsApp',
      whatsappTemplate: 'Have a look at the demo invitation: {url}',
    },
  };
}

function ug(p: PriceFacts, domain: string): HomeCopy {
  const base = ke(p, domain);
  return {
    ...base,
    title: 'E-Cards & Digital Wedding Invitations in Uganda | Kadi Sasa',
    description:
      'Send digital wedding and Kwanjula e-cards in Uganda by WhatsApp, SMS or print. Track RSVPs, digital pledge cards in UGX & scan QR codes offline at the gate.',
    hero: {
      ...base.hero,
      sub: 'Every guest gets their own QR e-card on WhatsApp, SMS or print. Track RSVPs, UGX pledge cards and reception check-in — even without network.',
      primary: 'Join the Uganda pilot',
    },
    heroTrustLine: 'Uganda pilot · Kwanjula, Kuhingira, weddings & corporate events',
    kickerEvents: ['Kwanjula', 'Wedding', 'Kuhingira', 'Birthday', 'Graduation', 'Corporate'],
    heroStatCards: {
      ...base.heroStatCards,
      michangoTitle: 'Pledges',
      michangoPledgedAmount: 'UGX 12M',
      michangoReceivedAmount: 'UGX 8.4M',
      previewVenueLine1: 'Serena Gardens,',
      previewVenueLine2: 'Kampala',
    },
    formLabels: {
      ...base.formLabels,
      namesPlaceholder: 'e.g. Namukasa & Kato or Kampala Summit',
    },
    trustLine: 'Uganda planned · One fee per card · Works offline too',
    featureRows: [
      { ...base.featureRows[0], linkSlug: 'kwanjula-kuhingira-digital-invitation' },
      { ...base.featureRows[1], linkSlug: 'uganda-wedding-committee-guide' },
      {
        eyebrow: 'Pledge cards',
        title: 'UGX pledges and payments that watch themselves.',
        bullets: [
          'MTN MoMo & Airtel Money records',
          'CSV reports',
          'Private: only you see the figures',
        ],
        linkLabel: 'Learn more',
        linkSlug: 'uganda-wedding-pledge-cards-guide',
      },
    ],
    answer:
      'Kadi Sasa is a digital e-card and guest check-in service for Ugandan celebrations — weddings, Kwanjula, Kuhingira, birthdays, graduations, and corporate events. Each guest gets a card with a QR code and short number on WhatsApp, SMS or paper, while committees track RSVPs, UGX pledge cards, and offline gate arrivals.',
    card: {
      ...base.card,
      venue: 'Serena Gardens, Kampala',
      invites: 'Invite Namukasa Sarah',
    },
    michango: {
      ...base.michango,
      body: 'Every guest has a pledge in UGX and what they have paid. Before the meeting, the treasurer has the report.',
      rows: [
        { name: 'Ssenga Grace', pledged: 500_000, paid: 500_000 },
        { name: 'Mr. Kato David', pledged: 1_000_000, paid: 300_000 },
        { name: 'Sarah Nambi', pledged: 250_000, paid: 150_000 },
      ],
    },
    eventsTitle: 'Guides for Ugandan committees',
    guidesTitle: 'Guides for Ugandan committees',
    status: {
      h2: 'Where Uganda stands',
      body: 'Kadi Sasa is live as a pilot in Tanzania. Uganda support (+256 numbers, UGX, MTN MoMo and Airtel Money pledge tracking, and Kwanjula/Kuhingira templates) is planned and not open yet. Tell us if your committee or planning team wants to join the first Uganda pilot.',
      cta: 'Join the Uganda pilot',
    },
    eyebrows: { ...base.eyebrows, hero: 'Digital e-cards · Uganda' },
    heroNote: 'Uganda is planned. Tell us about your event to join the early pilot list.',
    app: {
      ...base.app,
      secondary: 'Join the Uganda pilot',
      mock: {
        ...base.app.mock,
        event: 'Namukasa & Kato',
        date: '12 Dec 2026 · Kampala',
        michango: 'Pledges',
        michangoValue: 'UGX 8.4M / 12M',
      },
    },
    faq: [
      {
        q: 'Can we use Kadi Sasa in Uganda now?',
        a: 'Not yet. Kadi Sasa is live in Tanzania, and Uganda support (+256, UGX, MTN MoMo & Airtel Money workflows) is planned. Contact us if you want early access for the Uganda pilot.',
      },
      {
        q: 'Does it work for Kwanjula, Kuhingira, and church weddings?',
        a: 'Yes. You can run separate guest lists, wording, RSVP tracking, and gate check-in for Kwanjula, Kuhingira, nikah, church weddings, and corporate events.',
      },
      {
        q: 'Can we still give printed cards to elders?',
        a: 'Yes. Export print-ready PDFs with the exact same QR code and short number for elders, while younger guests and diaspora relatives receive WhatsApp e-cards.',
      },
    ],
    ctaBand: { ...base.ctaBand, primary: 'Join the Uganda pilot' },
  };
}

export function homeCopy(edition: SiteEdition, pricing: PricingCatalog, domain: string): HomeCopy {
  if (edition === 'ke') return ke(priceFacts(pricing, 'KES'), domain);
  if (edition === 'ug') return ug(priceFacts(pricing, 'KES'), domain);
  const facts = priceFacts(pricing, 'TZS');
  return edition === 'sw' ? sw(facts, domain) : en(facts, domain);
}
