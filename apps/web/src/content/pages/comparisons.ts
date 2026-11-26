import type { ContentPageDef } from '../types';

const UPDATED = '2026-11-26';

/**
 * Honest comparison and total-cost guides (Prompt 6). Comparisons use categories only (never
 * named negative competitor claims), state Kadi Sasa prices from /bei exactly (5 free cards;
 * TZS 2,400 / 2,200 / 1,950; 0% cut on michango), and mark unverified category claims with [VERIFY].
 */
export const COMPARISON_PAGES: ContentPageDef[] = [
  {
    slug: 'kadi-sasa-vs-karatasi-na-zana-za-kubuni',
    slugEn: 'kadi-sasa-vs-paper-vs-design-tools',
    group: 'guide',
    schema: 'Article',
    published: UPDATED,
    updated: UPDATED,
    related: [
      'gharama-halisi-za-huduma-ya-mialiko',
      'kadi-ya-harusi-mtandaoni',
      'lango-la-harusi-qr',
      'usalama-wa-kadi-za-mtandaoni',
    ],
    sw: {
      nav: 'Kadi Sasa vs karatasi na zana',
      title: 'Kadi Sasa vs Kadi za Karatasi na Zana za Kubuni',
      description:
        'Linganisha Kadi Sasa, kadi za karatasi za kuchapisha na zana za kubuni picha kwa gharama, kurekebisha taarifa, kufikia wazee, RSVP na udhibiti wa lango.',
      h1: 'Kadi Sasa vs kadi za karatasi vs zana za kubuni picha',
      answer:
        'Kadi za karatasi zinawafikia wazee lakini ni vigumu kurekebisha makosa au kufuatilia majibu; zana za kubuni picha zinatengeneza picha nzuri haraka lakini hazina QR ya kipekee kwa kila mgeni, SMS wala ukaguzi wa mlango. Kadi Sasa inaunganisha WhatsApp, SMS, PDF ya kuchapisha, RSVP, michango bila makato na lango la QR lisilohitaji mtandao.',
      sections: [
        {
          id: 'jedwali-linganishi',
          h2: 'Ulinganisho wa moja kwa moja kwa vigezo vitano muhimu',
          blocks: [
            {
              t: 'table',
              head: ['Kigezo', 'Kadi Sasa', 'Kadi za karatasi pekee', 'Zana za kubuni picha (picha/PDF)'],
              rows: [
                [
                  'Gharama ya kadi',
                  'Kadi 5 bure; kisha TZS 2,400 (1–99), TZS 2,200 (100–499), TZS 1,950 (500+) kwa kadi',
                  'Uchapishaji na bahasha hugharimu kwa kila nakala pamoja na usambazaji [VERIFY]',
                  'Bure au ada ya mwezi ya kubuni picha pekee; hakuna SMS wala mfumo wa lango [VERIFY]',
                ],
                [
                  'Kasi ya kubadilisha taarifa',
                  'Saa au ukumbi ukibadilika, unasasisha mara moja na viungo vyote vinabadilika papo hapo',
                  'Makosa au mabadiliko ya ukumbi huhitaji kuchapisha tena [VERIFY]',
                  'Unapaswa kuhariri picha, kuhamisha tena na kutuma upya kwenye makundi [VERIFY]',
                ],
                [
                  'Kuwafikia wazee wasio na smartphone',
                  'SMS yenye namba fupi + PDF za A6/A5/A4 za kuchapisha kwa wazee',
                  'Nzuri kwa kuwapa wazee mkononi, lakini gharama hupanda kwa wageni wa mbali [VERIFY]',
                  'Picha za WhatsApp hazimfikii mgeni mwenye simu ya kawaida [VERIFY]',
                ],
                [
                  'Ufuatiliaji wa RSVP na viti',
                  'Majibu ya moja kwa moja, idadi ya watu na hali ya kila kadi',
                  'Unahitaji kupiga simu au kuweka daftari la mkono [VERIFY]',
                  'Hakuna ufuatiliaji wa RSVP; picha moja hutumwa kwa wote [VERIFY]',
                ],
                [
                  'Udhibiti wa lango ukumbini',
                  'Programu ya Android inayofanya kazi bila mtandao, ikizuia QR zilizotumika',
                  'Kadi ya karatasi inaweza kughushiwa au kuletwa bila orodha ya pamoja [VERIFY]',
                  'Picha ya mwaliko husambazwa kwa urahisi; hakuna skani ya kipekee [VERIFY]',
                ],
              ],
            },
          ],
        },
        {
          id: 'gharama-na-marekebisho',
          h2: 'Gharama na kasi ya kurekebisha taarifa',
          blocks: [
            {
              t: 'p',
              text: 'Kwenye maandalizi ya harusi au send-off, tarehe, saa ya ibada au ukumbi vinaweza kubadilika wiki chache kabla ya tukio. Kwenye kadi za karatasi pekee, mabadiliko baada ya kuchapisha yanamaanisha gharama mpya ya uchapishaji na usambazaji wa pili [VERIFY]. Kwenye zana za kubuni picha, kamati inalazimika kutengeneza picha mpya na kuifuta ya zamani katika makundi mengi ya WhatsApp [VERIFY].',
            },
            {
              t: 'p',
              text: 'Kwenye Kadi Sasa, ukibadilisha ukumbi au saa kwenye mipangilio ya tukio, kiungo cha kadi ya kila mgeni kinaonyesha taarifa mpya mara moja bila kulipia kadi upya.',
            },
          ],
        },
        {
          id: 'wazee-rsvp-lango',
          h2: 'Kufikia wazee, kufuatilia majibu na kudhibiti mlango',
          blocks: [
            {
              t: 'p',
              text: 'Zana za kubuni picha hutengeneza picha au PDF tuli. Hazitumi SMS kwa babu asiye na WhatsApp, hazikusanyi majibu ya RSVP yenye idadi ya watu, na hazina programu ya mlangoni ya kuzuia nakala ya picha kutumika mara mbili [VERIFY].',
            },
            {
              t: 'p',
              text: 'Kadi Sasa inachanganya faida zote mbili: wazee wasio na smartphone wanapata SMS au PDF ya kuchapisha yenye QR ileile, huku kamati ikiona RSVP, michango (0% makato) na uhakiki wa lango bila mtandao.',
            },
            {
              t: 'note',
              text: 'Jaribu mwenyewe bila gharama: anza na kadi 5 za bure kwenye Kadi Sasa, linganisha na mtiririko wenu wa sasa, kisha uamue kabla ya kulipia kadi zozote.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Je, bado ninaweza kuchapisha kadi za karatasi nikitumia Kadi Sasa?',
          a: 'Ndiyo. Kadi Sasa inatengeneza PDF za A6, A5 na A4 kwa wazee au wageni muhimu, na QR ya karatasi inasomwa na programu ileile ya lango.',
        },
        {
          q: 'Nikibuni picha nzuri kwenye zana nyingine, ninaweza kuitumia kwenye Kadi Sasa?',
          a: 'Unaweza kupakia picha ya jalada (cover) au kuchagua mitindo iliyopo huku Kadi Sasa ikisimamia viungo binafsi, RSVP, SMS na QR ya langoni.',
        },
        {
          q: 'Je, Kadi Sasa inachukua asilimia kwenye michango kama mifumo mingine ya uchangishaji?',
          a: 'Hapana. Kadi Sasa inachukua 0% ya michango; wageni wanalipa moja kwa moja kwa wenye sherehe. Baadhi ya majukwaa ya uchangishaji wa umma hutoza ada ya jukwaa [VERIFY].',
        },
        {
          q: 'Bei ya Kadi Sasa ikoje ukilinganisha na uchapishaji wa karatasi?',
          a: 'Unaanza bure na kadi 5, kisha TZS 2,400 kwa kadi (1–99), TZS 2,200 (100–499), na TZS 1,950 (500+) ikijumuisha WhatsApp, SMS, vikumbusho 4, RSVP na lango.',
        },
      ],
    },
    en: {
      nav: 'Kadi Sasa vs paper & design tools',
      title: 'Kadi Sasa vs Paper Cards vs Design Tools',
      description:
        'Factual comparison of Kadi Sasa, printed paper cards and generic graphic design tools across cost, edits, reaching elders, RSVPs and gate control.',
      h1: 'Kadi Sasa vs paper cards vs generic design tools',
      answer:
        'Printed paper cards reach elders well but make edits and RSVP tracking slow; generic design tools create static images quickly but lack per-guest QR codes, SMS delivery and gate verification. Kadi Sasa combines WhatsApp, SMS, printable PDFs, RSVP tracking, 0%-cut michango and an offline QR gate.',
      sections: [
        {
          id: 'jedwali-linganishi',
          h2: 'Side-by-side comparison across five practical criteria',
          blocks: [
            {
              t: 'table',
              head: ['Criterion', 'Kadi Sasa', 'Paper cards only', 'Generic design tools (image/PDF)'],
              rows: [
                [
                  'Per-card cost',
                  '5 free cards; then TZS 2,400 (1–99), TZS 2,200 (100–499), TZS 1,950 (500+)',
                  'Printing, envelopes and physical delivery add up per card [VERIFY]',
                  'Free or monthly design subscription for graphics only; no SMS or gate system [VERIFY]',
                ],
                [
                  'Speed of changing details',
                  'Edit venue or time once and every guest link updates immediately',
                  'Changes after printing require reprinting and redistributing cards [VERIFY]',
                  'Must re-export the image and resend across every chat group [VERIFY]',
                ],
                [
                  'Reaching elders without smartphones',
                  'Plain SMS short code + printable A6/A5/A4 PDFs for elders',
                  'Works well in hand, though costly and slow for distant relatives [VERIFY]',
                  'Static images sent on WhatsApp miss feature-phone elders [VERIFY]',
                ],
                [
                  'RSVP & headcount tracking',
                  'Live per-guest confirmations, party size and delivery status',
                  'Requires manual phone calls or a separate notebook [VERIFY]',
                  'No RSVP tracking; one static file is shared with everyone [VERIFY]',
                ],
                [
                  'Gate control at the venue',
                  'Offline-first Android app catching duplicate or forwarded QRs',
                  'Paper cards can be copied or shared without a unified gate log [VERIFY]',
                  'Images can be forwarded freely with no unique check-in token [VERIFY]',
                ],
              ],
            },
          ],
        },
        {
          id: 'gharama-na-marekebisho',
          h2: 'Cost and speed of updating event details',
          blocks: [
            {
              t: 'p',
              text: 'During wedding or send-off planning, start times or reception halls often shift a few weeks before the day. With paper-only cards, any change after printing means paying to reprint and hand-deliver replacements [VERIFY]. With generic design tools, the committee has to re-export a graphic and explain which version is final across multiple WhatsApp threads [VERIFY].',
            },
            {
              t: 'p',
              text: 'On Kadi Sasa, updating the time, map or dress code in event settings refreshes every guest’s digital card link immediately at no extra card cost.',
            },
          ],
        },
        {
          id: 'wazee-rsvp-lango',
          h2: 'Reaching elders, tracking RSVPs and controlling the gate',
          blocks: [
            {
              t: 'p',
              text: 'Generic design tools produce a static image or PDF. They do not dispatch SMS codes to elders on basic phones, collect structured RSVP headcounts, or give ushers an offline scanner that stops forwarded screenshots [VERIFY].',
            },
            {
              t: 'p',
              text: 'Kadi Sasa keeps one list across every channel: smartphone guests get WhatsApp links, elders without smartphones receive SMS codes or printable PDFs sharing the same QR, and the committee tracks RSVPs, michango (0% commission) and offline gate check-in together.',
            },
            {
              t: 'note',
              text: 'Test it yourself with no commitment: start free with 5 cards on Kadi Sasa and compare how your committee handles RSVPs and door scanning.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Can we still hand printed paper cards to elders when using Kadi Sasa?',
          a: 'Yes. Kadi Sasa generates A6, A5 and 4-up A4 print-ready PDFs, and every printed card shares the same unique QR and short code scanned at the gate.',
        },
        {
          q: 'If we design a custom cover graphic elsewhere, can we use it?',
          a: 'Yes. You can upload a cover image or pick a built-in theme while Kadi Sasa handles per-guest links, SMS fallback, RSVPs and QR check-in.',
        },
        {
          q: 'Does Kadi Sasa take a percentage of contributions?',
          a: 'No. Kadi Sasa takes 0% of contributions; guests pay hosts directly. Some third-party fundraising platforms charge a percentage fee [VERIFY].',
        },
        {
          q: 'How does Kadi Sasa pricing work?',
          a: 'Start with 5 free cards, then TZS 2,400 per card (1–99), TZS 2,200 (100–499) and TZS 1,950 (500+), including WhatsApp, SMS, 4 reminders, RSVPs and gate scanning.',
        },
      ],
    },
  },
  {
    slug: 'gharama-halisi-za-huduma-ya-mialiko',
    slugEn: 'what-an-invitation-service-really-costs',
    group: 'guide',
    schema: 'Article',
    published: UPDATED,
    updated: UPDATED,
    related: [
      'kadi-sasa-vs-karatasi-na-zana-za-kubuni',
      'michango-ya-harusi',
      'lango-la-harusi-qr',
      'usalama-wa-kadi-za-mtandaoni',
    ],
    sw: {
      nav: 'Gharama halisi za mialiko',
      title: 'Gharama Halisi za Huduma ya Mialiko | Kadi Sasa',
      description:
        'Gharama zote za huduma ya mialiko: bei ya kadi, SMS za vikumbusho, uimara wa lango na makato ya michango (0% kwenye Kadi Sasa).',
      h1: 'Gharama halisi ya huduma ya mialiko ni ipi?',
      answer:
        'Gharama halisi ya huduma ya mialiko haipimwi kwa bei ya kadi moja tu, bali kwa jumla ya bei ya kadi, gharama ya SMS za vikumbusho, gharama ya uchapishaji, uimara wa lango ukumbini na kama mtoa huduma anakata asilimia kwenye michango. Kwenye Kadi Sasa unaanza na kadi 5 bure, bei ni TZS 2,400 (1–99), TZS 2,200 (100–499), TZS 1,950 (500+), na tunakata 0% kwenye michango.',
      sections: [
        {
          id: 'vyanzo-vya-gharama',
          h2: 'Vitu vinne vinavyounda gharama halisi ya mialiko',
          blocks: [
            {
              t: 'table',
              head: ['Kipengele cha gharama', 'Kwenye Kadi Sasa (/bei)', 'Kwenye njia au huduma zingine'],
              rows: [
                [
                  'Kadi za kuanzia (majaribio)',
                  'Kadi 5 za kwanza bure kwa kila tukio',
                  'Mara nyingi mchapishaji au jukwaa hutoza tangu nakala ya kwanza [VERIFY]',
                ],
                [
                  'Bei kwa kadi',
                  'TZS 2,400 (1–99), TZS 2,200 (100–499), TZS 1,950 (500+)',
                  'Baadhi ya huduma za soko hutangaza bei kuanzia TZS 1,300 kwa kadi kabla ya nyongeza [VERIFY]',
                ],
                [
                  'SMS za vikumbusho',
                  'Mikopo 4 ya vikumbusho imejumuishwa kwa kila kadi; vifurushi vya ziada ni TZS 3,000 (ujumbe 100) na TZS 14,000 (ujumbe 500)',
                  'Huenda ukalipa SMS kando au kutokuwa na SMS kabisa [VERIFY]',
                ],
                [
                  'Makato ya michango',
                  '0% — wageni wanalipa wenye sherehe moja kwa moja',
                  'Baadhi ya majukwaa ya michango hutoza asilimia ya kila mchango [VERIFY]',
                ],
                [
                  'Lango ukumbini mtandao ukikatika',
                  'Imejumuishwa (programu ya Android bila mtandao)',
                  'Mfumo unaotegemea intaneti ukumbini hukwama mlangoni na kuongeza gharama ya chakula/viti [VERIFY]',
                ],
              ],
            },
          ],
        },
        {
          id: 'bei-ya-kadi-na-sms',
          h2: 'Bei za Kadi Sasa zilivyo kwenye ukurasa wa /bei',
          blocks: [
            {
              t: 'p',
              text: 'Kwenye Kadi Sasa, unalipia kadi pale tu inapotengenezwa kwa mara ya kwanza (kutumwa kwa WhatsApp/SMS au kuchapishwa); kutuma tena au kuchapisha tena ni bure. Kila tukio linaanza na kadi 5 bure. Kwa oda zinazolipiwa, bei ni TZS 2,400 kwa kadi (1–99), TZS 2,200 (100–499) na TZS 1,950 (500+).',
            },
            {
              t: 'p',
              text: 'Kila kadi unayonunua huja na mikopo 4 ya vikumbusho (WhatsApp au SMS), pamoja na uwasilishaji wa awali wa kadi yenyewe. Kamati ikihitaji vikumbusho vingi zaidi, vifurushi vya ziada ni TZS 3,000 kwa ujumbe 100 na TZS 14,000 kwa ujumbe 500 — kama ilivyoonyeshwa wazi kwenye ukurasa wa bei (/bei).',
            },
          ],
        },
        {
          id: 'gharama-za-siri-lango-na-michango',
          h2: 'Gharama zilizojificha: lango linalokwama na makato ya michango',
          blocks: [
            {
              t: 'p',
              text: 'Huduma inayoonekana rahisi mwanzoni inaweza kuwa ghali zaidi siku ya tukio ikiwa haina lango linalofanya kazi bila intaneti. Mtandao ukikatika mlangoni na walinzi wakashindwa kuhakiki QR, wageni wasioalikwa au wenye nakala za picha huingia na kusababisha upungufu wa chakula na vinywaji [VERIFY].',
            },
            {
              t: 'p',
              text: 'Vivyo hivyo, ikiwa harusi inatarajia kukusanya michango ya TZS milioni 15, hata makato madogo ya asilimia yanapunguza bajeti ya sherehe kwa kiasi kikubwa [VERIFY]. Kwenye Kadi Sasa, fedha za michango hazipiti kwetu: wageni wanalipa moja kwa moja kwa wenye sherehe (M-Pesa, Mixx by Yas, Airtel Money, HaloPesa, benki au taslimu) na sisi tunachukua 0%.',
            },
            {
              t: 'note',
              text: 'Unataka kuona hesabu halisi ya orodha yako? Fungua ukurasa wa bei (/bei) au anza bure leo na kadi 5 za kwanza.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Je, Kadi Sasa inachukua asilimia yoyote kwenye michango?',
          a: 'Hapana. Tunachukua 0% ya michango. Pesa zinaenda moja kwa moja kwenye namba au akaunti ya wenye sherehe na kamati inarekodi malipo dhidi ya ahadi.',
        },
        {
          q: 'Kama nitamtumia mgeni kadi kwa WhatsApp kisha SMS ikahitajika, nitalipa mara mbili?',
          a: 'Hapana. Kadi ya mgeni inazalishwa na kulipiwa mara moja tu; kutuma tena au SMS mbadala ya kadi ileile hakuna gharama ya kadi ya ziada.',
        },
        {
          q: 'Ninaweza kujaribu kabla ya kulipa?',
          a: 'Ndiyo. Kila tukio linaanza na kadi 5 za bure ili utengeneze kadi, uhakiki na kamati na ujaribu lango kabla ya kununua kifurushi.',
        },
        {
          q: 'Vipi kama kumbi zetu hazina mtandao mzuri?',
          a: 'Programu ya Android ya lango inapakua orodha mapema na kuhakiki QR bila intaneti bila gharama yoyote ya ziada.',
        },
      ],
    },
    en: {
      nav: 'What an invitation service costs',
      title: 'What an Invitation Service Really Costs | Kadi Sasa',
      description:
        'A transparent look at total invitation cost: per-card pricing, SMS reminders, offline gate reliability and contribution fees (0% cut on Kadi Sasa).',
      h1: 'What an invitation service really costs',
      answer:
        'The true cost of an invitation service is not just the headline per-card price — it includes reminder SMS messages, printing, what happens if the gate fails without signal, and whether the platform takes a percentage of contributions. On Kadi Sasa you start with 5 free cards, pay TZS 2,400 (1–99), TZS 2,200 (100–499) or TZS 1,950 (500+), and we take 0% of contributions.',
      sections: [
        {
          id: 'vyanzo-vya-gharama',
          h2: 'Four components that decide your real total cost',
          blocks: [
            {
              t: 'table',
              head: ['Cost item', 'On Kadi Sasa (/bei)', 'Elsewhere in the market'],
              rows: [
                [
                  'Starter allowance',
                  '5 free cards per event to test with your committee',
                  'Print shops and many services charge from the very first card [VERIFY]',
                ],
                [
                  'Per-card tier price',
                  'TZS 2,400 (1–99), TZS 2,200 (100–499), TZS 1,950 (500+)',
                  'Some local digital-card providers advertise lower starting prices before add-ons [VERIFY]',
                ],
                [
                  'SMS reminders',
                  '4 reminder credits included per card; extra packs TZS 3,000 (100) and TZS 14,000 (500)',
                  'SMS delivery and reminders may be billed separately or omitted [VERIFY]',
                ],
                [
                  'Cut on michango',
                  '0% — guests pay hosts directly',
                  'Some fundraising platforms charge a percentage fee on collected funds [VERIFY]',
                ],
                [
                  'Offline gate failure risk',
                  'Included offline-first Android gate app',
                  'Online-only scanners stall when venue signal drops, causing gate chaos [VERIFY]',
                ],
              ],
            },
          ],
        },
        {
          id: 'bei-ya-kadi-na-sms',
          h2: 'Exact Kadi Sasa pricing as shown on /bei',
          blocks: [
            {
              t: 'p',
              text: 'On Kadi Sasa, a card is charged once when first generated (sent by WhatsApp/SMS or exported for print); resending or reprinting it later is free. Every event begins with 5 free cards. Paid orders are TZS 2,400 per card (1–99), TZS 2,200 (100–499) and TZS 1,950 (500+).',
            },
            {
              t: 'p',
              text: 'Each card purchased includes 4 reminder credits (for SMS or WhatsApp) in addition to delivering the card itself. If your committee needs extra reminder credits, add-on packs are TZS 3,000 for 100 messages and TZS 14,000 for 500 messages — matching our /bei pricing page.',
            },
          ],
        },
        {
          id: 'gharama-za-siri-lango-na-michango',
          h2: 'Hidden costs: venue gate dropouts and contribution cuts',
          blocks: [
            {
              t: 'p',
              text: 'A low headline price quickly becomes expensive if the check-in app stops working when venue mobile data drops, letting duplicate screenshots or uninvited guests consume catering [VERIFY].',
            },
            {
              t: 'p',
              text: 'Likewise, if a committee raises TZS 15 million in michango, even a small platform percentage removes hundreds of thousands of shillings from the event budget [VERIFY]. Kadi Sasa takes 0% of contributions: guests pay hosts directly via M-Pesa, Mixx by Yas, Airtel Money, HaloPesa, bank or cash.',
            },
            {
              t: 'note',
              text: 'Want to calculate your guest list? Check /bei or start free today with your first 5 cards.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Does Kadi Sasa take any percentage of wedding contributions?',
          a: 'No. We take 0% of contributions. Money goes directly to the hosts and the committee records payments against pledges.',
        },
        {
          q: 'If a WhatsApp invite falls back to SMS, do we pay for two cards?',
          a: 'No. Each guest card is generated and charged once; resending or SMS fallback for the same card incurs no extra card fee.',
        },
        {
          q: 'Can we test everything before paying?',
          a: 'Yes. Start with 5 free cards to test card design, RSVP and QR scanning with your committee first.',
        },
        {
          q: 'What if our venue has poor mobile reception?',
          a: 'The offline Android gate app downloads the guest list ahead of time and verifies QRs with zero signal at no extra cost.',
        },
      ],
    },
  },
];
