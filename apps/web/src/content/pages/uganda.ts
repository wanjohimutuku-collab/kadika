import type { ContentPageDef } from '../types';

const UPDATED = '2026-11-21';

/**
 * Uganda pages. Kadi Sasa is live as a pilot in Tanzania; Uganda support (+256 numbers, UGX, MTN MoMo
 * and Airtel Money) is planned and not open yet. These pages provide honest availability notes alongside
 * practical, answer-first guides for Kampala and Ugandan wedding/Kwanjula committees.
 */
export const UGANDA_PAGES: ContentPageDef[] = [
  {
    market: 'ug',
    slug: '',
    slugEn: '',
    group: 'product',
    schema: 'WebPage',
    updated: UPDATED,
    related: [
      'kwanjula-kuhingira-digital-invitation',
      'uganda-wedding-pledge-cards-guide',
      'uganda-wedding-committee-guide',
      'ecard-uganda-vs-paper',
    ],
    en: {
      nav: 'Uganda home',
      title: 'Digital Wedding & Kwanjula Invitations Uganda | Kadi Sasa',
      description:
        'How digital wedding and Kwanjula e-cards with WhatsApp delivery, pledge tracking and offline QR gate check-in work in Uganda, plus free committee guides.',
      h1: 'Digital e-cards for Ugandan weddings, Kwanjula and committees',
      answer:
        'Kadi Sasa gives each guest a personal digital e-card with RSVP, a unique QR code and a short card number, tracks pledges and verifies guests at the venue even without internet. It is live as a pilot in Tanzania; Uganda support is planned. The free guides here work with any tool.',
      sections: [
        {
          id: 'how',
          h2: 'How a digital e-card works for a Ugandan wedding or Kwanjula',
          blocks: [
            {
              t: 'ol',
              items: [
                'The couple or committee enters the guest list: name, +256 phone number, and number of seats allowed.',
                'Each guest receives their own e-card link via WhatsApp or SMS, while elders receive a printed card carrying the same QR and code.',
                'Guests confirm attendance on their phone without installing an app, giving caterers and decorators accurate numbers early.',
                'Pledges and contributions are recorded against each guest instead of getting buried in WhatsApp group chats.',
                'At the reception or Kwanjula tent, gate staff scan the QR code or enter the short card number—working offline if venue data drops.',
              ],
            },
          ],
        },
        {
          id: 'why-uganda',
          h2: 'Why digital invitations fit Ugandan celebrations',
          blocks: [
            {
              t: 'ul',
              items: [
                'Kwanjula, Kuhingira and church or nikah weddings involve large extended families across Kampala, Entebbe, Jinja, Mbarara and the diaspora.',
                'Wedding meetings rely on pledge cards and transparent treasurer reports in UGX.',
                'A hybrid setup lets younger guests and diaspora relatives use WhatsApp e-cards while elders still receive respectful printed cards.',
                'Outdoor tents and upcountry venues often have weak mobile data at check-in time.',
              ],
            },
          ],
        },
        {
          id: 'status',
          h2: 'Availability in Uganda',
          blocks: [
            {
              t: 'note',
              text: 'Kadi Sasa is currently live in pilot in Tanzania. Uganda support (+256 numbers, UGX pricing, Kampala time, and MTN MoMo / Airtel Money tracking workflows) is planned and not open yet. Use the contact page if you are a Kampala planner or committee interested in joining our Uganda pilot.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Can I use Kadi Sasa in Uganda today?',
          a: 'Not yet. Kadi Sasa is currently live in pilot in Tanzania, with Uganda support (+256, UGX) planned. Contact us if your committee or planning team wants early access when the Uganda pilot opens.',
        },
        {
          q: 'Does it work for Kwanjula and Kuhingira as well as church weddings?',
          a: 'Yes. Each ceremony can have its own guest list, wording, RSVP tracking, pledge ledger and gate check-in.',
        },
        {
          q: 'Can elders still get paper cards if we use digital e-cards?',
          a: 'Yes. Every digital card can be exported to print-ready PDFs with the exact same QR code and short number, so paper and WhatsApp cards share one gate list.',
        },
      ],
    },
    sw: {
      nav: 'Uganda',
      title: 'Kadi za Harusi na Kwanjula za Kidijitali Uganda | Kadi Sasa',
      description:
        'Jinsi kadi za kidijitali za harusi na Kwanjula zinavyofanya kazi Uganda kwa WhatsApp, ahadi na skani ya QR bila mtandao, pamoja na miongozo ya kamati.',
      h1: 'Kadi za kidijitali kwa harusi, Kwanjula na kamati za Uganda',
      answer:
        'Kadi Sasa humpa kila mgeni kadi yake ya kidijitali yenye RSVP, QR na namba fupi, hufuatilia ahadi na kuthibitisha wageni langoni hata bila mtandao. Huduma iko kwenye majaribio Tanzania; Uganda inapangwa. Miongozo ya bure hapa inafaa kwa zana yoyote.',
      sections: [
        {
          id: 'how',
          h2: 'Jinsi e-card inavyofanya kazi kwa harusi au Kwanjula Uganda',
          blocks: [
            {
              t: 'ol',
              items: [
                'Kamati inaweka orodha ya wageni: jina, namba ya +256 na idadi ya viti.',
                'Kila mgeni anapata kiungo chake kwa WhatsApp au SMS, na wazee wanapata kadi iliyochapishwa yenye QR ileile.',
                'Wageni wanathibitisha kuhudhuria kwenye simu bila kupakua programu.',
                'Ahadi na michango vinarekodiwa kwa kila mgeni badala ya kupotea kwenye magroup ya WhatsApp.',
                'Mlangoni, wahudumu wanaskani QR au kuandika namba fupi hata kama mtandao umekatika.',
              ],
            },
          ],
        },
        {
          id: 'why-uganda',
          h2: 'Kwa nini mialiko ya kidijitali inafaa sherehe za Uganda',
          blocks: [
            {
              t: 'ul',
              items: [
                'Kwanjula, Kuhingira na harusi zinahusisha familia kubwa Kampala, Jinja, Mbarara na ughaibuni.',
                'Vikao vya harusi vinahitaji ufuatiliaji wa wazi wa ahadi (pledge cards) kwa UGX.',
                'Mchanganyiko wa WhatsApp na karatasi unamfikia kila rika kwa heshima.',
                'Kumbi za nje mara nyingi zina mtandao dhaifu wakati wa kuingia wageni.',
              ],
            },
          ],
        },
        {
          id: 'status',
          h2: 'Upatikanaji nchini Uganda',
          blocks: [
            {
              t: 'note',
              text: 'Kadi Sasa sasa iko kwenye majaribio Tanzania. Msaada wa Uganda (+256, UGX, MTN MoMo na Airtel Money) unapangwa na bado haujafunguliwa. Wasiliana nasi kama ungependa kujiunga na majaribio ya kwanza Uganda.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Je, naweza kutumia Kadi Sasa Uganda leo?',
          a: 'Bado. Huduma iko kwenye majaribio Tanzania na Uganda (+256, UGX) inapangwa. Wasiliana nasi kama unataka taarifa ikifunguliwa.',
        },
        {
          q: 'Je, inafaa kwa Kwanjula na Kuhingira?',
          a: 'Ndiyo. Kila sherehe inaweza kuwa na orodha yake, maneno yake, ahadi na lango lake.',
        },
        {
          q: 'Je, wazee wanaweza kupata kadi za karatasi?',
          a: 'Ndiyo. Kila kadi inaweza kuchapishwa kwenye PDF ikiwa na QR ileile na namba fupi.',
        },
      ],
    },
  },
  {
    market: 'ug',
    slug: 'kwanjula-kuhingira-digital-invitation',
    slugEn: 'kwanjula-kuhingira-digital-invitation',
    group: 'guide',
    schema: 'Article',
    updated: UPDATED,
    related: [
      'uganda-wedding-pledge-cards-guide',
      'uganda-wedding-committee-guide',
      'ecard-uganda-vs-paper',
    ],
    en: {
      nav: 'Kwanjula & Kuhingira e-cards',
      title: 'Kwanjula & Kuhingira Digital Invitation Cards Uganda | Kadi Sasa',
      description:
        'How to design and send Kwanjula and Kuhingira digital e-cards in Uganda via WhatsApp, including wording templates, clan etiquette and hybrid cards for elders.',
      h1: 'Kwanjula and Kuhingira digital invitation cards in Uganda',
      answer:
        'A Kwanjula or Kuhingira digital invitation lets Ugandan families share ceremony details, dress themes and Google Maps directions instantly on WhatsApp while keeping printed cards for elders and clan heads. Personalised QR links prevent uninvited forwarding and give your catering team an accurate headcount.',
      sections: [
        {
          id: 'etiquette',
          h2: 'What to include on a Kwanjula or Kuhingira e-card',
          blocks: [
            {
              t: 'ul',
              items: [
                'Full names of the parents or guardians hosting the ceremony at the home.',
                'The bride and groom names, plus the clan or family greeting where appropriate.',
                'Exact date, arrival time (distinct from lunch/procession time), and venue directions or pin.',
                'Colour code or traditional attire note (gomesi, kanzu, mushanana) so guests match the decor.',
                'RSVP contact or committee coordinator phone number.',
              ],
            },
          ],
        },
        {
          id: 'wording',
          h2: 'Sample Kwanjula invitation wording',
          blocks: [
            {
              t: 'note',
              text: '“The family of Mr. & Mrs. Mukasa warmly invites you to the Kwanjula (Introduction Ceremony) of their daughter Namukasa Sarah to Kato Daniel on Saturday, 12 December 2026 at 10:00 AM in Gayaza, Wakiso. Dress code: Emerald & Gold. Please confirm your attendance via your personal link.”',
            },
          ],
        },
        {
          id: 'hybrid',
          h2: 'Using a hybrid digital + print approach',
          blocks: [
            {
              t: 'p',
              text: 'Send WhatsApp e-cards to friends, colleagues and relatives in the diaspora 4 to 6 weeks ahead, and reserve laser-cut or printed cards for aunties (ssengas), uncles and elders. Using one guest list with matching QR codes keeps gate management simple.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'How early should we send Kwanjula e-cards in Uganda?',
          a: 'Send digital Save-the-Dates 6 to 8 weeks before the ceremony, and personalised invitation links 3 to 4 weeks before so guests can plan travel and attire.',
        },
        {
          q: 'Can we stop guests from forwarding a WhatsApp Kwanjula card to strangers?',
          a: 'Yes, when each guest receives a personal link with a one-time QR code and fixed party size rather than a generic image.',
        },
      ],
    },
    sw: {
      nav: 'Kadi za Kwanjula na Kuhingira',
      title: 'Kadi za Kidijitali za Kwanjula na Kuhingira Uganda | Kadi Sasa',
      description:
        'Jinsi ya kuandaa na kutuma kadi za kidijitali za Kwanjula na Kuhingira Uganda kwa WhatsApp, ikiwemo maneno ya mfano na kadi za wazee.',
      h1: 'Kadi za kidijitali za Kwanjula na Kuhingira nchini Uganda',
      answer:
        'Kadi ya kidijitali ya Kwanjula au Kuhingira huwezesha familia kushiriki maelezo ya sherehe, rangi ya mavazi na ramani kwa haraka kupitia WhatsApp huku wazee wakipewa kadi za karatasi. Viungo vyenye QR huzuia usambazaji holela na kutoa idadi sahihi ya wageni.',
      sections: [
        {
          id: 'etiquette',
          h2: 'Mambo ya kuweka kwenye kadi ya Kwanjula au Kuhingira',
          blocks: [
            {
              t: 'ul',
              items: [
                'Majina kamili ya wazazi au walezi wanaopokea wageni.',
                'Majina ya bibi na bwana harusi pamoja na salamu za familia.',
                'Tarehe, saa ya kufika na ramani ya eneo la sherehe.',
                'Maelekezo ya rangi ya mavazi (gomesi, kanzu, mushanana).',
                'Namba ya mratibu wa kamati kwa uthibitisho wa mahudhurio.',
              ],
            },
          ],
        },
        {
          id: 'wording',
          h2: 'Mfano wa maneno ya mwaliko wa Kwanjula',
          blocks: [
            {
              t: 'note',
              text: '“Familia ya Bw. na Bi. Mukasa inakualika kwa furaha kwenye sherehe ya Kwanjula ya binti yao Namukasa Sarah na Kato Daniel, Jumamosi 12 Desemba 2026 saa 4:00 asubuhi huko Gayaza, Wakiso. Mavazi: Kijani na Dhahabu.”',
            },
          ],
        },
        {
          id: 'hybrid',
          h2: 'Mchanganyiko wa kadi za WhatsApp na karatasi',
          blocks: [
            {
              t: 'p',
              text: 'Tuma e-card za WhatsApp kwa marafiki na ndugu wa mbali wiki 4 hadi 6 kabla, na chapisha kadi chache kwa wazee, mashangazi na wageni maalum.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Tutume kadi za Kwanjula mapema kiasi gani?',
          a: 'Tuma taarifa ya awali wiki 6 hadi 8 kabla, na kadi kamili wiki 3 hadi 4 kabla ya sherehe.',
        },
        {
          q: 'Je, tunaweza kuzuia watu kusambaza kadi kwa wasioalikwa?',
          a: 'Ndiyo, kila mgeni akipewa kiungo chake chenye QR ya mara moja na idadi maalum ya viti.',
        },
      ],
    },
  },
  {
    market: 'ug',
    slug: 'uganda-wedding-pledge-cards-guide',
    slugEn: 'uganda-wedding-pledge-cards-guide',
    group: 'guide',
    schema: 'Article',
    updated: UPDATED,
    related: [
      'uganda-wedding-committee-guide',
      'kwanjula-kuhingira-digital-invitation',
      'ecard-uganda-vs-paper',
    ],
    en: {
      nav: 'Digital pledge cards',
      title: 'Digital Wedding Pledge Cards & Tracking in Uganda | Kadi Sasa',
      description:
        'How Ugandan wedding committees replace paper pledge cards with digital pledge tracking in UGX alongside MTN MoMo and Airtel Money.',
      h1: 'Digital wedding pledge cards and meeting tracking in Uganda',
      answer:
        'Digital pledge cards replace easily lost paper slips from Kampala wedding meetings with a live UGX ledger linked to each guest. Treasurers track who pledged, who paid via MTN MoMo, Airtel Money or cash, and what balance remains—without taking a percentage of your contributions.',
      sections: [
        {
          id: 'problem',
          h2: 'Why paper pledge cards break down during wedding meetings',
          blocks: [
            {
              t: 'ul',
              items: [
                'Paper slips from weekly meetings get misplaced or have illegible phone numbers.',
                'Following up pledges across WhatsApp groups and spreadsheets leads to duplicate or missed entries.',
                'Guests in the diaspora or outside Kampala cannot easily fill in a physical pledge card.',
              ],
            },
          ],
        },
        {
          id: 'digital',
          h2: 'How digital pledge tracking works',
          blocks: [
            {
              t: 'ol',
              items: [
                'Record each pledge in UGX against the contributor’s name and +256 phone number.',
                'Update partial or full payments as they arrive on MTN MoMo, Airtel Money, bank or cash.',
                'Share polite, personalised SMS or WhatsApp reminders with the remaining balance.',
                'Export a clean treasurer summary before every committee meeting.',
              ],
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Do guests pay contributions through the e-card platform?',
          a: 'With Kadi Sasa’s model, contributions go directly to the couple or committee treasurer—the platform keeps the encrypted ledger and takes 0% commission.',
        },
        {
          q: 'Can we still print pledge cards for physical meetings?',
          a: 'Yes. Many committees collect physical pledges at Kampala meetings and enter them into the digital ledger the same evening so nothing is lost.',
        },
      ],
    },
    sw: {
      nav: 'Kadi za ahadi (Pledge cards)',
      title: 'Kadi za Ahadi za Harusi Kidijitali Uganda | Kadi Sasa',
      description:
        'Jinsi kamati za harusi Uganda zinavyobadilisha kadi za karatasi za ahadi kuwa daftari la kidijitali la UGX na MTN MoMo au Airtel Money.',
      h1: 'Kadi za ahadi za harusi kidijitali na ufuatiliaji wa vikao Uganda',
      answer:
        'Kadi za ahadi za kidijitali zinachukua nafasi ya karatasi zinazopotea kwenye vikao vya harusi Kampala kwa daftari la wazi la UGX. Mweka hazina anafuatilia nani ameahidi, nani amelipa kwa MTN MoMo, Airtel Money au taslimu bila makato.',
      sections: [
        {
          id: 'problem',
          h2: 'Kwa nini kadi za karatasi zinasumbua kwenye vikao',
          blocks: [
            {
              t: 'ul',
              items: [
                'Karatasi za vikao hupotea au kuandikwa namba zisizosomeka.',
                'Kufuatilia ahadi kwenye magroup ya WhatsApp husababisha makosa ya mahesabu.',
                'Ndugu walioko ughaibuni hawapati kadi ya karatasi kwa urahisi.',
              ],
            },
          ],
        },
        {
          id: 'digital',
          h2: 'Jinsi ufuatiliaji wa kidijitali unavyofanya kazi',
          blocks: [
            {
              t: 'ol',
              items: [
                'Rekodi kila ahadi kwa UGX dhidi ya jina na namba ya +256 ya mchangiaji.',
                'Sasisha malipo kadri yanavyofika kupitia MTN MoMo, Airtel Money, benki au taslimu.',
                'Tuma vikumbusho vya heshima vya salio lililobaki kwa SMS au WhatsApp.',
                'Toa ripoti safi ya mweka hazina kabla ya kila kikao.',
              ],
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Je, michango inapitia kwenye mfumo?',
          a: 'Katika mfumo wa Kadi Sasa, pesa inaenda moja kwa moja kwa wenye sherehe au mweka hazina bila makato ya asilimia.',
        },
        {
          q: 'Je, bado tunaweza kutumia karatasi kwenye vikao?',
          a: 'Ndiyo. Kamati nyingi hukusanya ahadi za karatasi kikaoni kisha kuzingiza kwenye daftari la kidijitali jioni ileile.',
        },
      ],
    },
  },
  {
    market: 'ug',
    slug: 'uganda-wedding-committee-guide',
    slugEn: 'uganda-wedding-committee-guide',
    group: 'guide',
    schema: 'Article',
    updated: UPDATED,
    related: [
      'uganda-wedding-pledge-cards-guide',
      'kwanjula-kuhingira-digital-invitation',
      'ecard-uganda-vs-paper',
    ],
    en: {
      nav: 'Uganda committee guide',
      title: 'How to Run a Ugandan Wedding Committee | Kadi Sasa',
      description:
        'Practical guide for Ugandan wedding and Kwanjula committees: roles, pledge mobilisation, digital guest lists and offline QR gate check-in.',
      h1: 'How to run a Ugandan wedding and Kwanjula committee',
      answer:
        'A Ugandan wedding committee runs smoothly when four roles stay aligned: chairperson, secretary, treasurer and gate/protocol lead. Moving guest lists, pledge tracking and QR e-cards into one shared system eliminates spreadsheet errors and keeps reception check-in fast even at outdoor venues.',
      sections: [
        {
          id: 'roles',
          h2: 'Core roles on a Ugandan wedding committee',
          blocks: [
            {
              t: 'ul',
              items: [
                'Chairperson: leads weekly meetings, resolves bottlenecks and oversees timelines.',
                'Treasurer: manages UGX pledges, MTN MoMo / Airtel Money reconciliations and vendor deposits.',
                'Secretary & Mobilisation Lead: maintains the master guest list, sends e-cards and tracks RSVPs.',
                'Protocol & Gate Lead: oversees table seating, ushers and QR / card number check-in at the tent.',
              ],
            },
          ],
        },
        {
          id: 'gate',
          h2: 'Reception gate check-in without venue Wi-Fi',
          blocks: [
            {
              t: 'p',
              text: 'Many Kampala gardens and upcountry venues have congested networks on Saturday afternoons. Downloading the guest list and QR verification keys to usher phones beforehand ensures guests are checked in within seconds, even offline.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'How many ushers do we need at the gate for 400 guests?',
          a: 'Two to three ushers with phones scanning QR codes or checking short card numbers can admit 400 guests in under 35 minutes without queues.',
        },
        {
          q: 'Should the Kwanjula and wedding have separate committees?',
          a: 'Usually the bride’s family coordinates the Kwanjula while the joint committee runs the main wedding, though sharing the digital guest list avoids inviting people twice by mistake.',
        },
      ],
    },
    sw: {
      nav: 'Mwongozo wa kamati Uganda',
      title: 'Jinsi ya Kuendesha Kamati ya Harusi Uganda | Kadi Sasa',
      description:
        'Mwongozo kwa kamati za harusi na Kwanjula Uganda: majukumu, ufuatiliaji wa ahadi, orodha ya wageni na ukaguzi wa QR langoni.',
      h1: 'Jinsi ya kuendesha kamati ya harusi na Kwanjula Uganda',
      answer:
        'Kamati ya harusi Uganda hufanya kazi vizuri majukumu manne yakiratibiwa: mwenyekiti, katibu, mweka hazina na msimamizi wa lango. Kuweka orodha ya wageni, ahadi na kadi za QR kwenye mfumo mmoja huondoa makosa na kuharakisha uingiaji.',
      sections: [
        {
          id: 'roles',
          h2: 'Majukumu makuu ya kamati ya harusi Uganda',
          blocks: [
            {
              t: 'ul',
              items: [
                'Mwenyekiti: huongoza vikao vya kila wiki na kusimamia ratiba.',
                'Mweka hazina: husimamia ahadi za UGX, malipo ya MTN MoMo / Airtel Money na malipo ya watoa huduma.',
                'Katibu: hutunza orodha ya wageni, kutuma e-cards na kufuatilia RSVP.',
                'Msimamizi wa itifaki na lango: husimamia viti na ukaguzi wa QR mlangoni.',
              ],
            },
          ],
        },
        {
          id: 'gate',
          h2: 'Ukaguzi wa langoni bila Wi-Fi ya ukumbi',
          blocks: [
            {
              t: 'p',
              text: 'Kumbi nyingi za bustani Kampala zina msongamano wa mtandao siku ya Jumamosi. Kupakua orodha ya wageni mapema kwenye simu za lango huwezesha kuingiza wageni haraka hata bila mtandao.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Tunahitaji wapokeaji wangapi langoni kwa wageni 400?',
          a: 'Wapokeaji wawili hadi watatu wenye simu za kuskani QR wanaweza kuingiza wageni 400 chini ya dakika 35.',
        },
        {
          q: 'Je, Kwanjula na harusi ziwe na kamati tofauti?',
          a: 'Mara nyingi familia ya bibi harusi huratibu Kwanjula na kamati ya pamoja huratibu harusi kuu, lakini kushirikiana orodha huzuia marudio.',
        },
      ],
    },
  },
  {
    market: 'ug',
    slug: 'ecard-uganda-vs-paper',
    slugEn: 'ecard-uganda-vs-paper',
    group: 'guide',
    schema: 'Article',
    updated: UPDATED,
    related: [
      'kwanjula-kuhingira-digital-invitation',
      'uganda-wedding-pledge-cards-guide',
      'uganda-wedding-committee-guide',
    ],
    en: {
      nav: 'E-cards vs paper (Uganda)',
      title: 'Digital E-Cards vs Paper Wedding Cards in Uganda | Kadi Sasa',
      description:
        'Comparing WhatsApp digital e-cards and Nasser Road printed wedding cards in Uganda: cost, speed, RSVP tracking, elder etiquette and gate security.',
      h1: 'Digital e-cards vs paper wedding cards in Uganda',
      answer:
        'Digital e-cards cost far less than bulk printing on Nasser Road, reach guests across Kampala and the diaspora instantly on WhatsApp, and track RSVPs automatically. Most Ugandan couples get the best result with a hybrid plan: digital QR e-cards for peers and 20 to 40 printed cards for elders.',
      sections: [
        {
          id: 'compare',
          h2: 'Side-by-side comparison for Ugandan weddings',
          blocks: [
            {
              t: 'table',
              head: ['Factor', 'Paper cards (Nasser Road)', 'Digital e-cards with QR'],
              rows: [
                [
                  'Delivery time',
                  'Days or weeks of hand-delivery & boda couriers',
                  'Instant via WhatsApp or SMS',
                ],
                [
                  'Diaspora & upcountry reach',
                  'Requires courier or photo forwarding',
                  'One tap anywhere in the world',
                ],
                [
                  'RSVP & headcount',
                  'Manual phone calls and guesswork',
                  'Automatic guest replies & party size',
                ],
                [
                  'Gate security',
                  'Blank cards can be shared or copied',
                  'Unique one-time QR + short card number',
                ],
                [
                  'Elder etiquette',
                  'Traditional & expected by senior relatives',
                  'Print-ready PDF fallback with same QR',
                ],
              ],
            },
          ],
        },
        {
          id: 'hybrid',
          h2: 'The recommended hybrid strategy in Uganda',
          blocks: [
            {
              t: 'p',
              text: 'Print physical cards strictly for parents, clan elders, pastors/imams and chief guests, while sending personalised digital e-cards to workmates, friends and diaspora relatives. Every guest stays in one master list.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Are WhatsApp image invitations enough on their own?',
          a: 'A plain JPEG image works for small informal parties, but for weddings it can be forwarded endlessly and offers no RSVP tracking or gate QR verification. Personalised e-card links solve both.',
        },
        {
          q: 'Can printed cards and WhatsApp e-cards work at the same reception gate?',
          a: 'Yes, when the printed card carries the same unique QR code and short number generated for that guest in your digital list.',
        },
      ],
    },
    sw: {
      nav: 'E-cards vs karatasi Uganda',
      title: 'Kadi za Kidijitali vs Karatasi Uganda | Kadi Sasa',
      description:
        'Ulinganisho wa e-cards za WhatsApp na kadi za karatasi za Nasser Road Uganda: gharama, kasi, RSVP, heshima kwa wazee na usalama wa lango.',
      h1: 'Kadi za kidijitali vs kadi za karatasi nchini Uganda',
      answer:
        'Kadi za kidijitali zinapunguza gharama za uchapishaji, zinawafikia wageni Kampala na ughaibuni papo hapo kwa WhatsApp, na hufuatilia RSVP kiotomatiki. Wanandoa wengi Uganda huchanganya e-cards kwa marafiki na kadi chache za karatasi kwa wazee.',
      sections: [
        {
          id: 'compare',
          h2: 'Ulinganisho wa harusi za Uganda',
          blocks: [
            {
              t: 'table',
              head: ['Kipengele', 'Kadi za karatasi', 'E-cards zenye QR'],
              rows: [
                [
                  'Muda wa kufika',
                  'Siku kadhaa za kusambaza kwa mkono',
                  'Papo hapo kwa WhatsApp au SMS',
                ],
                ['Wageni wa mbali', 'Inahitaji usafirishaji', 'Kiungo kimoja popote duniani'],
                ['Majibu (RSVP)', 'Kupiga simu na kukisia', 'Majibu ya moja kwa moja kwenye simu'],
                [
                  'Usalama langoni',
                  'Kadi zinaweza kunakiliwa',
                  'QR ya kipekee ya mara moja na namba fupi',
                ],
                [
                  'Heshima kwa wazee',
                  'Inapendwa na wazee wengi',
                  'PDF ya kuchapisha yenye QR ileile',
                ],
              ],
            },
          ],
        },
        {
          id: 'hybrid',
          h2: 'Mbinu bora ya kuchanganya zote mbili',
          blocks: [
            {
              t: 'p',
              text: 'Chapisha kadi za karatasi kwa wazazi, wazee wa ukoo na viongozi wa dini, kisha tuma e-cards kwa marafiki, wafanyakazi wenzako na ndugu walioko nje ya nchi.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Je, picha ya kawaida ya WhatsApp inatosha?',
          a: 'Picha ya kawaida haina ufuatiliaji wa RSVP na inaweza kusambazwa kwa wasioalikwa. Kiungo cha e-card chenye QR kinatatua changamoto zote mbili.',
        },
        {
          q: 'Je, kadi za karatasi na za WhatsApp zinatumia lango moja?',
          a: 'Ndiyo, mradi kadi iliyochapishwa ina QR na namba fupi ileile iliyo kwenye orodha ya wageni.',
        },
      ],
    },
  },
];
