import type { ContentPageDef } from '../types';

const UPDATED = '2026-10-15';

export const PRODUCT_PAGES: ContentPageDef[] = [
  {
    slug: 'kadi-ya-harusi-mtandaoni',
    group: 'product',
    schema: 'WebPage',
    updated: UPDATED,
    related: [
      'michango-ya-harusi',
      'usalama-wa-kadi-za-mtandaoni',
      'lango-la-harusi-qr',
      'kadi-ya-harusi-bila-smartphone',
    ],
    sw: {
      nav: 'Kadi ya harusi mtandaoni',
      title: 'Kadi ya Harusi Mtandaoni Tanzania | Kadi Sasa',
      description:
        'Tuma kadi ya harusi kwa WhatsApp, SMS au karatasi. Kila mgeni ana QR na namba yake, majibu na michango vinafuatiliwa, na lango linafanya kazi bila mtandao.',
      h1: 'Kadi ya harusi mtandaoni inayomfikia kila mgeni',
      answer:
        'Kadi Sasa ni huduma ya Kitanzania ya kadi za harusi mtandaoni. Unaingiza orodha ya wageni, kila mmoja anapata kadi yake kwa WhatsApp, SMS au karatasi, ikiwa na QR na namba fupi. Unaona nani amejibu, nani amechangia, na nani ameingia langoni.',
      sections: [
        {
          id: 'ni-nini',
          h2: 'Kadi ya harusi mtandaoni ni nini?',
          blocks: [
            {
              t: 'p',
              text: 'Ni mwaliko wa kidijitali unaofunguka kwenye simu kupitia kiungo. Mgeni anaona majina ya wanandoa, tarehe, saa, ukumbi na ramani, na anajibu kama atahudhuria. Tofauti na picha ya mwaliko inayotumwa kwenye kundi la WhatsApp, kila mgeni anapata kadi yake mwenyewe, kwa hiyo unajua nani amepokea na nani amejibu.',
            },
            {
              t: 'p',
              text: 'Kadi ya Kadi Sasa pia ina QR na namba fupi, kwa mfano KH-4826. Hizi mbili ndizo zinazotumika langoni siku ya harusi.',
            },
          ],
        },
        {
          id: 'hatua',
          h2: 'Jinsi ya kutuma kadi za harusi kwa wageni wote',
          blocks: [
            {
              t: 'ol',
              items: [
                'Unda harusi: majina, tarehe, ukumbi na mtindo wa kadi.',
                'Ingiza wageni kwa kubandika orodha, kupakia CSV au kuchagua kutoka kwenye anwani za simu. Namba zinasafishwa kuwa +255 na marudio yanaondolewa.',
                'Chagua njia: WhatsApp kwa wenye smartphone, SMS kwa wengine, na PDF ya kuchapisha kwa wazee.',
                'Tuma. Unaona hali ya kila kadi: imetumwa, imefika, imefunguliwa, imethibitishwa.',
                'Siku ya harusi, kamati inaskani QR au kuandika namba langoni.',
              ],
            },
          ],
        },
        {
          id: 'unachopata',
          h2: 'Unachopata',
          blocks: [
            {
              t: 'table',
              head: ['Kipengele', 'Faida kwako'],
              rows: [
                ['Kadi ya kila mgeni', 'Unajua nani amefungua na nani amejibu'],
                ['QR na namba fupi', 'Kuingia langoni kunaenda haraka, hata QR ikishindwa'],
                [
                  'WhatsApp, SMS na karatasi',
                  'Wageni wote wanafikiwa, wakiwemo wazee na wasio na smartphone',
                ],
                ['Michango kwenye kadi', 'Ahadi na malipo yanaonekana kwa kila mgeni'],
                ['Lango bila mtandao', 'Ukumbi usio na mtandao hauzuii kuingiza wageni'],
                ['Vikumbusho', 'Wageni wasiojibu wanakumbushwa mara chache, kwa heshima'],
              ],
            },
          ],
        },
        {
          id: 'karatasi',
          h2: 'Je, kadi ya karatasi bado inahitajika?',
          blocks: [
            {
              t: 'p',
              text: 'Ndiyo, kwa wazee wengi. Kadi Sasa inatengeneza PDF ya kadi zote, kila moja ikiwa na jina la mgeni, QR kubwa ya kutosha kuskaniwa na namba. Unachapisha kwa mchapishaji yeyote. Kadi ya karatasi na ile ya simu zinatumia QR ileile, kwa hiyo mgeni mmoja hawezi kuingia mara mbili.',
            },
          ],
        },
        {
          id: 'gharama',
          h2: 'Gharama ni kiasi gani?',
          blocks: [
            {
              t: 'p',
              text: 'Wakati wa majaribio huduma ni bure. Gharama za SMS zinaonyeshwa kabla hujatuma. Bei za baadaye zitatangazwa hapa kabla ya kuanza kutozwa.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Je, ninahitaji kuwa na akaunti ya mtandaoni ili kutuma kadi?',
          a: 'Unaingia kwa namba ya simu na namba ya uthibitisho kwa SMS. Wageni hawahitaji akaunti; wanafungua kiungo tu.',
        },
        {
          q: 'Kadi ya mtandaoni inaweza kutumika kwa harusi ya kanisani au ya msikitini?',
          a: 'Ndiyo. Unaandika ukumbi, saa na maelezo yoyote unayotaka, na unaweza kuongeza salamu yako mwenyewe kwenye kadi.',
        },
        {
          q: 'Mgeni mmoja anaweza kuingia na watu wangapi?',
          a: 'Kila mgeni anapewa idadi ya watu wanaoruhusiwa kuingia naye, kuanzia mmoja hadi kumi. Kadi inaonyesha idadi hiyo.',
        },
        {
          q: 'Je, ninaweza kubadilisha rangi na mtindo wa kadi?',
          a: 'Ndiyo. Kuna mitindo minne ya rangi na jalada la hiari. Sehemu ya QR huwa nyeusi kwenye mandhari nyeupe ili iskaniwe vizuri.',
        },
      ],
    },
    en: {
      nav: 'Digital wedding cards',
      title: 'Digital Wedding Invitations Tanzania | Kadi Sasa',
      description:
        'Send wedding cards by WhatsApp, SMS or paper. Every guest gets their own QR and number, replies and contributions are tracked, and the gate works offline.',
      h1: 'Digital wedding invitations that reach every guest',
      answer:
        'Kadi Sasa is a Tanzanian service for digital wedding invitations. You add your guest list, and each guest gets their own card by WhatsApp, SMS or paper with a QR and a short number. You see who replied, who contributed and who arrived at the gate.',
      sections: [
        {
          id: 'what',
          h2: 'What is a digital wedding invitation?',
          blocks: [
            {
              t: 'p',
              text: 'It is an invitation that opens on a phone from a link. The guest sees the couple, date, time, venue and map, and replies whether they will attend. Unlike one image posted in a WhatsApp group, every guest gets their own card, so you know who received it and who answered.',
            },
            {
              t: 'p',
              text: 'A Kadi Sasa card also carries a QR and a short number such as KH-4826. Those two are what the gate uses on the day.',
            },
          ],
        },
        {
          id: 'steps',
          h2: 'How to send wedding cards to all your guests',
          blocks: [
            {
              t: 'ol',
              items: [
                'Create the wedding: names, date, venue and card style.',
                'Add guests by pasting a list, uploading a CSV or picking from phone contacts. Numbers are cleaned to +255 and duplicates removed.',
                'Choose the channel: WhatsApp for smartphones, SMS for everyone else, and a printable PDF for elders.',
                'Send. You see the status of each card: sent, delivered, opened, confirmed.',
                'On the day, the committee scans the QR or types the number at the gate.',
              ],
            },
          ],
        },
        {
          id: 'get',
          h2: 'What you get',
          blocks: [
            {
              t: 'table',
              head: ['Feature', 'Why it helps'],
              rows: [
                ['A card per guest', 'You know who opened it and who replied'],
                ['QR and short number', 'Fast entry, and a fallback if the QR fails'],
                ['WhatsApp, SMS and paper', 'Reaches elders and guests without a smartphone'],
                ['Contributions on the card', 'Pledges and payments show per guest'],
                ['Offline gate', 'A venue without network does not stop entry'],
                ['Reminders', 'Guests who have not replied are nudged a few times, politely'],
              ],
            },
          ],
        },
        {
          id: 'paper',
          h2: 'Do you still need paper cards?',
          blocks: [
            {
              t: 'p',
              text: 'For many elders, yes. Kadi Sasa produces a PDF of all cards, each with the guest name, a QR large enough to scan and the number. Print it at any printer. Paper and phone cards use the same QR, so one guest cannot enter twice.',
            },
          ],
        },
        {
          id: 'cost',
          h2: 'What does it cost?',
          blocks: [
            {
              t: 'p',
              text: 'It is free during the pilot. SMS costs are shown before you send. Future prices will be published here before any charge starts.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Do I need an account to send cards?',
          a: 'You sign in with your phone number and an SMS code. Guests need no account; they just open the link.',
        },
        {
          q: 'Does it work for church and mosque weddings?',
          a: 'Yes. You write the venue, time and any details you like, and you can add your own greeting to the card.',
        },
        {
          q: 'How many people can one guest bring?',
          a: 'Each guest is given a number of people allowed to enter with them, from one to ten. The card shows that number.',
        },
        {
          q: 'Can I change the colours and style?',
          a: 'Yes. There are four colour themes and an optional cover. The QR area is always black on white so it scans reliably.',
        },
      ],
    },
  },
  {
    slug: 'michango-ya-harusi',
    group: 'product',
    schema: 'WebPage',
    updated: UPDATED,
    related: [
      'kadi-ya-harusi-mtandaoni',
      'lango-la-harusi-qr',
      'kadi-ya-send-off',
      'usalama-wa-kadi-za-mtandaoni',
    ],
    sw: {
      nav: 'Michango ya harusi',
      title: 'Michango ya Harusi: Fuatilia Ahadi na Malipo | Kadi Sasa',
      description:
        'Rekodi ahadi na malipo ya michango ya harusi kwa kila mgeni. Wageni wanalipa kwa M-Pesa, Mixx by Yas, Airtel Money au HaloPesa kutoka kwenye kadi yao.',
      h1: 'Michango ya harusi: ahadi na malipo mahali pamoja',
      answer:
        'Kadi Sasa inaweka michango ndani ya kadi ya mwaliko. Kamati inarekodi ahadi ya kila mgeni, mgeni analipa kwa simu kutoka kwenye kadi yake, na kamati inaona kilichokusanywa, kilichoahidiwa na salio la kila mtu. Malipo ya taslimu yanarekodiwa pia.',
      sections: [
        {
          id: 'tatizo',
          h2: 'Tatizo la michango kwenye makundi ya WhatsApp',
          blocks: [
            {
              t: 'p',
              text: 'Kamati nyingi hufuatilia michango kwenye daftari au kundi la WhatsApp. Ahadi zinapotea kwenye mazungumzo marefu, hakuna anayejua salio la kila mtu, na wageni wengine hawakumbushwi. Matokeo yake ni mabishano na hesabu zisizolingana wakati wa kufunga.',
            },
          ],
        },
        {
          id: 'inavyofanya',
          h2: 'Jinsi michango inavyofanya kazi kwenye Kadi Sasa',
          blocks: [
            {
              t: 'ol',
              items: [
                'Kamati inarekodi ahadi ya mgeni (kiasi na maelezo) kwenye wasifu wake.',
                'Mgeni anaona ahadi na salio lake kwenye kadi yake, na anabonyeza “Lipa kwa simu”.',
                'Analipa kwa M-Pesa, Mixx by Yas, Airtel Money au HaloPesa. Hatuombi PIN; anathibitisha kwenye simu yake.',
                'Malipo yanaingia kwenye orodha na salio linapungua. Kamati inaweza pia kurekodi taslimu au benki.',
                'Mgeni anayedaiwa anapokea ukumbusho kwa heshima, si zaidi ya mara chache.',
              ],
            },
          ],
        },
        {
          id: 'kamati',
          h2: 'Kwa kamati: uwazi na ripoti',
          blocks: [
            {
              t: 'ul',
              items: [
                'Lengo la michango dhidi ya kilichokusanywa, na kilichoahidiwa dhidi ya kilicholipwa.',
                'Salio la kila mgeni, na orodha ya wasiolipa bado.',
                'Kila mabadiliko ya malipo yanarekodiwa kwenye kumbukumbu ya ukaguzi.',
                'Ripoti ya CSV ya kufunga hesabu.',
                'Walinda lango hawaoni taarifa za pesa; ni kamati na mwenyeji tu.',
              ],
            },
          ],
        },
        {
          id: 'bila-shinikizo',
          h2: 'Michango si sharti la kupata kadi',
          blocks: [
            {
              t: 'p',
              text: 'Kwa chaguo-msingi, kila mgeni anapata kadi bila kuhitajika kuahidi chochote. Mwenyeji akitaka kuweka masharti, lazima ayawashe mwenyewe. Tunaamini mwaliko ni wa heshima kwanza.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Michango inalipwaje?',
          a: 'Kwa M-Pesa, Mixx by Yas, Airtel Money au HaloPesa kutoka kwenye kadi ya mgeni. Taslimu na benki zinarekodiwa na kamati.',
        },
        {
          q: 'Pesa zinaenda wapi?',
          a: 'Malipo yanapita kwa mtoa huduma wa malipo aliyeidhinishwa. Mpangilio wa kupokea pesa kwa kamati bado unakamilishwa wakati wa majaribio; tutaeleza hapa utakapokuwa tayari.',
        },
        {
          q: 'Je, Kadi Sasa inahifadhi PIN za malipo?',
          a: 'Hapana. Mgeni anathibitisha kwenye simu yake na hatuombi PIN wala nenosiri.',
        },
        {
          q: 'Je, inaweza kutumika kwa mchango wa send-off au uchumba?',
          a: 'Ndiyo. Michango inaweza kuwashwa kwa tukio lolote.',
        },
      ],
    },
    en: {
      nav: 'Wedding contributions',
      title: 'Wedding Contributions (Michango): Track Pledges | Kadi Sasa',
      description:
        'Record pledges and payments for each wedding guest. Guests pay with M-Pesa, Mixx by Yas, Airtel Money or HaloPesa straight from their card.',
      h1: 'Wedding contributions (michango): pledges and payments in one place',
      answer:
        'Kadi Sasa puts contributions inside the invitation. The committee records each guest’s pledge, the guest pays by phone from their card, and the committee sees collected, pledged and balance per person. Cash payments are recorded too.',
      sections: [
        {
          id: 'problem',
          h2: 'The problem with contributions in WhatsApp groups',
          blocks: [
            {
              t: 'p',
              text: 'Many committees track michango in a notebook or a WhatsApp group. Pledges get lost in long chats, nobody knows each person’s balance, and some guests are never reminded. The result is arguments and accounts that do not match at closing.',
            },
          ],
        },
        {
          id: 'how',
          h2: 'How contributions work in Kadi Sasa',
          blocks: [
            {
              t: 'ol',
              items: [
                'The committee records a guest’s pledge (amount and note) on their profile.',
                'The guest sees the pledge and balance on their card and taps “Pay by phone”.',
                'They pay with M-Pesa, Mixx by Yas, Airtel Money or HaloPesa. We never ask for a PIN; they confirm on their own phone.',
                'The payment lands in the list and the balance drops. The committee can also record cash or bank payments.',
                'A guest who owes receives a polite reminder, only a few times.',
              ],
            },
          ],
        },
        {
          id: 'committee',
          h2: 'For the committee: transparency and reports',
          blocks: [
            {
              t: 'ul',
              items: [
                'Contribution target against collected, and pledged against paid.',
                'Each guest’s balance, and a list of those still to pay.',
                'Every payment change is written to an audit log.',
                'A CSV report for closing the accounts.',
                'Gate agents cannot see money details; only the committee and host can.',
              ],
            },
          ],
        },
        {
          id: 'no-pressure',
          h2: 'Contributions are not a condition for receiving a card',
          blocks: [
            {
              t: 'p',
              text: 'By default every guest gets a card without having to pledge anything. A host who wants conditions must switch them on deliberately. We believe an invitation should be courteous first.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'How are contributions paid?',
          a: 'With M-Pesa, Mixx by Yas, Airtel Money or HaloPesa from the guest’s card. Cash and bank payments are recorded by the committee.',
        },
        {
          q: 'Where does the money go?',
          a: 'Payments pass through an approved payment provider. How the committee receives funds is still being finalised during the pilot; we will explain it here when ready.',
        },
        {
          q: 'Does Kadi Sasa store payment PINs?',
          a: 'No. The guest confirms on their own phone and we never ask for a PIN or password.',
        },
        {
          q: 'Can I use it for a send-off or engagement?',
          a: 'Yes. Contributions can be switched on for any event.',
        },
      ],
    },
  },
  {
    slug: 'kadi-ya-send-off',
    group: 'product',
    schema: 'WebPage',
    updated: UPDATED,
    related: [
      'kadi-ya-uchumba',
      'maneno-ya-kadi-ya-harusi',
      'michango-ya-harusi',
      'kadi-ya-harusi-mtandaoni',
    ],
    sw: {
      nav: 'Kadi ya send-off',
      title: 'Kadi ya Send-off Mtandaoni Tanzania | Kadi Sasa',
      description:
        'Tuma mwaliko wa send-off kwa kila mgeni kwa WhatsApp, SMS au karatasi. Fuatilia majibu na michango, na ingiza wageni langoni kwa QR.',
      h1: 'Kadi ya send-off: mwaliko, majibu na michango',
      answer:
        'Send-off ni sherehe ya kumuaga binti kabla ya harusi, mara nyingi inayoandaliwa na familia yake. Kadi Sasa inakuruhusu kuandika aina ya mwaliko unayotaka, kutuma kadi ya kila mgeni, kufuatilia majibu na michango, na kuingiza wageni langoni kwa QR au namba.',
      sections: [
        {
          id: 'send-off',
          h2: 'Send-off ni nini?',
          blocks: [
            {
              t: 'p',
              text: 'Ni sherehe ya kumuaga bibi harusi mtarajiwa. Mara nyingi hufanyika kabla ya harusi na huandaliwa na familia yake. Wageni ni ndugu, jamaa na marafiki wa familia hiyo.',
            },
          ],
        },
        {
          id: 'nini-kinafaa',
          h2: 'Kwa nini kadi ya mtandaoni inafaa send-off',
          blocks: [
            {
              t: 'ul',
              items: [
                'Familia kubwa: unajua nani amejibu bila kupiga simu kila mtu.',
                'Wageni wa mikoani na nje ya nchi wanapata kiungo na ramani mara moja.',
                'Wazee wanapata kadi ya karatasi yenye QR na namba ileile.',
                'Michango ya send-off inaweza kufuatiliwa kwa jina la kila mchangiaji.',
                'Langoni, kamati ya familia inaingiza wageni kwa haraka bila orodha ya karatasi.',
              ],
            },
          ],
        },
        {
          id: 'aina',
          h2: 'Andika aina ya mwaliko wako mwenyewe',
          blocks: [
            {
              t: 'p',
              text: 'Unapounda tukio, unaandika aina ya mwaliko (kwa mfano “Send-off”) badala ya kuchagua kutoka orodha ndefu. Jina hilo linatumika kwenye kadi, SMS na kichwa cha ukurasa. Jina la pili ni la hiari, kwa hiyo mwenyeji mmoja anatosha.',
            },
          ],
        },
        {
          id: 'hatua',
          h2: 'Hatua za kutuma kadi ya send-off',
          blocks: [
            {
              t: 'ol',
              items: [
                'Unda tukio na uandike “Send-off” kama aina ya mwaliko.',
                'Ingiza wageni na uchague njia ya kutuma kwa kila kundi.',
                'Washa michango kama unataka kupokea ahadi.',
                'Tuma, kisha fuatilia majibu kwenye dashibodi.',
              ],
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Je, ninaweza kutumia kwa send-off na harusi zote mbili?',
          a: 'Ndiyo. Unaunda tukio tofauti kwa kila sherehe, kila moja na orodha yake na kadi zake.',
        },
        {
          q: 'Kitchen party inafaa?',
          a: 'Ndiyo. Andika “Kitchen party” kama aina ya mwaliko. Mfumo hauzuii aina yoyote ya sherehe ya faragha.',
        },
      ],
    },
    en: {
      nav: 'Send-off invitations',
      title: 'Send-off Invitation Cards Online Tanzania | Kadi Sasa',
      description:
        'Send a send-off invitation to every guest by WhatsApp, SMS or paper. Track replies and contributions, and admit guests at the gate with a QR or number.',
      h1: 'Send-off invitations: invite, reply and contribute',
      answer:
        'A send-off is a celebration to bid a bride farewell before her wedding, usually hosted by her family. With Kadi Sasa you write the kind of invitation you want, send each guest their own card, track replies and contributions, and admit guests at the gate by QR or number.',
      sections: [
        {
          id: 'what',
          h2: 'What is a send-off?',
          blocks: [
            {
              t: 'p',
              text: 'It is a celebration to see off the bride-to-be. It usually takes place before the wedding and is hosted by her family. Guests are relatives and friends of that family.',
            },
          ],
        },
        {
          id: 'why',
          h2: 'Why an online card suits a send-off',
          blocks: [
            {
              t: 'ul',
              items: [
                'Big families: you know who replied without phoning everyone.',
                'Guests upcountry and abroad get the link and map at once.',
                'Elders get a paper card with the same QR and number.',
                'Send-off contributions can be tracked by each contributor’s name.',
                'At the door the family committee admits guests quickly, with no paper list.',
              ],
            },
          ],
        },
        {
          id: 'kind',
          h2: 'Write your own kind of invitation',
          blocks: [
            {
              t: 'p',
              text: 'When you create the event you type the kind of invitation (for example “Send-off”) instead of picking from a long list. That name appears on the card, in SMS and in the page title. The second name is optional, so a single host is fine.',
            },
          ],
        },
        {
          id: 'steps',
          h2: 'Steps to send a send-off card',
          blocks: [
            {
              t: 'ol',
              items: [
                'Create the event and write “Send-off” as the kind of invitation.',
                'Add guests and choose how to send to each group.',
                'Switch on contributions if you want to receive pledges.',
                'Send, then follow replies on the dashboard.',
              ],
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Can I use it for both the send-off and the wedding?',
          a: 'Yes. Create a separate event for each celebration, each with its own list and cards.',
        },
        {
          q: 'What about a kitchen party?',
          a: 'Yes. Write “Kitchen party” as the kind of invitation. The system does not restrict private celebrations.',
        },
      ],
    },
  },
  {
    slug: 'kadi-ya-uchumba',
    group: 'product',
    schema: 'WebPage',
    updated: UPDATED,
    related: [
      'kadi-ya-send-off',
      'maneno-ya-kadi-ya-harusi',
      'kadi-ya-harusi-mtandaoni',
      'michango-ya-harusi',
    ],
    sw: {
      nav: 'Kadi ya uchumba',
      title: 'Kadi ya Uchumba na Engagement Party Mtandaoni | Kadi Sasa',
      description:
        'Tuma mwaliko wa uchumba au engagement party kwa kila mgeni. Fuatilia majibu, ahadi za michango na uingiaji wa wageni kwa QR au namba.',
      h1: 'Kadi ya uchumba na engagement party',
      answer:
        'Kadi Sasa inafaa uchumba na engagement party kama inavyofaa harusi. Unaandika aina ya mwaliko wako, kila mgeni anapata kadi yake kwa WhatsApp, SMS au karatasi, na unaona majibu, michango na waliofika.',
      sections: [
        {
          id: 'uchumba',
          h2: 'Kadi ya uchumba inapaswa kuwa na nini?',
          blocks: [
            {
              t: 'ul',
              items: [
                'Majina ya wanaouchumbiana na familia zinazohusika.',
                'Tarehe, saa na mahali, pamoja na ramani.',
                'Mavazi yanayopendekezwa, kama yapo.',
                'Namba ya kamati ya kuthibitisha na kuuliza.',
                'Njia ya kuchangia, kama familia inapokea michango.',
              ],
            },
          ],
        },
        {
          id: 'faida',
          h2: 'Faida za kutumia Kadi Sasa kwa uchumba',
          blocks: [
            {
              t: 'ul',
              items: [
                'QR ya kila mgeni inaingiza mara moja tu; ikiskaniwa mara ya pili kamati inaona nani aliingia na saa ngapi.',
                'Idadi ya wageni waliothibitisha inajulikana mapema kwa ajili ya chakula na viti.',
                'Orodha ileile inaweza kutumika baadaye kwa harusi kwa kuunda tukio jipya.',
              ],
            },
          ],
        },
        {
          id: 'mfano',
          h2: 'Mfano wa maneno ya mwaliko wa uchumba',
          blocks: [
            {
              t: 'note',
              text: 'Familia ya [jina] ina furaha kukualika kwenye sherehe ya uchumba wa [jina] na [jina]. Tarehe: [tarehe]. Saa: [saa]. Mahali: [mahali]. Tafadhali thibitisha kuhudhuria kupitia kadi hii.',
            },
            { t: 'p', text: 'Maneno zaidi ya kuandika yako kwenye ukurasa wa maneno ya kadi.' },
          ],
        },
      ],
      faq: [
        {
          q: 'Je, nikichagua “Uchumba” kadi itabadilika?',
          a: 'Aina uliyoandika inaonekana kwenye kadi, SMS na kichwa cha ukurasa. Mpangilio wa kadi unabaki ule ule.',
        },
        { q: 'Naweza kuondoa jina la pili?', a: 'Ndiyo. Jina la pili ni la hiari.' },
      ],
    },
    en: {
      nav: 'Engagement invitations',
      title: 'Engagement Party Invitation Cards Online | Kadi Sasa',
      description:
        'Send an engagement (uchumba) invitation to every guest. Track replies, pledges and arrivals, and admit guests with a QR or number.',
      h1: 'Engagement (uchumba) invitations',
      answer:
        'Kadi Sasa suits an engagement party as it does a wedding. You write the kind of invitation you want, every guest gets their own card by WhatsApp, SMS or paper, and you see replies, contributions and arrivals.',
      sections: [
        {
          id: 'content',
          h2: 'What should an engagement card include?',
          blocks: [
            {
              t: 'ul',
              items: [
                'The names of the couple and the families involved.',
                'Date, time and place, with a map.',
                'Suggested dress, if any.',
                'A committee number to confirm and ask questions.',
                'A way to contribute, if the family receives contributions.',
              ],
            },
          ],
        },
        {
          id: 'benefits',
          h2: 'Benefits of Kadi Sasa for an engagement',
          blocks: [
            {
              t: 'ul',
              items: [
                'Each guest’s QR admits once only; a second scan shows the committee who entered and when.',
                'Confirmed numbers early, for food and seating.',
                'The same list can be reused for the wedding by creating a new event.',
              ],
            },
          ],
        },
        {
          id: 'sample',
          h2: 'Sample engagement invitation wording',
          blocks: [
            {
              t: 'note',
              text: 'The family of [name] is delighted to invite you to the engagement celebration of [name] and [name]. Date: [date]. Time: [time]. Venue: [venue]. Please confirm your attendance through this card.',
            },
            { t: 'p', text: 'More wording ideas are on the invitation wording page.' },
          ],
        },
      ],
      faq: [
        {
          q: 'If I choose “Engagement” does the card change?',
          a: 'The kind you write shows on the card, in SMS and in the page title. The card layout stays the same.',
        },
        { q: 'Can I remove the second name?', a: 'Yes. The second name is optional.' },
      ],
    },
  },
];
