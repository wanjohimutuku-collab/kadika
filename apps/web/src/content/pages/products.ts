import type { ContentPageDef } from '../types';

const UPDATED = '2026-10-15';

export const PRODUCT_PAGES: ContentPageDef[] = [
  {
    slug: 'kadi-ya-harusi-mtandaoni',
    slugEn: 'online-wedding-invitation',
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
    slugEn: 'wedding-contributions',
    group: 'product',
    schema: 'WebPage',
    updated: '2026-11-26',
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
        'Fuatilia ahadi na malipo ya michango ya harusi Tanzania. Wageni wanalipa moja kwa moja kwa M-Pesa, Mixx, Airtel au HaloPesa bila makato.',
      h1: 'Michango ya harusi: jinsi ya kufuatilia ahadi na malipo',
      answer:
        'Ili kufuatilia michango ya harusi bila mabishano, weka ahadi ya kila mgeni kwenye daftari la kidijitali, pokee malipo moja kwa moja kupitia M-Pesa, Mixx by Yas, Airtel Money au HaloPesa kwa 0% makato, na utumie vikumbusho vya SMS kwa salio. Mweka hazina anapata ripoti ya kusoma kwenye kikao kwa sekunde. Anza bure na kadi 5.',
      sections: [
        {
          id: 'tatizo',
          h2: 'Kwa nini kufuatilia michango kwenye daftari au kundi la WhatsApp kunaleta shida?',
          blocks: [
            {
              t: 'p',
              text: 'Kamati nyingi za harusi bado huandika ahadi za michango kwenye madaftari au kuzitafuta katikati ya mazungumzo marefu kwenye kundi la WhatsApp. Ahadi zingine hupotea, mweka hazina hushindwa kujua salio halisi la kila mgeni haraka, na baadhi ya wachangiaji hukosa vikumbusho vya heshima kabla ya tarehe ya kufunga bajeti.',
            },
            {
              t: 'p',
              text: 'Pia, kuchanganya malipo ya michango kwenye simu binafsi bila rekodi ya pamoja huleta maswali wakati wa kikao cha kamati. Kadi Sasa inampa kila mgeni mstari wake wa ahadi, kilicholipwa na salio linalobaki, huku fedha zikienda moja kwa moja kwa wenye sherehe.',
            },
          ],
        },
        {
          id: 'inavyofanya',
          h2: 'Jinsi ya kufuatilia ahadi na malipo ya michango hatua kwa hatua?',
          blocks: [
            {
              t: 'ol',
              items: [
                'Weka lengo la bajeti ya michango ya sherehe kwenye mipangilio ya tukio lako la Kadi Sasa.',
                'Weka namba au akaunti ya wenye sherehe ya kupokelea malipo (M-Pesa, Lipa Namba, Mixx by Yas, Airtel Money, HaloPesa au benki).',
                'Rekodi ahadi ya kila mgeni (kiasi na maelezo) kwenye wasifu wake.',
                'Mgeni anapofungua kadi yake ya michango anaona ahadi yake, salio na namba sahihi za kamati za kulipia.',
                'Mgeni analipa moja kwa moja kwa wenye sherehe; mweka hazina anarekodi malipo na salio linashuka mara moja (taslimu na benki zinarekodiwa vilevile).',
                'Tuma vikumbusho vya SMS kwa heshima kwa waliobaki na salio na pakua ripoti ya CSV kabla ya kikao.',
              ],
            },
            {
              t: 'p',
              text: 'Kadi za michango hutumwa kama kadi ya ahadi na malipo peke yake, bila kuweka shinikizo kwenye kadi ya mwaliko wa sherehe. Kwa chaguo-msingi, kila mgeni anapata kadi ya mwaliko bila kuhitajika kuchangia kwanza.',
            },
          ],
        },
        {
          id: 'kamati',
          h2: 'Mweka hazina na kamati wanaona nini kwenye ripoti?',
          blocks: [
            {
              t: 'ul',
              items: [
                'Jumla ya lengo la michango dhidi ya ahadi zilizorekodiwa na kiasi kilichokwishalipwa.',
                'Salio la kila mgeni mmoja mmoja, na orodha ya waliomaliza au wenye salio.',
                'Kumbukumbu ya ukaguzi (audit log) kwa kila badiliko la ahadi au malipo ili kuongeza uaminifu.',
                'Ripoti ya CSV ya kusoma kwenye kikao cha kamati au kuhifadhi kwenye kumbukumbu za familia.',
                'Usiri kamili: kumbukumbu zimesimbwa kwa usimbaji fiche na walinda lango wa mlangoni hawaoni taarifa za pesa.',
              ],
            },
          ],
        },
        {
          id: 'bila-shinikizo',
          h2: 'Je, Kadi Sasa inachukua asilimia au PIN ya malipo?',
          blocks: [
            {
              t: 'p',
              text: 'Hapana. Kadi Sasa haishiki pesa za michango wala haichukui asilimia yoyote (0% makato). Malipo yanafanyika moja kwa moja kati ya mgeni na wenye sherehe kwenye mitandao ya Tanzania (M-Pesa, Mixx by Yas, Airtel Money, HaloPesa) au taslimu. Hatuombi kamwe PIN wala nenosiri la simu.',
            },
            {
              t: 'p',
              text: 'Bei ya jukwaa iko wazi kwenye ukurasa wa bei (/bei): unaanza bure na kadi 5, kisha TZS 2,400 (1–99), TZS 2,200 (100–499), na TZS 1,950 (500+). Tazama pia ukurasa wa kadi ya harusi (/kadi-ya-harusi-mtandaoni) na mwongozo wa usalama (/usalama-wa-kadi-za-mtandaoni).',
            },
            {
              t: 'note',
              text: 'Jaribu daftari la michango na kadi zako 5 za kwanza bure leo — panga ahadi na ripoti ya mweka hazina bila daftari la karatasi.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Michango inalipwa kupitia mitandao ipi Tanzania?',
          a: 'Wageni wanalipa moja kwa moja kwa wenye sherehe kupitia M-Pesa, Mixx by Yas, Airtel Money, HaloPesa, benki au taslimu. Kamati inarekodi kila malipo dhidi ya ahadi.',
        },
        {
          q: 'Je, Kadi Sasa inakata asilimia yoyote kwenye michango?',
          a: 'Hapana. Kadi Sasa inachukua 0% ya michango na haishiki fedha za wageni. Kiasi chote kinaenda moja kwa moja kwa wenye sherehe.',
        },
        {
          q: 'Nani anaweza kuona kiasi ambacho mgeni ameahidi au kulipa?',
          a: 'Mwenyeji na wanakamati walioidhinishwa tu. Walinzi wa langoni na wageni wengine hawaoni ahadi za watu wengine.',
        },
        {
          q: 'Mgeni anaweza kupata kikumbusho cha ahadi yake kwa SMS?',
          a: 'Ndiyo. Kamati inaweza kutuma vikumbusho vya SMS vyenye kiasi cha salio lake kwa heshima kabla ya siku ya kufunga hesabu.',
        },
        {
          q: 'Michango inaweza kutumika kwa send-off, kitchen party au harambee ya kanisa?',
          a: 'Ndiyo. Kipengele cha michango kinaweza kuwashwa au kuzimwa kwenye tukio lolote unalounda.',
        },
      ],
    },
    en: {
      nav: 'Wedding contributions',
      title: 'Wedding Contributions (Michango): Track Pledges | Kadi Sasa',
      description:
        'How to track wedding pledges and payments in Tanzania. Guests pay hosts directly via M-Pesa, Mixx by Yas, Airtel Money or HaloPesa with 0% commission.',
      h1: 'Wedding contributions (michango): how to track pledges and payments',
      answer:
        'To track wedding michango without disputes, record each guest’s pledge in a shared ledger, let guests pay hosts directly via M-Pesa, Mixx by Yas, Airtel Money or HaloPesa with 0% cut, and send polite SMS balance reminders. The treasurer gets a meeting-ready report in seconds. Start free with 5 cards.',
      sections: [
        {
          id: 'tatizo',
          h2: 'Why do notebooks and WhatsApp groups cause trouble for michango?',
          blocks: [
            {
              t: 'p',
              text: 'Many committees track pledges in paper notebooks or search through long WhatsApp threads. Pledges get missed, the treasurer struggles to pull an exact balance per guest before meetings, and contributors rarely receive timely, polite reminders.',
            },
            {
              t: 'p',
              text: 'Collecting funds on a personal phone without a shared audit trail also creates avoidable tension. Kadi Sasa gives every guest a clear pledge, paid amount and remaining balance while money goes straight to the hosts.',
            },
          ],
        },
        {
          id: 'inavyofanya',
          h2: 'How do you track pledges and payments step by step?',
          blocks: [
            {
              t: 'ol',
              items: [
                'Set your contribution target in your Kadi Sasa event settings.',
                'Add the hosts’ own receiving numbers or accounts (M-Pesa, Lipa Namba, Mixx by Yas, Airtel Money, HaloPesa or bank).',
                'Record each guest’s pledge amount and optional note on their profile.',
                'When the guest opens their contribution card, they see their pledge, balance and the committee’s verified payment numbers.',
                'The guest pays the hosts directly; the treasurer logs each payment (including cash or bank) and the balance updates at once.',
                'Send polite SMS pledge reminders to remaining balances and export a CSV report for committee meetings.',
              ],
            },
            {
              t: 'p',
              text: 'Contribution cards stay separate from invitation cards so no guest feels pressured to contribute simply to receive an invite.',
            },
          ],
        },
        {
          id: 'kamati',
          h2: 'What do the treasurer and committee see in reports?',
          blocks: [
            {
              t: 'ul',
              items: [
                'Event target versus total pledged and total collected.',
                'Individual balances per guest, filtered by paid, partial or unpaid.',
                'An audit log recording every pledge or payment update for accountability.',
                'A downloadable CSV report ready to read out at committee meetings.',
                'Full privacy: contribution amounts are encrypted and gate ushers never see financial figures.',
              ],
            },
          ],
        },
        {
          id: 'bila-shinikizo',
          h2: 'Does Kadi Sasa take a commission or ask for payment PINs?',
          blocks: [
            {
              t: 'p',
              text: 'No. Kadi Sasa never holds contribution funds and takes 0% commission. Guests pay hosts directly via M-Pesa, Mixx by Yas, Airtel Money, HaloPesa, bank or cash, and we never ask for a PIN or password.',
            },
            {
              t: 'p',
              text: 'Platform pricing is listed openly on /bei: start free with 5 cards, then TZS 2,400 (1–99), TZS 2,200 (100–499) and TZS 1,950 (500+). See our online wedding card service (/online-wedding-invitation) and safety guide (/security-of-online-invitations).',
            },
            {
              t: 'note',
              text: 'Try the michango ledger with your first 5 free cards today and replace messy notebooks before your next committee meeting.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Which payment methods can guests use in Tanzania?',
          a: 'Guests pay hosts directly via M-Pesa, Mixx by Yas, Airtel Money, HaloPesa, bank transfer or cash, and the committee logs each payment against the pledge.',
        },
        {
          q: 'Does Kadi Sasa take any percentage of michango?',
          a: 'No. Kadi Sasa takes 0% commission and never holds contribution money. Every shilling goes straight to the hosts.',
        },
        {
          q: 'Who can see how much each guest pledged or paid?',
          a: 'Only the host and authorised committee members. Gate ushers and other guests cannot see anyone else’s pledges.',
        },
        {
          q: 'Can guests receive polite SMS pledge reminders?',
          a: 'Yes. The committee can send SMS reminders showing the remaining balance before the closing date.',
        },
        {
          q: 'Can michango tracking be used for send-offs, kitchen parties or church drives?',
          a: 'Yes. Contributions can be switched on or off for any event you create.',
        },
      ],
    },
  },
  {
    slug: 'kadi-ya-send-off',
    slugEn: 'send-off-invitation',
    group: 'product',
    schema: 'WebPage',
    updated: UPDATED,
    related: [
      'kadi-ya-uchumba',
      'maneno-ya-kadi-ya-harusi',
      'michango-ya-harusi',
      'kadi-ya-harusi-mtandaoni',
      'usalama-wa-kadi-za-mtandaoni',
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
    slugEn: 'engagement-invitation',
    group: 'product',
    schema: 'WebPage',
    updated: UPDATED,
    related: [
      'kadi-ya-send-off',
      'maneno-ya-kadi-ya-harusi',
      'kadi-ya-harusi-mtandaoni',
      'michango-ya-harusi',
      'usalama-wa-kadi-za-mtandaoni',
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
