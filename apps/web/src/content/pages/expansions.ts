import type { Faq, Section } from '../types';

/**
 * Worked examples, wording samples and occasion-specific answers for the pages the SEO audit found thin
 * (docs/seo/SEO-AUDIT.md finding 9). Appended after each page's own sections and FAQ by `withExpansions`
 * in `content/index.ts`, which also moves the page's `updated` date.
 */
export interface Expansion {
  updated: string;
  sw: { sections: Section[]; faq: Faq[] };
  en: { sections: Section[]; faq: Faq[] };
}

const UPDATED = '2026-11-05';

export const EXPANSIONS: Record<string, Expansion> = {
  'kadi-ya-kitchen-party': {
    updated: UPDATED,
    sw: {
      sections: [
        {
          id: 'mfano-halisi',
          h2: 'Mfano: kitchen party ya Neema, Arusha',
          blocks: [
            {
              t: 'p',
              text: 'Kamati ya Neema ina wageni 60, wengi wao wanawake wa familia na marafiki wa kazini. Mwenyekiti anabandika majina kwenye orodha moja, anaandika “Kitchen party” kama aina ya tukio, na kuweka rangi ya siku: zambarau na dhahabu.',
            },
            {
              t: 'p',
              text: 'Wageni 48 wana WhatsApp na wanapokea kiungo cha kadi. Wageni 12, wakiwemo bibi wawili, wanapokea SMS yenye namba fupi ya kadi. Wiki moja kabla, kamati inaona wamethibitisha 41 na inapanga viti na chakula kwa idadi hiyo, si kwa kukisia.',
            },
          ],
        },
        {
          id: 'maneno-mfano',
          h2: 'Maneno ya kadi ya kitchen party',
          blocks: [
            {
              t: 'note',
              text: '“Familia ya Mzee Laizer inakualika kwenye kitchen party ya binti yetu Neema, Jumamosi 6 Machi 2027, saa 8 mchana, ukumbi wa Mount Meru, Arusha. Rangi ya siku: zambarau na dhahabu. Karibu sana.”',
            },
            {
              t: 'p',
              text: 'Andika kwa ufupi. Mgeni anahitaji jina, siku, saa, mahali na rangi. Maelezo ya mchango au zawadi yawekwe kwenye kadi ya michango, si kwenye mwaliko wenyewe.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Kitchen party na bridal shower zina tofauti gani?',
          a: 'Kitchen party ni sherehe ya Kitanzania ya wanawake ya kumwandaa bibi harusi mtarajiwa, yenye zawadi za nyumbani na mafundisho. Bridal shower ni jina la Kiingereza la sherehe inayofanana. Kwenye Kadi Sasa unaandika jina lolote kati ya hayo kama aina ya tukio.',
        },
        {
          q: 'Naweza kutuma kadi kwa kikundi kimoja tu?',
          a: 'Ndiyo. Weka wageni kwenye vikundi, mfano “Familia” na “Kazini”, kisha kwenye Tuma chagua kikundi unachotaka. Wengine hawapokei chochote.',
        },
      ],
    },
    en: {
      sections: [
        {
          id: 'worked-example',
          h2: 'Example: Neema’s kitchen party in Arusha',
          blocks: [
            {
              t: 'p',
              text: 'Neema’s committee has 60 guests, mostly women from the family and friends from work. The chair pastes the names into one list, writes “Kitchen party” as the event type, and sets the colour of the day: purple and gold.',
            },
            {
              t: 'p',
              text: '48 guests have WhatsApp and get a link to their card. 12 guests, including two grandmothers, get an SMS with a short card number. A week before, the committee sees 41 confirmations and plans seats and food for that number instead of guessing.',
            },
          ],
        },
        {
          id: 'wording-sample',
          h2: 'Kitchen party invitation wording',
          blocks: [
            {
              t: 'note',
              text: '“The family of Mzee Laizer invites you to the kitchen party of our daughter Neema, Saturday 6 March 2027, 2 pm, Mount Meru Hall, Arusha. Colour of the day: purple and gold. You are most welcome.”',
            },
            {
              t: 'p',
              text: 'Keep it short. A guest needs the name, day, time, place and colour. Contribution or gift details belong on the contribution card, not on the invitation itself.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'What is the difference between a kitchen party and a bridal shower?',
          a: 'A kitchen party is a Tanzanian women’s celebration that prepares the bride-to-be, with gifts for the home and advice. A bridal shower is the English name for a similar event. In Kadi Sasa you write either as the event type.',
        },
        {
          q: 'Can I send cards to one group only?',
          a: 'Yes. Put guests into groups, such as “Family” and “Work”, then on Send choose the group you want. Nobody else receives anything.',
        },
      ],
    },
  },
  'kadi-za-mwaliko-biashara': {
    updated: UPDATED,
    sw: {
      sections: [
        {
          id: 'mfano-halisi',
          h2: 'Mfano: uzinduzi wa bidhaa, Dar es Salaam',
          blocks: [
            {
              t: 'p',
              text: 'Kampuni inaalika wateja 250 kwenye uzinduzi. Inaingiza orodha kutoka Excel kama faili la CSV, na kila mgeni anapata kadi yenye jina lake, QR yake na namba fupi. Mlangoni, wapokeaji wawili wanatumia simu zao kama lango.',
            },
            {
              t: 'p',
              text: 'Kadi ya mtu mmoja inaingiza mara moja tu. Kiungo kikisambazwa kwenye kundi, aliyekuja kwa kadi ya mwenzake anaonekana mlangoni kama “Tayari ameingia”, pamoja na saa ya kuingia kwa mwenye kadi.',
            },
          ],
        },
        {
          id: 'ripoti-baadaye',
          h2: 'Ripoti baada ya tukio',
          blocks: [
            {
              t: 'ul',
              items: [
                'Idadi ya walioalikwa, waliothibitisha na waliofika.',
                'Orodha ya waliofika na saa walioingia.',
                'Faili la CSV la kufuatilia waliohudhuria, kwa kuzingatia sheria ya ulinzi wa taarifa binafsi.',
              ],
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Naweza kuingiza wageni kutoka Excel?',
          a: 'Ndiyo. Hifadhi orodha kama CSV na uiingize. Kadi Sasa inakagua namba za simu, inaonyesha zenye makosa na zinazojirudia, na haihifadhi chochote hadi uthibitishe.',
        },
        {
          q: 'Wageni wa kimataifa wanapata kadi kwa Kiingereza?',
          a: 'Ndiyo. Kila mgeni ana lugha yake, Kiswahili au Kiingereza, na kadi yake inaonyeshwa kwa lugha hiyo.',
        },
      ],
    },
    en: {
      sections: [
        {
          id: 'worked-example',
          h2: 'Example: a product launch in Dar es Salaam',
          blocks: [
            {
              t: 'p',
              text: 'A company invites 250 clients to a launch. It imports the list from Excel as a CSV file, and every guest gets a card with their name, their own QR and a short number. At the door, two ushers use their phones as the gate.',
            },
            {
              t: 'p',
              text: 'One person’s card admits once. If the link is forwarded around a group, whoever arrives with someone else’s card shows as “Already admitted” at the door, with the time the real guest came in.',
            },
          ],
        },
        {
          id: 'after-event',
          h2: 'Reports after the event',
          blocks: [
            {
              t: 'ul',
              items: [
                'How many were invited, confirmed and arrived.',
                'The list of arrivals with the time each came in.',
                'A CSV file for following up attendees, in line with data protection law.',
              ],
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Can I import guests from Excel?',
          a: 'Yes. Save the list as CSV and import it. Kadi Sasa checks phone numbers, flags invalid ones and duplicates, and saves nothing until you confirm.',
        },
        {
          q: 'Do international guests get the card in English?',
          a: 'Yes. Each guest has their own language, Swahili or English, and their card shows in that language.',
        },
      ],
    },
  },
  'kadi-ya-mahafali': {
    updated: UPDATED,
    sw: {
      sections: [
        {
          id: 'mfano-halisi',
          h2: 'Mfano: mahafali ya chuo, Dodoma',
          blocks: [
            {
              t: 'p',
              text: 'Familia ya Baraka inaalika ndugu 80 kwenye sherehe ya mahafali yake ya shahada. Sherehe ni nyumbani, baada ya sherehe rasmi ya chuo. Kadi inaonyesha saa ya sherehe ya nyumbani, ramani ya nyumba na namba ya kaka yake kwa maelekezo.',
            },
            {
              t: 'p',
              text: 'Ndugu wa kijijini wanapokea SMS na wale wa mjini wanapokea WhatsApp. Wageni wenyewe wanaongeza tarehe kwenye kalenda ya simu kutoka kwenye kadi, na kamati inaona nani bado hajajibu.',
            },
          ],
        },
        {
          id: 'maneno-mfano',
          h2: 'Maneno ya kadi ya mahafali',
          blocks: [
            {
              t: 'note',
              text: '“Familia ya Mwakyusa inayo furaha kukualika kwenye sherehe ya mahafali ya Baraka, aliyehitimu Shahada ya Uhandisi. Jumamosi 11 Desemba, saa 9 alasiri, nyumbani Area D, Dodoma. Karibu tufurahi pamoja.”',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Inafaa mahafali ya shule ya msingi au sekondari?',
          a: 'Ndiyo. Kadi inafaa mahafali ya darasa la saba, kidato cha nne, kidato cha sita, chuo au chuo kikuu. Unaandika aina ya tukio unayotaka.',
        },
        {
          q: 'Wageni wanaweza kuweka tarehe kwenye kalenda?',
          a: 'Ndiyo. Kadi ina kitufe cha kuongeza tarehe na saa kwenye kalenda ya simu ya mgeni.',
        },
      ],
    },
    en: {
      sections: [
        {
          id: 'worked-example',
          h2: 'Example: a university graduation in Dodoma',
          blocks: [
            {
              t: 'p',
              text: 'Baraka’s family invites 80 relatives to celebrate his degree. The party is at home, after the university ceremony. The card shows the time of the home party, a map to the house and his brother’s number for directions.',
            },
            {
              t: 'p',
              text: 'Relatives in the village get an SMS and those in town get WhatsApp. Guests add the date to their phone calendar from the card, and the committee sees who has not replied yet.',
            },
          ],
        },
        {
          id: 'wording-sample',
          h2: 'Graduation invitation wording',
          blocks: [
            {
              t: 'note',
              text: '“The Mwakyusa family is delighted to invite you to celebrate the graduation of Baraka, Bachelor of Engineering. Saturday 11 December, 3 pm, at home in Area D, Dodoma. Come and celebrate with us.”',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Does it suit primary or secondary school graduations?',
          a: 'Yes. It suits Standard Seven, Form Four, Form Six, college or university graduations. You write the event type you want.',
        },
        {
          q: 'Can guests add the date to their calendar?',
          a: 'Yes. The card has a button that adds the date and time to the guest’s phone calendar.',
        },
      ],
    },
  },
  'kadi-ya-kuzaliwa': {
    updated: UPDATED,
    sw: {
      sections: [
        {
          id: 'mfano-halisi',
          h2: 'Mfano: miaka 50 ya Mama Rehema, Mwanza',
          blocks: [
            {
              t: 'p',
              text: 'Watoto wa Mama Rehema wanaandaa sherehe ya kushtukiza ya miaka 50. Wanaweka wageni 120 kwenye vikundi: familia, kanisa na marafiki wa kazini. Kadi zinatumwa kwa wote isipokuwa Mama mwenyewe, na kila mgeni anajibu atakuja na watu wangapi.',
            },
            {
              t: 'p',
              text: 'Kwa sherehe ya kushtukiza, andika kwenye kadi “Ni siri, tafadhali usimwambie” ili wageni wajue tangu mwanzo.',
            },
          ],
        },
        {
          id: 'maneno-mfano',
          h2: 'Maneno ya kadi ya siku ya kuzaliwa',
          blocks: [
            {
              t: 'note',
              text: '“Tunakualika kusherehekea miaka 50 ya Mama Rehema. Jumapili 4 Aprili, saa 7 mchana, Gold Crest Hotel, Mwanza. Ni siri, tafadhali usimwambie. Thibitisha kabla ya 28 Machi.”',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Naweza kuweka tarehe ya mwisho ya kuthibitisha?',
          a: 'Ndiyo. Unaweka tarehe ya mwisho ya majibu kwenye tukio. Baada ya hapo unaona nani hajajibu na unaweza kumpigia simu.',
        },
        {
          q: 'Kwa sherehe ya mtoto, wazazi wanajibu kwa niaba?',
          a: 'Ndiyo. Tuma kadi kwa mzazi na weka idadi ya watu wanaoruhusiwa, mfano mtoto na mzazi mmoja. Mzazi anajibu kwa wote.',
        },
      ],
    },
    en: {
      sections: [
        {
          id: 'worked-example',
          h2: 'Example: Mama Rehema’s 50th in Mwanza',
          blocks: [
            {
              t: 'p',
              text: 'Mama Rehema’s children are planning a surprise 50th. They put 120 guests into groups: family, church and work friends. Cards go to everyone except Mama herself, and each guest replies with how many people are coming.',
            },
            {
              t: 'p',
              text: 'For a surprise party, write “It’s a surprise, please don’t tell her” on the card so guests know from the start.',
            },
          ],
        },
        {
          id: 'wording-sample',
          h2: 'Birthday invitation wording',
          blocks: [
            {
              t: 'note',
              text: '“Join us to celebrate Mama Rehema’s 50th birthday. Sunday 4 April, 1 pm, Gold Crest Hotel, Mwanza. It’s a surprise, please don’t tell her. Kindly reply by 28 March.”',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Can I set a reply deadline?',
          a: 'Yes. You set a reply deadline on the event. After it you see who has not replied and can call them.',
        },
        {
          q: 'For a child’s party, do parents reply on their behalf?',
          a: 'Yes. Send the card to the parent and set how many people it allows, for example the child and one parent. The parent replies for both.',
        },
      ],
    },
  },
  'kusimamia-majibu-ya-rsvp': {
    updated: UPDATED,
    sw: {
      sections: [
        {
          id: 'mfano-wa-hesabu',
          h2: 'Mfano wa hesabu: harusi ya wageni 320',
          blocks: [
            {
              t: 'p',
              text: 'Kamati ya Asha na Juma ilituma kadi 220 kwa familia na watu binafsi, na kadi hizo zinaruhusu watu 320 kwa jumla. Wiki mbili kabla, kadi 150 zimejibu “Nitahudhuria” zikiwa na watu 230.',
            },
            {
              t: 'p',
              text: 'Kamati inaagiza chakula cha watu 230 pamoja na akiba ndogo, si cha 320. Kisha inawapigia simu wenye kadi 40 ambazo bado hazijafunguliwa, kwa sababu kadi isiyofunguliwa mara nyingi ni namba isiyo sahihi.',
            },
          ],
        },
        {
          id: 'ratiba-ya-majibu',
          h2: 'Ratiba ya majibu inayofanya kazi',
          blocks: [
            {
              t: 'table',
              head: ['Lini', 'Nini cha kufanya'],
              rows: [
                ['Wiki 6 kabla', 'Tuma kadi zote.'],
                ['Wiki 2 kabla', 'Ukumbusho wa kwanza kwa wasiojibu.'],
                ['Wiki 1 kabla', 'Mpigie simu kila ambaye hajafungua kadi.'],
                ['Siku 3 kabla', 'Funga majibu, peleka idadi kwa mpishi na ukumbi.'],
                ['Siku 1 kabla', 'Ukumbusho wa mwisho wenye saa na ramani.'],
              ],
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Mgeni akitaka kuja na watu wengi kuliko kadi inavyoruhusu?',
          a: 'Kadi inamruhusu kuchagua hadi idadi uliyoweka tu. Akihitaji zaidi anawasiliana na kamati, na mnaweza kubadilisha idadi kwenye wasifu wake.',
        },
        {
          q: 'Mgeni akibadili jibu lake?',
          a: 'Anaweza kubadilisha jibu kwenye kadi yake. Kamati inaona jibu la sasa na idadi ya watu inasasishwa.',
        },
      ],
    },
    en: {
      sections: [
        {
          id: 'worked-numbers',
          h2: 'Worked numbers: a 320-guest wedding',
          blocks: [
            {
              t: 'p',
              text: 'Asha and Juma’s committee sent 220 cards to families and individuals, allowing 320 people in total. Two weeks before, 150 cards have replied “I will attend”, for 230 people.',
            },
            {
              t: 'p',
              text: 'The committee orders food for 230 plus a small margin, not for 320. Then it phones the holders of the 40 cards that have not been opened, because an unopened card is often a wrong number.',
            },
          ],
        },
        {
          id: 'reply-timeline',
          h2: 'A reply timeline that works',
          blocks: [
            {
              t: 'table',
              head: ['When', 'What to do'],
              rows: [
                ['6 weeks before', 'Send all the cards.'],
                ['2 weeks before', 'First reminder to those who have not replied.'],
                ['1 week before', 'Phone everyone who has not opened their card.'],
                ['3 days before', 'Close replies, give numbers to the caterer and venue.'],
                ['1 day before', 'Final reminder with the time and map.'],
              ],
            },
          ],
        },
      ],
      faq: [
        {
          q: 'What if a guest wants to bring more people than the card allows?',
          a: 'The card only lets them choose up to the number you set. If they need more they contact the committee, and you can change the number on their profile.',
        },
        {
          q: 'What if a guest changes their reply?',
          a: 'They can change it on their card. The committee sees the current reply and the headcount updates.',
        },
      ],
    },
  },
};
