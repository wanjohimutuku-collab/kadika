import type { ContentPageDef } from '../types';

const UPDATED = '2026-10-15';

export const COMPANY_PAGES: ContentPageDef[] = [
  {
    slug: 'maswali',
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
          a: 'Kwa M-Pesa, Mixx by Yas, Airtel Money au HaloPesa kutoka kwenye kadi ya mgeni. Kamati inaweza pia kurekodi taslimu na benki.',
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
    group: 'company',
    schema: 'WebPage',
    updated: UPDATED,
    related: ['kadi-ya-harusi-mtandaoni', 'usalama-wa-kadi-za-mtandaoni', 'mawasiliano', 'privacy'],
    sw: {
      nav: 'Kuhusu Kadi Sasa',
      title: 'Kuhusu Kadi Sasa: Kadi za Harusi za Kitanzania',
      description:
        'Kadi Sasa inasaidia kamati na wenyeji wa harusi, send-off na uchumba Tanzania kutuma kadi, kufuatilia michango na kuingiza wageni langoni.',
      h1: 'Kuhusu Kadi Sasa',
      answer:
        'Kadi Sasa inatengenezwa Tanzania ili kamati na wenyeji wa harusi, send-off na uchumba waweze kutuma kadi kwa kila mgeni, kufuatilia majibu na michango, na kuingiza wageni langoni bila msongamano, hata mtandao ukikatika.',
      sections: [
        {
          id: 'kwa-nini',
          h2: 'Kwa nini tuliianzisha',
          blocks: [
            {
              t: 'p',
              text: 'Mialiko mingi huishia kwenye picha moja ya WhatsApp, QR isiyosomeka langoni, au daftari la michango lisilolingana. Wazee hawapati kadi, wageni wanaogopa ulaghai, na kamati inaumia siku ya tukio. Tulitaka mfumo mmoja unaofanya kazi kwa simu za kawaida na smartphone, mtandaoni na bila mtandao.',
            },
          ],
        },
        {
          id: 'misingi',
          h2: 'Tunachoamini',
          blocks: [
            {
              t: 'ul',
              items: [
                'Kila mgeni anastahili kadi yake, hata asiye na smartphone.',
                'Mialiko iwe ya heshima: hakuna matangazo, hakuna shinikizo la michango.',
                'Uaminifu unaonekana: kila kadi inaonyesha mtumaji na namba ya kamati.',
                'Data ya wageni ni ya mwenyeji; tunakusanya kiwango cha chini.',
                'Kiswahili kwanza, Kiingereza kikiwa kwa mguso mmoja.',
              ],
            },
          ],
        },
        {
          id: 'inachofanya',
          h2: 'Tunachotoa',
          blocks: [
            {
              t: 'ul',
              items: [
                'Kadi ya mwaliko kwa kila mgeni kwa WhatsApp, SMS na karatasi.',
                'Majibu, vikumbusho na ufuatiliaji wa hali ya kila kadi.',
                'Michango: ahadi, malipo kwa simu na ripoti.',
                'Lango la kuingiza wageni kwa QR, namba au jina, bila mtandao.',
              ],
            },
          ],
        },
        {
          id: 'hali',
          h2: 'Hali ya sasa',
          blocks: [
            {
              t: 'p',
              text: 'Kadi Sasa iko kwenye hatua ya majaribio na harusi chache. Tunasikiliza kamati na wageni ili kuboresha. Maoni yako yanakaribishwa kupitia ukurasa wa mawasiliano.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Nani anaweza kutumia Kadi Sasa?',
          a: 'Wenyeji na kamati za harusi, send-off, uchumba na sherehe nyingine za faragha nchini Tanzania.',
        },
      ],
    },
    en: {
      nav: 'About Kadi Sasa',
      title: 'About Kadi Sasa: Tanzanian Wedding Invitations',
      description:
        'Kadi Sasa helps hosts and committees for weddings, send-offs and engagements in Tanzania send cards, track contributions and admit guests at the gate.',
      h1: 'About Kadi Sasa',
      answer:
        'Kadi Sasa is built in Tanzania so hosts and committees for weddings, send-offs and engagements can send every guest a card, track replies and contributions, and admit guests at the gate without a crush, even when the network drops.',
      sections: [
        {
          id: 'why',
          h2: 'Why we started it',
          blocks: [
            {
              t: 'p',
              text: 'Too many invitations end as one WhatsApp image, a QR that will not scan at the gate, or a contributions notebook that does not add up. Elders miss out, guests fear scams, and the committee suffers on the day. We wanted one system that works on basic phones and smartphones, with and without network.',
            },
          ],
        },
        {
          id: 'believe',
          h2: 'What we believe',
          blocks: [
            {
              t: 'ul',
              items: [
                'Every guest deserves their own card, even without a smartphone.',
                'Invitations should be courteous: no ads, no pressure to contribute.',
                'Trust should be visible: every card shows the sender and committee number.',
                'Guest data belongs to the host; we collect the minimum.',
                'Swahili first, English one tap away.',
              ],
            },
          ],
        },
        {
          id: 'offer',
          h2: 'What we offer',
          blocks: [
            {
              t: 'ul',
              items: [
                'A card per guest by WhatsApp, SMS and paper.',
                'Replies, reminders and status tracking per card.',
                'Contributions: pledges, mobile payments and reports.',
                'A gate that admits by QR, number or name, offline.',
              ],
            },
          ],
        },
        {
          id: 'status',
          h2: 'Where we are now',
          blocks: [
            {
              t: 'p',
              text: 'Kadi Sasa is in a pilot with a small number of weddings. We listen to committees and guests to improve. Your feedback is welcome through the contact page.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Who can use Kadi Sasa?',
          a: 'Hosts and committees for weddings, send-offs, engagements and other private celebrations in Tanzania.',
        },
      ],
    },
  },
  {
    slug: 'mawasiliano',
    group: 'company',
    schema: 'WebPage',
    updated: UPDATED,
    related: ['maswali', 'ombi-la-data', 'usalama-wa-kadi-za-mtandaoni', 'kuhusu'],
    sw: {
      nav: 'Mawasiliano',
      title: 'Wasiliana na Kadi Sasa',
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
      title: 'Contact Kadi Sasa',
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
