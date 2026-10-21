import type { ContentPageDef } from '../types';

const UPDATED = '2026-10-20';

/** Blog-style guides from the SEO strategy (section 9). Prices are deliberately not quoted. */
export const ARTICLE_PAGES: ContentPageDef[] = [
  {
    slug: 'jinsi-ya-kuunda-kadi-ya-harusi-tanzania',
    group: 'guide',
    schema: 'Article',
    updated: UPDATED,
    related: [
      'kadi-ya-harusi-mtandaoni',
      'maneno-ya-kadi-ya-harusi',
      'kutuma-kadi-za-mwaliko-whatsapp',
      'kadi-ya-mtandaoni-vs-karatasi',
    ],
    sw: {
      nav: 'Kuunda kadi ya harusi',
      title: 'Jinsi ya Kuunda Kadi ya Harusi Mtandaoni Tanzania',
      description:
        'Hatua kwa hatua za kuunda kadi ya harusi ya kidijitali: taarifa za kuweka, kuchagua mtindo, kuwatumia wageni na kuhakikisha wazee wanaipata.',
      h1: 'Jinsi ya kuunda kadi ya harusi mtandaoni nchini Tanzania',
      answer:
        'Kusanya taarifa za harusi, chagua mtindo wa kadi, ingiza orodha ya wageni, kisha utume kwa WhatsApp, SMS au karatasi. Hakiki kadi kwenye simu kabla ya kutuma, na wapatie wazee kadi ya karatasi yenye namba ileile ya QR.',
      sections: [
        {
          id: 'taarifa',
          h2: 'Taarifa za kuandaa kabla ya kuanza',
          blocks: [
            {
              t: 'ul',
              items: [
                'Majina ya bibi na bwana harusi',
                'Tarehe na saa ya kila sehemu: ibada au nikah, na sherehe',
                'Ukumbi, mji na ramani',
                'Mavazi au rangi ya siku',
                'Namba ya simu ya kamati ya kujibu maswali',
                'Orodha ya wageni yenye namba za simu',
              ],
            },
          ],
        },
        {
          id: 'hatua',
          h2: 'Hatua za kuunda kadi',
          blocks: [
            {
              t: 'ol',
              items: [
                'Unda harusi na uandike majina, tarehe na ukumbi.',
                'Chagua mtindo wa rangi unaoendana na harusi yenu.',
                'Hakiki kadi kwenye simu, kama mgeni atakavyoiona.',
                'Ingiza wageni na uweke idadi ya watu kila mmoja anaoruhusiwa kuja nao.',
                'Chagua njia ya kutuma kwa kila mgeni.',
              ],
            },
          ],
        },
        {
          id: 'aina',
          h2: 'Harusi ya kanisani, ya kimila au ya nikah',
          blocks: [
            {
              t: 'p',
              text: 'Kadi inaweza kuandikwa kwa aina yoyote ya sherehe. Weka maelezo ya kila sehemu, kwa mfano ibada ya saa nane na mapokezi ya saa kumi na mbili, na ongeza salamu yako mwenyewe. Maneno ya mfano yako kwenye ukurasa wa maneno ya kadi ya harusi.',
            },
          ],
        },
        {
          id: 'wazee',
          h2: 'Wazee na wasio na smartphone',
          blocks: [
            {
              t: 'p',
              text: 'Tuma SMS yenye namba ya kadi au chapisha kadi ya karatasi. Ukurasa wa wageni wasio na smartphone unaeleza jinsi wanavyoingia langoni.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Naweza kuunda kadi ya harusi kwa simu pekee?',
          a: 'Ndiyo. Unaweza kuunda harusi, kuingiza wageni na kutuma kadi kwa kutumia simu.',
        },
        {
          q: 'Nitumie kadi lini?',
          a: 'Wengi hutuma wiki sita hadi nane kabla ya harusi na kutuma kikumbusho karibu na tarehe. Kadi Sasa inaweza kutuma vikumbusho kwa wasiojibu.',
        },
      ],
    },
    en: {
      nav: 'Creating a wedding card',
      title: 'How to Create a Digital Wedding Invitation in Tanzania',
      description:
        'Step-by-step guide to a digital wedding card: what to include, choosing a style, sending it to guests and making sure elders receive it too.',
      h1: 'How to create a digital wedding invitation in Tanzania',
      answer:
        'Gather the wedding details, choose a card style, add your guest list, then send by WhatsApp, SMS or paper. Preview the card on a phone before sending, and give elders a paper card carrying the same QR and number.',
      sections: [
        {
          id: 'details',
          h2: 'Details to prepare before you start',
          blocks: [
            {
              t: 'ul',
              items: [
                'The names of the couple',
                'The date and time of each part: church service or nikah, and the reception',
                'The venue, town and map',
                'Dress code or colour of the day',
                'A committee phone number to answer questions',
                'A guest list with phone numbers',
              ],
            },
          ],
        },
        {
          id: 'steps',
          h2: 'Steps to create the card',
          blocks: [
            {
              t: 'ol',
              items: [
                'Create the wedding and enter the names, date and venue.',
                'Choose a colour style that suits the wedding.',
                'Preview the card on a phone, as a guest will see it.',
                'Add guests and set how many people each may bring.',
                'Choose how to send to each guest.',
              ],
            },
          ],
        },
        {
          id: 'types',
          h2: 'Church, traditional or nikah weddings',
          blocks: [
            {
              t: 'p',
              text: 'The card can be written for any kind of ceremony. Add the details of each part, for example a 2 pm service and a 6 pm reception, and add your own greeting. Sample wording is on the wedding card wording page.',
            },
          ],
        },
        {
          id: 'elders',
          h2: 'Elders and guests without smartphones',
          blocks: [
            {
              t: 'p',
              text: 'Send an SMS with the card number or print a paper card. The page on guests without smartphones explains how they enter at the gate.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Can I create a wedding card from a phone alone?',
          a: 'Yes. You can create the wedding, add guests and send cards using only a phone.',
        },
        {
          q: 'When should I send the cards?',
          a: 'Many hosts send six to eight weeks ahead and a reminder near the date. Kadi Sasa can send reminders to guests who have not replied.',
        },
      ],
    },
  },
  {
    slug: 'kadi-ya-mtandaoni-vs-karatasi',
    group: 'guide',
    schema: 'Article',
    updated: UPDATED,
    related: [
      'kadi-ya-harusi-mtandaoni',
      'kadi-ya-harusi-bila-smartphone',
      'usalama-wa-kadi-za-mtandaoni',
    ],
    sw: {
      nav: 'Mtandaoni au karatasi',
      title: 'Kadi ya Mtandaoni au ya Karatasi? Ulinganisho',
      description:
        'Kadi ya mwaliko ya mtandaoni na ya karatasi: tofauti za gharama, kasi, kubadilisha taarifa na kuwafikia wageni. Lini utumie zote mbili.',
      h1: 'Kadi ya mtandaoni au ya karatasi: ipi ni bora?',
      answer:
        'Kadi ya mtandaoni inatumwa haraka, inaweza kusahihishwa taarifa zikibadilika, na inaonyesha nani amejibu. Kadi ya karatasi inawafikia wazee na ina hadhi ya jadi. Njia nzuri kwa harusi nyingi ni kutumia zote mbili, kwa wageni wanaozihitaji.',
      sections: [
        {
          id: 'ulinganisho',
          h2: 'Ulinganisho kwa muhtasari',
          blocks: [
            {
              t: 'table',
              head: ['Jambo', 'Kadi ya mtandaoni', 'Kadi ya karatasi'],
              rows: [
                ['Kutuma', 'Papo hapo kwa WhatsApp au SMS', 'Inabebwa au kupelekwa kwa mkono'],
                [
                  'Kubadilisha taarifa',
                  'Kiungo kinaonyesha taarifa mpya',
                  'Inahitaji kuchapisha upya',
                ],
                ['Kujua nani amejibu', 'Ndiyo, kwa kila mgeni', 'Mpaka mtu ajibu kwa simu'],
                ['Wazee wasio na smartphone', 'Kwa SMS yenye namba', 'Wanaishika mkononi'],
                [
                  'Gharama',
                  'Hakuna uchapishaji; SMS zina gharama ndogo',
                  'Uchapishaji na usafirishaji',
                ],
              ],
            },
            {
              t: 'note',
              text: 'Linganisha kwa bei halisi unazopewa na mchapishaji wako na gharama za SMS zinazoonyeshwa kabla ya kutuma. Hatutaji bei za soko hapa kwa sababu zinabadilika.',
            },
          ],
        },
        {
          id: 'zote-mbili',
          h2: 'Lini utumie zote mbili',
          blocks: [
            {
              t: 'p',
              text: 'Tuma kadi ya mtandaoni kwa wengi, na uchapishe kadi za karatasi kwa wazazi na wageni wa heshima. Zote zinatumia QR ileile ya mgeni, kwa hiyo mgeni hawezi kuingia mara mbili.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Kadi ya mtandaoni inatosha kwa harusi?',
          a: 'Kwa wageni wengi ndiyo, lakini wazee wengi wanapendelea karatasi. Unaweza kutumia zote mbili.',
        },
        {
          q: 'Nikibadilisha ukumbi baada ya kutuma?',
          a: 'Kadi za mtandaoni zinaonyesha taarifa mpya wageni wanapofungua kiungo. Kadi za karatasi zilizochapishwa zinahitaji ujumbe wa ziada.',
        },
      ],
    },
    en: {
      nav: 'Digital vs printed',
      title: 'Digital vs Printed Invitation Cards: A Comparison',
      description:
        'Digital and printed invitation cards compared on cost, speed, updating details and reaching guests. When to use both.',
      h1: 'Digital vs printed invitation cards: which is better?',
      answer:
        'A digital card sends instantly, can be corrected if details change, and shows who has replied. A printed card reaches elders and carries tradition. For most weddings the best approach is both, each given to the guests who need it.',
      sections: [
        {
          id: 'compare',
          h2: 'The comparison at a glance',
          blocks: [
            {
              t: 'table',
              head: ['Aspect', 'Digital card', 'Printed card'],
              rows: [
                ['Sending', 'Instantly by WhatsApp or SMS', 'Carried or delivered by hand'],
                ['Changing details', 'The link shows the new details', 'Needs reprinting'],
                ['Knowing who replied', 'Yes, per guest', 'Not until the guest calls'],
                ['Elders without smartphones', 'By SMS with a number', 'They hold it in hand'],
                ['Cost', 'No printing; SMS cost a little', 'Printing and delivery'],
              ],
            },
            {
              t: 'note',
              text: 'Compare using the real quotes from your printer and the SMS cost shown before you send. We do not quote market prices here because they change.',
            },
          ],
        },
        {
          id: 'both',
          h2: 'When to use both',
          blocks: [
            {
              t: 'p',
              text: 'Send the digital card to most guests and print paper cards for parents and guests of honour. Both use the guest’s own QR, so a guest cannot enter twice.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Is a digital card enough for a wedding?',
          a: 'For most guests yes, but many elders prefer paper. You can use both.',
        },
        {
          q: 'What if the venue changes after sending?',
          a: 'Digital cards show the new details when guests open the link. Printed cards need an extra message.',
        },
      ],
    },
  },
  {
    slug: 'kutuma-kadi-za-mwaliko-whatsapp',
    group: 'guide',
    schema: 'Article',
    updated: UPDATED,
    related: [
      'kadi-za-mwaliko-mtandaoni',
      'kadi-ya-harusi-mtandaoni',
      'usalama-wa-kadi-za-mtandaoni',
      'kusimamia-majibu-ya-rsvp',
    ],
    sw: {
      nav: 'Kutuma kwa WhatsApp',
      title: 'Jinsi ya Kutuma Kadi za Mwaliko kwa WhatsApp',
      description:
        'Njia sahihi ya kutuma kadi za mwaliko kwa WhatsApp: kiungo cha kila mgeni, ujumbe mfupi wenye heshima, na nini cha kufanya mgeni asipojibu.',
      h1: 'Jinsi ya kutuma kadi za mwaliko kwa WhatsApp',
      answer:
        'Tuma kila mgeni kiungo chake cha kadi, si picha kwenye kundi. Andika ujumbe mfupi wenye jina lake, tarehe na ukumbi. Wasio na WhatsApp wapewe SMS yenye namba ya kadi. Fuatilia nani amefungua, kisha mkumbushe wasiojibu.',
      sections: [
        {
          id: 'kiungo',
          h2: 'Kiungo cha kila mgeni badala ya picha ya kundi',
          blocks: [
            {
              t: 'p',
              text: 'Picha moja kwenye kundi inamfikia kila mtu bila kujua nani ameiona na nani amejibu, na inaweza kusambazwa kwa watu ambao hawakualikwa. Kiungo cha mgeni mmoja kinakuonyesha kama amefungua na kinaweza kuhusishwa na QR yake.',
            },
          ],
        },
        {
          id: 'ujumbe',
          h2: 'Ujumbe unaofaa',
          blocks: [
            {
              t: 'p',
              text: 'Mfano: “Habari Mama Neema! Asha na Juma wanakualika kwenye harusi yao, Jumamosi 14 Desemba, Ukumbi wa Mwanga, Kibaha. Fungua kadi yako hapa: [kiungo]. Karibu sana.”',
            },
            {
              t: 'ul',
              items: [
                'Mwite kwa jina lake',
                'Taja tarehe na ukumbi ndani ya ujumbe',
                'Onyesha mtumaji ni nani, ili mgeni asidhani ni ulaghai',
                'Usiombe nywila, namba ya siri wala malipo kwenye ujumbe',
              ],
            },
          ],
        },
        {
          id: 'wasio',
          h2: 'Wasio na WhatsApp',
          blocks: [
            {
              t: 'p',
              text: 'Wapelekee SMS yenye kiungo na namba ya kadi, kwa mfano KH-4826. Ujumbe wa WhatsApp usipofika, huduma inaweza kutuma SMS badala yake.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Naweza kutuma kadi kwa WhatsApp bila kumsajili kila mgeni?',
          a: 'Ndiyo. Unaingiza namba zao tu na wao wanafungua kiungo bila akaunti.',
        },
        {
          q: 'Kwa nini nisitume picha kwenye kundi?',
          a: 'Hutajua nani amejibu, na picha inaweza kusambazwa kwa wasioalikwa. Kiungo cha kila mgeni kinaondoa matatizo hayo.',
        },
      ],
    },
    en: {
      nav: 'Sending on WhatsApp',
      title: 'How to Send Digital Invitation Cards on WhatsApp',
      description:
        'The right way to send invitation cards on WhatsApp: a link for each guest, a short respectful message, and what to do when a guest does not reply.',
      h1: 'How to send digital invitation cards on WhatsApp',
      answer:
        'Send each guest their own card link, not an image in a group. Write a short message with their name, the date and the venue. Give guests without WhatsApp an SMS with the card number. Track who has opened it, then remind those who have not replied.',
      sections: [
        {
          id: 'link',
          h2: 'A link per guest instead of a group image',
          blocks: [
            {
              t: 'p',
              text: 'One image in a group reaches everyone without telling you who saw it or replied, and it can be forwarded to people who were not invited. A link for one guest shows you whether they opened it and can be tied to their own QR.',
            },
          ],
        },
        {
          id: 'message',
          h2: 'A good message',
          blocks: [
            {
              t: 'p',
              text: 'Example: “Hello Mama Neema! Asha and Juma invite you to their wedding, Saturday 14 December, Ukumbi wa Mwanga, Kibaha. Open your card here: [link]. You are most welcome.”',
            },
            {
              t: 'ul',
              items: [
                'Address the guest by name',
                'State the date and venue in the message',
                'Show who the sender is, so the guest does not suspect a scam',
                'Never ask for passwords, PINs or payment in the message',
              ],
            },
          ],
        },
        {
          id: 'no-whatsapp',
          h2: 'Guests without WhatsApp',
          blocks: [
            {
              t: 'p',
              text: 'Send an SMS with the link and the card number, for example KH-4826. If a WhatsApp message is not delivered, the service can send an SMS instead.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Can I send cards on WhatsApp without registering each guest?',
          a: 'Yes. You only enter their numbers, and they open the link without an account.',
        },
        {
          q: 'Why not post an image in a group?',
          a: 'You will not know who replied, and the image can be forwarded to uninvited people. A link per guest avoids both.',
        },
      ],
    },
  },
  {
    slug: 'kusimamia-majibu-ya-rsvp',
    group: 'guide',
    schema: 'Article',
    updated: UPDATED,
    related: [
      'kadi-ya-harusi-mtandaoni',
      'lango-la-harusi-qr',
      'kutuma-kadi-za-mwaliko-whatsapp',
      'kadi-za-mwaliko-biashara',
    ],
    sw: {
      nav: 'Kusimamia majibu (RSVP)',
      title: 'Jinsi ya Kusimamia Majibu ya Wageni (RSVP) Mtandaoni',
      description:
        'Orodha ya wageni, tarehe ya mwisho ya kujibu, vikumbusho na idadi ya watakaokuja: jinsi ya kusimamia RSVP ya harusi au sherehe yoyote mtandaoni.',
      h1: 'Jinsi ya kusimamia majibu ya wageni (RSVP) mtandaoni',
      answer:
        'Weka orodha ya wageni, mpe kila mmoja kadi yake, na uweke tarehe ya mwisho ya kujibu. Kila jibu linakusanywa mahali pamoja pamoja na idadi ya watu watakaokuja, na wasiojibu wanakumbushwa kwa heshima ili upate idadi sahihi kabla ya sherehe.',
      sections: [
        {
          id: 'hatua',
          h2: 'Hatua za kusimamia RSVP',
          blocks: [
            {
              t: 'ol',
              items: [
                'Ingiza orodha ya wageni na uweke idadi ya watu kila mmoja anaoruhusiwa kuja nao.',
                'Weka tarehe ya mwisho ya kujibu.',
                'Tuma kadi, kisha angalia nani amefungua na nani amejibu.',
                'Wakumbushe wasiojibu kwa ujumbe mfupi wenye heshima.',
                'Tumia idadi ya waliothibitisha kupanga chakula, viti na bajeti.',
              ],
            },
          ],
        },
        {
          id: 'hali',
          h2: 'Hali za kila mgeni',
          blocks: [
            {
              t: 'p',
              text: 'Kila kadi ina hali: imetumwa, imefika, imefunguliwa, imethibitishwa au amekataa, na baadaye amefika langoni. Unaona idadi ya kila hali kwenye muhtasari wa harusi.',
            },
          ],
        },
        {
          id: 'langoni',
          h2: 'Kutoka majibu hadi langoni',
          blocks: [
            {
              t: 'p',
              text: 'Majibu yaleyale yanatumika siku ya sherehe: lango linajua nani alialikwa na ataingia na watu wangapi. Soma jinsi lango la QR linavyofanya kazi.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'RSVP ni nini?',
          a: 'Ni jibu la mgeni kwamba atahudhuria au hatahudhuria. Neno linatokana na Kifaransa “répondez s’il vous plaît”, yaani tafadhali jibu.',
        },
        {
          q: 'Wageni wasiojibu nifanyeje?',
          a: 'Wakumbushe kwa ujumbe wa heshima karibu na tarehe ya mwisho. Huduma inaweza kutuma vikumbusho vichache.',
        },
      ],
    },
    en: {
      nav: 'Managing RSVPs',
      title: 'How to Manage Wedding RSVPs and Guest Replies Online',
      description:
        'Guest lists, reply deadlines, reminders and headcount: how to manage RSVPs for a wedding or any event online.',
      h1: 'How to manage guest replies (RSVPs) online',
      answer:
        'Set up your guest list, give each guest their own card and set a reply deadline. Every reply is collected in one place with the number of people coming, and guests who have not replied are reminded politely so you have an accurate headcount before the event.',
      sections: [
        {
          id: 'steps',
          h2: 'Steps to manage RSVPs',
          blocks: [
            {
              t: 'ol',
              items: [
                'Add the guest list and set how many people each may bring.',
                'Set a reply deadline.',
                'Send the cards, then watch who has opened and who has replied.',
                'Remind guests who have not replied with a short, polite message.',
                'Use the confirmed count to plan food, seating and budget.',
              ],
            },
          ],
        },
        {
          id: 'status',
          h2: 'The status of each guest',
          blocks: [
            {
              t: 'p',
              text: 'Each card has a status: sent, delivered, opened, confirmed or declined, and later checked in at the gate. You see the count for each status on the wedding overview.',
            },
          ],
        },
        {
          id: 'gate',
          h2: 'From replies to the gate',
          blocks: [
            {
              t: 'p',
              text: 'The same list is used on the day: the gate knows who was invited and how many may enter with them. Read how the QR gate works.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'What does RSVP mean?',
          a: 'It is a guest’s reply saying whether they will attend. It comes from the French “répondez s’il vous plaît”, meaning please reply.',
        },
        {
          q: 'What do I do about guests who do not reply?',
          a: 'Remind them politely close to the deadline. The service can send a few reminders for you.',
        },
      ],
    },
  },
];
