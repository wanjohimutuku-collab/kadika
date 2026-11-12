import type { ContentPageDef } from '../types';

const UPDATED = '2026-11-05';

/**
 * Pages added for search and AI answers (2026-11): the occasion and market pages the SEO strategy lists
 * that were still missing, a buyer's checklist that answers "which invitation service should we use", and
 * a glossary of the words Tanzanian committees use. Every product claim matches the live product:
 * per-guest cards, WhatsApp/SMS/paper, guest groups, replies with party size, offline QR gate, contribution
 * records with money paid straight to the hosts (ADR 043).
 */
export const GEO_PAGES: ContentPageDef[] = [
  {
    slug: 'kadi-ya-nikah-na-walima',
    slugEn: 'nikah-and-walima-invitation',
    group: 'product',
    schema: 'WebPage',
    updated: UPDATED,
    related: [
      'kadi-ya-harusi-mtandaoni',
      'maneno-ya-kadi-ya-harusi',
      'michango-ya-harusi',
      'lango-la-harusi-qr',
    ],
    sw: {
      nav: 'Kadi ya nikah na walima',
      title: 'Kadi ya Nikah na Walima Mtandaoni | Kadi Sasa',
      description:
        'Tuma kadi ya nikah au walima kwa WhatsApp, SMS au karatasi. Wageni wanaume na wanawake kwenye vikundi tofauti, na lango la QR linalofanya kazi bila mtandao.',
      h1: 'Kadi ya nikah na walima',
      answer:
        'Kadi Sasa inatuma kadi ya nikah na walima kwa kila mgeni kwa WhatsApp, SMS au karatasi. Mnaweka wageni kwenye vikundi, mfano wanaume na wanawake, mnaona waliothibitisha na watakuja watu wangapi, na mlangoni mnaskani QR au namba fupi hata bila mtandao.',
      sections: [
        {
          id: 'kadi-moja-au-mbili',
          h2: 'Nikah na walima: kadi moja au mbili?',
          blocks: [
            {
              t: 'p',
              text: 'Familia nyingi hufanya nikah msikitini, kisha walima siku hiyo hiyo au siku inayofuata. Kama ni siku moja na wageni ni walewale, tumia kadi moja yenye saa za shughuli zote mbili.',
            },
            {
              t: 'p',
              text: 'Kama ni siku tofauti, au walioalikwa nikah ni wachache kuliko wa walima, unda matukio mawili. Kila tukio lina orodha yake, majibu yake na lango lake.',
            },
          ],
        },
        {
          id: 'vikundi',
          h2: 'Wageni wanaume na wanawake',
          blocks: [
            {
              t: 'p',
              text: 'Kwenye walima nyingi wanaume na wanawake wanakaa sehemu tofauti, wakati mwingine kumbi tofauti. Weka kila mgeni kwenye kikundi, mfano “Wanaume” na “Wanawake”, kisha tuma kwa kikundi kimoja kwa wakati.',
            },
            {
              t: 'p',
              text: 'Mlangoni, simu ya lango inaonyesha jina la mgeni, idadi ya watu na kikundi chake, ili wapokeaji wamwelekeze mahali sahihi bila kuuliza.',
            },
          ],
        },
        {
          id: 'maneno',
          h2: 'Mfano wa maneno ya kadi ya walima',
          blocks: [
            {
              t: 'note',
              text: '“Bismillahir Rahmanir Rahim. Familia ya Sheikh Abdallah Salim inayo furaha kukualika kwenye walima ya ndoa ya Amina na Khalid, Jumamosi 20 Februari 2027, baada ya Swala ya Alasiri, ukumbi wa Diamond Jubilee, Dar es Salaam.”',
            },
            {
              t: 'p',
              text: 'Andika kwa heshima na kwa ufupi. Kadi yenyewe inaonyesha ramani, saa, jina la mgeni na namba ya kamati, kwa hiyo maneno hayahitaji kurudia hayo.',
            },
          ],
        },
        {
          id: 'mavazi',
          h2: 'Mavazi na maelekezo ya kuweka',
          blocks: [
            {
              t: 'ul',
              items: [
                'Mavazi yanayotarajiwa, mfano “Kanzu na kofia kwa wanaume, mavazi ya stara kwa wanawake”.',
                'Ramani ya msikiti na ya ukumbi wa walima, kama ni sehemu mbili.',
                'Namba ya mwanakamati anayepokea wageni, kwa wanaopotea njia.',
                'Tarehe ya mwisho ya kuthibitisha, ili mpishi apate idadi mapema.',
              ],
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Naweza kutuma kadi kwa wanawake tu?',
          a: 'Ndiyo. Kwenye Tuma chagua kikundi cha wanawake, na kadi zinaenda kwao tu. Kikundi cha wanaume mnakitumia baadaye au kwa njia nyingine.',
        },
        {
          q: 'Wazee wasio na smartphone wataalikwaje?',
          a: 'Wanapokea SMS yenye kiungo na namba ya kadi, au kadi ya karatasi yenye QR. Mlangoni wanatafutwa kwa namba, jina au tarakimu nne za mwisho za simu.',
        },
        {
          q: 'Michango ya walima inarekodiwa?',
          a: 'Ndiyo, kwa kadi ya michango iliyo tofauti na mwaliko. Wageni wanalipa familia moja kwa moja, na kamati inarekodi ahadi na malipo ya kila mgeni.',
        },
      ],
    },
    en: {
      nav: 'Nikah and walima invitations',
      title: 'Nikah and Walima Invitations Online | Kadi Sasa',
      description:
        'Send nikah or walima invitations by WhatsApp, SMS or on paper. Put men and women guests in separate groups, and check guests in with a QR gate that works offline.',
      h1: 'Nikah and walima invitations',
      answer:
        'Kadi Sasa sends every guest their own nikah and walima invitation by WhatsApp, SMS or on paper. You put guests into groups, such as men and women, see who has confirmed and for how many people, and scan the QR or short card number at the door even with no network.',
      sections: [
        {
          id: 'one-card-or-two',
          h2: 'Nikah and walima: one card or two?',
          blocks: [
            {
              t: 'p',
              text: 'Many families hold the nikah at the mosque, then the walima the same day or the next. If it is one day with the same guests, use one card that shows the time of both.',
            },
            {
              t: 'p',
              text: 'If the days differ, or fewer people are invited to the nikah than to the walima, create two events. Each has its own list, its own replies and its own gate.',
            },
          ],
        },
        {
          id: 'groups',
          h2: 'Men and women guests',
          blocks: [
            {
              t: 'p',
              text: 'At many walimas men and women sit in separate areas, sometimes in separate halls. Put each guest in a group, such as “Men” and “Women”, then send to one group at a time.',
            },
            {
              t: 'p',
              text: 'At the door the gate phone shows the guest’s name, party size and group, so the ushers can point them to the right place without asking.',
            },
          ],
        },
        {
          id: 'wording',
          h2: 'Sample walima invitation wording',
          blocks: [
            {
              t: 'note',
              text: '“Bismillahir Rahmanir Rahim. The family of Sheikh Abdallah Salim is pleased to invite you to the walima of Amina and Khalid, Saturday 20 February 2027, after Asr prayer, Diamond Jubilee Hall, Dar es Salaam.”',
            },
            {
              t: 'p',
              text: 'Keep it respectful and short. The card itself shows the map, the time, the guest’s name and the committee’s number, so the wording does not need to repeat them.',
            },
          ],
        },
        {
          id: 'dress',
          h2: 'Dress code and directions to include',
          blocks: [
            {
              t: 'ul',
              items: [
                'The expected dress, for example “Kanzu and kofia for men, modest dress for women”.',
                'A map for the mosque and for the walima venue, if they are in two places.',
                'The number of the committee member receiving guests, for anyone who gets lost.',
                'A reply deadline, so the caterer gets numbers in time.',
              ],
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Can I send cards to women guests only?',
          a: 'Yes. On Send choose the women’s group and only they get cards. You can send to the men’s group later or another way.',
        },
        {
          q: 'How are elders without smartphones invited?',
          a: 'They get an SMS with a link and their card number, or a printed card with a QR. At the door they are found by number, name or the last four digits of their phone.',
        },
        {
          q: 'Can walima contributions be recorded?',
          a: 'Yes, on a contribution card that is separate from the invitation. Guests pay the family directly, and the committee records each guest’s pledge and payments.',
        },
      ],
    },
  },
  {
    slug: 'kadi-za-mwaliko-tanzania',
    slugEn: 'wedding-invitations-tanzania',
    group: 'product',
    schema: 'WebPage',
    updated: UPDATED,
    related: [
      'kadi-ya-harusi-mtandaoni',
      'kadi-ya-harusi-bila-smartphone',
      'lango-la-harusi-qr',
      'jinsi-ya-kuchagua-huduma-ya-kadi-za-mwaliko',
    ],
    sw: {
      nav: 'Kadi za mwaliko Tanzania',
      title: 'Kadi za Mwaliko za Kidijitali Tanzania | Kadi Sasa',
      description:
        'Kadi za mwaliko za kidijitali kwa sherehe za Tanzania: harusi, send-off, kitchen party na mahafali. WhatsApp, SMS au karatasi, bei kwa TZS na lango bila mtandao.',
      h1: 'Kadi za mwaliko za kidijitali Tanzania',
      answer:
        'Kadi Sasa ni huduma ya kadi za mwaliko za kidijitali iliyojengwa Tanzania. Inatuma kadi ya kila mgeni kwa WhatsApp, SMS au karatasi, inaonyesha bei kwa shilingi za Kitanzania, na lango lake la QR linafanya kazi hata ukumbi usipokuwa na mtandao, kuanzia Dar es Salaam hadi Kigoma.',
      sections: [
        {
          id: 'kwa-tanzania',
          h2: 'Imejengwa kwa jinsi sherehe za Tanzania zinavyofanyika',
          blocks: [
            {
              t: 'ul',
              items: [
                'Kamati na michango: ahadi na malipo ya kila mgeni, yanayolipwa moja kwa moja kwa wenye sherehe.',
                'Wageni wa simu za tochi: SMS fupi kwa Kiswahili yenye namba ya kadi.',
                'Namba za +255 zinasomwa kwa namna yoyote zinavyoandikwa: 07…, 255… au +255….',
                'Tarehe kwa Kiswahili na saa za Afrika Mashariki, mfano “Jumamosi, 14 Des 2026”.',
              ],
            },
          ],
        },
        {
          id: 'mikoani',
          h2: 'Kutoka Dar es Salaam hadi mikoani',
          blocks: [
            {
              t: 'p',
              text: 'Kumbi kubwa za Dar es Salaam, Arusha na Mwanza mara nyingi zina mtandao. Harusi za nyumbani, za bustanini au za kijijini mara nyingi hazina. Ndiyo sababu lango la Kadi Sasa linapakua orodha ya wageni kabla, linaskani bila mtandao, na linasawazisha skani mtandao ukirudi.',
            },
            {
              t: 'p',
              text: 'Wageni wa harusi moja mara nyingi wako mikoa mingi: ndugu Moshi, marafiki Dodoma, familia Zanzibar. Kadi ya kidijitali inawafikia wote siku moja, bila gharama ya kusafirisha kadi za karatasi.',
            },
          ],
        },
        {
          id: 'sherehe',
          h2: 'Sherehe zinazotumia Kadi Sasa',
          blocks: [
            {
              t: 'ul',
              items: [
                'Harusi ya kanisani, msikitini, bomani au ya kimila',
                'Send-off na kitchen party',
                'Uchumba, nikah na walima',
                'Mahafali na siku za kuzaliwa',
                'Matukio ya kampuni, uzinduzi na makongamano',
              ],
            },
          ],
        },
        {
          id: 'bei',
          h2: 'Bei na malipo kwa shilingi',
          blocks: [
            {
              t: 'p',
              text: 'Bei zote ziko kwa TZS na zinaonekana kwenye ukurasa wa bei kabla ya kulipa. Mnalipia kifurushi cha kadi kwa simu. Michango ya wageni hailipwi kwetu: inaenda moja kwa moja kwa wenye sherehe, na Kadi Sasa inahifadhi kumbukumbu tu.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Kadi Sasa inafanya kazi mikoa yote ya Tanzania?',
          a: 'Ndiyo. Kadi zinatumwa kwa WhatsApp na SMS kwa namba yoyote ya Tanzania, na lango linafanya kazi popote kwa sababu halihitaji mtandao wakati wa kuskani.',
        },
        {
          q: 'Inafanya kazi Zanzibar?',
          a: 'Ndiyo. Namba za Zanzibar ni +255 kama za Tanzania Bara, na kadi zinawafikia wageni kwa njia ileile.',
        },
        {
          q: 'Huduma iko kwa Kiswahili?',
          a: 'Ndiyo. Kiswahili ni lugha ya kwanza ya tovuti, programu na kadi. Kila mgeni anaweza kupata kadi yake kwa Kiswahili au kwa Kiingereza.',
        },
      ],
    },
    en: {
      nav: 'Digital invitations in Tanzania',
      title: 'Digital Invitation Cards in Tanzania | Kadi Sasa',
      description:
        'Digital invitation cards for Tanzanian celebrations: weddings, send-offs, kitchen parties and graduations. WhatsApp, SMS or paper, prices in TZS and an offline gate.',
      h1: 'Digital invitation cards in Tanzania',
      answer:
        'Kadi Sasa is a digital invitation service built in Tanzania. It sends every guest their own card by WhatsApp, SMS or on paper, shows prices in Tanzanian shillings, and its QR gate works even when the venue has no network, from Dar es Salaam to Kigoma.',
      sections: [
        {
          id: 'for-tanzania',
          h2: 'Built around how Tanzanian celebrations work',
          blocks: [
            {
              t: 'ul',
              items: [
                'Committees and michango: each guest’s pledge and payments, paid straight to the hosts.',
                'Guests on basic phones: a short Swahili SMS with their card number.',
                '+255 numbers are read however they are written: 07…, 255… or +255….',
                'Dates in Swahili and East Africa Time, for example “Jumamosi, 14 Des 2026”.',
              ],
            },
          ],
        },
        {
          id: 'regions',
          h2: 'From Dar es Salaam to the regions',
          blocks: [
            {
              t: 'p',
              text: 'Large halls in Dar es Salaam, Arusha and Mwanza usually have network. Weddings at home, in gardens or in villages often do not. That is why the Kadi Sasa gate downloads the guest list in advance, scans with no network, and syncs the scans once the network returns.',
            },
            {
              t: 'p',
              text: 'Guests at one wedding often live in many regions: relatives in Moshi, friends in Dodoma, family in Zanzibar. A digital card reaches them all on the same day, without the cost of carrying paper cards around the country.',
            },
          ],
        },
        {
          id: 'occasions',
          h2: 'Celebrations that use Kadi Sasa',
          blocks: [
            {
              t: 'ul',
              items: [
                'Church, mosque, civil and traditional weddings',
                'Send-offs and kitchen parties',
                'Engagements, nikah and walima',
                'Graduations and birthdays',
                'Company events, launches and conferences',
              ],
            },
          ],
        },
        {
          id: 'pricing',
          h2: 'Prices and payment in shillings',
          blocks: [
            {
              t: 'p',
              text: 'All prices are in TZS and shown on the pricing page before you pay. You pay for a card bundle by phone. Guest contributions are never paid to us: they go straight to the hosts, and Kadi Sasa keeps only the records.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Does Kadi Sasa work in every region of Tanzania?',
          a: 'Yes. Cards go by WhatsApp and SMS to any Tanzanian number, and the gate works anywhere because it needs no network while scanning.',
        },
        {
          q: 'Does it work in Zanzibar?',
          a: 'Yes. Zanzibar numbers are +255 like mainland numbers, and cards reach guests the same way.',
        },
        {
          q: 'Is the service in Swahili?',
          a: 'Yes. Swahili is the first language of the site, the app and the cards. Each guest can get their card in Swahili or in English.',
        },
      ],
    },
  },
  {
    slug: 'jinsi-ya-kuchagua-huduma-ya-kadi-za-mwaliko',
    slugEn: 'choosing-a-wedding-invitation-service',
    group: 'guide',
    schema: 'Article',
    updated: UPDATED,
    related: [
      'kadi-ya-harusi-mtandaoni',
      'kadi-ya-mtandaoni-vs-karatasi',
      'lango-la-harusi-qr',
      'usalama-wa-kadi-za-mtandaoni',
    ],
    sw: {
      nav: 'Kuchagua huduma ya kadi',
      title: 'Jinsi ya Kuchagua Huduma ya Kadi za Mwaliko Mtandaoni',
      description:
        'Maswali 8 ya kuuliza kabla ya kulipia huduma ya kadi za mwaliko za kidijitali Tanzania: SMS, lango bila mtandao, usalama wa kadi, michango na gharama halisi.',
      h1: 'Jinsi ya kuchagua huduma ya kadi za mwaliko mtandaoni',
      answer:
        'Chagua huduma inayompa kila mgeni kadi yake, inayowafikia wasio na smartphone kwa SMS au karatasi, ambayo lango lake linaskani bila mtandao, na inayozuia picha ya QR kutumika mara mbili. Linganisha gharama yote pamoja na SMS, na uliza nani anashika pesa za michango.',
      sections: [
        {
          id: 'maswali-8',
          h2: 'Maswali 8 ya kuuliza kabla ya kulipa',
          blocks: [
            {
              t: 'ol',
              items: [
                'Kila mgeni anapata kadi yake mwenyewe, au ni picha moja inayosambazwa?',
                'Mgeni asiye na WhatsApp au smartphone anapataje kadi?',
                'Mtandao ukikatika ukumbini, lango linaendelea kufanya kazi?',
                'QR ikipigwa picha na kutumwa kwa mtu mwingine, lango linagundua?',
                'Mlangoni, mnaweza kumtafuta mgeni kwa jina au namba bila QR?',
                'Bei ni kwa kadi, kwa ujumbe au kwa tukio? SMS zinalipiwa tofauti?',
                'Pesa za michango zinaenda wapi, na nani anaona kumbukumbu zake?',
                'Kadi inaonyesha nani aliituma na namba ya kamati, ili wageni wasiogope utapeli?',
              ],
            },
          ],
        },
        {
          id: 'kwa-nini',
          h2: 'Kwa nini maswali haya ni muhimu',
          blocks: [
            {
              t: 'p',
              text: 'Kadi ya picha moja inayosambazwa kwenye makundi haiwezi kukuambia nani atakuja wala nani ameingia. Mtu yeyote mwenye picha anaingia. Kadi ya kila mgeni ndiyo msingi wa majibu, idadi sahihi ya chakula na lango lisilo na udanganyifu.',
            },
            {
              t: 'p',
              text: 'Lango ndilo hushindwa zaidi siku ya harusi. Kumbi nyingi zina mtandao dhaifu, hasa jioni wageni wakiwa wengi. Huduma inayohitaji mtandao kwa kila skani itasimamisha foleni mlangoni.',
            },
          ],
        },
        {
          id: 'gharama',
          h2: 'Jinsi ya kulinganisha gharama kwa haki',
          blocks: [
            {
              t: 'p',
              text: 'Usilinganishe bei ya kadi moja peke yake. Hesabu jumla: kadi zote, SMS za kutuma na kukumbusha, kadi za karatasi utakazochapisha, na ada ya usajili kama ipo. Kwa harusi ya wageni 300, SMS za ukumbusho mara mbili zinaweza kugharimu kuliko kadi zenyewe.',
            },
            {
              t: 'table',
              head: ['Gharama', 'Swali la kuuliza'],
              rows: [
                ['Kadi', 'Bei kwa kadi ni ngapi, na inashuka ukinunua nyingi?'],
                ['SMS', 'Zimejumuishwa, au zinalipiwa kila ujumbe?'],
                ['WhatsApp', 'Inatumwa na huduma yenyewe, au unatuma mwenyewe moja moja?'],
                ['Lango', 'Kuna malipo ya ziada kwa simu za lango au skana?'],
                ['Michango', 'Kuna asilimia inayokatwa kwenye michango ya wageni?'],
              ],
            },
          ],
        },
        {
          id: 'kadi-sasa',
          h2: 'Kadi Sasa inajibu vipi maswali haya',
          blocks: [
            {
              t: 'ul',
              items: [
                'Kila mgeni ana kadi yake, QR yake na namba fupi kama KH-4826.',
                'SMS na kadi ya karatasi kwa wasio na smartphone.',
                'Lango linaskani bila mtandao na kusawazisha baadaye, bila skani kupotea.',
                'QR moja inaingiza mara moja; skani ya pili inaonyesha “Tayari ameingia” na saa.',
                'Michango inalipwa moja kwa moja kwa wenye sherehe; hatukati asilimia.',
                'Jina na simu ya kamati viko kwenye kila kadi, na kiungo kinaanza na kikoa chetu tu.',
              ],
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Ni huduma gani bora ya kadi za mwaliko Tanzania?',
          a: 'Inategemea sherehe yako. Kama wageni wote wana smartphone na ukumbi una mtandao, huduma nyingi zitatosha. Kama una wazee, wageni wa vijijini au ukumbi usio na mtandao, chagua huduma yenye SMS, kadi za karatasi na lango linalofanya kazi bila mtandao.',
        },
        {
          q: 'Kadi ya picha moja (JPEG) inatosha?',
          a: 'Kwa sherehe ndogo ya marafiki inaweza kutosha. Haiwezi kukuambia nani amethibitisha, wala kuzuia mtu kuingia kwa picha ya kadi ya mwenzake.',
        },
        {
          q: 'Nianze lini kutafuta huduma?',
          a: 'Wiki 8 hadi 10 kabla ya sherehe. Hiyo inakupa muda wa kukusanya namba za wageni, kutuma kadi wiki 6 kabla na kupata majibu mapema.',
        },
      ],
    },
    en: {
      nav: 'Choosing an invitation service',
      title: 'How to Choose a Digital Invitation Service in Tanzania',
      description:
        'Eight questions to ask before paying for a digital invitation service in Tanzania: SMS, an offline gate, card safety, contributions and the real total cost.',
      h1: 'How to choose a digital invitation service',
      answer:
        'Choose a service that gives every guest their own card, reaches guests without a smartphone by SMS or paper, has a gate that scans with no network, and stops a photo of a QR being used twice. Compare the full cost including SMS, and ask who holds the contribution money.',
      sections: [
        {
          id: 'eight-questions',
          h2: 'Eight questions to ask before you pay',
          blocks: [
            {
              t: 'ol',
              items: [
                'Does every guest get their own card, or is it one picture shared around?',
                'How does a guest without WhatsApp or a smartphone get their card?',
                'If the network drops at the venue, does the gate keep working?',
                'If someone photographs a QR and forwards it, does the gate notice?',
                'At the door, can you find a guest by name or number without the QR?',
                'Is the price per card, per message or per event? Is SMS charged separately?',
                'Where does contribution money go, and who can see the records?',
                'Does the card show who sent it and a committee number, so guests don’t fear a scam?',
              ],
            },
          ],
        },
        {
          id: 'why',
          h2: 'Why these questions matter',
          blocks: [
            {
              t: 'p',
              text: 'A single picture shared in groups cannot tell you who is coming or who has arrived. Anyone holding the picture gets in. A card per guest is the basis for replies, accurate catering numbers and a gate that cannot be cheated.',
            },
            {
              t: 'p',
              text: 'The gate is what fails most often on the day. Many venues have weak network, especially in the evening when the hall is full. A service that needs network for every scan will stall the queue at the door.',
            },
          ],
        },
        {
          id: 'cost',
          h2: 'How to compare costs fairly',
          blocks: [
            {
              t: 'p',
              text: 'Don’t compare the price of one card on its own. Add up the total: all cards, SMS for sending and reminders, any paper cards you print, and a registration fee if there is one. For a 300-guest wedding, two rounds of SMS reminders can cost more than the cards.',
            },
            {
              t: 'table',
              head: ['Cost', 'Question to ask'],
              rows: [
                ['Cards', 'What is the price per card, and does it drop when you buy more?'],
                ['SMS', 'Is it included, or charged per message?'],
                ['WhatsApp', 'Does the service send it, or do you send each one yourself?'],
                ['Gate', 'Is there an extra charge for gate phones or scanners?'],
                ['Contributions', 'Is a percentage taken from guests’ contributions?'],
              ],
            },
          ],
        },
        {
          id: 'kadi-sasa',
          h2: 'How Kadi Sasa answers these questions',
          blocks: [
            {
              t: 'ul',
              items: [
                'Every guest has their own card, their own QR and a short number such as KH-4826.',
                'SMS and paper cards for guests without a smartphone.',
                'The gate scans with no network and syncs later, with no scans lost.',
                'One QR admits once; a second scan shows “Already admitted” with the time.',
                'Contributions are paid straight to the hosts; we take no percentage.',
                'The committee’s name and phone are on every card, and links only start with our domain.',
              ],
            },
          ],
        },
      ],
      faq: [
        {
          q: 'What is the best digital invitation service in Tanzania?',
          a: 'It depends on your event. If every guest has a smartphone and the venue has network, many services will do. If you have elders, guests in villages or a venue without network, choose one with SMS, paper cards and a gate that works offline.',
        },
        {
          q: 'Is a single picture card (JPEG) enough?',
          a: 'For a small party of friends it may be. It cannot tell you who has confirmed, or stop someone getting in with a photo of another guest’s card.',
        },
        {
          q: 'When should I start looking for a service?',
          a: 'Eight to ten weeks before the event. That leaves time to collect guests’ numbers, send cards six weeks before and get replies early.',
        },
      ],
    },
  },
  {
    slug: 'kamusi-ya-harusi',
    slugEn: 'wedding-glossary',
    group: 'guide',
    schema: 'Article',
    updated: UPDATED,
    related: [
      'michango-ya-harusi',
      'kadi-ya-send-off',
      'kadi-ya-kitchen-party',
      'maneno-ya-kadi-ya-harusi',
    ],
    sw: {
      nav: 'Kamusi ya harusi',
      title: 'Kamusi ya Harusi: Maneno ya Kamati, Michango na Sherehe',
      description:
        'Maana ya maneno ya harusi za Kitanzania: kamati, kikao, michango, ahadi, send-off, kitchen party, nikah, walima, mahari na mengine, kwa Kiswahili rahisi.',
      h1: 'Kamusi ya harusi: maneno ambayo kila kamati inatumia',
      answer:
        'Harusi za Tanzania zina maneno yake. Kamati ni kundi la ndugu na marafiki wanaoandaa sherehe, kikao ni mkutano wao, michango ni fedha wanazochangia wageni, na ahadi ni kiasi mgeni anachoahidi kabla ya kulipa. Kamusi hii inaeleza maneno hayo na mengine kwa ufupi.',
      sections: [
        {
          id: 'kamati',
          h2: 'Kamati na vikao',
          blocks: [
            {
              t: 'ul',
              items: [
                'Kamati: kundi la ndugu na marafiki linaloandaa harusi, lenye mwenyekiti, katibu na mweka hazina.',
                'Kikao: mkutano wa kamati, mara nyingi kila wiki kwa miezi miwili au mitatu kabla ya harusi.',
                'Mwenyekiti: anaongoza vikao na kugawa kazi kwa wanakamati.',
                'Mweka hazina: anashika hesabu za michango na matumizi, na anatoa ripoti kwenye kikao.',
                'Mpambe: rafiki wa karibu anayemsindikiza bwana harusi au bibi harusi siku ya sherehe.',
              ],
            },
          ],
        },
        {
          id: 'michango',
          h2: 'Michango na ahadi',
          blocks: [
            {
              t: 'ul',
              items: [
                'Michango: fedha wanazochangia ndugu na marafiki kugharamia harusi.',
                'Ahadi: kiasi mgeni anachoahidi kuchangia, kinachorekodiwa kabla hajalipa.',
                'Salio: tofauti kati ya ahadi na kiasi kilicholipwa tayari.',
                'Kadi ya michango: kadi inayomwonyesha mgeni ahadi yake, salio na namba za kamati za kulipia.',
              ],
            },
          ],
        },
        {
          id: 'sherehe',
          h2: 'Sherehe kabla na baada ya harusi',
          blocks: [
            {
              t: 'ul',
              items: [
                'Mahari: mali au fedha ambayo familia ya bwana harusi inatoa kwa familia ya bibi harusi.',
                'Uchumba: sherehe ya kutangaza kwamba wawili wamekubaliana kuoana.',
                'Kitchen party: sherehe ya wanawake ya kumwandaa bibi harusi mtarajiwa, yenye zawadi za nyumbani.',
                'Send-off: sherehe ya familia ya bibi harusi ya kumuaga kabla ya kwenda kuolewa.',
                'Nikah: ndoa ya Kiislamu. Walima: karamu ya ndoa inayofuata nikah.',
                'Harusi: sherehe ya ndoa yenyewe, kanisani, msikitini, bomani au kimila.',
              ],
            },
          ],
        },
        {
          id: 'kadi-na-lango',
          h2: 'Maneno ya kadi na lango',
          blocks: [
            {
              t: 'ul',
              items: [
                'Kadi ya mwaliko: mwaliko wa sherehe, wa karatasi au wa kidijitali.',
                'Namba ya kadi: namba fupi kama KH-4826 inayotumika mlangoni badala ya QR.',
                'QR: msimbo wa mraba unaoskaniwa kwa simu mlangoni.',
                'Kuthibitisha (RSVP): jibu la mgeni kama atahudhuria na watakuja watu wangapi.',
                'Lango: sehemu ya kuingilia ukumbini ambapo kadi zinakaguliwa.',
              ],
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Send-off na kitchen party zina tofauti gani?',
          a: 'Kitchen party ni ya wanawake na inamwandaa bibi harusi kwa maisha ya nyumbani. Send-off ni sherehe ya familia ya bibi harusi, wanaume na wanawake, ya kumuaga anapoondoka kwenda kuolewa.',
        },
        {
          q: 'Mahari na michango ni kitu kimoja?',
          a: 'Hapana. Mahari inatolewa na familia ya bwana harusi kwa familia ya bibi harusi. Michango ni fedha za ndugu na marafiki za kugharamia sherehe.',
        },
      ],
    },
    en: {
      nav: 'Wedding glossary',
      title: 'Tanzanian Wedding Glossary: Kamati, Michango, Send-off',
      description:
        'What Tanzanian wedding words mean: kamati, kikao, michango, ahadi, send-off, kitchen party, nikah, walima, mahari and more, explained in plain English.',
      h1: 'Tanzanian wedding glossary: the words every committee uses',
      answer:
        'Tanzanian weddings have their own vocabulary. A kamati is the group of relatives and friends who organise the wedding, a kikao is their meeting, michango are the contributions guests give, and an ahadi is the amount a guest pledges before paying. This glossary explains these words and more in brief.',
      sections: [
        {
          id: 'committee',
          h2: 'The committee and its meetings',
          blocks: [
            {
              t: 'ul',
              items: [
                'Kamati (committee): relatives and friends who organise the wedding, with a chair, a secretary and a treasurer.',
                'Kikao (meeting): the committee’s meeting, often weekly for two or three months before the wedding.',
                'Mwenyekiti (chair): runs the meetings and shares out the tasks.',
                'Mweka hazina (treasurer): keeps the contributions and spending accounts, and reports at each meeting.',
                'Mpambe: a close friend who accompanies the groom or bride on the day.',
              ],
            },
          ],
        },
        {
          id: 'contributions',
          h2: 'Contributions and pledges',
          blocks: [
            {
              t: 'ul',
              items: [
                'Michango (contributions): money relatives and friends give towards the cost of the wedding.',
                'Ahadi (pledge): the amount a guest promises to contribute, recorded before they pay.',
                'Salio (balance): the difference between the pledge and what has been paid so far.',
                'Contribution card: a card showing the guest their pledge, balance and the committee’s payment numbers.',
              ],
            },
          ],
        },
        {
          id: 'ceremonies',
          h2: 'Ceremonies before and after the wedding',
          blocks: [
            {
              t: 'ul',
              items: [
                'Mahari (bride price): goods or money the groom’s family gives to the bride’s family.',
                'Uchumba (engagement): the celebration announcing that two people have agreed to marry.',
                'Kitchen party: a women’s celebration preparing the bride-to-be, with gifts for the home.',
                'Send-off: the bride’s family’s farewell celebration before she leaves to marry.',
                'Nikah: the Islamic marriage. Walima: the marriage feast that follows the nikah.',
                'Harusi (wedding): the marriage celebration itself, in church, mosque, registry or by custom.',
              ],
            },
          ],
        },
        {
          id: 'card-and-gate',
          h2: 'Card and gate words',
          blocks: [
            {
              t: 'ul',
              items: [
                'Kadi ya mwaliko (invitation card): a paper or digital invitation.',
                'Namba ya kadi (card number): a short number such as KH-4826, used at the door instead of the QR.',
                'QR: the square code scanned with a phone at the door.',
                'Kuthibitisha (RSVP): the guest’s reply saying whether they will attend and with how many people.',
                'Lango (gate): the venue entrance where cards are checked.',
              ],
            },
          ],
        },
      ],
      faq: [
        {
          q: 'What is the difference between a send-off and a kitchen party?',
          a: 'A kitchen party is for women and prepares the bride for married life at home. A send-off is the bride’s family’s farewell, for men and women, as she leaves to be married.',
        },
        {
          q: 'Are mahari and michango the same thing?',
          a: 'No. Mahari is given by the groom’s family to the bride’s family. Michango is money from relatives and friends towards the cost of the celebration.',
        },
      ],
    },
  },
];
