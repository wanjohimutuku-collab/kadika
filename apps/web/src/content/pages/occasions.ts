import type { ContentPageDef } from '../types';

const UPDATED = '2026-10-20';

/**
 * Search landing pages for occasions beyond weddings (SEO strategy, section 6). Every feature
 * named here exists today: per-guest cards, WhatsApp/SMS/paper, replies, QR and number at the
 * door. The occasion type is free text, so "Graduation" or "Kitchen party" can be written in.
 */
export const OCCASION_PAGES: ContentPageDef[] = [
  {
    slug: 'kadi-za-mwaliko-mtandaoni',
    group: 'product',
    schema: 'WebPage',
    updated: UPDATED,
    related: [
      'kadi-ya-harusi-mtandaoni',
      'kadi-ya-kuzaliwa',
      'kadi-ya-mahafali',
      'kutuma-kadi-za-mwaliko-whatsapp',
    ],
    sw: {
      nav: 'Kadi za mwaliko mtandaoni',
      title: 'Kadi za Mwaliko Mtandaoni kwa Kila Sherehe | Harusi Pass',
      description:
        'Tengeneza kadi za mwaliko mtandaoni kwa harusi, siku ya kuzaliwa, mahafali na sherehe nyingine. Kila mgeni anapata kadi yake kwa WhatsApp, SMS au karatasi.',
      h1: 'Kadi za mwaliko mtandaoni kwa kila sherehe',
      answer:
        'Kadi ya mwaliko mtandaoni ni mwaliko wa kidijitali unaofunguka kwenye simu kupitia kiungo. Kwenye Harusi Pass unaandika majina, tarehe na ukumbi, unaingiza wageni, kisha kila mmoja anapata kadi yake kwa WhatsApp, SMS au karatasi, na unaona nani amejibu.',
      sections: [
        {
          id: 'ni-nini',
          h2: 'Kadi ya mwaliko mtandaoni ni nini?',
          blocks: [
            {
              t: 'p',
              text: 'Ni mwaliko unaoonekana kwenye simu badala ya karatasi pekee. Mgeni anaona jina la mwenyeji, tarehe, saa, ukumbi na ramani, kisha anajibu kama atahudhuria. Kadi hiyo inaweza kutumwa kwa WhatsApp, SMS au kiungo.',
            },
          ],
        },
        {
          id: 'sherehe',
          h2: 'Sherehe zinazofaa',
          blocks: [
            {
              t: 'ul',
              items: [
                'Harusi, uchumba na send-off',
                'Kitchen party na bridal shower',
                'Siku ya kuzaliwa',
                'Mahafali na sherehe za kitaaluma',
                'Mikutano na sherehe za kampuni',
                'Mikusanyiko ya familia na ya kidini',
              ],
            },
            {
              t: 'p',
              text: 'Unapounda tukio unachagua aina au kuandika yako mwenyewe, kwa mfano “Mahafali”. Maneno ya kadi yanafuata aina uliyoandika.',
            },
          ],
        },
        {
          id: 'hatua',
          h2: 'Jinsi ya kutengeneza kadi ya mwaliko mtandaoni',
          blocks: [
            {
              t: 'ol',
              items: [
                'Chagua mtindo wa kadi.',
                'Andika majina, tarehe, saa, ukumbi na maelezo mengine.',
                'Hakiki kadi jinsi mgeni atakavyoiona kwenye simu.',
                'Ingiza wageni na uchague njia ya kutuma: WhatsApp, SMS au karatasi.',
                'Tuma, kisha fuatilia nani amefungua na nani amejibu.',
              ],
            },
          ],
        },
        {
          id: 'gharama',
          h2: 'Gharama ni kiasi gani?',
          blocks: [
            {
              t: 'p',
              text: 'Wakati wa majaribio huduma ni bure. Gharama za SMS zinaonyeshwa kabla hujatuma, na bei za baadaye zitatangazwa hapa kabla ya kuanza kutozwa.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Kadi ya mwaliko ya kidijitali ni nini?',
          a: 'Ni mwaliko wa kielektroniki unaotumwa mtandaoni badala ya, au pamoja na, kadi ya karatasi. Una majina, tarehe, saa na ukumbi wa tukio.',
        },
        {
          q: 'Naweza kutuma kadi kwa WhatsApp?',
          a: 'Ndiyo. Kila mgeni anapokea kiungo chake cha kadi kwa WhatsApp. Wasio na WhatsApp wanapokea SMS yenye namba ya kadi.',
        },
        {
          q: 'Je, wageni wanahitaji akaunti?',
          a: 'Hapana. Mgeni anafungua kiungo tu na kujibu.',
        },
      ],
    },
    en: {
      nav: 'Digital invitation cards',
      title: 'Digital Invitation Cards for Every Occasion | Harusi Pass',
      description:
        'Create digital invitation cards for weddings, birthdays, graduations and other events. Every guest gets their own card by WhatsApp, SMS or paper.',
      h1: 'Digital invitation cards for every occasion',
      answer:
        'A digital invitation card is an invitation that opens on a phone from a link. With Harusi Pass you enter the names, date and venue, add your guests, and each one gets their own card by WhatsApp, SMS or paper while you see who has replied.',
      sections: [
        {
          id: 'what',
          h2: 'What is a digital invitation card?',
          blocks: [
            {
              t: 'p',
              text: 'It is an invitation shown on a phone instead of on paper alone. The guest sees the host, date, time, venue and map, then replies whether they will attend. The card can be sent by WhatsApp, SMS or a link.',
            },
          ],
        },
        {
          id: 'occasions',
          h2: 'Occasions it suits',
          blocks: [
            {
              t: 'ul',
              items: [
                'Weddings, engagements and send-offs',
                'Kitchen parties and bridal showers',
                'Birthdays',
                'Graduations and academic milestones',
                'Meetings and company functions',
                'Family and religious gatherings',
              ],
            },
            {
              t: 'p',
              text: 'When you create an event you pick a type or write your own, for example “Graduation”. The card wording follows the type you wrote.',
            },
          ],
        },
        {
          id: 'steps',
          h2: 'How to make a digital invitation card',
          blocks: [
            {
              t: 'ol',
              items: [
                'Choose a card style.',
                'Enter the names, date, time, venue and other details.',
                'Preview the card the way a guest will see it on a phone.',
                'Add guests and choose how to send: WhatsApp, SMS or paper.',
                'Send, then track who has opened it and who has replied.',
              ],
            },
          ],
        },
        {
          id: 'cost',
          h2: 'What does it cost?',
          blocks: [
            {
              t: 'p',
              text: 'It is free during the pilot. SMS costs are shown before you send, and future prices will be published here before any charge starts.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'What is a digital invitation card?',
          a: 'It is an electronic invitation sent online instead of, or alongside, a printed card. It carries the names, date, time and venue of the event.',
        },
        {
          q: 'Can I send the card on WhatsApp?',
          a: 'Yes. Each guest receives their own card link on WhatsApp. Guests without WhatsApp receive an SMS with their card number.',
        },
        {
          q: 'Do guests need an account?',
          a: 'No. A guest opens the link and replies.',
        },
      ],
    },
  },
  {
    slug: 'kadi-ya-kuzaliwa',
    group: 'product',
    schema: 'WebPage',
    updated: UPDATED,
    related: [
      'kadi-za-mwaliko-mtandaoni',
      'kutuma-kadi-za-mwaliko-whatsapp',
      'kusimamia-majibu-ya-rsvp',
    ],
    sw: {
      nav: 'Kadi ya siku ya kuzaliwa',
      title: 'Kadi ya Mwaliko wa Siku ya Kuzaliwa | Harusi Pass',
      description:
        'Tuma kadi ya mwaliko wa siku ya kuzaliwa mtandaoni kwa WhatsApp au SMS. Wageni wanaona tarehe, ukumbi na ramani, na wanakujibu moja kwa moja.',
      h1: 'Kadi ya mwaliko wa siku ya kuzaliwa mtandaoni',
      answer:
        'Unaunda tukio, unaandika “Siku ya kuzaliwa” kama aina, na kuweka tarehe, saa na mahali. Kila mgeni anapokea kadi yake kwa WhatsApp au SMS, anajibu kama atakuja, na wewe unaona idadi ya watakaohudhuria kabla ya sherehe.',
      sections: [
        {
          id: 'taarifa',
          h2: 'Cha kuandika kwenye kadi ya siku ya kuzaliwa',
          blocks: [
            {
              t: 'ul',
              items: [
                'Jina la mwenye sherehe na umri, kama unapenda kuutaja',
                'Tarehe, saa ya kuanza na saa ya kumaliza',
                'Mahali pa sherehe na ramani',
                'Mavazi au mandhari, kama yapo',
                'Namba ya kuwasiliana kwa maswali',
              ],
            },
          ],
        },
        {
          id: 'hatua',
          h2: 'Jinsi ya kutuma',
          blocks: [
            {
              t: 'ol',
              items: [
                'Unda tukio na uandike “Siku ya kuzaliwa” kama aina.',
                'Ingiza wageni kwa kubandika orodha au kuchagua kutoka kwenye anwani.',
                'Tuma kwa WhatsApp, au SMS kwa wasio na WhatsApp.',
                'Fuatilia majibu na idadi ya watu watakaokuja.',
              ],
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Naweza kutuma kadi ya siku ya kuzaliwa kwa WhatsApp?',
          a: 'Ndiyo. Kila mgeni anapokea kiungo chake cha kadi, na anaweza kujibu bila akaunti.',
        },
        {
          q: 'Naweza kuona nani atakuja?',
          a: 'Ndiyo. Majibu ya wageni yanakusanywa mahali pamoja, pamoja na idadi ya watu wanaokuja nao.',
        },
      ],
    },
    en: {
      nav: 'Birthday invitations',
      title: 'Digital Birthday Invitation Cards | Harusi Pass',
      description:
        'Send a birthday invitation online by WhatsApp or SMS. Guests see the date, venue and map, and reply straight from the card.',
      h1: 'Digital birthday invitation cards',
      answer:
        'You create an event, write “Birthday” as the type, and set the date, time and place. Each guest receives their own card by WhatsApp or SMS, replies whether they will come, and you see the expected headcount before the party.',
      sections: [
        {
          id: 'details',
          h2: 'What to put on a birthday invitation',
          blocks: [
            {
              t: 'ul',
              items: [
                'The name of the person celebrating, and their age if you wish',
                'Date, start time and end time',
                'The place, with a map',
                'Dress code or theme, if there is one',
                'A phone number for questions',
              ],
            },
          ],
        },
        {
          id: 'steps',
          h2: 'How to send it',
          blocks: [
            {
              t: 'ol',
              items: [
                'Create an event and write “Birthday” as the type.',
                'Add guests by pasting a list or picking from contacts.',
                'Send by WhatsApp, or SMS for guests without WhatsApp.',
                'Track replies and the number of people coming.',
              ],
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Can I send a birthday invitation on WhatsApp?',
          a: 'Yes. Each guest receives their own card link and can reply without an account.',
        },
        {
          q: 'Can I see who is coming?',
          a: 'Yes. Replies are collected in one place, with the number of people each guest brings.',
        },
      ],
    },
  },
  {
    slug: 'kadi-ya-kitchen-party',
    group: 'product',
    schema: 'WebPage',
    updated: UPDATED,
    related: [
      'kadi-ya-send-off',
      'kadi-ya-uchumba',
      'michango-ya-harusi',
      'kadi-za-mwaliko-mtandaoni',
    ],
    sw: {
      nav: 'Kadi ya kitchen party',
      title: 'Kadi ya Kitchen Party na Bridal Shower | Harusi Pass',
      description:
        'Tuma kadi ya kitchen party au bridal shower kwa WhatsApp na SMS. Wageni wanajibu mtandaoni na unafuatilia michango ya kamati kwa kila mgeni.',
      h1: 'Kadi ya kitchen party na bridal shower',
      answer:
        'Unaunda tukio, unaandika “Kitchen party” kama aina, na kuweka tarehe, ukumbi na mavazi. Wageni wanapokea kadi yao kwa WhatsApp au SMS na kujibu mtandaoni, na unaweza kufuatilia michango ya kamati kwa kila mgeni.',
      sections: [
        {
          id: 'taarifa',
          h2: 'Taarifa za kuweka kwenye kadi',
          blocks: [
            {
              t: 'ul',
              items: [
                'Jina la bibi harusi mtarajiwa',
                'Tarehe, saa na ukumbi, pamoja na ramani',
                'Mavazi au rangi ya siku',
                'Mchango uliopendekezwa au zawadi, kama kamati imepanga',
                'Namba ya mwenyekiti wa kamati kwa maswali',
              ],
            },
          ],
        },
        {
          id: 'michango',
          h2: 'Michango ya kamati',
          blocks: [
            {
              t: 'p',
              text: 'Kamati ikiwa na michango, ahadi na malipo yanaonekana kwa kila mgeni na mgeni analipa kwa simu kutoka kwenye kadi. Soma zaidi kwenye ukurasa wa michango ya harusi.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Naweza kutumia kadi hii kwa bridal shower?',
          a: 'Ndiyo. Unaandika aina ya tukio unayotaka na maneno ya kadi yanafuata.',
        },
        {
          q: 'Wageni wazee wasio na smartphone wataalikwaje?',
          a: 'Wanapokea SMS yenye namba ya kadi, au kadi ya karatasi unayochapisha.',
        },
      ],
    },
    en: {
      nav: 'Kitchen party invitations',
      title: 'Kitchen Party and Bridal Shower Invitations | Harusi Pass',
      description:
        'Send kitchen party or bridal shower invitations by WhatsApp and SMS. Guests reply online and you can track committee contributions per guest.',
      h1: 'Kitchen party and bridal shower invitations',
      answer:
        'You create an event, write “Kitchen party” as the type, and set the date, venue and dress code. Guests receive their card by WhatsApp or SMS and reply online, and you can track committee contributions for each guest.',
      sections: [
        {
          id: 'details',
          h2: 'What to put on the card',
          blocks: [
            {
              t: 'ul',
              items: [
                'The name of the bride-to-be',
                'Date, time and venue, with a map',
                'Dress code or colour of the day',
                'A suggested contribution or gift, if the committee has agreed one',
                'The committee chairperson’s number for questions',
              ],
            },
          ],
        },
        {
          id: 'contributions',
          h2: 'Committee contributions',
          blocks: [
            {
              t: 'p',
              text: 'If the committee collects contributions, pledges and payments show per guest and guests pay by phone from the card. Read more on the wedding contributions page.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Can I use this for a bridal shower?',
          a: 'Yes. You write the event type you want and the card wording follows it.',
        },
        {
          q: 'How are elders without smartphones invited?',
          a: 'They receive an SMS with their card number, or a paper card you print.',
        },
      ],
    },
  },
  {
    slug: 'kadi-ya-mahafali',
    group: 'product',
    schema: 'WebPage',
    updated: UPDATED,
    related: ['kadi-za-mwaliko-mtandaoni', 'kadi-ya-kuzaliwa', 'kutuma-kadi-za-mwaliko-whatsapp'],
    sw: {
      nav: 'Kadi ya mahafali',
      title: 'Kadi ya Mwaliko wa Mahafali Mtandaoni | Harusi Pass',
      description:
        'Alika familia na marafiki kwenye mahafali kwa kadi ya mtandaoni. Tuma kwa WhatsApp au SMS, pokea majibu, na waingize wageni kwa namba ya kadi.',
      h1: 'Kadi ya mwaliko wa mahafali',
      answer:
        'Unaunda tukio na kuandika “Mahafali” kama aina, kisha unaweka tarehe, ukumbi na idadi ya watu kila mgeni anaoruhusiwa kuja nao. Wageni wanapokea kadi kwa WhatsApp au SMS, na siku ya mahafali wanaingia kwa QR au namba ya kadi.',
      sections: [
        {
          id: 'kwa-nini',
          h2: 'Kwa nini kadi ya mtandaoni kwa mahafali',
          blocks: [
            {
              t: 'p',
              text: 'Nafasi za ukumbi wa mahafali mara nyingi ni chache. Kila mgeni akipewa idadi ya watu anaoruhusiwa kuja nao, unaweza kudhibiti idadi ya watakaoingia na kujua mapema nani amethibitisha.',
            },
          ],
        },
        {
          id: 'hatua',
          h2: 'Jinsi ya kutuma',
          blocks: [
            {
              t: 'ol',
              items: [
                'Unda tukio na uandike “Mahafali” kama aina.',
                'Weka tarehe, ukumbi na maelezo kama maegesho au mavazi.',
                'Ingiza wageni na uweke idadi ya watu wanaoruhusiwa kwa kila mmoja.',
                'Tuma kadi na fuatilia majibu.',
              ],
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Naweza kupunguza idadi ya watu kila mgeni anaoleta?',
          a: 'Ndiyo. Kila mgeni ana idadi ya watu wanaoruhusiwa kuja naye, kuanzia mmoja hadi kumi.',
        },
        {
          q: 'Kadi inaweza kutumika kwa mahafali ya shule na chuo?',
          a: 'Ndiyo. Aina ya tukio ni maandishi huru, kwa hiyo unaandika unachohitaji.',
        },
      ],
    },
    en: {
      nav: 'Graduation invitations',
      title: 'Graduation Invitation Cards Online | Harusi Pass',
      description:
        'Invite family and friends to a graduation with an online card. Send by WhatsApp or SMS, collect replies and admit guests with their card number.',
      h1: 'Graduation invitation cards',
      answer:
        'You create an event and write “Graduation” as the type, then set the date, venue and how many people each guest may bring. Guests receive their card by WhatsApp or SMS, and on the day they enter with their QR or card number.',
      sections: [
        {
          id: 'why',
          h2: 'Why an online card for a graduation',
          blocks: [
            {
              t: 'p',
              text: 'Graduation halls often have limited seats. When each guest is given a number of people they may bring, you can control who enters and know early who has confirmed.',
            },
          ],
        },
        {
          id: 'steps',
          h2: 'How to send it',
          blocks: [
            {
              t: 'ol',
              items: [
                'Create an event and write “Graduation” as the type.',
                'Set the date, venue and details such as parking or dress.',
                'Add guests and set how many people each may bring.',
                'Send the cards and track replies.',
              ],
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Can I limit how many people each guest brings?',
          a: 'Yes. Each guest has a number of people allowed to come with them, from one to ten.',
        },
        {
          q: 'Does it work for school and university graduations?',
          a: 'Yes. The event type is free text, so you write what you need.',
        },
      ],
    },
  },
  {
    slug: 'kadi-za-mwaliko-biashara',
    group: 'product',
    schema: 'WebPage',
    updated: UPDATED,
    related: ['kadi-za-mwaliko-mtandaoni', 'lango-la-harusi-qr', 'kusimamia-majibu-ya-rsvp'],
    sw: {
      nav: 'Mialiko ya biashara',
      title: 'Mialiko ya Kidijitali kwa Matukio ya Biashara | Harusi Pass',
      description:
        'Tuma mialiko ya kidijitali kwa uzinduzi, mikutano na sherehe za kampuni. Kila mgeni ana kadi yake, majibu yanakusanywa, na lango linaskani QR.',
      h1: 'Mialiko ya kidijitali kwa matukio ya biashara',
      answer:
        'Kwa uzinduzi, mkutano au sherehe ya kampuni, unaunda tukio, unaingiza orodha ya wageni na kila mmoja anapokea kadi yake yenye QR. Majibu yanakusanywa mahali pamoja, na mapokezi yanaingiza wageni kwa kuskani QR au kuandika namba.',
      sections: [
        {
          id: 'faida',
          h2: 'Faida kwa waandaaji',
          blocks: [
            {
              t: 'ul',
              items: [
                'Orodha ya waalikwa na majibu yao mahali pamoja',
                'Kila mgeni ana kadi na QR yake, kwa hiyo kadi iliyosambazwa haitumiki mara mbili',
                'Mapokezi yanaingiza wageni haraka, hata ukumbi usipokuwa na mtandao',
                'Idadi ya waliofika inaonekana wakati wa tukio',
              ],
            },
          ],
        },
        {
          id: 'kumbuka',
          h2: 'Kumbuka',
          blocks: [
            {
              t: 'note',
              text: 'Harusi Pass ilijengwa kwa sherehe za binafsi. Haiuzi tiketi wala haina mpangilio wa viti. Ikiwa unahitaji hivyo, wasiliana nasi kabla ya kuamua.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Naweza kutumia kwa mkutano au uzinduzi wa kampuni?',
          a: 'Ndiyo, kwa mialiko, majibu na kuingiza wageni. Hakuna uuzaji wa tiketi.',
        },
        {
          q: 'Wageni wanahitaji kupakua programu?',
          a: 'Hapana. Wanafungua kiungo kwenye simu.',
        },
      ],
    },
    en: {
      nav: 'Business event invitations',
      title: 'Digital Invitations for Business Events | Harusi Pass',
      description:
        'Send digital invitations for launches, meetings and company celebrations. Every guest has their own card, replies are collected and the door scans QR codes.',
      h1: 'Digital invitations for business events',
      answer:
        'For a launch, meeting or company celebration, you create an event, add your guest list and each person receives their own card with a QR. Replies are collected in one place, and reception admits guests by scanning the QR or typing the number.',
      sections: [
        {
          id: 'benefits',
          h2: 'Benefits for organisers',
          blocks: [
            {
              t: 'ul',
              items: [
                'The guest list and their replies in one place',
                'Each guest has their own card and QR, so a forwarded card cannot be used twice',
                'Reception admits guests quickly, even in a venue without network',
                'Arrival counts are visible during the event',
              ],
            },
          ],
        },
        {
          id: 'note',
          h2: 'Good to know',
          blocks: [
            {
              t: 'note',
              text: 'Harusi Pass was built for private celebrations. It does not sell tickets or plan seating. If you need those, contact us before you decide.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Can I use it for a company meeting or launch?',
          a: 'Yes, for invitations, replies and admitting guests. It does not sell tickets.',
        },
        {
          q: 'Do guests need to download an app?',
          a: 'No. They open the link on their phone.',
        },
      ],
    },
  },
];
