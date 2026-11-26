import type { ContentPageDef } from '../types';

const UPDATED = '2026-10-15';

export const COMPANY_PAGES: ContentPageDef[] = [
  {
    slug: 'maswali',
    slugEn: 'faq',
    group: 'company',
    schema: 'WebPage',
    updated: UPDATED,
    related: [
      'kadi-ya-harusi-mtandaoni',
      'usalama-wa-kadi-za-mtandaoni',
      'michango-ya-harusi',
      'lango-la-harusi-qr',
    ],
    sw: {
      nav: 'Maswali yanayoulizwa mara kwa mara',
      title: 'Maswali kuhusu Kadi za Harusi za Mtandaoni | Kadi Sasa',
      description:
        'Majibu ya maswali ya kawaida kuhusu Kadi Sasa: gharama, WhatsApp na SMS, michango, lango bila mtandao, usalama wa kadi na data za wageni.',
      h1: 'Maswali yanayoulizwa mara kwa mara',
      answer:
        'Kadi Sasa ni huduma ya kutuma kadi ya mwaliko kwa kila mgeni, kufuatilia majibu na michango, na kuingiza wageni langoni kwa QR au namba. Hapa kuna majibu ya maswali yanayoulizwa mara nyingi kuhusu gharama, usalama, michango na siku ya tukio.',
      sections: [],
      faq: [
        {
          q: 'Kadi Sasa ni nini?',
          a: 'Ni huduma ya kutuma kadi ya mwaliko kwa kila mgeni kwa WhatsApp, SMS au karatasi, kufuatilia majibu na michango, na kuingiza wageni langoni kwa QR au namba, hata bila mtandao.',
        },
        {
          q: 'Inafaa kwa matukio gani?',
          a: 'Harusi, send-off, uchumba, kitchen party na sherehe nyingine za faragha. Unaandika aina ya mwaliko wewe mwenyewe.',
        },
        {
          q: 'Gharama ni kiasi gani?',
          a: 'Wakati wa majaribio ni bure. Gharama za SMS zinaonyeshwa kabla ya kutuma, na bei za baadaye zitatangazwa kabla ya kuanza kutozwa.',
        },
        {
          q: 'Je, wageni wanahitaji akaunti au programu?',
          a: 'Hapana. Wanafungua kiungo cha kadi yao kwenye simu. Wasio na smartphone wanapata SMS yenye namba au kadi ya karatasi.',
        },
        {
          q: 'Kadi inatumwa kwa njia gani?',
          a: 'WhatsApp, SMS au PDF ya kuchapisha. Unaweza kuchagua njia kwa kila kikundi cha wageni, na SMS inatumika kama mbadala ikiwa WhatsApp haikufika.',
        },
        {
          q: 'Michango inalipwaje?',
          a: 'Moja kwa moja kwa wenye sherehe, kwa M-Pesa, Mixx by Yas, Airtel Money, HaloPesa, benki au taslimu. Kamati inarekodi kila malipo dhidi ya ahadi. Kadi Sasa haishiki pesa za michango.',
        },
        {
          q: 'Michango ni lazima ili mgeni apate kadi?',
          a: 'Hapana. Kwa chaguo-msingi hakuna sharti. Mwenyeji akitaka kuweka sharti, lazima ayawashe mwenyewe.',
        },
        {
          q: 'Itakuwaje mtandao ukikatika siku ya harusi?',
          a: 'Programu ya lango inahakiki QR kwenye simu bila mtandao na kusawazisha baadaye. Kadi ya mgeni pia inaonekana bila mtandao baada ya kufunguliwa mara ya kwanza.',
        },
        {
          q: 'Mtu akipiga picha ya QR ya mwingine?',
          a: 'Kila QR ni ya mgeni mmoja na inaingiza mara moja. Ikiskaniwa mara ya pili, kamati inaona nani aliingia na saa ngapi.',
        },
        {
          q: 'Kadi ikipotea au ikitumwa kwa mtu asiyestahili?',
          a: 'Mwenyeji anatoa kadi mpya kwa mgeni huyo; kadi ya zamani inakoma kufanya kazi.',
        },
        {
          q: 'Mlinda lango anahitaji nini?',
          a: 'Simu ya Android, kiungo cha lango na PIN kutoka kwa mwenyeji. Hapati taarifa za pesa.',
        },
        {
          q: 'Data za wageni zinalindwa vipi?',
          a: 'Tunakusanya kiwango cha chini kinachohitajika, hatuuzi data, na mwenyeji anaweza kuzipakua au kuzifuta. Soma sera ya faragha na ukurasa wa maombi ya data.',
        },
        {
          q: 'Mgeni anaweza kuomba data zake zifutwe?',
          a: 'Ndiyo. Anaweza kuwasiliana na kamati au nasi kupitia ukurasa wa maombi ya data.',
        },
        {
          q: 'Je, ni ulaghai? Nitajuaje kadi ni halali?',
          a: 'Kadi halali inaonyesha mtumaji na namba ya kamati, na haiombi nenosiri wala PIN. Soma ukurasa wa usalama wa kadi.',
        },
        {
          q: 'Mnafanya kazi nchi gani?',
          a: 'Imetengenezwa Tanzania kwa matukio ya Kitanzania, ikiwa na malipo ya simu ya Tanzania na Kiswahili kama lugha ya kwanza.',
        },
      ],
    },
    en: {
      nav: 'Frequently asked questions',
      title: 'Digital Wedding Invitation FAQ | Kadi Sasa',
      description:
        'Answers to common questions about Kadi Sasa: cost, WhatsApp and SMS, contributions, offline gate, card safety and guest data.',
      h1: 'Frequently asked questions',
      answer:
        'Kadi Sasa sends each guest their own invitation, tracks replies and contributions, and admits guests at the gate by QR or number. Here are answers to common questions about cost, safety, contributions and the day itself.',
      sections: [],
      faq: [
        {
          q: 'What is Kadi Sasa?',
          a: 'A service that sends each guest their own invitation by WhatsApp, SMS or paper, tracks replies and contributions, and admits guests at the gate by QR or number, even offline.',
        },
        {
          q: 'What events is it for?',
          a: 'Weddings, send-offs, engagements, kitchen parties and other private celebrations. You write the kind of invitation yourself.',
        },
        {
          q: 'How much does it cost?',
          a: 'It is free during the pilot. SMS costs are shown before you send, and future prices will be published before charging starts.',
        },
        {
          q: 'Do guests need an account or an app?',
          a: 'No. They open the link to their card on their phone. Guests without a smartphone get an SMS with a number or a paper card.',
        },
        {
          q: 'How are cards sent?',
          a: 'By WhatsApp, SMS or a printable PDF. You can choose a channel per guest group, and SMS is used as a fallback if WhatsApp does not arrive.',
        },
        {
          q: 'How are contributions paid?',
          a: 'With M-Pesa, Mixx by Yas, Airtel Money or HaloPesa from the guest’s card. The committee can also record cash and bank payments.',
        },
        {
          q: 'Must a guest pledge to get a card?',
          a: 'No. By default there is no condition. A host who wants one must switch it on deliberately.',
        },
        {
          q: 'What if the network drops on the wedding day?',
          a: 'The gate app verifies QR codes on the phone without network and syncs later. A guest’s card also shows offline after its first open.',
        },
        {
          q: 'What if someone photographs another guest’s QR?',
          a: 'Each QR belongs to one guest and admits once. A second scan shows the committee who entered and when.',
        },
        {
          q: 'What if a card is lost or sent to the wrong person?',
          a: 'The host issues a new card for that guest; the old one stops working.',
        },
        {
          q: 'What does a gate agent need?',
          a: 'An Android phone, the gate link and a PIN from the host. They cannot see money details.',
        },
        {
          q: 'How is guest data protected?',
          a: 'We collect the minimum needed, do not sell data, and the host can download or delete it. Read the privacy policy and the data requests page.',
        },
        {
          q: 'Can a guest ask for their data to be deleted?',
          a: 'Yes. They can contact the committee or us through the data requests page.',
        },
        {
          q: 'Is it a scam? How do I know a card is genuine?',
          a: 'A genuine card shows the sender and committee number and never asks for a password or PIN. Read the page on card safety.',
        },
        {
          q: 'Where does it work?',
          a: 'It is made in Tanzania for Tanzanian events, with Tanzanian mobile payments and Swahili as the first language.',
        },
      ],
    },
  },
  {
    slug: 'kuhusu',
    slugEn: 'about',
    group: 'company',
    schema: 'WebPage',
    updated: '2026-11-26',
    related: ['kadi-ya-harusi-mtandaoni', 'usalama-wa-kadi-za-mtandaoni', 'mawasiliano', 'privacy'],
    sw: {
      nav: 'Kuhusu Kadi Sasa',
      title: 'Kuhusu Kadi Sasa: Kadi za Mwaliko Afrika Mashariki',
      description:
        'Kadi Sasa inasaidia familia na kamati Afrika Mashariki kutuma kadi za WhatsApp, SMS na QR, kufuatilia michango (0% makato) na kulinda lango bila mtandao.',
      h1: 'Mialiko ya heshima kwa kila mgeni, kuanzia kamati hadi ukumbini.',
      answer:
        'Kadi Sasa ni mfumo ulioundwa Dar es Salaam kwa ajili ya familia, kamati na waandaaji wa sherehe Afrika Mashariki. Unatuma kadi za kidijitali kwa WhatsApp, SMS ya kawaida na PDF yenye QR, kufuatilia majibu na michango kwa 0% makato, na kuthibitisha wageni langoni hata bila mtandao.',
      sections: [
        {
          id: 'kwa-nini',
          h2: 'Kwa nini tuliianzisha',
          blocks: [
            {
              t: 'p',
              text: 'Mialiko mingi bado huishia kwenye picha moja inayotupwa kwenye magroup, QR zinazoshindwa kusoma mtandao ukikatika ukumbini, au madaftari ya michango yanayoleta mabishano kwenye kikao. Wazee wasio na smartphone huachwa nyuma, na wageni huogopa link zisizoaminika.',
            },
            {
              t: 'p',
              text: 'Tuliijenga Kadi Sasa kutatua pengo hili halisi: kila mgeni apate mwaliko wake binafsi kwa njia anayoitumia (WhatsApp, SMS au karatasi ya QR), pesa ya michango iende moja kwa moja kwa wenye sherehe bila makato ya jukwaa, na walinzi langoni wasikwame mtandao ukipotea.',
            },
          ],
        },
        {
          id: 'misingi',
          h2: 'Misingi yetu mitano',
          blocks: [
            {
              t: 'ul',
              items: [
                'Kila mgeni ajumuishwe: WhatsApp kwa wenye smartphone, SMS yenye namba fupi na PDF yenye QR kwa wazazi na wazee.',
                'Uaminifu mbele: kila kadi inaonyesha jina la mtumaji na simu ya kamati — hatuombi PIN wala nenosiri.',
                '0% makato ya michango: michango ya harusi, send-off au harambee inapokelewa moja kwa moja na kamati.',
                'Lango imara bila mtandao: programu ya Android inapakua orodha mapema na kutambua nakala za screenshot papo hapo.',
                'Kiswahili kwanza, Kiingereza kwa mguso mmoja, huku data ya wageni ikilindwa chini ya mwenyeji.',
              ],
            },
          ],
        },
        {
          id: 'afrika-mashariki',
          h2: 'Uwepo wetu Afrika Mashariki',
          blocks: [
            {
              t: 'ul',
              items: [
                'Tanzania (Huduma kamili): bei wazi kwa TZS (/bei), msaada wa M-Pesa, Mixx by Yas, Airtel Money na HaloPesa.',
                'Kenya (Majaribio): namba za +254, ufuatiliaji wa ahadi za ruracio na harambee kwa M-Pesa Paybill na Till (/ke).',
                'Uganda (Miongozo): miongozo ya mialiko na ahadi za kwanjula na kuhingira (/ug).',
              ],
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Nani anaweza kutumia Kadi Sasa?',
          a: 'Familia, wanandoa, kamati za harusi, send-off, kitchen party, nikah, ruracio, harambee, sherehe binafsi na makampuni au taasisi.',
        },
        {
          q: 'Je, Kadi Sasa inakata asilimia yoyote kwenye michango?',
          a: 'Hapana. Tunachukua 0% kwenye michango. Wageni wanalipa moja kwa moja kwa namba au akaunti ya wenye sherehe, na kamati inafuatilia ahadi na risiti ndani ya mfumo.',
        },
        {
          q: 'Wazee wasio na smartphone wanapataje mwaliko?',
          a: 'Wanapokea SMS ya kawaida yenye namba fupi ya kuingilia getini (mfano KH-4826) au PDF yenye QR ya kuchapisha na kukabidhiwa mkononi.',
        },
        {
          q: 'Inagharimu kiasi gani kuanza?',
          a: 'Unaanza bure na kadi 5 za mwanzo Tanzania, kisha unalipia vifurushi vya uwazi vya TZS 2,400 (1–99), TZS 2,200 (100–499) au TZS 1,950 (500+) kwa kadi. Kenya iko kwenye majaribio ya bure.',
        },
      ],
    },
    en: {
      nav: 'About',
      title: 'About Kadi Sasa: Digital Invitations for East Africa',
      description:
        'Kadi Sasa helps families and committees across East Africa send WhatsApp, SMS and QR invitations, track michango (0% cut) and run offline gate check-in.',
      h1: 'Respectful invitations for every guest, from the committee room to the gate.',
      answer:
        'Kadi Sasa is built in Dar es Salaam for families, wedding committees, and organisers across East Africa. You send personal invitations by WhatsApp, plain SMS, and printable QR PDFs, track RSVPs and contributions with 0% commission, and check guests in at the gate even without mobile signal.',
      sections: [
        {
          id: 'why',
          h2: 'Why we built Kadi Sasa',
          blocks: [
            {
              t: 'p',
              text: 'Too many celebrations still rely on a single flyer dropped into busy group chats, QR screenshots forwarded to uninvited guests, and contribution notebooks that cause friction at committee meetings. Meanwhile, parents and grandparents without smartphones are left out or confused by unverified links.',
            },
            {
              t: 'p',
              text: 'We built Kadi Sasa to solve those real-world gaps together: every guest gets a personal card via the channel that fits them best (WhatsApp, SMS, or print), contributions go straight to hosts with 0% platform cut, and gate ushers verify entries offline in seconds.',
            },
          ],
        },
        {
          id: 'believe',
          h2: 'Our five principles',
          blocks: [
            {
              t: 'ul',
              items: [
                'No guest left behind: WhatsApp cards for smartphone users, plain SMS short codes and printable QR PDFs for elders.',
                'Visible trust, zero PIN prompts: every card displays the sender name and clickable committee phone number.',
                '0% cut on contributions: michango and harambee payments go directly to host mobile-money or bank accounts.',
                'Offline-first gate security: our Android scanner downloads the encrypted guest list ahead of time and stops duplicate screenshots immediately.',
                'Swahili first, English one tap away — with minimal guest data collection under host control.',
              ],
            },
          ],
        },
        {
          id: 'east-africa',
          h2: 'Across East Africa',
          blocks: [
            {
              t: 'ul',
              items: [
                'Tanzania (Live): transparent TZS tiers (/bei) with M-Pesa, Mixx by Yas, Airtel Money and HaloPesa.',
                'Kenya (Pilot): +254 numbers, Nairobi time, and M-Pesa Paybill/Till tracking for weddings, ruracio and harambee (/ke).',
                'Uganda (Early Guides): guides for kwanjula, kuhingira and pledge-card coordination (/ug).',
              ],
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Who is Kadi Sasa built for?',
          a: 'Couples, families, wedding and send-off committees, kitchen party planners, church and mosque organisers, ruracio and harambee teams, and private or corporate event hosts.',
        },
        {
          q: 'Does Kadi Sasa take a percentage of contributions?',
          a: 'No. We take 0% commission on michango and harambee funds. Guests pay directly to the host accounts, while treasurers track pledges and receipts in one clean ledger.',
        },
        {
          q: 'How do elders without smartphones receive their invitation?',
          a: 'They receive a plain SMS containing the venue details and their short gate code (e.g. KH-4826), or an A6/A5/4-up A4 printed card carrying the exact same signed QR code.',
        },
        {
          q: 'How much does it cost to get started?',
          a: 'In Tanzania you start with 5 free cards, followed by transparent TZS tiers (TZS 2,400 for 1–99, TZS 2,200 for 100–499, and TZS 1,950 for 500+ per card). Kenya is currently in free early pilot testing.',
        },
      ],
    },
  },
  {
    slug: 'mawasiliano',
    slugEn: 'contact',
    group: 'company',
    schema: 'WebPage',
    updated: UPDATED,
    related: ['maswali', 'ombi-la-data', 'usalama-wa-kadi-za-mtandaoni', 'kuhusu'],
    sw: {
      nav: 'Mawasiliano',
      title: 'Wasiliana na Kadi Sasa: Msaada, Kadi na Maombi ya Data',
      description:
        'Wasiliana na Kadi Sasa kwa maswali ya huduma, kuthibitisha kadi, au maombi ya data na faragha. Barua pepe: faragha@kadisasa.com.',
      h1: 'Wasiliana nasi',
      answer:
        'Tuandikie kwa barua pepe faragha@kadisasa.com kwa maswali ya huduma, kuthibitisha kama kadi ni halali, au maombi kuhusu data zako. Kama swali linahusu mwaliko mahususi, kamati ya tukio ndiyo yenye jibu la haraka zaidi.',
      sections: [
        {
          id: 'njia',
          h2: 'Njia za kuwasiliana',
          blocks: [
            {
              t: 'table',
              head: ['Unachohitaji', 'Wasiliana na nani'],
              rows: [
                [
                  'Swali kuhusu tarehe, ukumbi au mwaliko wako',
                  'Kamati ya tukio, kwa namba iliyo kwenye kadi',
                ],
                ['Kuthibitisha kama kadi ni halali', 'Kamati ya tukio, au sisi kwa barua pepe'],
                [
                  'Maombi ya data, kufuta au kupata nakala',
                  'faragha@kadisasa.com (angalia ukurasa wa maombi ya data)',
                ],
                [
                  'Hitilafu kwenye huduma au maoni',
                  'faragha@kadisasa.com kwa sasa; anwani maalum ya msaada itatangazwa hapa',
                ],
              ],
            },
          ],
        },
        {
          id: 'tahadhari',
          h2: 'Tahadhari',
          blocks: [
            {
              t: 'p',
              text: 'Hatutakuomba kamwe nenosiri, PIN au OTP kwa barua pepe, SMS wala simu. Mtu akidai kuwa ni Kadi Sasa na kuomba hivyo, usimjibu.',
            },
          ],
        },
      ],
    },
    en: {
      nav: 'Contact',
      title: 'Contact Kadi Sasa: Support, Card Checks and Data Requests',
      description:
        'Contact Kadi Sasa for service questions, to verify a card, or for data and privacy requests. Email: faragha@kadisasa.com.',
      h1: 'Contact us',
      answer:
        'Email faragha@kadisasa.com for service questions, to check whether a card is genuine, or for requests about your data. If your question is about a specific invitation, the event committee is the fastest way to an answer.',
      sections: [
        {
          id: 'ways',
          h2: 'Ways to reach us',
          blocks: [
            {
              t: 'table',
              head: ['What you need', 'Who to contact'],
              rows: [
                [
                  'A question about the date, venue or your invitation',
                  'The event committee, on the number on the card',
                ],
                ['To check a card is genuine', 'The event committee, or us by email'],
                [
                  'A data request, deletion or a copy',
                  'faragha@kadisasa.com (see the data requests page)',
                ],
                [
                  'A fault in the service or feedback',
                  'faragha@kadisasa.com for now; a dedicated support address will be announced here',
                ],
              ],
            },
          ],
        },
        {
          id: 'caution',
          h2: 'A caution',
          blocks: [
            {
              t: 'p',
              text: 'We will never ask for a password, PIN or OTP by email, SMS or phone. If someone claims to be Kadi Sasa and asks, do not reply.',
            },
          ],
        },
      ],
    },
  },
];
