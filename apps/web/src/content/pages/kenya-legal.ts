import type { ContentPageDef } from '../types';

const UPDATED = '2026-10-15';

/**
 * Kenyan legal drafts. They describe what the product does and what Kenya's Data Protection Act, 2019
 * asks of us as far as we can tell, and mark every point a Kenyan lawyer must confirm. Nothing here claims
 * that registration, a licence or a provider agreement already exists.
 */
export const KENYA_LEGAL_PAGES: ContentPageDef[] = [
  {
    market: 'ke',
    counterpart: { market: 'tz', slug: 'privacy' },
    slug: 'privacy',
    group: 'legal',
    schema: 'WebPage',
    draft: true,
    updated: UPDATED,
    related: ['data-requests', 'terms', 'tz:cookies', 'is-a-digital-wedding-invitation-safe'],
    en: {
      nav: 'Privacy policy (Kenya)',
      title: 'Privacy Policy for Kenya | Harusi Pass',
      description:
        'How Harusi Pass handles personal data for events in Kenya under the Data Protection Act, 2019: what we collect, who decides, sharing, retention, your rights and the ODPC.',
      h1: 'Privacy policy for Kenya',
      answer:
        'Harusi Pass collects the minimum needed to send invitations, receive replies and contributions, and admit guests. We do not sell data or use advertising. You can ask for a copy, a correction or deletion, and you can complain to the Office of the Data Protection Commissioner (ODPC). Kenya is not yet open for use.',
      sections: [
        {
          id: 'who',
          h2: 'Who decides what happens to the data',
          blocks: [
            {
              t: 'p',
              text: 'For guest information, the host of the event decides who is invited and why, so the host is the data controller and Harusi Pass processes it on the host’s behalf as a data processor. For the accounts of hosts and committee members, Harusi Pass is the controller. Company registration details and address will be added here before launch.',
            },
            {
              t: 'note',
              text: 'Registration: Kenya’s Data Protection Act, 2019 requires controllers and processors of personal data of people in Kenya to register with the ODPC unless an exemption applies, including where the organisation is outside Kenya. Before Kenya opens we will confirm with counsel whether we must register, complete it, and state the registration here. We have not registered yet.',
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
                  'Name, phone number, role in the event, records of important actions such as recording a payment',
                ],
                [
                  'Guests (entered by the host)',
                  'Name, phone number if any, group, number of people allowed, language, host notes',
                ],
                [
                  'A guest using their card',
                  'Reply, party size, request to stop reminders, pledges and payments (amount, mobile-money provider, payment phone number)',
                ],
                [
                  'At the gate',
                  'Card scans: time, gate, result, and who admitted a guest manually',
                ],
                [
                  'Messages',
                  'Status of the SMS or WhatsApp message sent (sent, delivered, failed)',
                ],
              ],
            },
          ],
        },
        {
          id: 'use',
          h2: 'How we use it and on what basis',
          blocks: [
            {
              t: 'ul',
              items: [
                'To send cards and reminders and show status to the committee.',
                'To receive and record contributions and payments.',
                'To confirm entry at the gate and stop a card being used twice.',
                'To prevent misuse and protect the service.',
              ],
            },
            {
              t: 'p',
              text: 'We do not sell data or share it with advertisers. The legal basis for each use (consent, performance of a contract, legitimate interest or a legal obligation) will be confirmed by a Kenyan lawyer before launch.',
            },
          ],
        },
        {
          id: 'sharing',
          h2: 'Who else sees it',
          blocks: [
            {
              t: 'p',
              text: 'To deliver cards and confirm payments we use SMS and WhatsApp messaging providers, a mobile-money payment provider (for M-Pesa and Airtel Money), and servers that store data. They receive only what the job needs and may not use it for anything else. Payments are collected by the payment provider; Harusi Pass does not hold the money and never sees or stores a PIN.',
            },
            {
              t: 'note',
              text: 'Where our servers and providers are located, and any transfer of personal data outside Kenya, will be stated here before launch. The Act sets conditions for transfers abroad (safeguards, consent or another allowed ground); counsel must confirm which applies.',
            },
          ],
        },
        {
          id: 'keep',
          h2: 'How long we keep it',
          blocks: [
            {
              t: 'p',
              text: 'Event data stays until the host deletes it or asks us to. When an account deletion is requested, we delete the account and its events within 30 days. When a guest is erased, their name, phone and notes are removed; payment amounts stay without anything that identifies the person, for the event’s accounts. A maximum retention period after an event ends will be set with counsel.',
            },
          ],
        },
        {
          id: 'messages',
          h2: 'Messages we send',
          blocks: [
            {
              t: 'p',
              text: 'Invitations and reminders are sent only to numbers the host entered for their own event. A guest can stop reminders with the button at the bottom of their card, and can ask the host or us to remove their details. Sender IDs, sending hours and consent rules for SMS in Kenya will be confirmed with counsel and the SMS provider before launch.',
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
                'To be told what we hold about you and get a copy.',
                'To have inaccurate information corrected.',
                'To object to certain uses and to ask for deletion.',
                'To receive your data in a usable form where the law allows.',
                'To complain to the Office of the Data Protection Commissioner (ODPC).',
              ],
            },
            { t: 'p', text: 'How to ask is on the data requests page.' },
          ],
        },
        {
          id: 'security',
          h2: 'Security and breaches',
          blocks: [
            {
              t: 'p',
              text: 'Card links are unique and cannot be guessed; we store hashed forms for verification plus an encrypted copy needed to resend the link. The keys used to sign QR codes are encrypted on the server. We never ask guests for a password, PIN or OTP. If we find a breach that puts people at risk we will notify the ODPC and those affected as the Act requires (the notification period, which we understand to be short, is to be confirmed by counsel).',
            },
          ],
        },
        {
          id: 'children',
          h2: 'Children',
          blocks: [
            {
              t: 'p',
              text: 'The service is for adult hosts. We do not target children. Hosts are responsible for details of any children they add, and the Act’s extra requirements for children’s data apply to them and to us.',
            },
          ],
        },
        {
          id: 'contact',
          h2: 'Contact',
          blocks: [
            {
              t: 'p',
              text: 'Privacy questions: faragha@harusipass.co.tz. Cookies and device storage work as described on the cookies page.',
            },
          ],
        },
      ],
    },
    sw: {
      nav: 'Sera ya faragha (Kenya)',
      title: 'Sera ya Faragha kwa Kenya | Harusi Pass',
      description:
        'Jinsi Harusi Pass inavyoshughulikia data binafsi kwa matukio ya Kenya chini ya Sheria ya Ulinzi wa Data ya 2019: tunachokusanya, nani anaamua, kushiriki, muda na haki zako.',
      h1: 'Sera ya faragha kwa Kenya',
      answer:
        'Harusi Pass inakusanya kiwango cha chini kinachohitajika kutuma mialiko, kupokea majibu na michango, na kuingiza wageni. Hatuuzi data wala hatutumii matangazo. Unaweza kuomba nakala, marekebisho au kufutwa, na unaweza kulalamika kwa Ofisi ya Kamishna wa Ulinzi wa Data (ODPC). Kenya bado haijafunguliwa.',
      sections: [
        {
          id: 'who',
          h2: 'Nani anaamua kuhusu data',
          blocks: [
            {
              t: 'p',
              text: 'Kwa taarifa za wageni, mwenyeji wa tukio anaamua ni nani aalikwe na kwa nini, kwa hiyo ndiye mdhibiti wa data; Harusi Pass inazishughulikia kwa niaba yake kama mchakataji. Kwa akaunti za wenyeji na kamati, Harusi Pass ndiye mdhibiti. Maelezo ya usajili wa kampuni na anwani yatawekwa hapa kabla ya uzinduzi.',
            },
            {
              t: 'note',
              text: 'Usajili: Sheria ya Ulinzi wa Data ya Kenya ya 2019 inawataka wadhibiti na wachakataji wa data za watu walio Kenya kujisajili na ODPC isipokuwa kama wamesamehewa, hata wakiwa nje ya Kenya. Kabla Kenya haijafunguliwa tutathibitisha na mwanasheria kama tunapaswa kusajili, tutasajili, na tutaeleza hali hapa. Bado hatujasajili.',
            },
          ],
        },
        {
          id: 'collect',
          h2: 'Tunachokusanya',
          blocks: [
            {
              t: 'table',
              head: ['Kutoka kwa', 'Taarifa'],
              rows: [
                [
                  'Mwenyeji na kamati',
                  'Jina, namba ya simu, jukumu kwenye tukio, kumbukumbu za vitendo muhimu kama kurekodi malipo',
                ],
                [
                  'Wageni (wanaingizwa na mwenyeji)',
                  'Jina, namba ya simu ikiwa ipo, kikundi, idadi ya watu wanaoruhusiwa, lugha, maelezo ya mwenyeji',
                ],
                [
                  'Mgeni anapotumia kadi',
                  'Jibu, idadi ya watu, ombi la kuacha vikumbusho, ahadi na malipo (kiasi, mtoa huduma wa pesa za simu, namba ya malipo)',
                ],
                ['Langoni', 'Kuskaniwa kwa kadi: saa, lango, matokeo, na aliyeingiza kwa mkono'],
                [
                  'Ujumbe',
                  'Hali ya SMS au ujumbe wa WhatsApp uliotumwa (umetumwa, umefika, umeshindwa)',
                ],
              ],
            },
          ],
        },
        {
          id: 'use',
          h2: 'Tunavyotumia na kwa msingi gani',
          blocks: [
            {
              t: 'ul',
              items: [
                'Kutuma kadi na vikumbusho na kuonyesha hali kwa kamati.',
                'Kupokea na kurekodi michango na malipo.',
                'Kuthibitisha kuingia langoni na kuzuia kadi kutumika mara mbili.',
                'Kuzuia matumizi mabaya na kulinda huduma.',
              ],
            },
            {
              t: 'p',
              text: 'Hatuuzi data wala kuishiriki na watangazaji. Msingi wa kisheria wa kila matumizi (ridhaa, utekelezaji wa mkataba, maslahi halali au wajibu wa kisheria) utathibitishwa na mwanasheria wa Kenya kabla ya uzinduzi.',
            },
          ],
        },
        {
          id: 'sharing',
          h2: 'Nani mwingine anaona',
          blocks: [
            {
              t: 'p',
              text: 'Ili kufikisha kadi na kuthibitisha malipo tunatumia watoa huduma wa SMS na WhatsApp, mtoa huduma wa malipo ya pesa za simu (kwa M-Pesa na Airtel Money), na seva za kuhifadhi data. Wanapokea tu kinachohitajika na hawaruhusiwi kukitumia kwa shughuli nyingine. Malipo yanakusanywa na mtoa huduma wa malipo; Harusi Pass haishiki pesa na haioni wala kuhifadhi PIN.',
            },
            {
              t: 'note',
              text: 'Mahali seva na watoa huduma walipo, na uhamishaji wowote wa data binafsi nje ya Kenya, vitaelezwa hapa kabla ya uzinduzi. Sheria inaweka masharti ya uhamishaji nje (ulinzi, ridhaa au msingi mwingine); mwanasheria athibitishe lipi linatumika.',
            },
          ],
        },
        {
          id: 'keep',
          h2: 'Tunahifadhi kwa muda gani',
          blocks: [
            {
              t: 'p',
              text: 'Data za tukio zinabaki hadi mwenyeji azifute au aombe zifutwe. Ombi la kufuta akaunti likipokelewa, tunafuta akaunti na matukio yake ndani ya siku 30. Mgeni akifutwa, jina, simu na maelezo yake huondolewa; kiasi cha malipo kinabaki bila kinachomtambulisha mtu, kwa hesabu za tukio. Muda wa juu wa kuhifadhi baada ya tukio utawekwa pamoja na mwanasheria.',
            },
          ],
        },
        {
          id: 'messages',
          h2: 'Ujumbe tunaotuma',
          blocks: [
            {
              t: 'p',
              text: 'Mialiko na vikumbusho vinatumwa tu kwa namba alizoingiza mwenyeji kwa tukio lake. Mgeni anaweza kuacha vikumbusho kwa kitufe kilicho chini ya kadi yake, na anaweza kumwomba mwenyeji au sisi tuondoe taarifa zake. Majina ya watumaji, saa za kutuma na sheria za ridhaa kwa SMS Kenya zitathibitishwa na mwanasheria na mtoa huduma wa SMS kabla ya uzinduzi.',
            },
          ],
        },
        {
          id: 'rights',
          h2: 'Haki zako',
          blocks: [
            {
              t: 'ul',
              items: [
                'Kujulishwa tunachoshikilia kukuhusu na kupata nakala.',
                'Kusahihishwa kwa taarifa zisizo sahihi.',
                'Kupinga matumizi fulani na kuomba kufutwa.',
                'Kupokea data yako kwa muundo unaotumika pale sheria inaporuhusu.',
                'Kulalamika kwa Ofisi ya Kamishna wa Ulinzi wa Data (ODPC).',
              ],
            },
            { t: 'p', text: 'Jinsi ya kuomba iko kwenye ukurasa wa maombi ya data.' },
          ],
        },
        {
          id: 'security',
          h2: 'Usalama na uvujaji',
          blocks: [
            {
              t: 'p',
              text: 'Viungo vya kadi ni vya kipekee na havitabiriki; tunahifadhi alama za kificho kwa ajili ya kuhakiki pamoja na nakala iliyosimbwa inayohitajika kutuma tena kiungo. Funguo za kusaini QR zimesimbwa kwenye seva. Hatuombi nenosiri, PIN wala OTP kutoka kwa wageni. Tukigundua uvujaji unaohatarisha watu tutaijulisha ODPC na walioathirika kama Sheria inavyohitaji (muda wa kujulisha, tunaoelewa kuwa mfupi, uthibitishwe na mwanasheria).',
            },
          ],
        },
        {
          id: 'children',
          h2: 'Watoto',
          blocks: [
            {
              t: 'p',
              text: 'Huduma ni ya wenyeji wazima. Hatuwalengi watoto. Wenyeji wanawajibika kwa taarifa za watoto wanaowaingiza, na masharti ya ziada ya Sheria kuhusu data za watoto yanawahusu wao na sisi.',
            },
          ],
        },
        {
          id: 'contact',
          h2: 'Mawasiliano',
          blocks: [
            {
              t: 'p',
              text: 'Maswali ya faragha: faragha@harusipass.co.tz. Vidakuzi na hifadhi ya kifaa vinafanya kazi kama ilivyoelezwa kwenye ukurasa wa vidakuzi.',
            },
          ],
        },
      ],
    },
  },
  {
    market: 'ke',
    counterpart: { market: 'tz', slug: 'terms' },
    slug: 'terms',
    group: 'legal',
    schema: 'WebPage',
    draft: true,
    updated: UPDATED,
    related: ['privacy', 'data-requests', 'tz:matumizi-yanayokubalika', 'tz:cookies'],
    en: {
      nav: 'Terms of use (Kenya)',
      title: 'Terms of Use for Kenya | Harusi Pass',
      description:
        'Terms for using Harusi Pass for events in Kenya: accounts, host duties, messages, voluntary mobile-money contributions, no custody of funds, liability and governing law.',
      h1: 'Terms of use for Kenya',
      answer:
        'By using Harusi Pass you accept these terms and the privacy policy. The host is responsible for the guest list and messages. Contributions are voluntary and are paid through a mobile-money provider; Harusi Pass does not hold the money. The service for Kenya is not open yet and is provided as is.',
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
          h2: 'Host and committee responsibilities',
          blocks: [
            {
              t: 'ul',
              items: [
                'Add only people you know and who it is right to invite, and only numbers you have the right to use.',
                'Give accurate details of the event, the committee and a contact number.',
                'Respect guests’ requests to stop reminders or to be deleted.',
                'Keep contributions voluntary: do not make an invitation or a seat conditional on giving, and do not publish lists that shame people.',
                'Keep honest records and share accounts with the committee, as set out in our committee guide.',
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
              text: 'Send invitations only to people you know. Do not use the service for advertising, scam messages or anything unlawful. SMS costs are shown before sending and you are responsible for them once charging starts. Sender rules in Kenya may limit what and when we can send; we may block messages that look like misuse.',
            },
          ],
        },
        {
          id: 'payments',
          h2: 'Contributions and payments',
          blocks: [
            {
              t: 'p',
              text: 'Contributions are paid through an approved mobile-money provider using M-Pesa or Airtel Money, in Kenya shillings. Harusi Pass is not a bank or a mobile-money provider, does not hold or pay out funds, and never sees or stores a PIN. A contribution is between the guest and the host. The provider’s terms and fees apply. How committees receive funds, fees and refunds will be set out here before real payments begin.',
            },
            {
              t: 'note',
              text: 'Whether any part of this needs a licence or other authorisation in Kenya is for counsel to confirm before launch.',
            },
          ],
        },
        {
          id: 'gate',
          h2: 'Gate agents',
          blocks: [
            {
              t: 'p',
              text: 'The host gives gate agents a link and a PIN. Do not share the PIN. The host can remove gate links at any time and every step is logged. Gate agents cannot see money details.',
            },
          ],
        },
        {
          id: 'availability',
          h2: 'Availability',
          blocks: [
            {
              t: 'p',
              text: 'The service for Kenya is not open yet. When it opens it will be in a pilot, so we do not promise it will never fail. For important events, test the gate before the day and keep a fallback list.',
            },
          ],
        },
        {
          id: 'liability',
          h2: 'Limits of liability',
          blocks: [
            {
              t: 'p',
              text: 'The service is provided as is during the pilot. To the extent the law allows we are not liable for indirect loss. The liability cap and any indemnity terms will be set with counsel.',
            },
          ],
        },
        {
          id: 'law',
          h2: 'Governing law',
          blocks: [
            {
              t: 'p',
              text: 'For events in Kenya these terms are intended to be governed by the laws of Kenya. The courts that hear disputes and the company details will be added with counsel.',
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
    sw: {
      nav: 'Masharti ya matumizi (Kenya)',
      title: 'Masharti ya Matumizi kwa Kenya | Harusi Pass',
      description:
        'Masharti ya kutumia Harusi Pass kwa matukio ya Kenya: akaunti, wajibu wa mwenyeji, ujumbe, michango ya hiari kwa pesa za simu, kutoshika fedha, dhima na sheria inayotumika.',
      h1: 'Masharti ya matumizi kwa Kenya',
      answer:
        'Kwa kutumia Harusi Pass unakubali masharti haya na sera ya faragha. Mwenyeji anawajibika kwa orodha ya wageni na ujumbe. Michango ni ya hiari na inalipwa kupitia mtoa huduma wa pesa za simu; Harusi Pass haishiki pesa. Huduma kwa Kenya bado haijafunguliwa na inatolewa kama ilivyo.',
      sections: [
        {
          id: 'accept',
          h2: 'Kukubali masharti',
          blocks: [
            {
              t: 'p',
              text: 'Ukiingia au kutumia Harusi Pass unakubali masharti haya na sera ya faragha. Kama hukubali, usitumie huduma. Wageni wanaofungua kadi hawahitaji kukubali masharti ya mwenyeji, lakini sera ya faragha inawahusu.',
            },
          ],
        },
        {
          id: 'account',
          h2: 'Akaunti',
          blocks: [
            {
              t: 'p',
              text: 'Wenyeji na kamati wanaingia kwa namba ya simu na namba ya uthibitisho kwa SMS. Unawajibika kwa shughuli zote kwenye akaunti yako. Usimruhusu mtu mwingine atumie namba yako ya uthibitisho.',
            },
          ],
        },
        {
          id: 'host',
          h2: 'Wajibu wa mwenyeji na kamati',
          blocks: [
            {
              t: 'ul',
              items: [
                'Ingiza tu watu unaowafahamu na ambao ni sahihi kuwaalika, na namba ulizo na haki ya kuzitumia.',
                'Toa maelezo sahihi ya tukio, kamati na namba ya mawasiliano.',
                'Heshimu maombi ya wageni ya kuacha vikumbusho au kufutwa.',
                'Weka michango ya hiari: usifanye mwaliko au kiti kuwa na sharti la kutoa, na usichapishe orodha zinazowaaibisha watu.',
                'Weka kumbukumbu za kweli na ushiriki hesabu na kamati, kama ilivyo kwenye mwongozo wetu wa kamati.',
              ],
            },
          ],
        },
        {
          id: 'messages',
          h2: 'Ujumbe',
          blocks: [
            {
              t: 'p',
              text: 'Tuma mialiko kwa watu unaowafahamu tu. Usitumie huduma kwa matangazo, ujumbe wa ulaghai au kitu kinachokiuka sheria. Gharama za SMS zinaonyeshwa kabla ya kutuma na unawajibika nazo mara kutozwa kuanza. Sheria za watumaji Kenya zinaweza kupunguza tunachoweza kutuma na lini; tunaweza kuzuia ujumbe unaoonekana kuwa matumizi mabaya.',
            },
          ],
        },
        {
          id: 'payments',
          h2: 'Michango na malipo',
          blocks: [
            {
              t: 'p',
              text: 'Michango inalipwa kupitia mtoa huduma aliyeidhinishwa wa pesa za simu kwa M-Pesa au Airtel Money, kwa shilingi za Kenya. Harusi Pass si benki wala mtoa huduma wa pesa za simu, haishiki wala kulipa fedha, na haioni wala kuhifadhi PIN. Mchango upo kati ya mgeni na mwenyeji. Masharti na ada za mtoa huduma wa malipo zinatumika. Jinsi kamati zinavyopokea pesa, ada na marejesho vitaelezwa hapa kabla malipo halisi kuanza.',
            },
            {
              t: 'note',
              text: 'Kama sehemu yoyote ya hili inahitaji leseni au idhini nyingine nchini Kenya ni suala la mwanasheria kuthibitisha kabla ya uzinduzi.',
            },
          ],
        },
        {
          id: 'gate',
          h2: 'Walinda lango',
          blocks: [
            {
              t: 'p',
              text: 'Mwenyeji huwapa walinda lango kiungo na PIN. Usishiriki PIN. Mwenyeji anaweza kufuta viungo vya lango wakati wowote na kila hatua inarekodiwa. Walinda lango hawaoni taarifa za pesa.',
            },
          ],
        },
        {
          id: 'availability',
          h2: 'Upatikanaji',
          blocks: [
            {
              t: 'p',
              text: 'Huduma kwa Kenya bado haijafunguliwa. Itakapofunguliwa itakuwa kwenye majaribio, kwa hiyo hatuahidi kuwa haitakatika. Kwa matukio muhimu, jaribu lango kabla ya siku na uwe na orodha mbadala.',
            },
          ],
        },
        {
          id: 'liability',
          h2: 'Mipaka ya dhima',
          blocks: [
            {
              t: 'p',
              text: 'Huduma inatolewa kama ilivyo wakati wa majaribio. Kwa kiwango sheria inachoruhusu, hatuwajibiki kwa hasara zisizo za moja kwa moja. Kiwango cha juu cha dhima na masharti ya fidia vitawekwa pamoja na mwanasheria.',
            },
          ],
        },
        {
          id: 'law',
          h2: 'Sheria inayotumika',
          blocks: [
            {
              t: 'p',
              text: 'Kwa matukio ya Kenya masharti haya yanakusudiwa kutawaliwa na sheria za Kenya. Mahakama zitakazosikiliza migogoro na maelezo ya kampuni vitaongezwa pamoja na mwanasheria.',
            },
          ],
        },
        {
          id: 'changes',
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
  },
  {
    market: 'ke',
    counterpart: { market: 'tz', slug: 'ombi-la-data' },
    slug: 'data-requests',
    group: 'legal',
    schema: 'WebPage',
    draft: true,
    updated: UPDATED,
    related: ['privacy', 'terms', 'tz:cookies', ''],
    en: {
      nav: 'Data requests (Kenya)',
      title: 'Data Requests for Kenya: Copy, Correction or Deletion | Harusi Pass',
      description:
        'How to ask Harusi Pass for a copy of your information, to correct it or to delete it for events in Kenya, how we verify you, and how to complain to the ODPC.',
      h1: 'Data requests for Kenya: copy, correction and deletion',
      answer:
        'A guest or host can ask for a copy of their information, ask for it to be corrected, or ask for it to be deleted. Email faragha@harusipass.co.tz or ask the event host. We check it is you, then respond. You can also complain to the Office of the Data Protection Commissioner.',
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
                'Email faragha@harusipass.co.tz and say what you want: a copy, a correction or deletion.',
                'Give your name, the phone number the invitation was sent to, and the event or host name.',
                'We will ask for light verification, such as sending a code to that phone, to confirm it is you.',
                'We respond and act within the time the law allows.',
              ],
            },
            {
              t: 'p',
              text: 'You can also ask the event host. A host can download or delete a guest’s data from the app.',
            },
            {
              t: 'note',
              text: 'Kenya’s data protection rules set short response times. Our target, to be confirmed by counsel before launch, is 7 days to provide a copy and 14 days to correct or delete.',
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
                'Payment amounts stay without anything that identifies you, for the event’s accounts.',
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
              text: 'You have the right to complain to the Office of the Data Protection Commissioner (ODPC). Its contact details and how to file a complaint will be confirmed by counsel and added here.',
            },
          ],
        },
      ],
    },
    sw: {
      nav: 'Maombi ya data (Kenya)',
      title: 'Maombi ya Data kwa Kenya: Nakala, Marekebisho au Kufuta | Harusi Pass',
      description:
        'Jinsi ya kuomba Harusi Pass nakala ya taarifa zako, kuzisahihisha au kuzifuta kwa matukio ya Kenya, jinsi tunavyokuthibitisha, na jinsi ya kulalamika kwa ODPC.',
      h1: 'Maombi ya data kwa Kenya: nakala, marekebisho na kufuta',
      answer:
        'Mgeni au mwenyeji anaweza kuomba nakala ya taarifa zake, kuzisahihisha au kuzifuta. Andika kwa faragha@harusipass.co.tz au mwombe mwenyeji wa tukio. Tunathibitisha kuwa ni wewe, kisha tunajibu. Unaweza pia kulalamika kwa Ofisi ya Kamishna wa Ulinzi wa Data.',
      sections: [
        {
          id: 'who',
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
          id: 'how',
          h2: 'Jinsi ya kuomba',
          blocks: [
            {
              t: 'ol',
              items: [
                'Andika barua pepe kwa faragha@harusipass.co.tz na useme unachotaka: nakala, marekebisho au kufuta.',
                'Taja jina lako, namba ya simu iliyotumika kukualika, na jina la tukio au mwenyeji.',
                'Tutakuuliza uthibitisho mdogo, kwa mfano kutuma namba kwenye simu hiyo, ili kuhakikisha ni wewe.',
                'Tunajibu na kutekeleza ndani ya muda sheria inaporuhusu.',
              ],
            },
            {
              t: 'p',
              text: 'Unaweza pia kumwomba mwenyeji wa tukio. Mwenyeji anaweza kupakua au kufuta data ya mgeni kutoka kwenye programu.',
            },
            {
              t: 'note',
              text: 'Kanuni za ulinzi wa data za Kenya zinaweka muda mfupi wa kujibu. Lengo letu, litakalothibitishwa na mwanasheria kabla ya uzinduzi, ni siku 7 kutoa nakala na siku 14 kusahihisha au kufuta.',
            },
          ],
        },
        {
          id: 'happens',
          h2: 'Kinachotokea ukiomba kufutwa',
          blocks: [
            {
              t: 'ul',
              items: [
                'Jina, namba ya simu na maelezo yako huondolewa kwenye orodha ya wageni.',
                'Kadi yako ya zamani inakoma kufanya kazi.',
                'Kiasi cha malipo kinabaki bila kinachokutambulisha, kwa hesabu za tukio.',
                'Mwenyeji anaweza kuhitaji kukuingiza tena ukialikwa upya.',
              ],
            },
          ],
        },
        {
          id: 'reminders',
          h2: 'Kuacha tu vikumbusho',
          blocks: [
            {
              t: 'p',
              text: 'Ukitaka kuacha vikumbusho pekee, tumia kitufe cha “Acha kunikumbusha” kilicho chini ya kadi yako. Mwaliko wako unabaki.',
            },
          ],
        },
        {
          id: 'complaints',
          h2: 'Kama hujaridhika',
          blocks: [
            {
              t: 'p',
              text: 'Una haki ya kulalamika kwa Ofisi ya Kamishna wa Ulinzi wa Data (ODPC). Maelezo yake na jinsi ya kuwasilisha malalamiko yatathibitishwa na mwanasheria na kuwekwa hapa.',
            },
          ],
        },
      ],
    },
  },
];
