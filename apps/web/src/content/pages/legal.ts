import type { ContentPageDef } from '../types';

const UPDATED = '2026-10-15';

/**
 * Legal drafts. Facts here follow what the product actually does. Company identity, hosting
 * location, retention limits and governing law are deliberately left for a lawyer (see the audit doc).
 */
export const LEGAL_PAGES: ContentPageDef[] = [
  {
    slug: 'privacy',
    group: 'legal',
    schema: 'WebPage',
    draft: true,
    updated: UPDATED,
    related: ['ombi-la-data', 'cookies', 'terms', 'usalama-wa-kadi-za-mtandaoni'],
    sw: {
      nav: 'Sera ya faragha',
      title: 'Sera ya Faragha | Harusi Pass',
      description:
        'Sera ya faragha ya Harusi Pass: taarifa tunazokusanya, tunavyozitumia, tunavyozishiriki, muda wa kuzihifadhi na haki zako chini ya sheria ya Tanzania.',
      h1: 'Sera ya faragha',
      answer:
        'Harusi Pass inakusanya taarifa chache zinazohitajika kutuma mialiko, kupokea majibu na michango, na kuingiza wageni langoni. Hatuuzi data wala hatutumii matangazo. Mwenyeji anaweza kupakua au kufuta data za wageni, na mgeni anaweza kuomba nakala au kufutwa.',
      sections: [
        {
          id: 'sisi',
          h2: 'Sisi ni nani na nani anadhibiti data',
          blocks: [
            {
              t: 'p',
              text: 'Harusi Pass inaendeshwa nchini Tanzania na tunafuata Sheria ya Ulinzi wa Taarifa Binafsi ya Tanzania ya mwaka 2022. Kwa taarifa za wageni, mwenyeji wa tukio ndiye anayeamua ni nani aalikwe na kwa nini, kwa hiyo ndiye mdhibiti wa data hizo; sisi tunazishughulikia kwa niaba yake. Kwa taarifa za akaunti ya mwenyeji na kamati, sisi ndio wadhibiti.',
            },
            {
              t: 'p',
              text: 'Maelezo ya usajili wa kampuni na anwani yatawekwa hapa kabla ya uzinduzi.',
            },
          ],
        },
        {
          id: 'tunachokusanya',
          h2: 'Taarifa tunazokusanya',
          blocks: [
            {
              t: 'table',
              head: ['Kutoka kwa', 'Taarifa'],
              rows: [
                [
                  'Mwenyeji na kamati',
                  'Jina, namba ya simu, jukumu kwenye tukio, kumbukumbu za vitendo muhimu (kama kurekodi malipo)',
                ],
                [
                  'Wageni (zinaingizwa na mwenyeji)',
                  'Jina, namba ya simu (ikiwa ipo), kikundi, idadi ya watu wanaoruhusiwa, lugha, maelezo ya mwenyeji',
                ],
                [
                  'Mgeni anapotumia kadi',
                  'Jibu la mwaliko, idadi ya watu, kuomba kuacha vikumbusho, ahadi na malipo (kiasi, mtoa huduma, namba ya simu ya malipo)',
                ],
                [
                  'Langoni',
                  'Kuskaniwa kwa kadi: saa, lango, matokeo, na nani aliyeingiza kwa mkono',
                ],
                [
                  'Ujumbe',
                  'Hali ya ujumbe wa WhatsApp au SMS uliotumwa (umetumwa, umefika, umeshindwa)',
                ],
              ],
            },
          ],
        },
        {
          id: 'matumizi',
          h2: 'Tunavyotumia taarifa',
          blocks: [
            {
              t: 'ul',
              items: [
                'Kutuma kadi na vikumbusho, na kuonyesha hali kwa kamati.',
                'Kupokea na kurekodi michango na malipo.',
                'Kuthibitisha kuingia langoni na kuzuia kadi kutumika mara mbili.',
                'Kuzuia matumizi mabaya na kulinda usalama wa huduma.',
                'Kutimiza wajibu wa kisheria.',
              ],
            },
            {
              t: 'p',
              text: 'Msingi wa kisheria wa kila matumizi (ridhaa, mkataba, maslahi halali au wajibu wa kisheria) utathibitishwa na mwanasheria kabla ya uzinduzi.',
            },
            { t: 'p', text: 'Hatuuzi wala kushiriki data na watangazaji.' },
          ],
        },
        {
          id: 'watoa-huduma',
          h2: 'Watoa huduma tunaowatumia',
          blocks: [
            {
              t: 'p',
              text: 'Ili kutuma kadi na kuthibitisha malipo tunatumia: kampuni za ujumbe wa WhatsApp na SMS, mtoa huduma wa malipo ya simu, na seva za kuhifadhi data. Wanapokea tu kinachohitajika kufanya kazi hiyo na hawaruhusiwi kukitumia kwa shughuli nyingine.',
            },
            {
              t: 'p',
              text: 'Mahali seva zilipo na uhamishaji wowote wa data nje ya Tanzania vitaelezwa hapa kabla ya uzinduzi.',
            },
          ],
        },
        {
          id: 'muda',
          h2: 'Tunahifadhi kwa muda gani',
          blocks: [
            {
              t: 'p',
              text: 'Data za tukio zinabaki hadi mwenyeji azifute au aombe zifutwe. Tukipokea ombi la kufuta akaunti, tunafuta akaunti na matukio husika ndani ya siku 30. Mgeni akifutwa, jina, simu na maelezo yake huondolewa; kiasi cha malipo kinabaki bila taarifa za mtu, kwa ajili ya hesabu za tukio.',
            },
            {
              t: 'p',
              text: 'Muda wa juu wa kuhifadhi data baada ya tukio kuisha utawekwa na mwanasheria.',
            },
          ],
        },
        {
          id: 'kifaa',
          h2: 'Kinachohifadhiwa kwenye kifaa chako',
          blocks: [
            {
              t: 'p',
              text: 'Kadi yako huhifadhi nakala kwenye kivinjari ili ionekane bila mtandao, na jibu lako hadi litumwe. Programu ya lango huhifadhi orodha ya wageni kwenye simu ya mlinda lango; PIN ya lango haihifadhiwi. Maelezo zaidi yako kwenye ukurasa wa vidakuzi.',
            },
          ],
        },
        {
          id: 'usalama',
          h2: 'Usalama',
          blocks: [
            {
              t: 'p',
              text: 'Viungo vya kadi ni vya kipekee na havitabiriki; tunahifadhi alama zake za kificho kwa ajili ya kuhakiki, pamoja na nakala iliyosimbwa inayohitajika kutuma tena kiungo. Funguo za kusaini QR zimesimbwa kwenye seva. Hatuombi nenosiri, PIN wala namba za siri kutoka kwa wageni. Hakuna mfumo usio na hatari kabisa; tukigundua uvujaji tutawajulisha walioathirika na mamlaka husika kama sheria inavyohitaji.',
            },
          ],
        },
        {
          id: 'haki',
          h2: 'Haki zako',
          blocks: [
            {
              t: 'ul',
              items: [
                'Kujua taarifa zako tulizonazo na kupata nakala.',
                'Kusahihisha taarifa zisizo sahihi.',
                'Kuomba zifutwe, na kupinga matumizi fulani.',
                'Kuacha kupokea vikumbusho kutoka kwenye kadi yako.',
                'Kulalamika kwa mamlaka ya ulinzi wa taarifa binafsi ya Tanzania [mwanasheria athibitishe jina na anwani ya mamlaka].',
              ],
            },
            { t: 'p', text: 'Jinsi ya kuomba iko kwenye ukurasa wa maombi ya data.' },
          ],
        },
        {
          id: 'watoto',
          h2: 'Watoto',
          blocks: [
            {
              t: 'p',
              text: 'Huduma hii ni ya wenyeji wazima. Hatuwalengi watoto, na mwenyeji anawajibika kwa taarifa za wageni anaowaingiza, wakiwemo watoto.',
            },
          ],
        },
        {
          id: 'mabadiliko',
          h2: 'Mabadiliko ya sera',
          blocks: [
            {
              t: 'p',
              text: 'Tukibadilisha sera hii tutasasisha tarehe iliyo juu ya ukurasa na, kwa mabadiliko makubwa, tutawajulisha wenyeji.',
            },
          ],
        },
        {
          id: 'mawasiliano',
          h2: 'Mawasiliano',
          blocks: [{ t: 'p', text: 'Maswali kuhusu faragha: faragha@harusipass.co.tz.' }],
        },
      ],
    },
    en: {
      nav: 'Privacy policy',
      title: 'Privacy Policy | Harusi Pass',
      description:
        'Harusi Pass privacy policy: what we collect, how we use and share it, how long we keep it, and your rights under Tanzanian law.',
      h1: 'Privacy policy',
      answer:
        'Harusi Pass collects the minimum needed to send invitations, receive replies and contributions, and admit guests at the gate. We do not sell data or use advertising. A host can download or delete guest data, and a guest can ask for a copy or for erasure.',
      sections: [
        {
          id: 'who',
          h2: 'Who we are and who controls the data',
          blocks: [
            {
              t: 'p',
              text: 'Harusi Pass operates in Tanzania and follows the Personal Data Protection Act, 2022. For guest information, the event host decides who is invited and why, so the host is the controller of that data and we process it on their behalf. For host and committee account information, we are the controller.',
            },
            {
              t: 'p',
              text: 'Company registration details and address will be added here before launch.',
            },
          ],
        },
        {
          id: 'collect',
          h2: 'What we collect',
          blocks: [
            {
              t: 'table',
              head: ['From', 'Information'],
              rows: [
                [
                  'Host and committee',
                  'Name, phone number, role in the event, records of important actions (such as recording a payment)',
                ],
                [
                  'Guests (entered by the host)',
                  'Name, phone number (if any), group, number of people allowed, language, host notes',
                ],
                [
                  'A guest using their card',
                  'Reply, party size, request to stop reminders, pledges and payments (amount, provider, payment phone number)',
                ],
                ['At the gate', 'Card scans: time, gate, result, and who admitted manually'],
                ['Messages', 'Status of the WhatsApp or SMS sent (sent, delivered, failed)'],
              ],
            },
          ],
        },
        {
          id: 'use',
          h2: 'How we use it',
          blocks: [
            {
              t: 'ul',
              items: [
                'To send cards and reminders and show status to the committee.',
                'To receive and record contributions and payments.',
                'To confirm entry at the gate and prevent a card being used twice.',
                'To prevent misuse and protect the service.',
                'To meet legal obligations.',
              ],
            },
            {
              t: 'p',
              text: 'The legal basis for each use (consent, contract, legitimate interest or legal obligation) will be confirmed by a lawyer before launch.',
            },
            { t: 'p', text: 'We do not sell or share data with advertisers.' },
          ],
        },
        {
          id: 'providers',
          h2: 'Providers we use',
          blocks: [
            {
              t: 'p',
              text: 'To send cards and confirm payments we use: WhatsApp and SMS messaging companies, a mobile payment provider, and servers that store data. They receive only what is needed for that job and may not use it for anything else.',
            },
            {
              t: 'p',
              text: 'Where servers are located and any transfer of data outside Tanzania will be described here before launch.',
            },
          ],
        },
        {
          id: 'retention',
          h2: 'How long we keep it',
          blocks: [
            {
              t: 'p',
              text: 'Event data stays until the host deletes it or asks us to. When we receive a request to delete an account, we delete the account and its events within 30 days. When a guest is erased, their name, phone and notes are removed; the payment amount stays without personal details, for the event’s accounts.',
            },
            {
              t: 'p',
              text: 'A maximum retention period after an event ends will be set by a lawyer.',
            },
          ],
        },
        {
          id: 'device',
          h2: 'What is stored on your device',
          blocks: [
            {
              t: 'p',
              text: 'Your card keeps a copy in the browser so it shows offline, and your reply until it is sent. The gate app stores the guest list on the agent’s phone; the gate PIN is not stored. More detail is on the cookies page.',
            },
          ],
        },
        {
          id: 'security',
          h2: 'Security',
          blocks: [
            {
              t: 'p',
              text: 'Card links are unique and cannot be guessed; we store hashed forms for verification, plus an encrypted copy needed to resend the link. The keys used to sign QR codes are encrypted on the server. We never ask guests for a password, PIN or secret number. No system is risk-free; if we find a breach we will tell those affected and the authority as the law requires.',
            },
          ],
        },
        {
          id: 'rights',
          h2: 'Your rights',
          blocks: [
            {
              t: 'ul',
              items: [
                'To know what we hold about you and get a copy.',
                'To correct inaccurate information.',
                'To ask for deletion and object to certain uses.',
                'To stop reminders from your card.',
                'To complain to Tanzania’s data protection authority [a lawyer to confirm the authority’s name and address].',
              ],
            },
            { t: 'p', text: 'How to ask is on the data requests page.' },
          ],
        },
        {
          id: 'children',
          h2: 'Children',
          blocks: [
            {
              t: 'p',
              text: 'The service is for adult hosts. We do not target children, and hosts are responsible for the information of the guests they add, including children.',
            },
          ],
        },
        {
          id: 'changes',
          h2: 'Changes to this policy',
          blocks: [
            {
              t: 'p',
              text: 'If we change this policy we will update the date at the top and, for significant changes, tell hosts.',
            },
          ],
        },
        {
          id: 'contact',
          h2: 'Contact',
          blocks: [{ t: 'p', text: 'Privacy questions: faragha@harusipass.co.tz.' }],
        },
      ],
    },
  },
  {
    slug: 'terms',
    group: 'legal',
    schema: 'WebPage',
    draft: true,
    updated: UPDATED,
    related: ['privacy', 'matumizi-yanayokubalika', 'cookies', 'mawasiliano'],
    sw: {
      nav: 'Masharti ya matumizi',
      title: 'Masharti ya Matumizi | Harusi Pass',
      description:
        'Masharti ya kutumia Harusi Pass: akaunti, wajibu wa mwenyeji, ujumbe, malipo ya michango, walinda lango, mipaka ya dhima na mabadiliko.',
      h1: 'Masharti ya matumizi',
      answer:
        'Kwa kutumia Harusi Pass unakubali masharti haya. Mwenyeji anawajibika kwa orodha ya wageni na ujumbe anaotuma, michango inalipwa kupitia watoa huduma wa malipo walioidhinishwa, na huduma iko kwenye majaribio na inatolewa kama ilivyo.',
      sections: [
        {
          id: 'ukubali',
          h2: 'Kukubali masharti',
          blocks: [
            {
              t: 'p',
              text: 'Ukiingia au kutumia Harusi Pass unakubali masharti haya na sera ya faragha. Kama hukubali, usitumie huduma. Wageni wanaofungua kadi hawahitaji kukubali masharti ya mwenyeji, lakini wanafunikwa na sera ya faragha.',
            },
          ],
        },
        {
          id: 'akaunti',
          h2: 'Akaunti',
          blocks: [
            {
              t: 'p',
              text: 'Wenyeji na kamati wanaingia kwa namba ya simu na namba ya uthibitisho kwa SMS. Unawajibika kwa shughuli zote zinazofanyika kwenye akaunti yako. Usiruhusu mtu mwingine kutumia namba yako ya uthibitisho.',
            },
          ],
        },
        {
          id: 'mwenyeji',
          h2: 'Wajibu wa mwenyeji',
          blocks: [
            {
              t: 'ul',
              items: [
                'Ingiza tu watu unaowafahamu na ambao ni sahihi kuwaalika.',
                'Hakikisha una haki ya kutumia namba za simu unazoingiza.',
                'Toa maelezo sahihi ya tukio, kamati na namba ya mawasiliano.',
                'Heshimu maombi ya wageni ya kuacha vikumbusho au kufutwa.',
              ],
            },
          ],
        },
        {
          id: 'ujumbe',
          h2: 'Ujumbe',
          blocks: [
            {
              t: 'p',
              text: 'Tuma mialiko kwa watu unaowafahamu tu. Usitumie huduma kutuma matangazo, ujumbe wa ulaghai au ujumbe unaokiuka sheria. Gharama za SMS zinaonyeshwa kabla ya kutuma, na unawajibika kwazo mara ya kutozwa kuanza. Tunaweza kuzuia ujumbe unaoonekana kuwa matumizi mabaya.',
            },
          ],
        },
        {
          id: 'malipo',
          h2: 'Malipo ya michango',
          blocks: [
            {
              t: 'p',
              text: 'Michango inalipwa kupitia watoa huduma wa malipo walioidhinishwa. Harusi Pass si benki wala mtoa huduma wa pesa za simu, na haihifadhi PIN za malipo. Uhusiano wa mchango upo kati ya mgeni na mwenyeji. Jinsi kamati inavyopokea pesa, ada na marejesho vitaelezwa hapa kabla ya kuanza kupokea malipo halisi.',
            },
          ],
        },
        {
          id: 'lango',
          h2: 'Walinda lango',
          blocks: [
            {
              t: 'p',
              text: 'Mwenyeji huwapa walinda lango kiungo na PIN. Usishiriki PIN. Mwenyeji anaweza kufuta viungo vya lango wakati wowote, na kila hatua inarekodiwa. Walinda lango hawaoni taarifa za pesa.',
            },
          ],
        },
        {
          id: 'matumizi',
          h2: 'Matumizi yanayokubalika',
          blocks: [
            {
              t: 'p',
              text: 'Matumizi yote yanapaswa kufuata ukurasa wa matumizi yanayokubalika. Tukiona ukiukaji tunaweza kusimamisha akaunti au tukio.',
            },
          ],
        },
        {
          id: 'umiliki',
          h2: 'Umiliki wa maudhui',
          blocks: [
            {
              t: 'p',
              text: 'Orodha za wageni na maandishi ya kadi ni yako. Unatupa ruhusa ya kuyatumia kadri inavyohitajika kuendesha huduma. Nembo, muundo na programu ya Harusi Pass ni mali yetu.',
            },
          ],
        },
        {
          id: 'upatikanaji',
          h2: 'Upatikanaji wa huduma',
          blocks: [
            {
              t: 'p',
              text: 'Huduma iko kwenye majaribio. Tunajitahidi iwe inapatikana, lakini hatuahidi kuwa haitakatika. Kwa matukio muhimu, jaribu lango kabla ya siku na uwe na mpango mbadala wa orodha.',
            },
          ],
        },
        {
          id: 'dhima',
          h2: 'Mipaka ya dhima',
          blocks: [
            {
              t: 'p',
              text: 'Huduma inatolewa kama ilivyo wakati wa majaribio. Kwa kiwango kinachoruhusiwa na sheria, hatuwajibiki kwa hasara zisizo za moja kwa moja. Kiwango cha juu cha dhima na masharti ya fidia vitawekwa na mwanasheria.',
            },
          ],
        },
        {
          id: 'sheria',
          h2: 'Sheria inayotumika',
          blocks: [
            {
              t: 'p',
              text: 'Masharti haya yatatawaliwa na sheria za Tanzania. Mahakama zitakazoshughulikia migogoro na maelezo ya kampuni yataongezwa na mwanasheria.',
            },
          ],
        },
        {
          id: 'mabadiliko',
          h2: 'Mabadiliko ya masharti',
          blocks: [
            {
              t: 'p',
              text: 'Tukibadilisha masharti tutasasisha tarehe iliyo juu na kuwajulisha wenyeji kwa mabadiliko makubwa. Kuendelea kutumia huduma ni kukubali masharti mapya.',
            },
          ],
        },
      ],
    },
    en: {
      nav: 'Terms of use',
      title: 'Terms of Use | Harusi Pass',
      description:
        'Terms for using Harusi Pass: accounts, host responsibilities, messages, contribution payments, gate agents, limits of liability and changes.',
      h1: 'Terms of use',
      answer:
        'By using Harusi Pass you accept these terms. The host is responsible for the guest list and the messages they send, contributions are paid through approved payment providers, and the service is in a pilot and provided as is.',
      sections: [
        {
          id: 'accept',
          h2: 'Accepting the terms',
          blocks: [
            {
              t: 'p',
              text: 'By signing in or using Harusi Pass you accept these terms and the privacy policy. If you do not, do not use the service. Guests who open a card do not need to accept the host’s terms, but the privacy policy covers them.',
            },
          ],
        },
        {
          id: 'account',
          h2: 'Accounts',
          blocks: [
            {
              t: 'p',
              text: 'Hosts and committee members sign in with a phone number and an SMS code. You are responsible for everything done through your account. Do not let anyone else use your code.',
            },
          ],
        },
        {
          id: 'host',
          h2: 'Host responsibilities',
          blocks: [
            {
              t: 'ul',
              items: [
                'Add only people you know and who it is right to invite.',
                'Make sure you have the right to use the phone numbers you add.',
                'Give accurate details of the event, committee and contact number.',
                'Respect guests’ requests to stop reminders or be deleted.',
              ],
            },
          ],
        },
        {
          id: 'messages',
          h2: 'Messages',
          blocks: [
            {
              t: 'p',
              text: 'Send invitations only to people you know. Do not use the service for advertising, scam messages or anything unlawful. SMS costs are shown before sending, and you are responsible for them once charging starts. We may block messages that look like misuse.',
            },
          ],
        },
        {
          id: 'payments',
          h2: 'Contribution payments',
          blocks: [
            {
              t: 'p',
              text: 'Contributions are paid through approved payment providers. Harusi Pass is not a bank or a mobile money provider and does not store payment PINs. A contribution is between the guest and the host. How the committee receives funds, fees and refunds will be set out here before real payments begin.',
            },
          ],
        },
        {
          id: 'gate',
          h2: 'Gate agents',
          blocks: [
            {
              t: 'p',
              text: 'The host gives gate agents a link and a PIN. Do not share the PIN. The host can remove gate links at any time, and every step is logged. Gate agents cannot see money details.',
            },
          ],
        },
        {
          id: 'use',
          h2: 'Acceptable use',
          blocks: [
            {
              t: 'p',
              text: 'All use must follow the acceptable use page. If we see a breach we may suspend an account or event.',
            },
          ],
        },
        {
          id: 'ip',
          h2: 'Ownership of content',
          blocks: [
            {
              t: 'p',
              text: 'Guest lists and card text are yours. You give us permission to use them as needed to run the service. The Harusi Pass name, design and software are ours.',
            },
          ],
        },
        {
          id: 'availability',
          h2: 'Availability',
          blocks: [
            {
              t: 'p',
              text: 'The service is in a pilot. We work to keep it available but do not promise it will never fail. For important events, test the gate before the day and keep a fallback list.',
            },
          ],
        },
        {
          id: 'liability',
          h2: 'Limits of liability',
          blocks: [
            {
              t: 'p',
              text: 'The service is provided as is during the pilot. To the extent the law allows, we are not liable for indirect loss. The liability cap and any indemnity terms will be set by a lawyer.',
            },
          ],
        },
        {
          id: 'law',
          h2: 'Governing law',
          blocks: [
            {
              t: 'p',
              text: 'These terms are governed by the laws of Tanzania. The courts that hear disputes and the company details will be added by a lawyer.',
            },
          ],
        },
        {
          id: 'changes',
          h2: 'Changes to the terms',
          blocks: [
            {
              t: 'p',
              text: 'If we change the terms we will update the date above and tell hosts of significant changes. Continuing to use the service means accepting the new terms.',
            },
          ],
        },
      ],
    },
  },
  {
    slug: 'cookies',
    group: 'legal',
    schema: 'WebPage',
    draft: true,
    updated: UPDATED,
    related: ['privacy', 'terms', 'ombi-la-data', 'usalama-wa-kadi-za-mtandaoni'],
    sw: {
      nav: 'Vidakuzi na hifadhi ya kifaa',
      title: 'Sera ya Vidakuzi na Hifadhi ya Kifaa | Harusi Pass',
      description:
        'Harusi Pass inatumia kidakuzi cha lugha na hifadhi ya kifaa kwa kadi kuonekana bila mtandao. Hatutumii vidakuzi vya matangazo wala vya uchanganuzi.',
      h1: 'Vidakuzi na hifadhi ya kifaa',
      answer:
        'Harusi Pass inatumia kidakuzi kimoja cha lugha na hifadhi ya kivinjari ili kadi yako ionekane bila mtandao. Kwa sasa hatutumii vidakuzi vya matangazo wala vya uchanganuzi, kwa hiyo hakuna bango la kukubali vidakuzi.',
      sections: [
        {
          id: 'orodha',
          h2: 'Kinachohifadhiwa kwenye kifaa chako',
          blocks: [
            {
              t: 'table',
              head: ['Jina au aina', 'Kwa nini', 'Muda'],
              rows: [
                [
                  'NEXT_LOCALE (kidakuzi)',
                  'Kukumbuka lugha uliyochagua (Kiswahili au Kiingereza)',
                  'Mwaka 1',
                ],
                [
                  'Hifadhi ya kivinjari ya kadi',
                  'Kuonyesha kadi yako, QR na namba bila mtandao; kuhifadhi jibu lako hadi litumwe',
                  'Hadi ufute data ya kivinjari au kadi ibadilishwe',
                ],
                [
                  'Hifadhi ya kikao cha kuingia',
                  'Kukuweka umeingia unapotumia programu ya mwenyeji, na kukumbuka namba wakati wa kuthibitisha',
                  'Muda wa kikao',
                ],
                [
                  'Kache ya huduma ya mtandaoni (service worker)',
                  'Kufanya kadi ifunguke haraka na bila mtandao',
                  'Hadi ifutwe au ibadilishwe',
                ],
              ],
            },
          ],
        },
        {
          id: 'hatutumii',
          h2: 'Tusichotumia',
          blocks: [
            {
              t: 'ul',
              items: [
                'Vidakuzi vya matangazo au vya kukufuatilia kwenye tovuti nyingine.',
                'Zana za uchanganuzi zinazotuma data kwa makampuni ya nje (kwa sasa).',
              ],
            },
            {
              t: 'p',
              text: 'Tukianza kutumia uchanganuzi wa kupima ukurasa, tutasasisha ukurasa huu na kuomba ridhaa kama sheria inavyohitaji.',
            },
          ],
        },
        {
          id: 'dhibiti',
          h2: 'Jinsi ya kudhibiti',
          blocks: [
            {
              t: 'p',
              text: 'Unaweza kufuta vidakuzi na data ya tovuti kwenye mipangilio ya kivinjari chako. Ukifuta hifadhi ya kadi, utahitaji mtandao kuifungua tena, na jibu lisilotumwa litapotea.',
            },
          ],
        },
      ],
    },
    en: {
      nav: 'Cookies and device storage',
      title: 'Cookies and Device Storage Policy | Harusi Pass',
      description:
        'Harusi Pass uses a language cookie and browser storage so your card shows offline. We do not use advertising or analytics cookies.',
      h1: 'Cookies and device storage',
      answer:
        'Harusi Pass uses one language cookie and browser storage so your card shows offline. We do not currently use advertising or analytics cookies, so there is no cookie consent banner.',
      sections: [
        {
          id: 'list',
          h2: 'What is stored on your device',
          blocks: [
            {
              t: 'table',
              head: ['Name or type', 'Why', 'How long'],
              rows: [
                [
                  'NEXT_LOCALE (cookie)',
                  'Remembers the language you chose (Swahili or English)',
                  '1 year',
                ],
                [
                  'Browser storage for the card',
                  'Shows your card, QR and number offline; keeps your reply until it is sent',
                  'Until you clear browser data or the card changes',
                ],
                [
                  'Sign-in session storage',
                  'Keeps a host signed in, and remembers the number during verification',
                  'For the session',
                ],
                [
                  'Service worker cache',
                  'Makes the card open fast and offline',
                  'Until cleared or replaced',
                ],
              ],
            },
          ],
        },
        {
          id: 'not',
          h2: 'What we do not use',
          blocks: [
            {
              t: 'ul',
              items: [
                'Advertising cookies or cookies that track you across other sites.',
                'Analytics tools that send data to outside companies (currently).',
              ],
            },
            {
              t: 'p',
              text: 'If we start page analytics we will update this page and ask for consent as the law requires.',
            },
          ],
        },
        {
          id: 'control',
          h2: 'How to control it',
          blocks: [
            {
              t: 'p',
              text: 'You can delete cookies and site data in your browser settings. If you clear a card’s storage you will need network to open it again, and an unsent reply will be lost.',
            },
          ],
        },
      ],
    },
  },
  {
    slug: 'ombi-la-data',
    group: 'legal',
    schema: 'WebPage',
    draft: true,
    updated: UPDATED,
    related: ['privacy', 'cookies', 'mawasiliano', 'terms'],
    sw: {
      nav: 'Maombi ya data',
      title: 'Ombi la Data: Pata Nakala au Futa Taarifa Zako | Harusi Pass',
      description:
        'Jinsi ya kuomba nakala ya taarifa zako, kuzisahihisha au kuzifuta kutoka Harusi Pass. Mgeni au mwenyeji, na muda tunaochukua kujibu.',
      h1: 'Maombi ya data: nakala, usahihishaji na kufuta',
      answer:
        'Mgeni au mwenyeji anaweza kuomba nakala ya taarifa zake, kuzisahihisha au kuzifuta. Andika kwa faragha@harusipass.co.tz au mwombe mwenyeji wa tukio. Tunathibitisha kuwa ni wewe, kisha tunatekeleza ndani ya siku 30.',
      sections: [
        {
          id: 'nani',
          h2: 'Nani anaweza kuomba',
          blocks: [
            {
              t: 'ul',
              items: [
                'Mgeni aliyealikwa kwenye tukio lolote kupitia Harusi Pass.',
                'Mwenyeji au mwanakamati mwenye akaunti.',
              ],
            },
          ],
        },
        {
          id: 'njia',
          h2: 'Jinsi ya kuomba',
          blocks: [
            {
              t: 'ol',
              items: [
                'Andika barua pepe kwa faragha@harusipass.co.tz. Eleza unachotaka: nakala, usahihishaji au kufuta.',
                'Taja jina lako, namba ya simu iliyotumika kukualika, na jina la tukio au mwenyeji.',
                'Tutakuuliza uthibitisho mdogo, kwa mfano kutuma namba kwenye simu hiyo, ili kuhakikisha ni wewe.',
                'Tunajibu na kutekeleza ndani ya siku 30.',
              ],
            },
            {
              t: 'p',
              text: 'Pia unaweza kumwomba mwenyeji wa tukio. Mwenyeji anaweza kupakua au kufuta data ya mgeni moja kwa moja kutoka kwenye programu.',
            },
          ],
        },
        {
          id: 'kinachotokea',
          h2: 'Kinachotokea ukiomba kufutwa',
          blocks: [
            {
              t: 'ul',
              items: [
                'Jina, namba ya simu na maelezo yako huondolewa kwenye orodha ya mgeni.',
                'Kadi yako ya zamani inakoma kufanya kazi.',
                'Kiasi cha malipo kinabaki bila taarifa zinazokutambulisha, kwa ajili ya hesabu za tukio.',
                'Mwenyeji anaweza kuhitaji kukuingiza tena ukialikwa upya.',
              ],
            },
          ],
        },
        {
          id: 'vikumbusho',
          h2: 'Kuacha tu vikumbusho',
          blocks: [
            {
              t: 'p',
              text: 'Ukitaka kuacha vikumbusho pekee, tumia kitufe cha “Acha kunikumbusha” kilicho chini ya kadi yako. Mwaliko wako unabaki.',
            },
          ],
        },
        {
          id: 'malalamiko',
          h2: 'Kama hujaridhika',
          blocks: [
            {
              t: 'p',
              text: 'Una haki ya kulalamika kwa mamlaka ya ulinzi wa taarifa binafsi ya Tanzania. Maelezo ya mamlaka hiyo yatathibitishwa na mwanasheria na kuwekwa hapa.',
            },
          ],
        },
      ],
    },
    en: {
      nav: 'Data requests',
      title: 'Data Request: Get a Copy or Delete Your Information | Harusi Pass',
      description:
        'How to ask for a copy of your information, correct it or delete it from Harusi Pass, as a guest or a host, and how long we take to respond.',
      h1: 'Data requests: copy, correction and deletion',
      answer:
        'A guest or host can ask for a copy of their information, ask for it to be corrected, or ask for it to be deleted. Email faragha@harusipass.co.tz or ask the event host. We check it is you, then act within 30 days.',
      sections: [
        {
          id: 'who',
          h2: 'Who can ask',
          blocks: [
            {
              t: 'ul',
              items: [
                'A guest invited to any event through Harusi Pass.',
                'A host or committee member with an account.',
              ],
            },
          ],
        },
        {
          id: 'how',
          h2: 'How to ask',
          blocks: [
            {
              t: 'ol',
              items: [
                'Email faragha@harusipass.co.tz. Say what you want: a copy, a correction or deletion.',
                'Give your name, the phone number the invitation was sent to, and the event or host name.',
                'We will ask for light verification, such as sending a code to that phone, to confirm it is you.',
                'We respond and act within 30 days.',
              ],
            },
            {
              t: 'p',
              text: 'You can also ask the event host. A host can download or delete a guest’s data directly from the app.',
            },
          ],
        },
        {
          id: 'happens',
          h2: 'What happens when you ask to be deleted',
          blocks: [
            {
              t: 'ul',
              items: [
                'Your name, phone number and notes are removed from the guest list.',
                'Your old card stops working.',
                'Payment amounts stay without anything identifying you, for the event’s accounts.',
                'The host may need to add you again if you are invited again.',
              ],
            },
          ],
        },
        {
          id: 'reminders',
          h2: 'Stopping reminders only',
          blocks: [
            {
              t: 'p',
              text: 'If you only want to stop reminders, use the “Stop reminders” button at the bottom of your card. Your invitation stays.',
            },
          ],
        },
        {
          id: 'complaints',
          h2: 'If you are not satisfied',
          blocks: [
            {
              t: 'p',
              text: 'You have the right to complain to Tanzania’s data protection authority. The authority’s details will be confirmed by a lawyer and added here.',
            },
          ],
        },
      ],
    },
  },
  {
    slug: 'matumizi-yanayokubalika',
    group: 'legal',
    schema: 'WebPage',
    draft: true,
    updated: UPDATED,
    related: ['terms', 'privacy', 'usalama-wa-kadi-za-mtandaoni', 'mawasiliano'],
    sw: {
      nav: 'Matumizi yanayokubalika',
      title: 'Matumizi Yanayokubalika | Harusi Pass',
      description:
        'Sheria za kutumia Harusi Pass kwa heshima: bila ulaghai, bila matangazo, bila kuiga mtu, na kwa watu unaowafahamu tu.',
      h1: 'Matumizi yanayokubalika',
      answer:
        'Tumia Harusi Pass kualika watu unaowafahamu kwenye tukio la kweli. Usitumie kutuma matangazo, kutapeli, kuiga mtu mwingine, au kukusanya pesa kwa udanganyifu. Tukiona ukiukaji tunaweza kusimamisha akaunti au tukio.',
      sections: [
        {
          id: 'inaruhusiwa',
          h2: 'Kinachoruhusiwa',
          blocks: [
            {
              t: 'ul',
              items: [
                'Kualika ndugu, jamaa na marafiki kwenye harusi, send-off, uchumba au sherehe ya faragha.',
                'Kupokea majibu na michango ya hiari kwa tukio hilo.',
                'Kuwapa walinda lango ufikiaji wa kuingiza wageni.',
              ],
            },
          ],
        },
        {
          id: 'hairuhusiwi',
          h2: 'Kisichoruhusiwa',
          blocks: [
            {
              t: 'ul',
              items: [
                'Kutuma ujumbe wa matangazo au barua taka.',
                'Kuiga mtu au shirika, au kutumia jina la kamati isiyo yako.',
                'Kuomba pesa kwa udanganyifu, kutumia tukio la uongo, au kukusanya malipo kwa madhumuni mengine.',
                'Kuingiza namba za watu usiowafahamu au ambao hawakukubali kuwasiliana nao.',
                'Maudhui ya chuki, vitisho, unyanyasaji au yanayokiuka sheria.',
                'Kujaribu kuvunja usalama, kukwepa vikomo vya mfumo, au kuvuna data za wengine.',
                'Kuuza tena au kutumia huduma kwa matukio ya watu wengine bila makubaliano.',
              ],
            },
          ],
        },
        {
          id: 'hatua',
          h2: 'Tunachofanya tukiona ukiukaji',
          blocks: [
            {
              t: 'ol',
              items: [
                'Tunaweza kusimamisha utumaji ujumbe au kuficha kadi za tukio.',
                'Tunaweza kusimamisha akaunti, na tunarekodi sababu.',
                'Kwa makosa makubwa tunaweza kuripoti kwa mamlaka husika.',
              ],
            },
            { t: 'p', text: 'Ukiona matumizi mabaya, tuandikie kupitia ukurasa wa mawasiliano.' },
          ],
        },
      ],
    },
    en: {
      nav: 'Acceptable use',
      title: 'Acceptable Use Policy | Harusi Pass',
      description:
        'Rules for using Harusi Pass respectfully: no scams, no advertising, no impersonation, and only for people you know.',
      h1: 'Acceptable use',
      answer:
        'Use Harusi Pass to invite people you know to a real event. Do not use it to send advertising, scam, impersonate someone, or collect money deceptively. If we see a breach we may suspend an account or event.',
      sections: [
        {
          id: 'allowed',
          h2: 'What is allowed',
          blocks: [
            {
              t: 'ul',
              items: [
                'Inviting relatives and friends to a wedding, send-off, engagement or private celebration.',
                'Receiving replies and voluntary contributions for that event.',
                'Giving gate agents access to admit guests.',
              ],
            },
          ],
        },
        {
          id: 'not',
          h2: 'What is not allowed',
          blocks: [
            {
              t: 'ul',
              items: [
                'Sending advertising or spam.',
                'Impersonating a person or organisation, or using a committee name that is not yours.',
                'Asking for money deceptively, using a fake event, or collecting payments for other purposes.',
                'Adding numbers of people you do not know or who have not agreed to be contacted.',
                'Hateful, threatening, abusive or unlawful content.',
                'Trying to break security, bypass limits or harvest other people’s data.',
                'Reselling or using the service for others’ events without an agreement.',
              ],
            },
          ],
        },
        {
          id: 'action',
          h2: 'What we do if we see a breach',
          blocks: [
            {
              t: 'ol',
              items: [
                'We may stop message sending or hide an event’s cards.',
                'We may suspend an account, and we record the reason.',
                'For serious cases we may report to the relevant authority.',
              ],
            },
            { t: 'p', text: 'If you see misuse, tell us through the contact page.' },
          ],
        },
      ],
    },
  },
];
