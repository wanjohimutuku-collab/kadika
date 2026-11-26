import type { ContentPageDef } from '../types';

const UPDATED = '2026-11-26';

/**
 * Swahili answer-first pillar pages (Prompt 5). Each opens with a 2–3 sentence direct answer,
 * uses question-based H2 headings, includes a numbered how-to and 4–6 FAQs, links to service,
 * pricing (/bei) and safety pages, and stays between 600 and 900 words in Kiswahili.
 */
export const SWAHILI_ANSWER_PAGES: ContentPageDef[] = [
  {
    slug: 'kadi-za-harusi-online',
    slugEn: 'online-wedding-cards-whatsapp-sms',
    group: 'guide',
    schema: 'Article',
    published: UPDATED,
    updated: UPDATED,
    related: [
      'kadi-ya-harusi-mtandaoni',
      'michango-ya-harusi',
      'usalama-wa-kadi-za-mtandaoni',
      'mwaliko-bila-smartphone',
    ],
    sw: {
      nav: 'Kadi za harusi online',
      title: 'Kadi za Harusi Online Tanzania: WhatsApp na SMS',
      description:
        'Jinsi ya kutengeneza na kutuma kadi za harusi online Tanzania kwa WhatsApp, SMS na PDF ya kuchapisha, pamoja na QR ya langoni bila mtandao.',
      h1: 'Kadi za harusi online Tanzania: jinsi ya kutuma kwa WhatsApp na SMS',
      answer:
        'Ili kutuma kadi za harusi online Tanzania, andika taarifa za harusi, ingiza orodha ya wageni wenye namba za simu, kisha tuma kiungo cha kipekee kwa WhatsApp au SMS. Kila kadi inabeba msimbo wa QR na namba fupi ya langoni, na unaziona majibu ya RSVP pamoja na michango moja kwa moja kwenye dashibodi. Anza bure na kadi 5 za kwanza.',
      sections: [
        {
          id: 'kwa-nini-kadi-ya-kipekee',
          h2: 'Kwa nini utume kadi ya kipekee badala ya picha kwenye kundi la WhatsApp?',
          blocks: [
            {
              t: 'p',
              text: 'Unapotuma picha moja ya mwaliko kwenye kundi la WhatsApp, huna njia ya kujua ni nani ameiona, nani atakuja, au atakuja na watu wangapi. Zaidi ya hapo, picha hiyo inaweza kusambazwa kwa watu ambao hawakualikwa na kusababisha msongamano ukumbini au upungufu wa chakula na viti siku ya harusi.',
            },
            {
              t: 'p',
              text: 'Kwa kutumia kadi za harusi online kwenye Kadi Sasa, kila mgeni anapata kiungo chake binafsi kinachoonyesha jina lake, idadi ya viti alivyopangiwa, ramani ya ukumbi na namba ya mawasiliano ya kamati. Picha ya kadi haiwezi kutumika mara mbili mlangoni kwa sababu QR inaruhusu kuingia mara moja tu.',
            },
            {
              t: 'ul',
              items: [
                'Unajua hali ya kila mgeni: imetumwa, imefika, imefunguliwa na imethibitishwa.',
                'Wageni wako mikoani au nje ya nchi wanapata kadi papo hapo bila gharama za usafiri.',
                'Wazee wasio na smartphone bado wanapata SMS yenye namba fupi au PDF ya karatasi iliyo na QR ileile.',
                'Kamati inaona makadirio halisi ya wageni kabla ya kufunga hesabu za mapishi.',
              ],
            },
          ],
        },
        {
          id: 'jinsi-ya-kutuma',
          h2: 'Hatua za kutengeneza na kutuma kadi za harusi online ni zipi?',
          blocks: [
            {
              t: 'ol',
              items: [
                'Ingia kwenye Kadi Sasa kwa namba yako ya simu na uthibitishe kwa msimbo wa SMS bila kuhitaji kadi ya benki.',
                'Jaza taarifa za harusi: majina ya maharusi, tarehe, saa, ukumbi, ramani, mavazi na namba ya simu ya kamati.',
                'Chagua mtindo wa rangi ya kadi na kagua muonekano wake kama mgeni atakavyouona kwenye simu yake.',
                'Ingiza orodha ya wageni kwa kubandika majina, kupakia faili la CSV au kuchagua kutoka kwenye anwani za simu; namba za Tanzania husafishwa kiotomatiki kuwa +255.',
                'Chagua njia ya kutuma: WhatsApp kwa wenye smartphone, SMS kwa simu za kawaida, na PDF ya A6 au A4 kwa wazee wanaohitaji kadi za karatasi.',
                'Tuma kadi na fuatilia majibu ya RSVP moja kwa moja; wasiojibu wanaweza kupata vikumbusho vya heshima kabla ya harusi.',
              ],
            },
            {
              t: 'p',
              text: 'Ikiwa ujumbe wa WhatsApp hautafika ndani ya saa chache kwa sababu mgeni hana mtandao au hana WhatsApp, mfumo unatuma SMS yenye kiungo kifupi na namba ya kadi kiotomatiki ili asikose mwaliko wake.',
            },
          ],
        },
        {
          id: 'simu-ndogo-na-mlangoni',
          h2: 'Je, wageni wasio na smartphone na kumbi zisizo na mtandao wanahudumiwaje?',
          blocks: [
            {
              t: 'p',
              text: 'Kwenye harusi za Kitanzania, bibi, babu na baadhi ya ndugu hutumia simu za kawaida au hupendelea kadi ya mkononi. Kadi Sasa inatuma SMS nyepesi yenye jina la tukio, tarehe na namba fupi kama KH-4826. Pia kamati inaweza kupakua PDF yenye kadi za karatasi za A6, A5 au A4 tayari kwa uchapishaji.',
            },
            {
              t: 'p',
              text: 'Siku ya harusi ukumbini, walinzi wa lango wanatumia programu ya Android ya Kadi Sasa ambayo inapakua orodha ya wageni mapema. Hata kama ukumbi upo nje ya mji au mtandao wa simu ukikatika, skani ya QR na utafutaji wa namba au jina vinaendelea kufanya kazi bila kukwama, na mgeni akijaribu kutumia nakala ya QR ya mtu mwingine, skrini inaonyesha mara moja kuwa tayari ameingia.',
            },
          ],
        },
        {
          id: 'gharama-na-usalama',
          h2: 'Gharama za kadi za harusi online na usalama wake zikoje?',
          blocks: [
            {
              t: 'p',
              text: 'Unaweza kuanza bure kwa kadi 5 za mwanzo kuona jinsi mfumo unavyofanya kazi na kamati yako. Baada ya hapo bei zetu za Tanzania ziko wazi kwenye ukurasa wa bei (/bei): TZS 2,400 kwa kadi kwa oda za kadi 1 hadi 99, TZS 2,200 kwa kadi 100 hadi 499, na TZS 1,950 kwa kadi 500 au zaidi, kila kadi ikiwa na mikopo 4 ya vikumbusho. Hatukati asilimia yoyote kwenye michango ya harusi.',
            },
            {
              t: 'p',
              text: 'Kwa usalama, kila kadi halali inaonyesha jina la kamati na namba ya simu ya kupiga, na kiungo chake huanza na kadisasa.com pekee. Soma pia mwongozo wa huduma ya kadi ya harusi mtandaoni (/kadi-ya-harusi-mtandaoni) na ukurasa wa usalama (/usalama-wa-kadi-za-mtandaoni).',
            },
            {
              t: 'note',
              text: 'Uko tayari kujaribu na kamati yako? Anza bure leo na kadi 5 za kwanza, pakua kadi ya majaribio na uone jinsi RSVP na lango la QR vinavyofanya kazi kabla ya kutuma kwa wageni wote.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Je, ninaweza kutuma kadi za harusi kwa WhatsApp na SMS kwa pamoja?',
          a: 'Ndiyo. Unapoingiza wageni, wenye WhatsApp wanapokea kadi kupitia WhatsApp na wasio nayo wanapokea SMS yenye namba fupi ya kadi. Kadi zote zinatumia msimbo mmoja wa langoni.',
        },
        {
          q: 'Wageni wanahitaji kupakua programu yoyote ili kufungua kadi?',
          a: 'Hapana. Mgeni anafungua kiungo moja kwa moja kwenye kivinjari cha simu yake na anaweza kujibu RSVP papo hapo bila kufungua akaunti au kuweka nenosiri.',
        },
        {
          q: 'Nikibadilisha ukumbi au saa baada ya kutuma kadi, nifanyeje?',
          a: 'Badilisha taarifa kwenye mipangilio ya tukio lako. Kadi ya kidijitali inasasishwa mara moja kwenye kiungo kilekile, bila kulazimika kuchapisha kadi mpya.',
        },
        {
          q: 'Je, kadi za harusi online zinaweza kuchapishwa kwa wazee?',
          a: 'Ndiyo. Kadi Sasa inatengeneza PDF yenye kadi za A6, A5 au kadi 4 kwenye ukurasa wa A4 zikiwa na QR safi na namba fupi ya kuingilia langoni.',
        },
        {
          q: 'Gharama ya kuanza kutumia Kadi Sasa ni kiasi gani?',
          a: 'Unaanza bure kwa kadi 5 za kwanza bila kuhitaji kadi ya benki. Baada ya hapo unalipia kadi unazotuma kuanzia TZS 1,950 hadi TZS 2,400 kwa kadi kulingana na ukubwa wa oda.',
        },
      ],
    },
    en: {
      nav: 'Online wedding cards (TZ)',
      title: 'Online Wedding Cards Tanzania: WhatsApp & SMS Guide',
      description:
        'How to create and send online wedding cards in Tanzania via WhatsApp, SMS and printable PDF, with offline QR gate check-in.',
      h1: 'Online wedding cards in Tanzania: how to send via WhatsApp and SMS',
      answer:
        'To send online wedding cards in Tanzania, enter your wedding details, add your guest list with phone numbers, and send each guest a unique link by WhatsApp or SMS. Every card carries a signed QR code and short number, while RSVPs and pledges update live on your dashboard. Start free with 5 cards.',
      sections: [
        {
          id: 'kwa-nini-kadi-ya-kipekee',
          h2: 'Why send individual cards instead of one image in a WhatsApp group?',
          blocks: [
            {
              t: 'p',
              text: 'When you drop a single invitation image into a WhatsApp group, you cannot tell who opened it, who plans to attend, or how many seats they expect. Worse, anyone can forward that image, creating confusion at the gate and throwing off catering numbers.',
            },
            {
              t: 'p',
              text: 'With individual online wedding cards on Kadi Sasa, each guest receives a personal link displaying their name, seat allowance, venue map and committee contact number. Screenshots cannot be reused because every QR admits once.',
            },
            {
              t: 'ul',
              items: [
                'Track delivery per guest: sent, delivered, opened and confirmed.',
                'Reach upcountry and diaspora relatives instantly without courier delays.',
                'Give elders without smartphones an SMS code or printed PDF sharing the same QR.',
                'Lock in accurate headcounts for food and seating early.',
              ],
            },
          ],
        },
        {
          id: 'jinsi-ya-kutuma',
          h2: 'What are the steps to create and send online wedding cards?',
          blocks: [
            {
              t: 'ol',
              items: [
                'Sign in to Kadi Sasa with your phone number and confirm the SMS code — no bank card required.',
                'Enter your wedding details: couple names, date, time, venue, map link, dress code and committee phone.',
                'Pick your card colour theme and preview it just as a guest will see it on their phone.',
                'Add guests by pasting a list, uploading a CSV or picking from contacts; Tanzanian numbers normalise automatically to +255.',
                'Choose delivery per group: WhatsApp for smartphone users, SMS for basic phones, and printable A6/A4 PDFs for elders.',
                'Send invitations and follow live RSVPs; send polite reminders to guests who have not replied.',
              ],
            },
            {
              t: 'p',
              text: 'If a WhatsApp message is not delivered within a few hours, the system automatically falls back to an SMS carrying the short link and card number so no guest misses out.',
            },
          ],
        },
        {
          id: 'simu-ndogo-na-mlangoni',
          h2: 'How do you handle guests without smartphones and venues with poor signal?',
          blocks: [
            {
              t: 'p',
              text: 'In Tanzanian weddings, grandparents and many elders use basic phones or prefer a physical card. Kadi Sasa sends a concise SMS with the event name, date and a short code like KH-4826, and exports print-ready A6, A5 or 4-up A4 PDFs.',
            },
            {
              t: 'p',
              text: 'On the wedding day, ushers use the offline-first Android gate app after downloading the guest list once. Even if venue signal drops completely, QR scanning and lookup by code or name keep running, and forwarded QR photos immediately show as already admitted.',
            },
          ],
        },
        {
          id: 'gharama-na-usalama',
          h2: 'What do online wedding cards cost and how are they kept safe?',
          blocks: [
            {
              t: 'p',
              text: 'Every event starts free with 5 cards so your committee can test the flow first. Paid tiers on our pricing page (/bei) are TZS 2,400 per card (1–99), TZS 2,200 (100–499) and TZS 1,950 (500+), each with 4 reminder credits included and 0% commission on michango.',
            },
            {
              t: 'p',
              text: 'For guest trust, every genuine card displays the committee name and phone number and only opens from kadisasa.com. See our online wedding card service page (/online-wedding-invitation) and safety guide (/security-of-online-invitations).',
            },
            {
              t: 'note',
              text: 'Ready to try it with your committee? Start free with 5 cards today and test RSVP and QR gate scanning before inviting your full list.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Can we send WhatsApp and SMS wedding cards together?',
          a: 'Yes. Smartphone guests receive WhatsApp cards while basic-phone guests receive an SMS with their short card number, all sharing one gate list.',
        },
        {
          q: 'Do guests need to download an app to open their card?',
          a: 'No. Guests open their card link directly in any mobile browser and confirm their RSVP without creating an account.',
        },
        {
          q: 'What if the venue or time changes after we send cards?',
          a: 'Update the event details in your console and the digital card updates immediately on the same link without reprinting.',
        },
        {
          q: 'Can we still print paper cards for elders?',
          a: 'Yes. Export print-ready A6, A5 or 4-up A4 PDF sheets carrying each guest’s name, QR code and short number.',
        },
        {
          q: 'How much does it cost to start?',
          a: 'You start free with 5 cards and no bank card required. After that, cards cost TZS 1,950 to TZS 2,400 depending on order size.',
        },
      ],
    },
  },
  {
    slug: 'kadi-ya-send-off-kitchen-party',
    slugEn: 'send-off-and-kitchen-party-invitations',
    group: 'guide',
    schema: 'Article',
    published: UPDATED,
    updated: UPDATED,
    related: [
      'kadi-ya-send-off',
      'kadi-ya-kitchen-party',
      'michango-ya-harusi',
      'usalama-wa-kadi-za-mtandaoni',
    ],
    sw: {
      nav: 'Send-off na kitchen party',
      title: 'Kadi ya Send-off na Kitchen Party Mtandaoni | Kadi Sasa',
      description:
        'Jinsi ya kutengeneza kadi ya send-off na kitchen party mtandaoni Tanzania: majibu ya RSVP, mavazi ya sherehe, michango na udhibiti wa mlango.',
      h1: 'Kadi ya send-off na kitchen party mtandaoni',
      answer:
        'Kadi ya send-off na kitchen party mtandaoni inakupa kiungo kimoja cha mwaliko chenye tarehe, ukumbi, mavazi na ramani kwa kila mgeni. Unaweza kuandika aina ya sherehe unayotaka, kufuatilia majibu ya RSVP na michango bila makato, na kuwapa wazee SMS au kadi ya karatasi. Anza bure na kadi 5.',
      sections: [
        {
          id: 'tofauti-ya-sherehe',
          h2: 'Je, send-off na kitchen party zinaweza kuendeshwa kwenye mfumo mmoja?',
          blocks: [
            {
              t: 'p',
              text: 'Ndiyo, lakini kila sherehe inaundiwa tukio lake tofauti ili orodha ya wageni, mavazi, ukumbi na hesabu za michango zisichanganyike. Kwenye kitchen party mara nyingi waalikwa ni akina mama, ndugu wa karibu na marafiki wa bibi harusi, ilhali send-off hujumuisha familia pana na wageni wa mikoani.',
            },
            {
              t: 'p',
              text: 'Kwa sababu Kadi Sasa inaruhusu kuandika aina ya tukio kwa uhuru na kufanya jina la pili kuwa la hiari, kadi ya send-off au kitchen party inaonyesha jina la binti na familia yake kwa heshima bila kulazimisha majina mawili.',
            },
            {
              t: 'ul',
              items: [
                'Weka rangi ya mavazi (dress code) na maelezo ya zawadi moja kwa moja kwenye kadi.',
                'Fuatilia kama kila mgeni atakuja peke yake au na mwenzi kulingana na idadi uliyoruhusu.',
                'Tumia daftari la michango la kamati pale tu sherehe inapokusanya michango, au lizime kwa tukio lisilo na michango.',
              ],
            },
          ],
        },
        {
          id: 'hatua-sendoff-kitchen',
          h2: 'Jinsi ya kutengeneza kadi ya send-off au kitchen party hatua kwa hatua',
          blocks: [
            {
              t: 'ol',
              items: [
                'Fungua tukio jipya kwenye Kadi Sasa na uchague au uandike “Send-off” au “Kitchen party”.',
                'Weka jina la mhusika mkuu, jina la familia au kamati inayoalika, na namba ya simu ya mawasiliano.',
                'Jaza tarehe, saa ya kuanza, jina la ukumbi, kiungo cha ramani na maelezo ya mavazi.',
                'Chagua rangi ya kadi inayolingana na mandhari ya ukumbi wenu.',
                'Ingiza orodha ya waalikwa na uamue kama watapokea kadi kwa WhatsApp, SMS au karatasi ya kuchapisha.',
                'Tuma kadi, kisha fuatilia majibu ya RSVP na vikumbusho kabla ya siku ya sherehe.',
              ],
            },
            {
              t: 'p',
              text: 'Baada ya sherehe kumalizika, unaweza kuwasha ukurasa wa picha za Kumbukumbu ili wageni walioalikwa waone picha nzuri za siku hiyo kwa kutumia kiungo chao kilekile.',
            },
          ],
        },
        {
          id: 'wazee-na-mavazi',
          h2: 'Je, shangazi, bibi na wageni wasio na WhatsApp watapataje mwaliko?',
          blocks: [
            {
              t: 'p',
              text: 'Wageni ambao hawatumii WhatsApp wanawekewa chaguo la SMS au kadi ya karatasi. SMS inawafikia kwenye simu yoyote ya kawaida ikiwa na namba fupi ya kadi, na kamati inaweza kuchapisha PDF za A6 au A4 zenye majina yao na msimbo wa QR ili kuwakabidhi mkononi kwa heshima.',
            },
            {
              t: 'p',
              text: 'Mlangoni siku ya tukio, walinzi hawahitaji akaunti ya akaunti ya mwenyeji — wanaingia kupitia kiungo cha lango na PIN ya muda na kuskana QR au kutafuta jina la mgeni kwa haraka.',
            },
          ],
        },
        {
          id: 'bei-na-usalama-sendoff',
          h2: 'Gharama ni kiasi gani na kadi zinalindwaje dhidi ya nakala feki?',
          blocks: [
            {
              t: 'p',
              text: 'Kila tukio linaanza na kadi 5 bure. Baada ya hapo bei kwenye ukurasa wa bei (/bei) ni TZS 2,400 kwa kadi (1–99), TZS 2,200 (100–499), na TZS 1,950 (500+), bila makato yoyote kwenye michango ya wageni. Kadi zote zina QR iliyosainiwa kidijitali ili kuzuia mtu kutumia picha ya kadi ya mwenzake.',
            },
            {
              t: 'p',
              text: 'Soma zaidi kwenye kurasa zetu za huduma ya send-off (/kadi-ya-send-off), kitchen party (/kadi-ya-kitchen-party), na ukurasa wa usalama (/usalama-wa-kadi-za-mtandaoni).',
            },
            {
              t: 'note',
              text: 'Anza kuandaa send-off au kitchen party yako leo kwa kadi 5 za bure — hakiki muonekano wa kadi na uwashirikishe wanakamati wenzako kabla ya kutuma.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Naweza kuandika maelezo ya rangi za sare au zawadi kwenye kadi?',
          a: 'Ndiyo. Kuna sehemu ya mavazi (dress code) na maelezo ya ziada ambapo unaweka rangi za sare, maegesho au maelekezo ya ukumbi.',
        },
        {
          q: 'Je, ninaweza kuzima sehemu ya michango kama hatukusanyi michango?',
          a: 'Ndiyo. Kwenye mipangilio ya tukio unaweza kuzima michango ili kadi ibaki kuwa mwaliko na RSVP pekee.',
        },
        {
          q: 'Kama mgeni anaalika watu wawili, ninaweza kudhibiti hilo?',
          a: 'Ndiyo. Kila mgeni ana idadi yake ya viti (1 hadi 10), na skrini ya mlangoni huonyesha idadi halisi anayoruhusiwa.',
        },
        {
          q: 'Inafaa pia kwa sherehe za kiume au sherehe za familia?',
          a: 'Ndiyo. Aina ya tukio ni huru — unaweza kuandika Send-off, Kitchen party, Bag party au sherehe nyingine yoyote.',
        },
        {
          q: 'Pesa za michango zinapitia Kadi Sasa?',
          a: 'Hapana. Wageni wanalipa moja kwa moja kwa familia au kamati kupitia M-Pesa, Mixx by Yas, Airtel Money, HaloPesa au taslimu kwa 0% makato.',
        },
      ],
    },
    en: {
      nav: 'Send-off & kitchen party',
      title: 'Send-off & Kitchen Party Cards Online | Kadi Sasa',
      description:
        'How to make online send-off and kitchen party invitations in Tanzania with RSVP tracking, dress codes, michango ledger and QR check-in.',
      h1: 'Online send-off and kitchen party invitations',
      answer:
        'An online send-off or kitchen party card gives every guest a personal link with date, venue, dress code and map. You can set any event type, track RSVPs and michango with 0% cut, and reach elders by SMS or printed PDF. Start free with 5 cards.',
      sections: [
        {
          id: 'tofauti-ya-sherehe',
          h2: 'Can send-offs and kitchen parties run on the same platform?',
          blocks: [
            {
              t: 'p',
              text: 'Yes, with each celebration set up as its own event so guest lists, dress codes, venues and contributions stay neatly separated. Kitchen parties usually gather close relatives and friends of the bride, while send-offs bring together wider family and upcountry guests.',
            },
            {
              t: 'p',
              text: 'Because Kadi Sasa supports custom event types and makes the second host name optional, a send-off or kitchen party card respectfully highlights the bride and her family without forcing two names.',
            },
            {
              t: 'ul',
              items: [
                'Display dress-code colours and gift notes clearly on every card.',
                'Control whether each guest is invited solo or with a plus-one.',
                'Enable the committee michango ledger only when collecting contributions, or turn it off for invite-only gatherings.',
              ],
            },
          ],
        },
        {
          id: 'hatua-sendoff-kitchen',
          h2: 'How do you create a send-off or kitchen party card step by step?',
          blocks: [
            {
              t: 'ol',
              items: [
                'Create a new event on Kadi Sasa and pick or type “Send-off” or “Kitchen party”.',
                'Enter the host name, family or committee sender line, and committee contact phone.',
                'Add the date, start time, venue name, map link and dress-code note.',
                'Pick a colour theme matching your hall decor.',
                'Add your guest list and choose WhatsApp, SMS or printable PDF per group.',
                'Send invitations, track RSVPs and schedule polite reminders before the day.',
              ],
            },
            {
              t: 'p',
              text: 'After the party, you can turn on the private Kumbukumbu photo gallery so invited guests can view photos using the same card link.',
            },
          ],
        },
        {
          id: 'wazee-na-mavazi',
          h2: 'How do aunties, grandmothers and non-WhatsApp guests receive their invite?',
          blocks: [
            {
              t: 'p',
              text: 'Guests without WhatsApp receive an SMS with a short card code on any basic phone, or a printed A6/A4 PDF card handed over in person by the family.',
            },
            {
              t: 'p',
              text: 'At the door, ushers join via a gate link and PIN — no full account needed — and scan QR codes or look up guests by name or short code.',
            },
          ],
        },
        {
          id: 'bei-na-usalama-sendoff',
          h2: 'What does it cost and how are cards protected from screenshots?',
          blocks: [
            {
              t: 'p',
              text: 'Every event starts with 5 free cards. Paid pricing on our pricing page (/bei) is TZS 2,400 (1–99), TZS 2,200 (100–499) and TZS 1,950 (500+), with 0% commission on contributions. Every QR is digitally signed and admits once.',
            },
            {
              t: 'p',
              text: 'Explore our send-off (/send-off-invitation), kitchen party (/kitchen-party-invitation) and card safety (/security-of-online-invitations) pages for more detail.',
            },
            {
              t: 'note',
              text: 'Start preparing your send-off or kitchen party today with 5 free cards and preview the layout with your committee before sending.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Can I include dress-code colours or gift instructions on the card?',
          a: 'Yes. Dedicated dress-code and extra-note fields let you list theme colours, parking or hall instructions clearly.',
        },
        {
          q: 'Can I disable contributions if we are not collecting money?',
          a: 'Yes. Switch off contributions in event settings so the card shows invitation details, RSVP and QR only.',
        },
        {
          q: 'Can I limit how many guests one card admits?',
          a: 'Yes. Set allowed party size from 1 to 10 per guest, and the gate scanner enforces that limit.',
        },
        {
          q: 'Does it work for other family celebrations too?',
          a: 'Yes. Event type is free text, so you can label it for any family or private celebration.',
        },
        {
          q: 'Does Kadi Sasa handle or hold contribution funds?',
          a: 'No. Guests pay hosts directly via M-Pesa, Mixx by Yas, Airtel Money, HaloPesa or cash with 0% commission.',
        },
      ],
    },
  },
  {
    slug: 'mwaliko-bila-smartphone',
    slugEn: 'invitations-for-elders-without-smartphones',
    group: 'guide',
    schema: 'Article',
    published: UPDATED,
    updated: UPDATED,
    related: [
      'kadi-ya-harusi-bila-smartphone',
      'kadi-ya-harusi-mtandaoni',
      'lango-la-harusi-qr',
      'usalama-wa-kadi-za-mtandaoni',
    ],
    sw: {
      nav: 'Mwaliko bila smartphone',
      title: 'Mwaliko kwa Wazazi Wasio na Smartphone: SMS na Karatasi',
      description:
        'Jinsi ya kuwaalika bibi, babu na wazazi wasio na smartphone kwenye harusi au sherehe kwa kutumia SMS zenye namba fupi na kadi za karatasi zenye QR.',
      h1: 'Mwaliko kwa wazazi wasio na smartphone: SMS na kadi ya karatasi',
      answer:
        'Wazazi, bibi na babu wasio na smartphone wanaalikwa kupitia SMS nyepesi yenye namba fupi ya kadi (kama KH-4826) au kadi ya karatasi ya PDF yenye msimbo wa QR. Siku ya sherehe langoni, kamati inaingiza wageni kwa kuchanganua QR ya karatasi, kutaja namba fupi, au kutafuta jina na tarakimu nne za mwisho za simu — hata bila mtandao. Anza bure na kadi 5.',
      sections: [
        {
          id: 'tatizo-la-whatsapp-pekee',
          h2: 'Kwa nini mwaliko wa WhatsApp pekee huwaacha wazazi nyuma?',
          blocks: [
            {
              t: 'p',
              text: 'Familia nyingi hutuma mialiko kwa WhatsApp pekee, jambo linalowaacha bibi, babu na ndugu wa vijijini wanaotumia simu za kawaida (simu za tochi) au wanaopendelea kadi ya mkononi. Kuwasilisha mwaliko kwa mdomo pekee mara nyingi husababisha wakose maelezo sahihi ya ukumbi au majina yao yakosekane kwenye daftari la mlangoni.',
            },
            {
              t: 'p',
              text: 'Kadi Sasa inaunganisha wageni wote kwenye orodha moja: wenye smartphone wanapata kadi ya kidijitali kwa WhatsApp, wakati wazazi wasio na smartphone wanapata SMS inayosomeka kwenye simu yoyote au kadi iliyochapishwa yenye QR na namba ileile ya kipekee.',
            },
          ],
        },
        {
          id: 'jinsi-ya-kutuma-sms-na-karatasi',
          h2: 'Jinsi ya kutuma mwaliko kwa wazazi wasio na smartphone hatua kwa hatua?',
          blocks: [
            {
              t: 'ol',
              items: [
                'Unapomuongeza mgeni kwenye orodha, chagua kuwa hana smartphone au mwekee chaguo la SMS au karatasi.',
                'Kwa wenye simu za kawaida, tuma SMS yenye jina la tukio, tarehe, ukumbi na namba fupi ya kadi kama KH-4826.',
                'Kwa wazazi na wazee wanaopendelea kadi ya mkononi, pakua PDF ya kuchapisha (ukubwa wa A6, A5 au kadi 4 kwenye ukurasa wa A4) yenye jina la mzazi, QR kubwa na namba yake.',
                'Chapisha kadi hizo kwa printa yoyote ya kawaida na uzikabidhi mkononi au kupitia wajumbe wa familia.',
                'Siku ya sherehe, mlangoni tumia programu ya Android ya Kadi Sasa kuskani QR ya karatasi, kuandika namba fupi ya SMS, au kutafuta jina la mzazi — yote yakifanya kazi hata mtandao ukikatika.',
              ],
            },
            {
              t: 'p',
              text: 'Pia, ikiwa mgeni ana smartphone lakini mtandao wake wa intaneti umezimwa wakati wa kutuma, mfumo unaweza kutuma SMS kama mbadala (fallback) baada ya muda ulioweka.',
            },
          ],
        },
        {
          id: 'mapokezi-mlangoni',
          h2: 'Mzazi akipoteza SMS au akisahau karatasi nyumbani anaingiaje?',
          blocks: [
            {
              t: 'p',
              text: 'Kamati haina haja ya kumzuia mzazi mlangoni. Kwenye programu ya lango ya Kadi Sasa, mlinzi anaweza kutafuta mgeni kwa njia nne bila kuhitaji intaneti ukumbini:',
            },
            {
              t: 'ul',
              items: [
                'Kuskani msimbo wa QR uliochapishwa kwenye kadi ya karatasi.',
                'Kuandika namba fupi ya herufi na tarakimu (mfano KH-4826) kutoka kwenye SMS.',
                'Kusoma namba kutoka kwenye skrini ya simu ya tochi kwa kamera (Scan SMS) au kuandika tarakimu nne za mwisho za simu yake.',
                'Kutafuta kwa jina lake kamili kwenye orodha iliyohifadhiwa ndani ya simu ya mlinzi.',
              ],
            },
            {
              t: 'p',
              text: 'Kwa sababu SMS na kadi ya karatasi zinatumia rekodi moja ya mgeni, mgeni mmoja hawezi kuingia mara mbili hata akija na karatasi na pia akatumiwa SMS.',
            },
          ],
        },
        {
          id: 'gharama-na-usalama-wazee',
          h2: 'Je, kadi za SMS na karatasi zina gharama za ziada au hatari ya ulaghai?',
          blocks: [
            {
              t: 'p',
              text: 'Hakuna malipo ya ziada kwa wageni wasio na smartphone: kila kadi unayolipia kwenye vifurushi vyetu (/bei — TZS 2,400 kwa 1–99, TZS 2,200 kwa 100–499, TZS 1,950 kwa 500+) tayari inajumuisha kiungo, SMS, vikumbusho 4 na PDF ya kuchapisha. Unaanza bure na kadi 5 za kwanza.',
            },
            {
              t: 'p',
              text: 'Kwa usalama wa wazazi, SMS zote rasmi zinaonyesha namba ya kamati na haziombi kamwe PIN ya M-Pesa wala nenosiri. Soma pia mwongozo wetu wa huduma ya kadi ya harusi (/kadi-ya-harusi-mtandaoni), lango la QR (/lango-la-harusi-qr) na usalama (/usalama-wa-kadi-za-mtandaoni).',
            },
            {
              t: 'note',
              text: 'Jaribu kutengeneza kadi za mfano za karatasi na SMS kwa ajili ya wazee wa familia yako leo — anza bure na kadi 5 za kwanza.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Je, SMS ya mwaliko inasomeka kwenye simu ya kawaida (ya tochi)?',
          a: 'Ndiyo. Ujumbe unakuwa maandishi mafupi yanayosomeka kwenye simu yoyote bila kuhitaji data au smartphone, ukiwa na namba ya kadi na maelezo muhimu.',
        },
        {
          q: 'PDF ya kuchapisha kadi za karatasi ina ukubwa gani?',
          a: 'Unaweza kuchagua kadi moja kwa ukurasa (A6 au A5) au karatasi ya A4 yenye kadi 4 zinazokatwa kirahisi kwa mchapishaji yeyote wa mtaani.',
        },
        {
          q: 'Kadi ya karatasi ikichapishwa, bado inazuia mtu asiyealikwa?',
          a: 'Ndiyo. Kila kadi ya karatasi ina msimbo wa QR uliosainiwa kidijitali kwa jina la mgeni huyo pekee; ikiskaniwa mara ya pili, lango linaonyesha kuwa tayari imetumika.',
        },
        {
          q: 'Wageni wasio na smartphone wanalipiwa bei tofauti?',
          a: 'Hapana. Bei ni ileile kwa kila kadi, na unaanza na kadi 5 bure kujaribu WhatsApp, SMS na PDF ya kuchapisha.',
        },
        {
          q: 'Kamati inaweza kujibu RSVP kwa niaba ya mzazi asiye na intaneti?',
          a: 'Ndiyo. Akithibitisha kwa simu au ana kwa ana, mwanakamati anaweza kusasisha jibu lake na idadi ya watu moja kwa moja kwenye dashibodi.',
        },
      ],
    },
    en: {
      nav: 'Invites without smartphone',
      title: 'Invitations for Elders Without Smartphones | Kadi Sasa',
      description:
        'How to invite parents and elders without smartphones using plain SMS card numbers and printable QR PDF cards that scan offline at the gate.',
      h1: 'Inviting elders without smartphones: SMS and paper cards',
      answer:
        'Parents and grandparents without smartphones receive a plain SMS with a short card number (such as KH-4826) or a printable QR PDF card. At the gate, ushers admit them by scanning the paper QR, typing the short code, or searching their name or last four phone digits — even offline. Start free with 5 cards.',
      sections: [
        {
          id: 'tatizo-la-whatsapp-pekee',
          h2: 'Why do WhatsApp-only invitations leave elders out?',
          blocks: [
            {
              t: 'p',
              text: 'Sending invitations only on WhatsApp leaves out grandparents and upcountry relatives who rely on basic feature phones or prefer a card in hand. Relying on phone calls alone often leaves them without clear venue directions or missing from the gate list.',
            },
            {
              t: 'p',
              text: 'Kadi Sasa keeps every guest in one list: smartphone guests receive WhatsApp links, while elders without smartphones receive a clear SMS or a printed card carrying the exact same unique QR and short number.',
            },
          ],
        },
        {
          id: 'jinsi-ya-kutuma-sms-na-karatasi',
          h2: 'How do you send invitations to elders without smartphones step by step?',
          blocks: [
            {
              t: 'ol',
              items: [
                'When adding an elder to your guest list, mark that they do not have a smartphone or choose SMS / print.',
                'For feature-phone guests, send a concise SMS containing the event name, date, venue and short card number like KH-4826.',
                'For parents and elders who prefer paper, export a printable PDF (A6, A5 or 4-up A4) showing their name, a crisp QR and their code.',
                'Print the cards at any local print shop and hand them over in person.',
                'On the day, ushers scan the paper QR, type the short SMS number or look up the elder’s name in the offline Android gate app.',
              ],
            },
            {
              t: 'p',
              text: 'Even for smartphone guests, automatic SMS fallback ensures anyone whose WhatsApp does not land still receives their invitation code.',
            },
          ],
        },
        {
          id: 'mapokezi-mlangoni',
          h2: 'What if an elder misplaces their SMS or leaves the paper card at home?',
          blocks: [
            {
              t: 'p',
              text: 'No elder gets stuck at the door. The offline Android gate app gives ushers four fast ways to verify and admit a guest without venue signal:',
            },
            {
              t: 'ul',
              items: [
                'Scan the QR code printed on their paper card.',
                'Type the short alphanumeric code (such as KH-4826) from their SMS.',
                'Point the camera at the feature-phone screen with Scan SMS or search the last four digits of their phone.',
                'Look up their full name in the offline guest list stored on the usher’s phone.',
              ],
            },
            {
              t: 'p',
              text: 'Because SMS and printed paper cards share the same guest record, one guest cannot be admitted twice.',
            },
          ],
        },
        {
          id: 'gharama-na-usalama-wazee',
          h2: 'Do SMS and paper cards cost extra or pose scam risks?',
          blocks: [
            {
              t: 'p',
              text: 'There is no extra fee for non-smartphone guests. Every paid card on our pricing page (/bei — TZS 2,400 for 1–99, TZS 2,200 for 100–499, TZS 1,950 for 500+) includes WhatsApp/SMS delivery, 4 reminders and printable PDFs, starting with 5 free cards.',
            },
            {
              t: 'p',
              text: 'Official messages always show the committee phone number and never ask for an M-Pesa PIN or password. See our online wedding card page (/online-wedding-invitation), QR gate guide (/wedding-gate-qr-check-in) and card safety page (/security-of-online-invitations).',
            },
            {
              t: 'note',
              text: 'Test printable cards and SMS invitations for the elders in your family today — start free with your first 5 cards.',
            },
          ],
        },
      ],
      faq: [
        {
          q: 'Does the SMS invitation read cleanly on a basic feature phone?',
          a: 'Yes. It is sent as short plain text with the event date, venue and card code, requiring no mobile data or smartphone.',
        },
        {
          q: 'What sizes are available in the printable PDF?',
          a: 'Choose A6, A5 or 4-up A4 sheets ready for any local print shop or home printer.',
        },
        {
          q: 'Do printed cards still prevent gate crashers?',
          a: 'Yes. Every printed card holds a unique signed QR code tied to that guest; scanning it a second time immediately flags it as already admitted.',
        },
        {
          q: 'Do non-smartphone guests cost more?',
          a: 'No. Every tier covers WhatsApp, SMS and printable PDFs at the same per-card price, starting with 5 free cards.',
        },
        {
          q: 'Can the committee record an RSVP for an elder who calls instead?',
          a: 'Yes. When an elder confirms by phone or in person, any committee member can update their RSVP status and party size in the dashboard.',
        },
      ],
    },
  },
];
