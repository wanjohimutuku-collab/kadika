import type { ContentPageDef } from '../types';

const UPDATED = '2026-10-15';

/**
 * Kenya pages. The product itself does not yet accept Kenyan phone numbers, KES or Kenyan mobile
 * money, so these pages are useful guides plus an honest availability note. Do not add claims of
 * Kenyan support until it exists (see docs/seo/kenya-readiness.md).
 */
export const KENYA_PAGES: ContentPageDef[] = [
  {
    market: 'ke',
    counterpart: { market: 'tz', slug: 'kadi-ya-harusi-mtandaoni' },
    slug: '',
    group: 'product',
    schema: 'WebPage',
    updated: UPDATED,
    related: [
      'wedding-committee-guide',
      'wedding-contributions-guide',
      'wedding-invitation-wording',
      'is-a-digital-wedding-invitation-safe',
    ],
    en: {
      nav: 'Kenya home',
      title: 'Digital Wedding Invitations Kenya | Harusi Pass',
      description:
        'How digital wedding invitations with RSVP, QR gate check-in and contribution tracking work, plus free guides for Kenyan wedding committees. Kenya launch is next.',
      h1: 'Digital wedding invitations for Kenyan weddings and committees',
      answer:
        'Harusi Pass gives each guest their own invitation with RSVP, a QR and a short number, tracks pledges and admits guests at the gate even offline. It is live as a pilot in Tanzania; Kenya support is being planned. The free guides here work with any tool.',
      sections: [
        {
          id: 'how',
          h2: 'How a digital invitation works for a Kenyan wedding',
          blocks: [
            {
              t: 'ol',
              items: [
                'The couple or committee adds the guest list: name, phone number, number of people allowed.',
                'Every guest gets their own link by WhatsApp or SMS, and a printed card for elders who prefer paper.',
                'Guests reply on their phone, so the committee sees confirmed numbers early for catering and seating.',
                'Pledges and contributions are recorded against each guest instead of a WhatsApp group scroll.',
                'On the day, the gate scans a QR or types a short card number, and it still works if the venue has no network.',
              ],
            },
          ],
        },
        {
          id: 'why-kenya',
          h2: 'Why it fits how Kenyan weddings are organised',
          blocks: [
            {
              t: 'ul',
              items: [
                'Weddings are often run by a committee that coordinates budget, guests and contributions, usually in a WhatsApp group.',
                'Harambee-style contributions need transparency: who pledged, who paid, what is left.',
                'Guests range from smartphone users to elders on basic phones, so one channel is never enough.',
                'Venues outside towns often have weak network at the gate.',
              ],
            },
          ],
        },
        {
          id: 'status',
          h2: 'Availability in Kenya',
          blocks: [
            {
              t: 'note',
              text: 'Harusi Pass is in a pilot in Tanzania. Kenyan phone numbers (+254), prices in KES and Kenyan M-Pesa payments are not supported yet. We are planning Kenya next and would like to hear from committees who want it. Use the contact page to tell us.',
            },
          ],
        },
        {
          id: 'meanwhile',
          h2: 'Free guides you can use today',
          blocks: [
            {
              t: 'ul',
              items: [
                'How to run a wedding committee in Kenya: roles, timeline and accounts.',
                'Wedding contributions and harambee: how to collect and track pledges.',
                'Wedding invitation wording for Kenyan weddings, ruracio, introductions and kitchen parties.',
                'How to tell a genuine digital wedding invitation from a scam.',
              ],
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Can I use Harusi Pass in Kenya now?',
          a: 'Not yet. It currently accepts Tanzanian phone numbers and TZS only. Kenya is planned; tell us through the contact page if you want it.',
        },
        {
          q: 'Will it support M-Pesa in Kenya?',
          a: 'That is the plan for the Kenya launch, but it is not available today and we will not claim it until it works.',
        },
        {
          q: 'Is there a cost?',
          a: 'It is free during the pilot in Tanzania. Future prices, including Kenya shilling prices, will be published before charging starts.',
        },
      ],
    },
    sw: {
      nav: 'Kenya',
      title: 'Kadi za Harusi za Mtandaoni Kenya | Harusi Pass',
      description:
        'Jinsi kadi za harusi za mtandaoni zenye majibu, QR langoni na ufuatiliaji wa michango zinavyofanya kazi, na miongozo ya bure kwa kamati za harusi Kenya.',
      h1: 'Kadi za harusi za mtandaoni kwa harusi na kamati za Kenya',
      answer:
        'Harusi Pass inampa kila mgeni kadi yake yenye majibu, QR na namba fupi, inafuatilia ahadi na kuingiza wageni langoni hata bila mtandao. Iko kwenye majaribio nchini Tanzania; msaada wa Kenya unapangwa. Miongozo ya bure hapa inafaa kwa zana yoyote.',
      sections: [
        {
          id: 'how',
          h2: 'Jinsi kadi ya mtandaoni inavyofanya kazi kwa harusi ya Kenya',
          blocks: [
            {
              t: 'ol',
              items: [
                'Wanandoa au kamati wanaingiza orodha ya wageni: jina, namba ya simu, idadi ya watu wanaoruhusiwa.',
                'Kila mgeni anapata kiungo chake kwa WhatsApp au SMS, na kadi ya karatasi kwa wazee wanaopendelea karatasi.',
                'Wageni wanajibu kwenye simu zao, kwa hiyo kamati inaona idadi iliyothibitishwa mapema kwa chakula na viti.',
                'Ahadi na michango vinarekodiwa kwa kila mgeni badala ya kutafuta kwenye kundi la WhatsApp.',
                'Siku ya tukio, lango linaskani QR au kuandika namba fupi ya kadi, na linafanya kazi hata ukumbi usipo na mtandao.',
              ],
            },
          ],
        },
        {
          id: 'why-kenya',
          h2: 'Kwa nini inalingana na jinsi harusi za Kenya zinavyoandaliwa',
          blocks: [
            {
              t: 'ul',
              items: [
                'Harusi mara nyingi huendeshwa na kamati inayosimamia bajeti, wageni na michango, kwa kawaida kwenye kundi la WhatsApp.',
                'Michango ya aina ya harambee inahitaji uwazi: nani aliahidi, nani alilipa, na kilichobaki.',
                'Wageni ni kuanzia wenye smartphone hadi wazee wenye simu za kawaida, kwa hiyo njia moja haitoshi.',
                'Kumbi za mbali na miji mara nyingi zina mtandao hafifu langoni.',
              ],
            },
          ],
        },
        {
          id: 'status',
          h2: 'Upatikanaji nchini Kenya',
          blocks: [
            {
              t: 'note',
              text: 'Harusi Pass iko kwenye majaribio nchini Tanzania. Namba za simu za Kenya (+254), bei kwa shilingi za Kenya (KES) na malipo ya M-Pesa ya Kenya bado hazitumiki. Tunapanga Kenya kufuata na tungependa kusikia kutoka kwa kamati zinazoitaka. Tumia ukurasa wa mawasiliano kutuambia.',
            },
          ],
        },
        {
          id: 'meanwhile',
          h2: 'Miongozo ya bure unayoweza kutumia leo',
          blocks: [
            {
              t: 'ul',
              items: [
                'Jinsi ya kuendesha kamati ya harusi Kenya: majukumu, ratiba na hesabu.',
                'Michango ya harusi na harambee: jinsi ya kukusanya na kufuatilia ahadi.',
                'Maneno ya kadi ya harusi Kenya, ruracio, utambulisho na kitchen party.',
                'Jinsi ya kutofautisha kadi halali ya harusi ya mtandaoni na ulaghai.',
              ],
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Naweza kutumia Harusi Pass Kenya sasa?',
          a: 'Bado. Kwa sasa inapokea namba za simu za Tanzania na TZS tu. Kenya imepangwa; tuambie kupitia ukurasa wa mawasiliano ukiitaka.',
        },
        {
          q: 'Je, itasaidia M-Pesa ya Kenya?',
          a: 'Ndiyo ni mpango wa uzinduzi wa Kenya, lakini haipatikani leo na hatutadai hivyo hadi ifanye kazi.',
        },
        {
          q: 'Kuna gharama?',
          a: 'Ni bure wakati wa majaribio nchini Tanzania. Bei za baadaye, ikiwemo kwa shilingi za Kenya, zitatangazwa kabla ya kuanza kutozwa.',
        },
      ],
    },
  },
  {
    market: 'ke',
    slug: 'wedding-committee-guide',
    group: 'guide',
    schema: 'Article',
    updated: UPDATED,
    related: [
      'wedding-contributions-guide',
      'wedding-invitation-wording',
      '',
      'tz:lango-la-harusi-qr',
    ],
    en: {
      nav: 'Wedding committee guide',
      title: 'How to Run a Wedding Committee in Kenya: Roles and Plan',
      description:
        'A practical guide to running a Kenyan wedding committee: roles, a 6-month timeline, a budget table, handling contributions openly and avoiding common disputes.',
      h1: 'How to run a wedding committee in Kenya: roles, timeline and accounts',
      answer:
        'A wedding committee works best with a chair, a secretary, a treasurer with at least one co-signatory, and leads for guests, venue, food and programme. Agree a budget early, record every pledge and payment in one place, report to members regularly, and close the accounts openly after the wedding.',
      sections: [
        {
          id: 'roles',
          h2: 'Committee roles',
          blocks: [
            {
              t: 'table',
              head: ['Role', 'Main duty'],
              rows: [
                ['Chairperson', 'Runs meetings, keeps decisions moving, speaks for the committee'],
                ['Secretary', 'Records minutes, decisions and the guest list'],
                ['Treasurer', 'Holds the money record; reports pledges, payments and balance'],
                [
                  'Co-signatory or auditor',
                  'A second person who approves withdrawals and checks the books',
                ],
                [
                  'Guest and invitations lead',
                  'Owns the guest list, invitations, RSVPs and reminders',
                ],
                ['Venue and logistics lead', 'Venue, decor, sound, transport, gate'],
                ['Food and drinks lead', 'Catering, quantities, service'],
                ['Programme lead (MC liaison)', 'Order of events and timing on the day'],
              ],
            },
          ],
        },
        {
          id: 'timeline',
          h2: 'A six-month timeline',
          blocks: [
            {
              t: 'table',
              head: ['When', 'What to finish'],
              rows: [
                ['6 months out', 'Form the committee, agree the budget, set the date and venue'],
                ['4 months out', 'Open the contribution plan, build the draft guest list'],
                ['3 months out', 'Confirm vendors, finalise the guest list, send invitations'],
                ['2 months out', 'Chase RSVPs, reconcile pledges against payments'],
                ['1 month out', 'Final headcount, seating, programme, gate plan'],
                ['1 week out', 'Confirm every vendor, test the gate, brief the team'],
                ['After', 'Thank-you messages, close the accounts, share the report'],
              ],
            },
          ],
        },
        {
          id: 'budget',
          h2: 'Build the budget before you ask for money',
          blocks: [
            {
              t: 'p',
              text: 'List every cost line, add a buffer of about ten percent, and divide the total into what the families cover and what the contribution drive must raise. A committee that can show members the budget gets more trust and fewer arguments.',
            },
            {
              t: 'ul',
              items: [
                'Venue and decor',
                'Food and drinks, priced per head',
                'Sound, MC and photography',
                'Transport and accommodation',
                'Printing, invitations and airtime',
                'Attire and rings',
                'A contingency line',
              ],
            },
          ],
        },
        {
          id: 'whatsapp',
          h2: 'Why a WhatsApp group alone is not enough',
          blocks: [
            {
              t: 'p',
              text: 'A group is good for conversation and poor as a record. Pledges are buried in long threads, nobody has a single balance per person, and members who mute the group miss reminders. Keep the chat for talking and keep a separate, shared record for money and guests.',
            },
          ],
        },
        {
          id: 'trust',
          h2: 'Keep money handling open',
          blocks: [
            {
              t: 'ul',
              items: [
                'At least two people should control any withdrawal.',
                'Write down who pledged what and when each payment arrived.',
                'Share a short balance update on a fixed schedule, for example every two weeks.',
                'Keep receipts and payment confirmations.',
                'After the wedding, publish the final accounts to the committee.',
              ],
            },
          ],
        },
        {
          id: 'day',
          h2: 'Plan the day at the gate',
          blocks: [
            {
              t: 'p',
              text: 'Decide who admits guests, how you will check names, and what you will do with someone who is not on the list. A numbered card or QR for each guest makes this fast. Test whatever method you choose before the day.',
            },
          ],
        },
        {
          id: 'status',
          h2: 'Where Harusi Pass fits',
          blocks: [
            {
              t: 'note',
              text: 'Harusi Pass can hold the guest list, RSVPs, pledges and the gate in one place. It is in a pilot in Tanzania and not yet available for Kenyan numbers or KES; this guide works with any tool, including a shared spreadsheet.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'How many people should be on a wedding committee?',
          a: 'Enough to cover the roles above without overlap. Many committees work with six to ten active members.',
        },
        {
          q: 'Who should be the treasurer?',
          a: 'Someone trusted and organised, with a second person who co-approves withdrawals and checks the records.',
        },
        {
          q: 'When should the committee start?',
          a: 'About six months before the date, so the budget, guest list and contributions have time to settle.',
        },
      ],
    },
    sw: {
      nav: 'Mwongozo wa kamati ya harusi',
      title: 'Jinsi ya Kuendesha Kamati ya Harusi Kenya: Majukumu na Mpango',
      description:
        'Mwongozo wa vitendo wa kuendesha kamati ya harusi Kenya: majukumu, ratiba ya miezi 6, bajeti, kushughulikia michango kwa uwazi na kuepuka migogoro.',
      h1: 'Jinsi ya kuendesha kamati ya harusi Kenya: majukumu, ratiba na hesabu',
      answer:
        'Kamati ya harusi inafanya kazi vizuri ikiwa na mwenyekiti, katibu, mweka hazina mwenye mtia saini mwenza, na viongozi wa wageni, ukumbi, chakula na ratiba. Kubaliana bajeti mapema, rekodi ahadi na malipo mahali pamoja, toa taarifa mara kwa mara, na funga hesabu kwa uwazi baada ya harusi.',
      sections: [
        {
          id: 'roles',
          h2: 'Majukumu ya kamati',
          blocks: [
            {
              t: 'table',
              head: ['Cheo', 'Kazi kuu'],
              rows: [
                [
                  'Mwenyekiti',
                  'Anaendesha vikao, anasukuma maamuzi, anazungumza kwa niaba ya kamati',
                ],
                ['Katibu', 'Anaandika dakika, maamuzi na orodha ya wageni'],
                ['Mweka hazina', 'Anashika kumbukumbu ya pesa; anaripoti ahadi, malipo na salio'],
                [
                  'Mtia saini mwenza au mkaguzi',
                  'Mtu wa pili anayeidhinisha utoaji wa pesa na kukagua vitabu',
                ],
                [
                  'Kiongozi wa wageni na mialiko',
                  'Orodha ya wageni, mialiko, majibu na vikumbusho',
                ],
                ['Kiongozi wa ukumbi na vifaa', 'Ukumbi, mapambo, sauti, usafiri, lango'],
                ['Kiongozi wa chakula na vinywaji', 'Upishi, kiasi, huduma'],
                [
                  'Kiongozi wa ratiba (mwasiliani wa MC)',
                  'Mpangilio wa matukio na muda siku ya tukio',
                ],
              ],
            },
          ],
        },
        {
          id: 'timeline',
          h2: 'Ratiba ya miezi sita',
          blocks: [
            {
              t: 'table',
              head: ['Lini', 'Cha kukamilisha'],
              rows: [
                ['Miezi 6 kabla', 'Unda kamati, kubaliana bajeti, weka tarehe na ukumbi'],
                ['Miezi 4 kabla', 'Fungua mpango wa michango, tengeneza orodha ya wageni ya awali'],
                ['Miezi 3 kabla', 'Thibitisha wauzaji, maliza orodha ya wageni, tuma mialiko'],
                ['Miezi 2 kabla', 'Fuatilia majibu, linganisha ahadi na malipo'],
                ['Mwezi 1 kabla', 'Idadi ya mwisho, viti, ratiba, mpango wa lango'],
                ['Wiki 1 kabla', 'Thibitisha kila muuzaji, jaribu lango, wape maelekezo timu'],
                ['Baada ya tukio', 'Ujumbe wa shukrani, funga hesabu, shiriki ripoti'],
              ],
            },
          ],
        },
        {
          id: 'budget',
          h2: 'Tengeneza bajeti kabla ya kuomba pesa',
          blocks: [
            {
              t: 'p',
              text: 'Orodhesha kila gharama, ongeza akiba ya karibu asilimia kumi, kisha ugawanye jumla kati ya kinachobebwa na familia na kinachopaswa kukusanywa kwa michango. Kamati inayoonyesha bajeti kwa wanachama inapata imani zaidi na mabishano machache.',
            },
            {
              t: 'ul',
              items: [
                'Ukumbi na mapambo',
                'Chakula na vinywaji, kwa bei ya kila mtu',
                'Sauti, MC na picha',
                'Usafiri na malazi',
                'Uchapishaji, mialiko na muda wa maongezi',
                'Mavazi na pete',
                'Mstari wa dharura',
              ],
            },
          ],
        },
        {
          id: 'whatsapp',
          h2: 'Kwa nini kundi la WhatsApp pekee halitoshi',
          blocks: [
            {
              t: 'p',
              text: 'Kundi ni zuri kwa mazungumzo lakini si kumbukumbu nzuri. Ahadi zinapotea kwenye mazungumzo marefu, hakuna salio la kila mtu mahali pamoja, na wanachama wanaonyamazisha kundi hukosa vikumbusho. Tumia gumzo kuzungumza na uwe na kumbukumbu tofauti ya pesa na wageni.',
            },
          ],
        },
        {
          id: 'trust',
          h2: 'Shughulikia pesa kwa uwazi',
          blocks: [
            {
              t: 'ul',
              items: [
                'Watu wasiopungua wawili wadhibiti utoaji wowote wa pesa.',
                'Andika nani aliahidi nini na kila malipo yalipofika.',
                'Toa taarifa fupi ya salio kwa ratiba maalum, kwa mfano kila wiki mbili.',
                'Hifadhi risiti na uthibitisho wa malipo.',
                'Baada ya harusi, wasilisha hesabu za mwisho kwa kamati.',
              ],
            },
          ],
        },
        {
          id: 'day',
          h2: 'Panga siku ya tukio langoni',
          blocks: [
            {
              t: 'p',
              text: 'Amua nani anaingiza wageni, jinsi ya kukagua majina, na la kufanya kwa mtu asiye kwenye orodha. Kadi yenye namba au QR kwa kila mgeni inafanya hili kuwa rahisi. Jaribu njia utakayochagua kabla ya siku.',
            },
          ],
        },
        {
          id: 'status',
          h2: 'Harusi Pass inafaa wapi',
          blocks: [
            {
              t: 'note',
              text: 'Harusi Pass inaweza kushika orodha ya wageni, majibu, ahadi na lango mahali pamoja. Iko kwenye majaribio nchini Tanzania na bado haipokei namba za Kenya wala KES; mwongozo huu unafaa kwa zana yoyote, ikiwemo jedwali la pamoja.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Kamati ya harusi iwe na watu wangapi?',
          a: 'Wa kutosha kufunika majukumu yaliyo juu bila kuingiliana. Kamati nyingi hufanya kazi na wanachama sita hadi kumi walio hai.',
        },
        {
          q: 'Nani awe mweka hazina?',
          a: 'Mtu anayeaminika na mwenye mpangilio, pamoja na mtu wa pili anayeidhinisha utoaji na kukagua kumbukumbu.',
        },
        {
          q: 'Kamati ianze lini?',
          a: 'Takriban miezi sita kabla ya tarehe, ili bajeti, orodha ya wageni na michango vipate muda.',
        },
      ],
    },
  },
  {
    market: 'ke',
    counterpart: { market: 'tz', slug: 'michango-ya-harusi' },
    slug: 'wedding-contributions-guide',
    group: 'guide',
    schema: 'Article',
    updated: UPDATED,
    related: [
      'wedding-committee-guide',
      'is-a-digital-wedding-invitation-safe',
      '',
      'tz:michango-ya-harusi',
    ],
    en: {
      nav: 'Wedding contributions and harambee',
      title: 'Wedding Contributions in Kenya: Harambee and M-Pesa Guide',
      description:
        'How to collect and track wedding contributions in Kenya: harambee etiquette, M-Pesa options, fundraising platforms, transparency, and mistakes committees make.',
      h1: 'Wedding contributions in Kenya: harambee, M-Pesa and tracking pledges',
      answer:
        'To run wedding contributions well, set a target from the budget, record every pledge against a named person, collect payments through a channel the committee can reconcile, such as M-Pesa, and share balances regularly. Use two people to control withdrawals. Never make a card or invitation conditional on giving.',
      sections: [
        {
          id: 'harambee',
          h2: 'Harambee and wedding contributions',
          blocks: [
            {
              t: 'p',
              text: 'Harambee means pulling together, and it is the national motto. In practice, many weddings are funded partly by contributions from family, friends and colleagues, coordinated by a committee, often through WhatsApp groups and physical fundraisers. The custom has real value, and it also draws criticism when a drive feels like pressure or when accounts are unclear.',
            },
          ],
        },
        {
          id: 'steps',
          h2: 'Steps for a clear contribution drive',
          blocks: [
            {
              t: 'ol',
              items: [
                'Build the budget and decide what the drive needs to raise.',
                'Set a target and a closing date.',
                'Invite contributions politely and say how they can be paid.',
                'Record each pledge: name, amount, date, note.',
                'Record each payment against the pledge.',
                'Send balance updates and gentle reminders on a schedule.',
                'Close the accounts and thank contributors.',
              ],
            },
          ],
        },
        {
          id: 'ways',
          h2: 'Ways to collect: pros and cons',
          blocks: [
            {
              t: 'table',
              head: ['Method', 'Good for', 'Watch out for'],
              rows: [
                [
                  'M-Pesa Send Money to a treasurer',
                  'Quick start, familiar to everyone',
                  'Money sits in one person’s account; harder to separate from personal funds',
                ],
                [
                  'M-Pesa Paybill or Till number',
                  'Clear receipts and a business record',
                  'Setup, rules and fees depend on the provider; confirm current terms with Safaricom',
                ],
                [
                  'Fundraising platforms such as M-Changa or OneKitty',
                  'Public or group fundraising with built-in signatories',
                  'Platform fees and rules; check the current terms yourself',
                ],
                [
                  'Cash at meetings',
                  'Elders and in-person events',
                  'Needs receipts and quick banking; easy to mis-record',
                ],
                [
                  'Bank account for the committee',
                  'Larger amounts, formal accounts',
                  'Opening requirements and time',
                ],
              ],
            },
          ],
        },
        {
          id: 'track',
          h2: 'Tracking pledges per person',
          blocks: [
            {
              t: 'p',
              text: 'Whatever you use to collect, keep one list with each person’s pledge, what they have paid and what remains. A simple sheet works. The goal is that any member can see the same numbers and that no pledge depends on someone’s memory.',
            },
          ],
        },
        {
          id: 'etiquette',
          h2: 'Etiquette: keep it voluntary',
          blocks: [
            {
              t: 'ul',
              items: [
                'Ask once clearly and remind sparingly.',
                'Never publish a list that shames people who did not give.',
                'Do not make an invitation or a seat at the venue conditional on contributing.',
                'Respect a polite no.',
              ],
            },
          ],
        },
        {
          id: 'status',
          h2: 'Where Harusi Pass fits',
          blocks: [
            {
              t: 'note',
              text: 'In Harusi Pass, pledges and payments sit on each guest’s invitation and the committee sees collected, pledged and balance in one view. It is in a pilot in Tanzania and does not yet support Kenyan M-Pesa or KES, so for a Kenyan wedding today use the steps above with your own sheet or a platform you trust.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'What is the safest way for a committee to hold contribution money?',
          a: 'Use an account or payment channel where at least two people must approve withdrawals, and keep a record of every pledge and payment. Confirm current options and fees with the provider.',
        },
        {
          q: 'Should contributions be compulsory?',
          a: 'No. They work best when voluntary and transparent. Tying an invitation to a payment damages goodwill.',
        },
        {
          q: 'How often should the committee report balances?',
          a: 'A short update every one to two weeks, and a final report after the wedding.',
        },
      ],
    },
    sw: {
      nav: 'Michango ya harusi na harambee',
      title: 'Michango ya Harusi Kenya: Mwongozo wa Harambee na M-Pesa',
      description:
        'Jinsi ya kukusanya na kufuatilia michango ya harusi Kenya: adabu ya harambee, chaguo za M-Pesa, majukwaa ya michango, uwazi na makosa ya kamati.',
      h1: 'Michango ya harusi Kenya: harambee, M-Pesa na kufuatilia ahadi',
      answer:
        'Ili kuendesha michango ya harusi vizuri, weka lengo kutokana na bajeti, rekodi kila ahadi kwa jina la mtu, kusanya malipo kwa njia ambayo kamati inaweza kulinganisha, kama M-Pesa, na shiriki salio mara kwa mara. Watu wawili wadhibiti utoaji wa pesa. Usifanye kadi au mwaliko kuwa na sharti la kutoa.',
      sections: [
        {
          id: 'harambee',
          h2: 'Harambee na michango ya harusi',
          blocks: [
            {
              t: 'p',
              text: 'Harambee inamaanisha kuvuta pamoja, na ni kauli mbiu ya taifa. Kwa vitendo, harusi nyingi zinagharamiwa kwa sehemu na michango ya familia, marafiki na wafanyakazi wenzao, inayoratibiwa na kamati, mara nyingi kupitia makundi ya WhatsApp na harambee za ana kwa ana. Mila hii ina thamani halisi, na pia inakosolewa inapohisiwa kama shinikizo au hesabu zisipokuwa wazi.',
            },
          ],
        },
        {
          id: 'steps',
          h2: 'Hatua za kuendesha michango kwa uwazi',
          blocks: [
            {
              t: 'ol',
              items: [
                'Tengeneza bajeti na uamue kiasi cha kukusanya.',
                'Weka lengo na tarehe ya kufunga.',
                'Alika michango kwa heshima na useme jinsi ya kulipa.',
                'Rekodi kila ahadi: jina, kiasi, tarehe, maelezo.',
                'Rekodi kila malipo dhidi ya ahadi.',
                'Tuma taarifa za salio na vikumbusho vya upole kwa ratiba.',
                'Funga hesabu na uwashukuru wachangiaji.',
              ],
            },
          ],
        },
        {
          id: 'ways',
          h2: 'Njia za kukusanya: faida na tahadhari',
          blocks: [
            {
              t: 'table',
              head: ['Njia', 'Inafaa kwa', 'Tahadhari'],
              rows: [
                [
                  'M-Pesa Send Money kwa mweka hazina',
                  'Kuanza haraka, inajulikana na wote',
                  'Pesa ziko kwenye akaunti ya mtu mmoja; ni vigumu kutenganisha na pesa binafsi',
                ],
                [
                  'M-Pesa Paybill au Till',
                  'Risiti wazi na kumbukumbu ya biashara',
                  'Usajili, sheria na ada hutegemea mtoa huduma; thibitisha masharti ya sasa na Safaricom',
                ],
                [
                  'Majukwaa ya michango kama M-Changa au OneKitty',
                  'Michango ya kikundi au ya wazi yenye watia saini',
                  'Ada na sheria za jukwaa; kagua masharti ya sasa mwenyewe',
                ],
                [
                  'Taslimu kwenye vikao',
                  'Wazee na matukio ya ana kwa ana',
                  'Inahitaji risiti na kuweka benki haraka; ni rahisi kukosea kurekodi',
                ],
                [
                  'Akaunti ya benki ya kamati',
                  'Kiasi kikubwa, hesabu rasmi',
                  'Masharti ya kufungua na muda',
                ],
              ],
            },
          ],
        },
        {
          id: 'track',
          h2: 'Kufuatilia ahadi kwa kila mtu',
          blocks: [
            {
              t: 'p',
              text: 'Njia yoyote ya kukusanya, weka orodha moja yenye ahadi ya kila mtu, kilicholipwa na kilichobaki. Jedwali rahisi linatosha. Lengo ni kwamba kila mwanachama aone namba zilezile na kwamba hakuna ahadi inayotegemea kumbukumbu ya mtu.',
            },
          ],
        },
        {
          id: 'etiquette',
          h2: 'Adabu: iwe ya hiari',
          blocks: [
            {
              t: 'ul',
              items: [
                'Omba mara moja kwa uwazi na ukumbushe kwa uchache.',
                'Usichapishe orodha inayowaaibisha wasiotoa.',
                'Usifanye mwaliko au kiti ukumbini kuwa na sharti la kuchangia.',
                'Heshimu hapana ya upole.',
              ],
            },
          ],
        },
        {
          id: 'status',
          h2: 'Harusi Pass inafaa wapi',
          blocks: [
            {
              t: 'note',
              text: 'Kwenye Harusi Pass, ahadi na malipo viko kwenye mwaliko wa kila mgeni na kamati inaona kilichokusanywa, kilichoahidiwa na salio kwa mtazamo mmoja. Iko kwenye majaribio nchini Tanzania na bado haisaidii M-Pesa ya Kenya wala KES, kwa hiyo kwa harusi ya Kenya leo tumia hatua zilizo juu pamoja na jedwali lako au jukwaa unaloliamini.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Njia salama zaidi kwa kamati kushika pesa za michango ni ipi?',
          a: 'Tumia akaunti au njia ya malipo ambapo watu wasiopungua wawili lazima waidhinishe utoaji, na uweke rekodi ya kila ahadi na malipo. Thibitisha chaguo na ada za sasa na mtoa huduma.',
        },
        {
          q: 'Michango iwe lazima?',
          a: 'Hapana. Inafanya kazi vizuri ikiwa ya hiari na wazi. Kuunganisha mwaliko na malipo kunaharibu nia njema.',
        },
        {
          q: 'Kamati iripoti salio mara ngapi?',
          a: 'Taarifa fupi kila wiki moja hadi mbili, na ripoti ya mwisho baada ya harusi.',
        },
      ],
    },
  },
  {
    market: 'ke',
    counterpart: { market: 'tz', slug: 'maneno-ya-kadi-ya-harusi' },
    slug: 'wedding-invitation-wording',
    group: 'guide',
    schema: 'Article',
    updated: UPDATED,
    related: ['wedding-committee-guide', '', 'tz:maneno-ya-kadi-ya-harusi'],
    en: {
      nav: 'Invitation wording for Kenyan weddings',
      title: 'Wedding Invitation Wording Kenya: Samples for Ruracio and More',
      description:
        'Sample wording for Kenyan wedding, ruracio, introduction, kitchen party and bridal shower invitations in English and Swahili, with a checklist of details to include.',
      h1: 'Wedding invitation wording for Kenya: samples in English and Swahili',
      answer:
        'A Kenyan invitation should name the hosts, say what the event is, give the date, time, venue and a map, list dress if any, and give a number to confirm and a reply-by date. Below are samples for a wedding, ruracio, introduction, kitchen party and bridal shower.',
      sections: [
        {
          id: 'checklist',
          h2: 'What to include',
          blocks: [
            {
              t: 'ol',
              items: [
                'Names of the couple and the families hosting.',
                'The kind of event.',
                'Date, day and start time.',
                'Venue with directions or a map.',
                'Dress code, if any.',
                'A number to confirm attendance and a reply-by date.',
                'How to contribute, if you accept contributions, said gently.',
              ],
            },
          ],
        },
        {
          id: 'samples',
          h2: 'Sample wording',
          blocks: [
            { t: 'h3', text: 'Wedding' },
            {
              t: 'note',
              text: 'Together with their families, [name] and [name] joyfully invite you to their wedding on [day, date] at [time], [venue]. Reception to follow. Kindly confirm by [date] on [number].',
            },
            { t: 'h3', text: 'Ruracio (dowry ceremony, as practised in some communities)' },
            {
              t: 'note',
              text: 'The family of [name] warmly invites you to the ruracio of [name] and [name] on [day, date] at [time], [venue]. Your presence will honour both families. Please confirm on [number].',
            },
            { t: 'h3', text: 'Introduction ceremony' },
            {
              t: 'note',
              text: 'The families of [name] and [name] invite you to the introduction ceremony on [day, date] at [time], [venue]. Kindly confirm by [date].',
            },
            { t: 'h3', text: 'Kitchen party' },
            {
              t: 'note',
              text: 'You are invited to [name]’s kitchen party on [day, date] at [time], [venue]. A kitchen gift is welcome. Please confirm on [number].',
            },
            { t: 'h3', text: 'Bridal shower' },
            {
              t: 'note',
              text: 'Join us to celebrate [name] before her wedding. [day, date], [time], [venue]. Please confirm on [number] by [date].',
            },
            { t: 'h3', text: 'Swahili line to add to any of the above' },
            { t: 'note', text: 'Karibu sana. Tafadhali thibitisha kuhudhuria kabla ya [tarehe].' },
          ],
        },
        {
          id: 'tips',
          h2: 'Tips',
          blocks: [
            {
              t: 'ul',
              items: [
                'Write the date in words and digits.',
                'Use one language per line to keep cards readable.',
                'Check traditions with the elders of both families before printing.',
                'Do not make contributions a condition of attending.',
              ],
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Should the invitation be in English or Swahili?',
          a: 'Use what your guests read most easily. Many Kenyan invitations combine English with a short Swahili line.',
        },
        {
          q: 'How early should invitations go out?',
          a: 'About two to three months before, with a reminder a few weeks before the reply-by date.',
        },
      ],
    },
    sw: {
      nav: 'Maneno ya kadi ya harusi Kenya',
      title: 'Maneno ya Kadi ya Harusi Kenya: Sampuli za Ruracio na Zaidi',
      description:
        'Sampuli za maneno ya kadi za harusi, ruracio, utambulisho, kitchen party na bridal shower Kenya kwa Kiswahili na Kiingereza, pamoja na orodha ya maelezo ya kujumuisha.',
      h1: 'Maneno ya kadi ya harusi Kenya: sampuli kwa Kiswahili na Kiingereza',
      answer:
        'Kadi ya Kenya inapaswa kutaja wenyeji, kusema ni tukio gani, kutoa tarehe, saa, ukumbi na ramani, kutaja mavazi kama yapo, na kutoa namba ya kuthibitisha na tarehe ya mwisho ya kujibu. Hapa kuna sampuli za harusi, ruracio, utambulisho, kitchen party na bridal shower.',
      sections: [
        {
          id: 'checklist',
          h2: 'Cha kujumuisha',
          blocks: [
            {
              t: 'ol',
              items: [
                'Majina ya wanandoa na familia zinazoandaa.',
                'Aina ya tukio.',
                'Tarehe, siku na saa ya kuanza.',
                'Ukumbi pamoja na maelekezo au ramani.',
                'Mavazi, kama yapo.',
                'Namba ya kuthibitisha kuhudhuria na tarehe ya mwisho ya kujibu.',
                'Jinsi ya kuchangia, ikiwa mnapokea michango, kwa upole.',
              ],
            },
          ],
        },
        {
          id: 'samples',
          h2: 'Sampuli za maneno',
          blocks: [
            { t: 'h3', text: 'Harusi' },
            {
              t: 'note',
              text: 'Pamoja na familia zao, [jina] na [jina] wanakualika kwa furaha kwenye harusi yao tarehe [siku, tarehe] saa [saa], [ukumbi]. Mapokezi yatafuata. Tafadhali thibitisha kabla ya [tarehe] kwa [namba].',
            },
            {
              t: 'h3',
              text: 'Ruracio (sherehe ya mahari, kama inavyofanyika kwenye jamii fulani)',
            },
            {
              t: 'note',
              text: 'Familia ya [jina] inakukaribisha kwenye ruracio ya [jina] na [jina] tarehe [siku, tarehe] saa [saa], [ukumbi]. Uwepo wako utaziheshimu familia zote mbili. Tafadhali thibitisha kwa [namba].',
            },
            { t: 'h3', text: 'Sherehe ya utambulisho' },
            {
              t: 'note',
              text: 'Familia za [jina] na [jina] zinakualika kwenye sherehe ya utambulisho tarehe [siku, tarehe] saa [saa], [ukumbi]. Tafadhali thibitisha kabla ya [tarehe].',
            },
            { t: 'h3', text: 'Kitchen party' },
            {
              t: 'note',
              text: 'Unakaribishwa kwenye kitchen party ya [jina] tarehe [siku, tarehe] saa [saa], [ukumbi]. Zawadi ya jikoni inakaribishwa. Tafadhali thibitisha kwa [namba].',
            },
            { t: 'h3', text: 'Bridal shower' },
            {
              t: 'note',
              text: 'Jiunge nasi kusherehekea [jina] kabla ya harusi yake. [siku, tarehe], [saa], [ukumbi]. Tafadhali thibitisha kwa [namba] kabla ya [tarehe].',
            },
            { t: 'h3', text: 'Mstari wa Kiingereza wa kuongeza' },
            {
              t: 'note',
              text: 'You are warmly welcome. Please confirm your attendance by [date].',
            },
          ],
        },
        {
          id: 'tips',
          h2: 'Vidokezo',
          blocks: [
            {
              t: 'ul',
              items: [
                'Andika tarehe kwa herufi na tarakimu.',
                'Tumia lugha moja kwa kila mstari ili kadi isomeke.',
                'Hakikisha mila na wazee wa familia zote mbili kabla ya kuchapisha.',
                'Usiweke michango kama sharti la kuhudhuria.',
              ],
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Kadi iwe kwa Kiingereza au Kiswahili?',
          a: 'Tumia lugha wageni wako wanayosoma kwa urahisi. Kadi nyingi za Kenya huchanganya Kiingereza na mstari mfupi wa Kiswahili.',
        },
        {
          q: 'Mialiko itumwe mapema kiasi gani?',
          a: 'Takriban miezi miwili hadi mitatu kabla, na ukumbusho wiki chache kabla ya tarehe ya mwisho ya kujibu.',
        },
      ],
    },
  },
  {
    market: 'ke',
    counterpart: { market: 'tz', slug: 'usalama-wa-kadi-za-mtandaoni' },
    slug: 'is-a-digital-wedding-invitation-safe',
    group: 'guide',
    schema: 'Article',
    updated: UPDATED,
    related: ['wedding-contributions-guide', '', 'tz:usalama-wa-kadi-za-mtandaoni'],
    en: {
      nav: 'Is a digital invitation safe?',
      title: 'Is a Digital Wedding Invitation Safe? Spotting Scams in Kenya',
      description:
        'How to tell a genuine digital wedding invitation from a scam in Kenya: red flags, safe checks, and what never to send, including M-Pesa PINs and OTPs.',
      h1: 'Is a digital wedding invitation safe? How to spot a scam',
      answer:
        'A genuine digital wedding invitation shows who sent it and a committee number you can call, and never asks for a password, PIN or OTP or for you to install an app. Verify by phoning the host or committee on a number you already have before you tap, pay or reply.',
      sections: [
        {
          id: 'flags',
          h2: 'Red flags',
          blocks: [
            {
              t: 'ul',
              items: [
                'A message from an unknown number urging you to act quickly.',
                'A request to download an app or APK to view the card.',
                'Any request for your M-Pesa PIN, a one-time code or a password.',
                'A contribution request that points to a number or paybill nobody on the committee recognises.',
                'A link that looks slightly different from the one the committee shared.',
              ],
            },
          ],
        },
        {
          id: 'checks',
          h2: 'Safe checks',
          blocks: [
            {
              t: 'ol',
              items: [
                'Phone the host or a committee member on a number you already have.',
                'Ask the committee to confirm the payment number before you send money.',
                'Check your balance in your own M-Pesa app instead of trusting a forwarded confirmation message.',
                'Look for a clear sender line and a contact number on the invitation.',
                'If in doubt, do not tap, pay or reply.',
              ],
            },
          ],
        },
        {
          id: 'never',
          h2: 'What a genuine card never asks for',
          blocks: [
            {
              t: 'p',
              text: 'A card should never ask for your PIN, a code sent to your phone, a password or a bank detail. Paying a contribution is a separate step that you confirm on your own phone.',
            },
          ],
        },
        {
          id: 'status',
          h2: 'About Harusi Pass cards',
          blocks: [
            {
              t: 'note',
              text: 'Harusi Pass cards show the sender and committee phone, ask for no password or PIN, and send no apps or attachments. The service is in a pilot in Tanzania and is not yet available for Kenyan numbers; if you receive a message claiming to be from Harusi Pass about a Kenyan event, verify it with the committee first.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'What should I do if I think an invitation is a scam?',
          a: 'Do not click or pay. Phone the host on a number you already have, delete the message and report the number to your network.',
        },
        {
          q: 'Is it safe to pay a contribution from an invitation link?',
          a: 'Only if the committee has confirmed the payment details through another channel and you approve the payment on your own phone.',
        },
      ],
    },
    sw: {
      nav: 'Je, kadi ya mtandaoni ni salama?',
      title: 'Je, Kadi ya Harusi ya Mtandaoni ni Salama? Kutambua Ulaghai Kenya',
      description:
        'Jinsi ya kutofautisha kadi halali ya harusi ya mtandaoni na ulaghai Kenya: ishara hatari, ukaguzi salama, na vitu usivyopaswa kutuma, ikiwemo PIN za M-Pesa na OTP.',
      h1: 'Je, kadi ya harusi ya mtandaoni ni salama? Jinsi ya kutambua ulaghai',
      answer:
        'Kadi halali ya harusi ya mtandaoni inaonyesha aliyeituma na namba ya kamati unayoweza kupiga, na haiombi nenosiri, PIN wala OTP, wala kukutaka usakinishe programu. Thibitisha kwa kumpigia mwenyeji au kamati kwa namba uliyonayo kabla ya kubonyeza, kulipa au kujibu.',
      sections: [
        {
          id: 'flags',
          h2: 'Ishara hatari',
          blocks: [
            {
              t: 'ul',
              items: [
                'Ujumbe kutoka namba usiyoijua unaokushinikiza kuchukua hatua haraka.',
                'Ombi la kupakua programu au APK ili kuona kadi.',
                'Ombi lolote la PIN ya M-Pesa, msimbo wa mara moja au nenosiri.',
                'Ombi la mchango linaloelekeza kwa namba au paybill ambayo hakuna mwanakamati anayeitambua.',
                'Kiungo kinachoonekana tofauti kidogo na kile kamati ilichoshiriki.',
              ],
            },
          ],
        },
        {
          id: 'checks',
          h2: 'Ukaguzi salama',
          blocks: [
            {
              t: 'ol',
              items: [
                'Mpigie mwenyeji au mwanakamati kwa namba uliyonayo tayari.',
                'Mwombe kamati kuthibitisha namba ya malipo kabla ya kutuma pesa.',
                'Kagua salio kwenye programu yako ya M-Pesa badala ya kuamini ujumbe wa uthibitisho uliotumwa.',
                'Tafuta mstari wazi wa mtumaji na namba ya mawasiliano kwenye mwaliko.',
                'Ukiwa na shaka, usibonyeze, usilipe wala kujibu.',
              ],
            },
          ],
        },
        {
          id: 'never',
          h2: 'Kadi halali haiombi nini kamwe',
          blocks: [
            {
              t: 'p',
              text: 'Kadi haipaswi kuomba PIN yako, msimbo uliotumwa kwenye simu yako, nenosiri wala taarifa za benki. Kulipa mchango ni hatua tofauti unayothibitisha kwenye simu yako mwenyewe.',
            },
          ],
        },
        {
          id: 'status',
          h2: 'Kuhusu kadi za Harusi Pass',
          blocks: [
            {
              t: 'note',
              text: 'Kadi za Harusi Pass zinaonyesha mtumaji na simu ya kamati, hazioombi nenosiri wala PIN, na hazitumi programu wala viambatisho. Huduma iko kwenye majaribio nchini Tanzania na bado haipatikani kwa namba za Kenya; ukipokea ujumbe unaodai kuwa kutoka Harusi Pass kuhusu tukio la Kenya, uthibitishe na kamati kwanza.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Nifanye nini nikidhani mwaliko ni ulaghai?',
          a: 'Usibonyeze wala kulipa. Mpigie mwenyeji kwa namba uliyonayo, futa ujumbe na uripoti namba hiyo kwa mtandao wako.',
        },
        {
          q: 'Ni salama kulipa mchango kutoka kwenye kiungo cha mwaliko?',
          a: 'Tu ikiwa kamati imethibitisha maelezo ya malipo kwa njia nyingine na unaidhinisha malipo kwenye simu yako mwenyewe.',
        },
      ],
    },
  },
];
