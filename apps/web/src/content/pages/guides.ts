import type { ContentPageDef } from '../types';

const UPDATED = '2026-10-15';

export const GUIDE_PAGES: ContentPageDef[] = [
  {
    slug: 'kadi-ya-harusi-bila-smartphone',
    group: 'guide',
    schema: 'Article',
    updated: UPDATED,
    related: [
      'kadi-ya-harusi-mtandaoni',
      'lango-la-harusi-qr',
      'usalama-wa-kadi-za-mtandaoni',
      'maswali',
    ],
    sw: {
      nav: 'Wageni wasio na smartphone',
      title: 'Kadi ya Harusi kwa Wasio na Smartphone | Harusi Pass',
      description:
        'Jinsi ya kuwaalika wazazi na wageni wasio na smartphone: SMS yenye namba, kadi ya karatasi yenye QR, na kuingia langoni kwa namba au jina.',
      h1: 'Jinsi ya kuwaalika wageni wasio na smartphone',
      answer:
        'Mgeni asiye na smartphone anapokea SMS yenye namba yake fupi, kama KH-4826, au kadi ya karatasi yenye QR na namba hiyohiyo. Langoni anataja namba, jina au tarakimu nne za mwisho za simu yake, na kamati inamwingiza bila kuhitaji intaneti.',
      sections: [
        {
          id: 'kwa-nini',
          h2: 'Kwa nini hili ni muhimu',
          blocks: [
            {
              t: 'p',
              text: 'Wazazi, babu, bibi na wageni wengi wa vijijini hutumia simu za kawaida. Mwaliko unaotegemea kiungo cha WhatsApp au picha ya QR haumfikii. Mfumo unaowasahau ndio unaosababisha malalamiko kwamba “sikupata kadi”.',
            },
          ],
        },
        {
          id: 'njia-tatu',
          h2: 'Njia tatu za kumfikia kila mgeni',
          blocks: [
            {
              t: 'table',
              head: ['Njia', 'Mgeni anapokea nini', 'Langoni'],
              rows: [
                ['SMS', 'Ujumbe mfupi wenye kiungo na namba ya kadi', 'Anataja namba'],
                [
                  'Karatasi',
                  'Kadi iliyochapishwa yenye QR na namba',
                  'Anaonyesha QR au anataja namba',
                ],
                [
                  'Simu ya mtu mwingine',
                  'Mwana au jirani anamfungulia kiungo',
                  'Anaonyesha skrini au anataja namba',
                ],
              ],
            },
          ],
        },
        {
          id: 'langoni',
          h2: 'Langoni: namba, jina au simu',
          blocks: [
            {
              t: 'p',
              text: 'Mlinda lango anaweza kutafuta mgeni kwa namba ya kadi, kwa jina, au kwa tarakimu nne za mwisho za simu. Orodha iko kwenye simu ya mlinda lango, kwa hiyo utafutaji unafanya kazi bila mtandao. Ikibidi, mwenyeji au kamati anaweza kumwingiza mgeni kwa mkono kwa kutaja sababu, na kitendo hicho kinarekodiwa.',
            },
          ],
        },
        {
          id: 'vidokezo',
          h2: 'Vidokezo kwa kamati',
          blocks: [
            {
              t: 'ul',
              items: [
                'Uliza mgeni namba ya simu ya mtu anayemwamini ikiwa yeye mwenyewe hana.',
                'Chapisha kadi za wazee mapema na uzipeleke kwa mkono.',
                'Mwambie mgeni asaidiwe kuhifadhi namba ya kadi kwenye kumbukumbu ya simu yake.',
                'Weka dawati la “tatizo la kadi” langoni na mtu mmoja wa kutafuta kwa jina.',
              ],
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Je, mgeni anahitaji intaneti?',
          a: 'Hapana. SMS inasomeka kwenye simu yoyote, na kuingia langoni kunahitaji namba tu.',
        },
        {
          q: 'Mgeni akipoteza SMS?',
          a: 'Kamati inaweza kumtafuta kwa jina au tarakimu za simu na kumtumia tena au kumwingiza.',
        },
      ],
    },
    en: {
      nav: 'Guests without smartphones',
      title: 'Wedding Cards for Guests Without Smartphones | Harusi Pass',
      description:
        'How to invite parents and guests who have no smartphone: an SMS with a number, a paper card with a QR, and entry at the gate by number or name.',
      h1: 'How to invite guests who do not have a smartphone',
      answer:
        'A guest without a smartphone gets an SMS with their short number, such as KH-4826, or a paper card with a QR and the same number. At the gate they give the number, their name or the last four digits of their phone, and the committee admits them without needing internet.',
      sections: [
        {
          id: 'why',
          h2: 'Why this matters',
          blocks: [
            {
              t: 'p',
              text: 'Parents, grandparents and many rural guests use basic phones. An invitation that depends on a WhatsApp link or a QR image does not reach them. Forgetting them is what causes the complaint “I never got a card”.',
            },
          ],
        },
        {
          id: 'three',
          h2: 'Three ways to reach every guest',
          blocks: [
            {
              t: 'table',
              head: ['Method', 'What the guest receives', 'At the gate'],
              rows: [
                ['SMS', 'A short message with a link and the card number', 'They say the number'],
                [
                  'Paper',
                  'A printed card with a QR and number',
                  'They show the QR or say the number',
                ],
                [
                  'Someone else’s phone',
                  'A child or neighbour opens the link for them',
                  'They show the screen or say the number',
                ],
              ],
            },
          ],
        },
        {
          id: 'gate',
          h2: 'At the gate: number, name or phone',
          blocks: [
            {
              t: 'p',
              text: 'A gate agent can find a guest by card number, by name, or by the last four digits of their phone. The list is on the agent’s phone, so searching works offline. If needed, the host or committee can admit a guest manually with a reason, and that action is logged.',
            },
          ],
        },
        {
          id: 'tips',
          h2: 'Tips for the committee',
          blocks: [
            {
              t: 'ul',
              items: [
                'Ask for the number of a trusted relative if the guest has none.',
                'Print elders’ cards early and deliver them by hand.',
                'Help the guest save the card number in their phone notes.',
                'Set up a “card problem” desk at the gate with one person searching by name.',
              ],
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Does the guest need internet?',
          a: 'No. An SMS reads on any phone, and entry at the gate needs only the number.',
        },
        {
          q: 'What if a guest loses the SMS?',
          a: 'The committee can find them by name or phone digits and resend or admit them.',
        },
      ],
    },
  },
  {
    slug: 'usalama-wa-kadi-za-mtandaoni',
    group: 'guide',
    schema: 'Article',
    updated: UPDATED,
    related: ['kadi-ya-harusi-mtandaoni', 'maswali', 'privacy', 'ombi-la-data'],
    sw: {
      nav: 'Usalama wa kadi',
      title: 'Je, Kadi ya Harusi ya Mtandaoni ni Salama au Ulaghai?',
      description:
        'Jinsi ya kutambua kadi halali ya harusi ya mtandaoni: mtumaji anaonekana, hakuna nenosiri wala PIN, hakuna programu ya kupakua, na namba ya kamati ya kupiga.',
      h1: 'Je, kadi ya harusi ya mtandaoni ni salama? Jinsi ya kutambua ulaghai',
      answer:
        'Kadi halali ya Harusi Pass inaonyesha jina la mtumaji na namba ya simu ya kamati, haikuombi nenosiri, PIN wala OTP, na haikutumi programu au kiambatisho. Ukiwa na shaka, mpigie kamati kwa namba iliyo kwenye kadi kabla ya kubonyeza chochote.',
      sections: [
        {
          id: 'sababu',
          h2: 'Kwa nini watu wanaogopa kadi za mtandaoni',
          blocks: [
            {
              t: 'p',
              text: 'Matapeli hutuma viungo vya uongo vinavyoiga mialiko, vikiomba kupakua programu au kuweka namba ya siri. Wageni wengi wamejifunza kuwa makini, na ni sawa. Kamati zinazotumia kadi za kidijitali mara nyingi hulazimika kupiga simu kueleza kwamba si ulaghai.',
            },
          ],
        },
        {
          id: 'ishara',
          h2: 'Ishara za kadi halali ya Harusi Pass',
          blocks: [
            {
              t: 'ul',
              items: [
                'Juu ya kadi kuna mstari unaosema “Mwaliko huu umetumwa na [jina la kamati]”.',
                'Namba ya simu ya kamati inaonekana, pamoja na kitufe cha kupiga.',
                'Anwani ya tovuti ni ya Harusi Pass; kiungo ni cha kadi yako tu.',
                'Kadi inaonyesha jina lako, si orodha ya wageni wengine.',
                'Hakuna kinachoomba nenosiri, PIN ya simu, namba ya benki wala OTP.',
              ],
            },
          ],
        },
        {
          id: 'hatupaswi',
          h2: 'Mambo ambayo Harusi Pass haifanyi kamwe',
          blocks: [
            {
              t: 'ul',
              items: [
                'Haikuombi nenosiri, PIN ya malipo wala namba za siri kutoka kwa wageni.',
                'Haitumi programu (APK) wala viambatisho vya kupakua.',
                'Haitumii huduma za nje za kufupisha viungo; viungo vyote ni vya tovuti yetu.',
                'Haitumii vidakuzi vya matangazo.',
              ],
            },
          ],
        },
        {
          id: 'shaka',
          h2: 'Ukiwa na shaka, fanya hivi',
          blocks: [
            {
              t: 'ol',
              items: [
                'Usibonyeze kiungo kilichotumwa na namba usiyoijua.',
                'Mpigie mwenyeji au kamati kwa namba uliyonayo tayari.',
                'Tuma ujumbe kwetu kupitia ukurasa wa mawasiliano ukitaka tuthibitishe.',
                'Ukiona ombi la pesa au nenosiri, ripoti na ufute ujumbe.',
              ],
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Mgeni analipa mchango, je, ni salama?',
          a: 'Malipo yanafanyika kwa mtoa huduma wa malipo ya simu; mgeni anathibitisha kwenye simu yake. Hatuombi wala hatuhifadhi PIN.',
        },
        {
          q: 'Mtu akinakili kiungo cha kadi yangu?',
          a: 'Kiungo ni cha kipekee na hakitabiriki. Mwenyeji anaweza kutoa kadi mpya, na ya zamani inakoma kufanya kazi.',
        },
      ],
    },
    en: {
      nav: 'Is it safe?',
      title: 'Is a Digital Wedding Invitation Safe or a Scam?',
      description:
        'How to recognise a genuine digital wedding invitation: the sender is shown, no password or PIN is asked, no app to install, and a committee number to call.',
      h1: 'Are digital wedding invitations safe? How to spot a scam',
      answer:
        'A genuine Harusi Pass card shows the sender’s name and the committee’s phone number, never asks for a password, PIN or OTP, and never sends an app or attachment. If you are unsure, call the committee on the number on the card before tapping anything.',
      sections: [
        {
          id: 'why',
          h2: 'Why people fear online invitations',
          blocks: [
            {
              t: 'p',
              text: 'Scammers send fake links that mimic invitations and ask you to install an app or enter a secret number. Many guests have learned to be careful, and that is right. Committees that use digital cards often have to phone guests to explain it is not a scam.',
            },
          ],
        },
        {
          id: 'signs',
          h2: 'Signs of a genuine Harusi Pass card',
          blocks: [
            {
              t: 'ul',
              items: [
                'A line near the top says “This invitation was sent by [committee name]”.',
                'The committee’s phone number is shown, with a call button.',
                'The web address is Harusi Pass and the link is for your card only.',
                'The card shows your name, not a list of other guests.',
                'Nothing asks for a password, phone PIN, bank number or OTP.',
              ],
            },
          ],
        },
        {
          id: 'never',
          h2: 'What Harusi Pass never does',
          blocks: [
            {
              t: 'ul',
              items: [
                'Ask guests for a password, payment PIN or secret number.',
                'Send an app (APK) or a downloadable attachment.',
                'Use third-party link shorteners; every link is on our own domain.',
                'Use advertising cookies.',
              ],
            },
          ],
        },
        {
          id: 'doubt',
          h2: 'If you are in doubt',
          blocks: [
            {
              t: 'ol',
              items: [
                'Do not tap a link from a number you do not know.',
                'Phone the host or committee on a number you already have.',
                'Message us through the contact page and we will help verify it.',
                'If something asks for money or a password, report it and delete the message.',
              ],
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Is it safe for a guest to pay a contribution?',
          a: 'Payment goes through a mobile payment provider and the guest confirms on their own phone. We neither ask for nor store a PIN.',
        },
        {
          q: 'What if someone copies my card link?',
          a: 'The link is unique and cannot be guessed. The host can issue a new card, and the old one stops working.',
        },
      ],
    },
  },
  {
    slug: 'lango-la-harusi-qr',
    group: 'guide',
    schema: 'Article',
    updated: UPDATED,
    related: [
      'kadi-ya-harusi-bila-smartphone',
      'kadi-ya-harusi-mtandaoni',
      'usalama-wa-kadi-za-mtandaoni',
      'maswali',
    ],
    sw: {
      nav: 'Kuingiza wageni langoni',
      title: 'Jinsi ya Kuingiza Wageni Langoni kwa QR Bila Mtandao',
      description:
        'Mwongozo wa kuingiza wageni wa harusi langoni: skani QR bila mtandao, namba ya kadi, utafutaji wa jina, kadi iliyotumika mara mbili na QR isiyosomeka.',
      h1: 'Jinsi ya kuingiza wageni langoni kwa QR, hata bila mtandao',
      answer:
        'Mlinda lango anafungua programu, anaingiza PIN ya lango, na orodha ya wageni inapakuliwa kwenye simu yake. Kila QR inahakikiwa kwenye simu bila mtandao. Ikishindikana, anaandika namba ya kadi au kutafuta jina. Kadi iliyotumika tayari inaonyesha nani aliingia na saa ngapi.',
      sections: [
        {
          id: 'maandalizi',
          h2: 'Maandalizi kabla ya siku',
          blocks: [
            {
              t: 'ol',
              items: [
                'Mwenyeji anatengeneza kiungo cha lango na PIN kwenye programu.',
                'Walinda lango wanafungua kiungo kwenye simu zao na kuweka PIN.',
                'Simu inapakua orodha ya wageni na funguo za kuhakiki. Fanya hivi mahali penye mtandao.',
                'Jaribu kwa kadi mbili au tatu, ikiwemo ya karatasi.',
              ],
            },
          ],
        },
        {
          id: 'siku',
          h2: 'Siku ya harusi',
          blocks: [
            {
              t: 'p',
              text: 'Elekeza kamera kwenye QR. Skrini nzima inakuwa kijani na jina la mgeni na idadi ya watu wanaoruhusiwa, au njano akiwa ameshaingia, au nyekundu kadi ikiwa si halali. Kila hali ina ikoni na neno, si rangi pekee.',
            },
            {
              t: 'table',
              head: ['Matokeo', 'Maana', 'Fanya nini'],
              rows: [
                ['Kijani: Karibu ndani', 'Kadi halali, mgeni hajaingia', 'Mwingize'],
                [
                  'Njano: Tayari ameingia',
                  'Kadi imeskaniwa awali',
                  'Angalia nani na saa ngapi; mwenyeji anaweza kuruhusu kwa sababu',
                ],
                [
                  'Nyekundu: Kadi si halali',
                  'Imebadilishwa, si ya harusi hii au saini batili',
                  'Tafuta kwa jina',
                ],
              ],
            },
          ],
        },
        {
          id: 'mbadala',
          h2: 'QR ikishindwa: njia mbadala',
          blocks: [
            {
              t: 'ul',
              items: [
                'Andika namba ya kadi, kwa mfano KH-4826.',
                'Tafuta kwa jina au tarakimu nne za mwisho za simu.',
                'Kwa kamati au mwenyeji: ingiza kwa mkono na andika sababu; kitendo kinarekodiwa.',
              ],
            },
            {
              t: 'p',
              text: 'Sababu za kawaida za QR kushindwa ni mwangaza mdogo wa skrini, picha ya skrini yenye ubora hafifu na QR iliyochapishwa ndogo sana. Mwambie mgeni aongeze mwangaza wa skrini. Kadi zetu za karatasi zinachapishwa na QR kubwa ya kutosha na nafasi nyeupe kuizunguka.',
            },
          ],
        },
        {
          id: 'vifaa-vingi',
          h2: 'Walinda lango wengi na kusawazisha',
          blocks: [
            {
              t: 'p',
              text: 'Simu nyingi zinaweza kutumika kwa wakati mmoja. Mtandao ukirudi, uskani unasawazishwa na seva. Mgeni akiskaniwa kwenye simu mbili, aliyeskaniwa kwanza anakubaliwa na wa pili anaonyeshwa kama amerudia.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Je, programu inahitaji mtandao kila uskani?',
          a: 'Hapana. Uhakiki wa QR unafanyika kwenye simu. Mtandao unahitajika kupakua orodha na kusawazisha baadaye.',
        },
        {
          q: 'Mgeni akipiga picha ya QR ya mwingine?',
          a: 'QR inaingiza mara moja. Ikiskaniwa tena, kamati inaona alipoingia mara ya kwanza.',
        },
        {
          q: 'Kadi ikipotea?',
          a: 'Mwenyeji anaweza kutoa kadi mpya; ya zamani inakoma kufanya kazi.',
        },
      ],
    },
    en: {
      nav: 'Gate check-in',
      title: 'How to Check Wedding Guests In With a QR, Even Offline',
      description:
        'A guide to wedding gate check-in: scan QR codes offline, card numbers, name search, a card used twice, and a QR that will not scan.',
      h1: 'How to check in wedding guests with a QR, even without network',
      answer:
        'A gate agent opens the app, enters the gate PIN, and the guest list downloads to their phone. Each QR is verified on the phone with no network. If scanning fails, they type the card number or search by name. A card already used shows who entered and when.',
      sections: [
        {
          id: 'prep',
          h2: 'Preparing before the day',
          blocks: [
            {
              t: 'ol',
              items: [
                'The host creates a gate link and PIN in the app.',
                'Gate agents open the link on their phones and enter the PIN.',
                'The phone downloads the guest list and verification keys. Do this where there is network.',
                'Test with two or three cards, including a paper one.',
              ],
            },
          ],
        },
        {
          id: 'day',
          h2: 'On the day',
          blocks: [
            {
              t: 'p',
              text: 'Point the camera at the QR. The whole screen turns green with the guest’s name and number allowed, amber if they already entered, or red if the card is not valid. Every state has an icon and a word, not colour alone.',
            },
            {
              t: 'table',
              head: ['Result', 'Meaning', 'What to do'],
              rows: [
                ['Green: Welcome in', 'Valid card, guest not yet in', 'Admit them'],
                [
                  'Amber: Already checked in',
                  'Card was scanned before',
                  'See who and when; the host can allow with a reason',
                ],
                [
                  'Red: Invalid card',
                  'Replaced, for another event or bad signature',
                  'Search by name',
                ],
              ],
            },
          ],
        },
        {
          id: 'fallback',
          h2: 'When the QR fails: fallbacks',
          blocks: [
            {
              t: 'ul',
              items: [
                'Type the card number, for example KH-4826.',
                'Search by name or the last four digits of the phone.',
                'For the committee or host: admit manually and write a reason; it is logged.',
              ],
            },
            {
              t: 'p',
              text: 'Common reasons a QR fails are low screen brightness, a low-quality screenshot, and a printed QR that is too small. Ask the guest to raise screen brightness. Our paper cards print the QR large enough with white space around it.',
            },
          ],
        },
        {
          id: 'many',
          h2: 'Several gate agents and syncing',
          blocks: [
            {
              t: 'p',
              text: 'Many phones can run at once. When network returns, scans sync to the server. If a guest is scanned on two phones, the earliest scan is accepted and the second is shown as a repeat.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Does the app need network for every scan?',
          a: 'No. QR verification happens on the phone. Network is needed to download the list and to sync later.',
        },
        {
          q: 'What if a guest photographs another guest’s QR?',
          a: 'A QR admits once. If scanned again, the committee sees when it was first used.',
        },
        {
          q: 'What if a card is lost?',
          a: 'The host can issue a new card; the old one stops working.',
        },
      ],
    },
  },
  {
    slug: 'maneno-ya-kadi-ya-harusi',
    group: 'guide',
    schema: 'Article',
    updated: UPDATED,
    related: [
      'kadi-ya-uchumba',
      'kadi-ya-send-off',
      'kadi-ya-harusi-mtandaoni',
      'michango-ya-harusi',
    ],
    sw: {
      nav: 'Maneno ya kadi ya harusi',
      title: 'Maneno ya Kuandika Kwenye Kadi ya Harusi: Sampuli 8',
      description:
        'Sampuli za maneno ya kadi ya mwaliko wa harusi, send-off na uchumba kwa Kiswahili: rasmi, ya kidini na ya kisasa, pamoja na vidokezo vya kuandika.',
      h1: 'Maneno ya kuandika kwenye kadi ya harusi (sampuli 8)',
      answer:
        'Kadi nzuri ya harusi ina majina ya wanandoa, tarehe, saa, mahali, namba ya kuthibitisha na ombi la kujibu kabla ya tarehe fulani. Hapa chini kuna sampuli nane za Kiswahili za harusi, send-off na uchumba ambazo unaweza kunakili na kubadilisha.',
      sections: [
        {
          id: 'muhimu',
          h2: 'Vitu vinane vya lazima kwenye kila kadi',
          blocks: [
            {
              t: 'ol',
              items: [
                'Majina kamili ya wanandoa au wenyeji.',
                'Aina ya tukio: harusi, send-off, uchumba.',
                'Tarehe na siku ya wiki.',
                'Saa ya kuanza.',
                'Mahali pa tukio na ramani.',
                'Mavazi, kama yapo.',
                'Namba ya kamati ya kuthibitisha.',
                'Tarehe ya mwisho ya kujibu.',
              ],
            },
          ],
        },
        {
          id: 'sampuli',
          h2: 'Sampuli za maneno',
          blocks: [
            { t: 'h3', text: '1. Harusi (rasmi)' },
            {
              t: 'note',
              text: 'Tunayo furaha kubwa kukualika kwenye harusi ya [jina] na [jina]. Tarehe: [tarehe]. Saa: [saa]. Mahali: [mahali]. Tafadhali thibitisha kuhudhuria kabla ya [tarehe]. Karibu sana.',
            },
            { t: 'h3', text: '2. Harusi (ya kidini, Kikristo)' },
            {
              t: 'note',
              text: 'Kwa neema ya Mungu, [jina] na [jina] wanakualika kushuhudia ibada ya ndoa yao. Tarehe: [tarehe]. Saa: [saa]. Kanisa: [jina]. Karamu itafuata katika [ukumbi].',
            },
            { t: 'h3', text: '3. Harusi (ya kidini, Kiislamu)' },
            {
              t: 'note',
              text: 'Bismillahi. Tunakualika kwenye nikah na hafla ya [jina] na [jina]. Tarehe: [tarehe]. Saa: [saa]. Mahali: [msikiti/ukumbi]. Mwenyezi Mungu awabariki.',
            },
            { t: 'h3', text: '4. Harusi (ya kisasa)' },
            {
              t: 'note',
              text: '[jina] na [jina] wanaoana! Jiunge nasi kusherehekea tarehe [tarehe] saa [saa], [ukumbi]. Uwepo wako ndiyo zawadi kubwa.',
            },
            { t: 'h3', text: '5. Send-off' },
            {
              t: 'note',
              text: 'Familia ya [jina] inakualika kwenye sherehe ya kumuaga [jina] kabla ya ndoa yake. Tarehe: [tarehe]. Saa: [saa]. Mahali: [mahali]. Tafadhali thibitisha kwa [namba].',
            },
            { t: 'h3', text: '6. Uchumba' },
            {
              t: 'note',
              text: 'Familia zetu zinafurahi kukualika kwenye sherehe ya uchumba wa [jina] na [jina]. Tarehe: [tarehe]. Saa: [saa]. Mahali: [mahali].',
            },
            { t: 'h3', text: '7. Kitchen party' },
            {
              t: 'note',
              text: 'Karibu kwenye kitchen party ya [jina]. Tarehe: [tarehe]. Saa: [saa]. Mahali: [mahali]. Zawadi ya jikoni inakaribishwa. Thibitisha kwa [namba].',
            },
            { t: 'h3', text: '8. Ombi la mchango' },
            {
              t: 'note',
              text: 'Mchango wowote utapokelewa kwa shukrani. Unaweza kuchangia moja kwa moja kupitia kadi yako. Mungu akubariki.',
            },
          ],
        },
        {
          id: 'vidokezo',
          h2: 'Vidokezo vya kuandika vizuri',
          blocks: [
            {
              t: 'ul',
              items: [
                'Tumia sentensi fupi na heshima: “Karibu”, “Tafadhali”.',
                'Andika tarehe kwa herufi na tarakimu kuepuka makosa.',
                'Usiweke michango kama sharti la kuhudhuria.',
                'Mwombe msemaji mzuri wa Kiswahili apitie maandishi kabla ya kuchapisha.',
              ],
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Naweza kuandika kwa Kiingereza na Kiswahili?',
          a: 'Ndiyo. Kadi inaonyesha lugha ya mgeni, na mgeni anaweza kubadilisha kati ya Kiswahili na Kiingereza.',
        },
        {
          q: 'Maneno yanawekwa wapi kwenye Harusi Pass?',
          a: 'Salamu yako inaonekana juu ya kadi, na maelezo mengine yanaingia kwenye sehemu ya tukio.',
        },
      ],
    },
    en: {
      nav: 'Invitation wording',
      title: 'Wedding Invitation Wording in Swahili and English: 8 Samples',
      description:
        'Sample wording for wedding, send-off and engagement invitations in Swahili and English: formal, religious and modern, with tips for writing.',
      h1: 'Wedding invitation wording (8 samples)',
      answer:
        'A good invitation has the names, date, time, place, a number to confirm and a reply-by date. Below are eight Swahili samples for weddings, send-offs and engagements you can copy and adapt, with English meaning notes.',
      sections: [
        {
          id: 'must',
          h2: 'Eight things every card needs',
          blocks: [
            {
              t: 'ol',
              items: [
                'Full names of the couple or hosts.',
                'The kind of event: wedding, send-off, engagement.',
                'Date and day of the week.',
                'Start time.',
                'Place and a map.',
                'Dress code, if any.',
                'A committee number to confirm.',
                'A reply-by date.',
              ],
            },
          ],
        },
        {
          id: 'samples',
          h2: 'Sample wording',
          blocks: [
            { t: 'h3', text: '1. Wedding (formal)' },
            {
              t: 'note',
              text: 'We are delighted to invite you to the wedding of [name] and [name]. Date: [date]. Time: [time]. Venue: [venue]. Please confirm by [date]. You are most welcome.',
            },
            { t: 'h3', text: '2. Wedding (Christian)' },
            {
              t: 'note',
              text: 'By the grace of God, [name] and [name] invite you to witness their marriage service. Date: [date]. Time: [time]. Church: [name]. A reception follows at [venue].',
            },
            { t: 'h3', text: '3. Wedding (Muslim)' },
            {
              t: 'note',
              text: 'Bismillah. We invite you to the nikah and celebration of [name] and [name]. Date: [date]. Time: [time]. Place: [mosque/venue]. May God bless them.',
            },
            { t: 'h3', text: '4. Wedding (modern)' },
            {
              t: 'note',
              text: '[name] and [name] are getting married! Join us on [date] at [time], [venue]. Your presence is the greatest gift.',
            },
            { t: 'h3', text: '5. Send-off' },
            {
              t: 'note',
              text: 'The family of [name] invites you to a send-off celebration for [name] before her marriage. Date: [date]. Time: [time]. Venue: [venue]. Please confirm on [number].',
            },
            { t: 'h3', text: '6. Engagement' },
            {
              t: 'note',
              text: 'Our families are happy to invite you to the engagement celebration of [name] and [name]. Date: [date]. Time: [time]. Venue: [venue].',
            },
            { t: 'h3', text: '7. Kitchen party' },
            {
              t: 'note',
              text: 'You are welcome at [name]’s kitchen party. Date: [date]. Time: [time]. Venue: [venue]. A kitchen gift is welcome. Confirm on [number].',
            },
            { t: 'h3', text: '8. Contribution request' },
            {
              t: 'note',
              text: 'Any contribution will be received with gratitude. You can contribute directly through your card. God bless you.',
            },
          ],
        },
        {
          id: 'tips',
          h2: 'Tips for writing well',
          blocks: [
            {
              t: 'ul',
              items: [
                'Use short, courteous sentences: “Karibu”, “Tafadhali”.',
                'Write the date in words and digits to avoid mistakes.',
                'Do not make contributions a condition of attending.',
                'Ask a good Swahili speaker to read the text before printing.',
              ],
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Can I write in both English and Swahili?',
          a: 'Yes. The card shows the guest’s language and they can switch between Swahili and English.',
        },
        {
          q: 'Where does my wording go in Harusi Pass?',
          a: 'Your greeting shows at the top of the card, and other details go in the event section.',
        },
      ],
    },
  },
];
