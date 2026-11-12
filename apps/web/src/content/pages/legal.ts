import type { ContentPageDef } from '../types';

const UPDATED = '2026-10-15';
const PRIVACY_UPDATED = '2026-11-02';

/**
 * Legal drafts. Facts here follow what the product actually does. Company identity, hosting
 * location, retention limits and governing law are deliberately left for a lawyer (see the audit doc).
 */
export const LEGAL_PAGES: ContentPageDef[] = [
  {
    slug: 'privacy',
    group: 'legal',
    schema: 'WebPage',
    updated: PRIVACY_UPDATED,
    related: ['ombi-la-data', 'cookies', 'terms', 'usalama-wa-kadi-za-mtandaoni'],
    sw: {
      nav: 'Sera ya faragha',
      title: 'Sera ya Faragha | Kadi Sasa',
      description:
        'Sera ya faragha ya Kadi Sasa: taarifa tunazokusanya, tunavyozitumia na kuzishiriki, muda wa kuzihifadhi na haki zako chini ya sheria za Tanzania na Afrika.',
      h1: 'Sera ya faragha',
      answer:
        'Kadi Sasa inakusanya taarifa zinazohitajika kutuma mialiko, kupokea majibu, kurekodi michango na kuingiza wageni langoni. Hatuuzi taarifa binafsi wala hatuzitumii kwa matangazo. Mwenyeji anadhibiti taarifa za wageni wake, na mtu yeyote anaweza kuomba nakala, marekebisho au kufutwa kwa taarifa zake.',
      sections: [
        {
          id: 'utangulizi',
          h2: '1. Utangulizi',
          blocks: [
            {
              t: 'p',
              text: 'Kadi Sasa ("sisi") ni jukwaa la mialiko ya matukio, usimamizi wa wageni, kumbukumbu za michango na uthibitisho wa kuingia langoni, kwa watu binafsi, familia, taasisi, kamati na waandaaji wa matukio barani Afrika.',
            },
            {
              t: 'p',
              text: 'Sera hii inaeleza taarifa binafsi tunazokusanya, kwa nini, tunavyozitumia, tunayeshiriki naye, muda tunaozihifadhi na jinsi ya kutumia haki zako. Tunafuata sheria za ulinzi wa taarifa binafsi za nchi tunazofanya kazi, ikiwemo Sheria ya Ulinzi wa Taarifa Binafsi ya Tanzania ya mwaka 2022.',
            },
            {
              t: 'p',
              text: 'Hatuuzi taarifa binafsi na hatuzitumii kuonyesha matangazo ya watu wengine.',
            },
          ],
        },
        {
          id: 'sisi',
          h2: '2. Sisi ni nani na nani anadhibiti data',
          blocks: [
            {
              t: 'table',
              head: ['Kipengele', 'Maelezo'],
              rows: [
                ['Jina la kisheria la biashara', 'KADISASA'],
                ['Namba ya usajili', '482589'],
                ['Anwani iliyosajiliwa', 'Soweto, Moshi, Tanzania'],
                ['Nchi ya usajili', 'Tanzania'],
                ['Tovuti', 'https://kadisasa.com'],
                ['Mawasiliano ya faragha', 'faragha@kadisasa.com'],
              ],
            },
            {
              t: 'p',
              text: 'Kwa taarifa za wageni wa tukio, mwenyeji ndiye anayeamua ni nani aalikwe na kwa nini, kwa hiyo kwa kawaida yeye ndiye mdhibiti wa data hizo, na sisi tunazishughulikia kwa niaba yake.',
            },
            {
              t: 'p',
              text: 'Sisi ni wadhibiti wa taarifa za akaunti zetu wenyewe, usimamizi wa jukwaa, usalama, malipo ya huduma na uboreshaji wa huduma. Nafasi ya kisheria ya watoa huduma wengine inategemea kazi wanayofanya.',
            },
          ],
        },
        {
          id: 'tunachokusanya',
          h2: '3. Taarifa tunazokusanya',
          blocks: [
            { t: 'h3', text: '3.1 Mwenyeji na kamati' },
            {
              t: 'ul',
              items: [
                'Jina kamili, namba ya simu, na barua pepe ikiwa imetolewa.',
                'Taarifa za kuingia na uthibitisho wa akaunti.',
                'Jukumu ulilopewa kwenye tukio na ruhusa zake.',
                'Kumbukumbu za vitendo muhimu na za usalama wa akaunti.',
                'Taarifa za malipo ya huduma (vifurushi vya kadi, SMS au WhatsApp), pale zinapohusika.',
                'Picha za kumbukumbu mnazopakia kwa ajili ya wageni wenu, pamoja na maelezo na tarehe zake. Wageni walioalikwa pekee ndio wanaziona, kwa kiungo cha kadi zao. Tunaondoa taarifa za mahali na za kamera kwenye kila picha, na tunazifuta mnapozifuta, mnapofuta tukio au akaunti.',
              ],
            },
            { t: 'h3', text: '3.2 Wageni (zinaingizwa na mwenyeji au kamati)' },
            {
              t: 'ul',
              items: [
                'Jina, namba ya simu, na barua pepe ikiwa imetolewa.',
                'Kikundi au familia, na idadi ya watu wanaoruhusiwa kuhudhuria.',
                'Lugha ya mwaliko na maelezo ya mwenyeji.',
                'Hali ya mwaliko na kuhudhuria.',
              ],
            },
            {
              t: 'p',
              text: 'Mwenyeji anawajibika kuhakikisha ana msingi halali wa kisheria wa kutupatia taarifa za wageni.',
            },
            {
              t: 'p',
              text: 'Mwenyeji akiingiza wageni kutoka kwenye anwani za simu, Google Contacts au faili la anwani, anwani hizo zinasomwa kwenye kifaa chake tu. Tunasoma majina na namba za simu pekee, na tunahifadhi wale tu anaowachagua. Ruhusa ya Google ni ya kusoma tu, inatumika mara moja na inafutwa mara tu tunapomaliza kusoma. Hatuihifadhi, hatushiriki taarifa hizo na mtu yeyote, na hatuzitumii kwa matangazo. Matumizi yetu ya taarifa kutoka API za Google yanafuata Google API Services User Data Policy, ikiwemo masharti ya Limited Use.',
            },
            { t: 'h3', text: '3.3 Majibu ya mwaliko' },
            {
              t: 'p',
              text: 'Mgeni anapofungua kadi yake tunarekodi: kufunguliwa kwa kadi, jibu la kuhudhuria, idadi ya watu wanaoambatana naye, ujumbe alioandika, ombi la kuacha vikumbusho, na hali ya kufika kwa ujumbe.',
            },
            { t: 'h3', text: '3.4 Michango' },
            {
              t: 'p',
              text: 'Kadi Sasa haikusanyi wala haipitishi fedha za michango ya wageni. Mchango unalipwa moja kwa moja kati ya mgeni na mwenyeji, nje ya Kadi Sasa. Mwenyeji au kamati wanaweza kurekodi ahadi na malipo (kiasi, njia ya malipo, tarehe, kumbukumbu na maelezo). Kumbukumbu hizi zimesimbwa, na zinaonekana kwa mwenyeji na kamati ya tukio tu, si kwa wafanyakazi wetu.',
            },
            {
              t: 'p',
              text: 'Hatuombi namba za kadi za benki, PIN za pesa kwa simu wala nenosiri la benki kupitia kadi za mwaliko.',
            },
            { t: 'h3', text: '3.5 Langoni' },
            {
              t: 'p',
              text: 'Tukio likitumia uthibitisho wa kidijitali wa kuingia, tunarekodi: taarifa za uthibitisho wa QR au namba ya kadi, tarehe na saa ya kuskani, lango, matokeo (kukubaliwa au kukataliwa), kuingizwa kwa mkono na sababu yake, na mlinda lango aliyehusika. Kumbukumbu hizi huzuia kuingia mara mbili na humpa mwenyeji orodha ya waliofika.',
            },
            { t: 'h3', text: '3.6 Mawasiliano' },
            {
              t: 'p',
              text: 'Tunarekodi hali ya SMS na ujumbe wa WhatsApp uliotumwa (umetumwa, umefika, umeshindwa), historia ya vikumbusho na mapendeleo ya mawasiliano.',
            },
            { t: 'h3', text: '3.7 Taarifa za kiufundi' },
            {
              t: 'p',
              text: 'Unapotumia Kadi Sasa tunaweza kukusanya anwani ya IP, aina ya kivinjari na kifaa, mfumo wa uendeshaji, nyakati za kuingia, kumbukumbu za usalama na hitilafu, na hifadhi ya kivinjari. Tunazitumia kuendesha, kutunza na kulinda jukwaa.',
            },
          ],
        },
        {
          id: 'matumizi',
          h2: '4. Tunavyotumia taarifa',
          blocks: [
            {
              t: 'ol',
              items: [
                'Kuunda na kusimamia akaunti za wenyeji.',
                'Kuunda na kutuma mialiko ya kidijitali na ya kuchapisha.',
                'Kutunza orodha za wageni na ruhusa za kamati.',
                'Kupokea na kurekodi majibu ya kuhudhuria.',
                'Kutuma vikumbusho na taarifa za huduma.',
                'Kumwezesha mwenyeji kurekodi michango.',
                'Kuthibitisha kadi na kuingia kwa wageni, na kuzuia kuingia mara mbili, udanganyifu na matumizi yasiyoruhusiwa.',
                'Kulinda usalama na uaminifu wa jukwaa.',
                'Kutoa msaada kwa wateja.',
                'Kutimiza wajibu wa kisheria, kutatua migogoro na kulinda maslahi halali ya biashara.',
              ],
            },
          ],
        },
        {
          id: 'msingi',
          h2: '5. Msingi wa kisheria',
          blocks: [
            {
              t: 'p',
              text: 'Tunashughulikia taarifa binafsi kwa msingi halali unaotambuliwa na sheria husika. Kulingana na shughuli na nchi, msingi huo unaweza kuwa ridhaa ya mhusika, utekelezaji wa mkataba, wajibu wa kisheria, maslahi halali yaliyopimwa dhidi ya haki za mhusika, au msingi mwingine unaotambuliwa na sheria ya nchi husika.',
            },
            {
              t: 'p',
              text: 'Tunapima msingi unaofaa kwa kila shughuli. Pale tunapotegemea ridhaa, unaweza kuiondoa wakati wowote, kwa kuzingatia masharti ya sheria.',
            },
          ],
        },
        {
          id: 'wenyeji',
          h2: '6. Wenyeji na taarifa za wageni',
          blocks: [
            { t: 'p', text: 'Kwa kawaida mwenyeji anawajibika:' },
            {
              t: 'ul',
              items: [
                'Kuhakikisha taarifa za wageni zimekusanywa kihalali.',
                'Kuwajulisha wageni jinsi taarifa zao zinavyotumika.',
                'Kutoa taarifa sahihi za wageni.',
                'Kuwapa ruhusa wanakamati walioidhinishwa tu.',
                'Kutumia taarifa za wageni kwa madhumuni halali ya tukio tu.',
                'Kujibu maombi ya faragha ya wageni wa tukio lake.',
              ],
            },
            {
              t: 'p',
              text: 'Tunashughulikia taarifa za wageni kwa maelekezo ya mwenyeji na wajibu wetu wa huduma. Hatuuruhusu mwenyeji kutumia Kadi Sasa kukusanya au kusambaza taarifa binafsi kinyume cha sheria.',
            },
          ],
        },
        {
          id: 'watoa-huduma',
          h2: '7. Tunayeshiriki naye taarifa',
          blocks: [
            {
              t: 'p',
              text: 'Tunashiriki taarifa pale tu inapohitajika kuendesha jukwaa, kutoa huduma uliyoomba au kutii sheria.',
            },
            {
              t: 'table',
              head: ['Mtoa huduma', 'Anachopokea'],
              rows: [
                [
                  'Ujumbe (WhatsApp na SMS)',
                  'Namba ya simu na maandishi ya mwaliko, kikumbusho au taarifa',
                ],
                [
                  'Malipo ya huduma',
                  'Taarifa za muamala wa mwenyeji anapolipia huduma za Kadi Sasa. Hawapokei taarifa za wageni wala michango',
                ],
                [
                  'Google Firebase (uthibitisho wa kuingia)',
                  'Namba ya simu ya mwenyeji au mwanakamati anayeingia, anwani ya IP na ishara za kifaa za kuzuia roboti (reCAPTCHA au Play Integrity)',
                ],
                ['Seva na miundombinu', 'Taarifa zinazohitajika kuendesha Kadi Sasa'],
                [
                  'Usalama na ufuatiliaji wa hitilafu',
                  'Kumbukumbu za kiufundi, pale tunapowatumia',
                ],
                [
                  'Mamlaka za kisheria',
                  'Pale tu sheria, amri halali au ombi halali la mamlaka linapotaka',
                ],
              ],
            },
            {
              t: 'p',
              text: 'Watoa huduma wanaofanya kazi kwa niaba yetu wanapaswa kulinda taarifa binafsi na kuzitumia kwa madhumuni yaliyoidhinishwa tu. Kila mtoa huduma pia ana sera yake ya faragha. Ukitaka orodha ya sasa ya majina ya watoa huduma, tuandikie faragha@kadisasa.com.',
            },
            { t: 'h3', text: '7.1 Namba za kuingia na Google' },
            {
              t: 'p',
              text: 'Wenyeji, wanakamati na wafanyakazi wetu huingia kwa namba ya simu. Namba ya kuthibitisha (OTP) hutumwa na kukaguliwa na Google Firebase Authentication. Firebase hupokea namba ya simu inayoingia, anwani ya IP, na ishara za kifaa za kuzuia roboti (reCAPTCHA kwenye kivinjari, Play Integrity kwenye Android). Baada ya namba kuthibitishwa, tunapokea kutoka Firebase uthibitisho uliosainiwa wenye namba ya simu tu, kisha tunaondoka kwenye kikao cha Firebase na kutumia kikao chetu wenyewe.',
            },
            {
              t: 'p',
              text: 'Hatutumii "Ingia kwa Google" na hatuombi ruhusa ya kufikia akaunti yako ya Google. Hatusomi barua pepe, anwani, faili, kalenda, picha wala taarifa nyingine yoyote ya akaunti ya Google. Namba ya simu iliyothibitishwa inatumika kukuingiza kwenye Kadi Sasa na kulinda akaunti yako tu; haiuzwi, haitumiki kwa matangazo, na haishirikiwi na mtu mwingine isipokuwa kama ilivyoelezwa kwenye sera hii.',
            },
            {
              t: 'p',
              text: 'Wageni hawahitaji kuingia: wanafungua kadi kwa kiungo chao, na hawapiti Firebase. Google inashughulikia taarifa hizi kwa mujibu wa masharti ya Firebase na sera ya faragha ya Google (https://policies.google.com/privacy).',
            },
          ],
        },
        {
          id: 'nje-ya-nchi',
          h2: '8. Kuhamisha taarifa nje ya nchi',
          blocks: [
            {
              t: 'p',
              text: 'Baadhi ya watoa huduma wanaweza kuhifadhi au kushughulikia taarifa nje ya nchi anayoishi mwenyeji au mgeni. Kabla ya kuhamisha taarifa nje ya mipaka tunapima masharti ya sheria husika na kuweka kinga zinazofaa, kama vile uamuzi wa kutosheleza ulinzi, mikataba iliyoidhinishwa, kibali cha mamlaka, ridhaa pale inaporuhusiwa, au kinga nyingine inayotakiwa na sheria.',
            },
            {
              t: 'p',
              text: 'Seva zinazohifadhi taarifa za Kadi Sasa ziko Marekani (United States), kwa hiyo taarifa za wenyeji na wageni huhifadhiwa nje ya Tanzania. Uthibitisho wa kuingia unashughulikiwa na Google Firebase kwenye miundombinu ya Google duniani. Tunatumia kinga zilizoelezwa hapo juu kwa uhamisho huu.',
            },
          ],
        },
        {
          id: 'muda',
          h2: '9. Muda wa kuhifadhi na kufuta',
          blocks: [
            {
              t: 'table',
              head: ['Taarifa', 'Muda wa kuhifadhi'],
              rows: [
                [
                  'Akaunti',
                  'Wakati akaunti iko hai, na muda wa ziada unaohitajika kwa sababu za kisheria, usalama au hesabu',
                ],
                [
                  'Tukio na wageni',
                  'Wakati tukio liko hai au kama mwenyeji atakavyoelekeza, kwa kuzingatia sheria',
                ],
                [
                  'Kumbukumbu za malipo ya huduma',
                  'Kulingana na masharti ya fedha, hesabu na sheria',
                ],
                [
                  'Kumbukumbu za lango na kuhudhuria',
                  'Kwa usimamizi wa tukio, kutatua migogoro na masharti ya sheria',
                ],
                [
                  'Kumbukumbu za kiufundi na usalama',
                  'Kulingana na ratiba yetu ya ndani ya kuhifadhi',
                ],
              ],
            },
            {
              t: 'p',
              text: 'Tukipokea ombi la kufuta akaunti, tunafuta akaunti na matukio yake ndani ya siku 30, isipokuwa pale sheria inapotutaka tuhifadhi. Mgeni akifutwa, jina, simu na maelezo yake huondolewa; kiasi cha mchango kinaweza kubaki bila kumtambulisha mtu, kwa ajili ya hesabu za tukio. Taarifa zisizohitajika tena hufutwa au kufanywa zisizomtambulisha mtu. Nakala za akiba zilizolindwa zinaweza kubaki kwa muda mfupi hadi mzunguko wa kufuta akiba ukamilike.',
            },
          ],
        },
        {
          id: 'kifaa',
          h2: '10. Vidakuzi na hifadhi ya kifaa',
          blocks: [
            {
              t: 'p',
              text: 'Tunatumia hifadhi ya kivinjari na teknolojia zinazofanana kwa ajili ya kuingia kwenye akaunti, usalama, mapendeleo muhimu, nakala ya kadi kwa matumizi bila mtandao, na majibu yanayosubiri kutumwa.',
            },
            {
              t: 'p',
              text: 'Programu ya lango huhifadhi kwa muda orodha ya wageni kwenye kifaa kilichoidhinishwa ili kuthibitisha kuingia bila mtandao, na hutuma kumbukumbu za kuskani mtandao ukirudi. PIN ya lango haihifadhiwi kwenye kifaa.',
            },
            {
              t: 'p',
              text: 'Hatutumii vidakuzi vya matangazo. Unaweza kusimamia vidakuzi kwenye mipangilio ya kivinjari; kufuta hifadhi kunaweza kuondoa nakala ya kadi ya bila mtandao na majibu ambayo hayajatumwa. Maelezo zaidi yako kwenye ukurasa wa vidakuzi.',
            },
          ],
        },
        {
          id: 'usalama',
          h2: '11. Usalama wa taarifa',
          blocks: [
            {
              t: 'ul',
              items: [
                'Ruhusa kulingana na jukumu: mwenyeji, kamati na mlinda lango kila mmoja anaona anachohitaji tu; mlinda lango haoni taarifa za fedha.',
                'Uthibitisho salama wa kuingia, na hatua ya pili ya uthibitisho kwa wafanyakazi wetu.',
                'Usimbaji fiche wakati wa kutuma na kwenye hifadhi inayohusika, ikiwemo kumbukumbu za michango.',
                'Viungo vya kadi ni vya kipekee na havitabiriki; tunahifadhi alama zake za kificho tu, pamoja na nakala iliyosimbwa ya kutuma tena kiungo.',
                'Funguo za kusaini QR zimesimbwa na haziondoki kwenye seva.',
                'Ufuatiliaji wa shughuli zinazotia shaka, kumbukumbu za ukaguzi za vitendo vya kiutawala, na taratibu za akiba na urejeshaji.',
              ],
            },
            {
              t: 'p',
              text: 'Hakuna mfumo wa kielektroniki usio na hatari kabisa. Uvujaji wa taarifa binafsi ukitokea, tunatathmini tukio, tunachukua hatua za kulidhibiti, na tunawajulisha walioathirika na mamlaka husika kama sheria inavyotaka.',
            },
          ],
        },
        {
          id: 'haki',
          h2: '12. Haki zako',
          blocks: [
            { t: 'p', text: 'Kulingana na nchi yako na sheria husika, una haki ya:' },
            {
              t: 'ul',
              items: [
                'Kujua kama tunashughulikia taarifa zako, na kupata nakala yake.',
                'Kusahihisha taarifa zisizo sahihi au zisizokamilika.',
                'Kuomba zifutwe.',
                'Kupinga matumizi fulani, au kuomba yazuiwe pale inaporuhusiwa.',
                'Kuondoa ridhaa pale ridhaa ndiyo msingi wa kisheria.',
                'Kupinga baadhi ya maamuzi yanayofanywa na mfumo pekee.',
                'Kupata taarifa kuhusu uhamishaji wa taarifa nje ya nchi.',
                'Kulalamika kwa mamlaka ya ulinzi wa taarifa ya nchi yako.',
              ],
            },
            {
              t: 'p',
              text: 'Kuomba, tuma barua pepe kwa faragha@kadisasa.com ukiweka jina lako, mawasiliano yako, tukio au akaunti husika, aina ya ombi, na taarifa zinazohitajika kukutambua. Tunaweza kuomba taarifa zaidi kuthibitisha utambulisho wako ili tusitoe taarifa kwa mtu asiyehusika. Tunajibu ndani ya muda unaotakiwa na sheria husika. Maelezo zaidi yako kwenye ukurasa wa maombi ya data.',
            },
            {
              t: 'p',
              text: 'Mgeni anaweza kuacha vikumbusho kupitia kitufe kwenye kadi yake au kwa kuwasiliana na mwenyeji. Kuacha vikumbusho hakufuti kumbukumbu nyingine za tukio.',
            },
          ],
        },
        {
          id: 'watoto',
          h2: '13. Watoto',
          blocks: [
            {
              t: 'p',
              text: 'Kadi Sasa ni kwa wenyeji na wanakamati wazima. Orodha ya wageni inaweza kuwa na watoto pale mwenyeji anapowaalika. Sheria ya Tanzania inahesabu taarifa za watoto kuwa taarifa nyeti, kwa hiyo mwenyeji anapaswa kuhakikisha ana mamlaka ya kisheria, ushiriki au ridhaa ya mzazi au mlezi, au msingi mwingine halali pale unapohitajika, na kuingiza kiwango cha chini kinachohitajika (kwa mfano jina tu ndani ya familia).',
            },
            {
              t: 'p',
              text: 'Hatuwapi watoto akaunti, na hatutumii taarifa za watoto kwa matangazo wala uchambuzi usiohusiana na tukio.',
            },
          ],
        },
        {
          id: 'nyeti',
          h2: '14. Taarifa nyeti',
          blocks: [
            {
              t: 'p',
              text: 'Baadhi ya taarifa za tukio zinaweza kuhesabiwa kuwa nyeti chini ya sheria, kama taarifa za watoto, kumbukumbu za fedha, afya, dini, au taarifa za kibayometriki ikiwa huduma hiyo itaanzishwa baadaye. Hatumtaki mwenyeji kukusanya taarifa nyeti zisizohitajika. Pale zinaposhughulikiwa, tunaweka kinga za ziada na tunahitaji msingi halali wa kisheria.',
            },
          ],
        },
        {
          id: 'mfumo',
          h2: '15. Uchakataji wa kiotomatiki',
          blocks: [
            {
              t: 'p',
              text: 'Mfumo hufanya kiotomatiki: kuthibitisha uhalali wa kadi, kugundua kuskaniwa mara mbili, kusasisha hali ya kuhudhuria, na kurekodi hali ya kufika kwa ujumbe. Hizi ni kwa usimamizi wa tukio. Mlinda lango anaweza kumtafuta mgeni kwa jina na kumwingiza kwa mkono, kwa hiyo hakuna uamuzi mzito unaofanywa na mfumo pekee bila mtu kuhusika.',
            },
          ],
        },
        {
          id: 'tovuti-nyingine',
          h2: '16. Tovuti na huduma za nje',
          blocks: [
            {
              t: 'p',
              text: 'Kadi Sasa inaweza kuwa na viungo vya huduma za nje, kama ramani, WhatsApp na watoa huduma za malipo. Huduma hizo zina sera na masharti yao, na hatuwajibiki kwa jinsi zinavyoshughulikia faragha.',
            },
          ],
        },
        {
          id: 'ujumbe',
          h2: '17. Ujumbe na matangazo',
          blocks: [
            {
              t: 'p',
              text: 'Hatuuzi taarifa za wageni wala kuzitumia kwa matangazo ya watu wengine, na hatutumi ujumbe wa matangazo kwa wageni. Tunaweza kutuma ujumbe wa huduma kwa wenyeji, kama taarifa za akaunti, hali ya kutuma mialiko, uthibitisho wa malipo ya huduma, taarifa za usalama na matangazo muhimu ya jukwaa. Tukianzisha ujumbe wa matangazo, tutaomba ridhaa inayotakiwa na sheria na kuweka njia ya kujiondoa.',
            },
          ],
        },
        {
          id: 'afrika',
          h2: '18. Ulinzi wa taarifa barani Afrika',
          blocks: [
            {
              t: 'p',
              text: 'Nchi za Afrika zina sheria na mamlaka tofauti za ulinzi wa taarifa. Mfumo wetu wa faragha umeundwa kuzingatia masharti ya kitaifa, ikiwemo:',
            },
            {
              t: 'table',
              head: ['Nchi', 'Sheria'],
              rows: [
                ['Tanzania', 'Sheria ya Ulinzi wa Taarifa Binafsi, 2022 (Na. 11 ya 2022)'],
                ['Kenya', 'Data Protection Act, 2019'],
                ['Uganda', 'Data Protection and Privacy Act, 2019'],
                ['Rwanda', 'Sheria Na. 058/2021 kuhusu ulinzi wa taarifa binafsi na faragha'],
                ['Nigeria', 'Nigeria Data Protection Act, 2023'],
                ['Afrika Kusini', 'Protection of Personal Information Act (POPIA), 2013'],
                ['Ghana', 'Data Protection Act, 2012'],
                ['Malawi', 'Data Protection Act, 2024'],
                ['Botswana', 'Data Protection Act, 2024'],
              ],
            },
            {
              t: 'p',
              text: 'Pale sheria ya nchi inapotoa ulinzi zaidi, sheria hiyo inatangulia kuliko masharti yanayopingana ya sera hii. Tunaweza kuchapisha maelezo ya ziada kwa nchi mahususi pale yanapohitajika.',
            },
          ],
        },
        {
          id: 'malalamiko',
          h2: '19. Malalamiko na mamlaka',
          blocks: [
            {
              t: 'p',
              text: 'Ikiwa unaona tumeshughulikia taarifa zako vibaya, wasiliana nasi kwanza kupitia faragha@kadisasa.com. Pia una haki ya kuwasilisha malalamiko kwa mamlaka ya ulinzi wa taarifa ya nchi yako: Tume ya Ulinzi wa Taarifa Binafsi (PDPC) kwa Tanzania, Ofisi ya Kamishna wa Ulinzi wa Data (ODPC) kwa Kenya, na mamlaka ya kitaifa husika kwa nchi nyingine.',
            },
          ],
        },
        {
          id: 'mabadiliko',
          h2: '20. Mabadiliko ya sera',
          blocks: [
            {
              t: 'p',
              text: 'Tunaweza kubadilisha sera hii huduma zetu, watoa huduma, sheria au mahitaji ya usalama yakibadilika. Toleo jipya litawekwa kwenye https://kadisasa.com/privacy na tarehe iliyo juu itasasishwa. Kwa mabadiliko makubwa, tutawajulisha watumiaji pale sheria inapotaka.',
            },
          ],
        },
        {
          id: 'mawasiliano',
          h2: '21. Wasiliana nasi',
          blocks: [
            {
              t: 'p',
              text: 'Timu ya Faragha ya Kadi Sasa. Barua pepe: faragha@kadisasa.com. Tovuti: https://kadisasa.com. Nchi: Tanzania. Anwani: KADISASA, Soweto, Moshi, Tanzania.',
            },
          ],
        },
      ],
    },
    en: {
      nav: 'Privacy policy',
      title: 'Privacy Policy | Kadi Sasa',
      description:
        'Kadi Sasa privacy policy: what we collect, how we use and share it, how long we keep it, and your rights under Tanzanian and other African data protection laws.',
      h1: 'Privacy policy',
      answer:
        'Kadi Sasa collects what is needed to send invitations, receive replies, record contributions and admit guests at the gate. We do not sell personal information or use it for advertising. Hosts control their guests’ information, and anyone can ask for a copy, a correction or erasure of their data.',
      sections: [
        {
          id: 'introduction',
          h2: '1. Introduction',
          blocks: [
            {
              t: 'p',
              text: 'Kadi Sasa ("we", "us") is an event invitation, guest management, contribution record-keeping and event access platform for individuals, families, organisations, committees and event organisers across Africa.',
            },
            {
              t: 'p',
              text: 'This policy explains what personal information we collect, why, how we use it, who receives it, how long we keep it and how you exercise your rights. We follow the data protection laws of the countries where we operate, including Tanzania’s Personal Data Protection Act, 2022.',
            },
            {
              t: 'p',
              text: 'We do not sell personal information or use it to serve third-party advertisements.',
            },
          ],
        },
        {
          id: 'who',
          h2: '2. Who we are and who controls the data',
          blocks: [
            {
              t: 'table',
              head: ['Item', 'Details'],
              rows: [
                ['Legal business name', 'KADISASA'],
                ['Registration number', '482589'],
                ['Registered address', 'Soweto, Moshi, Tanzania'],
                ['Country of registration', 'Tanzania'],
                ['Website', 'https://kadisasa.com'],
                ['Privacy contact', 'faragha@kadisasa.com'],
              ],
            },
            {
              t: 'p',
              text: 'For guest information collected for an event, the host decides who is invited and why, so the host is normally the data controller and we process that information on the host’s behalf.',
            },
            {
              t: 'p',
              text: 'We are the controller for information about our own accounts, platform administration, security, billing and service improvement. The legal role of other service providers depends on what they actually do.',
            },
          ],
        },
        {
          id: 'collect',
          h2: '3. Information we collect',
          blocks: [
            { t: 'h3', text: '3.1 Hosts and committee members' },
            {
              t: 'ul',
              items: [
                'Full name, phone number, and email address where provided.',
                'Sign-in and authentication information.',
                'Your role in an event and its permissions.',
                'Records of important actions and account security.',
                'Billing information for our services (card bundles, SMS or WhatsApp packs), where applicable.',
                'Memory photos you upload for your guests, with their captions and dates. Only invited guests see them, through their own card link. We remove location and camera details from every photo, and delete the photos when you delete them, the event or your account.',
              ],
            },
            { t: 'h3', text: '3.2 Guests (entered by the host or committee)' },
            {
              t: 'ul',
              items: [
                'Name, phone number, and email address where provided.',
                'Household or invitation group, and the number of people allowed to attend.',
                'Invitation language and host notes.',
                'Invitation and attendance status.',
              ],
            },
            {
              t: 'p',
              text: 'Hosts are responsible for having a lawful basis to give us their guests’ information.',
            },
            {
              t: 'p',
              text: 'When a host adds guests from phone contacts, Google Contacts or a contacts file, the contacts are read on the host’s own device. We read names and phone numbers only, and keep only the people the host picks. Google access is read-only, used once and removed as soon as we finish reading. We do not store it, share the information with anyone, or use it for advertising. Our use of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements.',
            },
            { t: 'h3', text: '3.3 Invitation responses' },
            {
              t: 'p',
              text: 'When a guest opens their card we record: that the card was opened, the attendance reply, the number of accompanying guests, any message they write, requests to stop reminders, and message delivery status.',
            },
            { t: 'h3', text: '3.4 Contributions' },
            {
              t: 'p',
              text: 'Kadi Sasa does not collect or move guests’ contribution money. A contribution is paid directly between the guest and the host, outside Kadi Sasa. The host or committee may record pledges and payments (amount, payment method, date, reference and notes). These records are encrypted and visible only to the event’s host and committee, not to our staff.',
            },
            {
              t: 'p',
              text: 'We never ask for card numbers, mobile money PINs or banking passwords through invitation cards.',
            },
            { t: 'h3', text: '3.5 Gate and attendance' },
            {
              t: 'p',
              text: 'When an event uses digital entry checks, we record: QR or card-number verification details, the date and time of the scan, the gate, the result (admitted or refused), manual admissions and their reason, and the gate agent involved. These records prevent duplicate entry and give the host an attendance record.',
            },
            { t: 'h3', text: '3.6 Communications' },
            {
              t: 'p',
              text: 'We record the status of SMS and WhatsApp messages sent (sent, delivered, failed), reminder history and communication preferences.',
            },
            { t: 'h3', text: '3.7 Technical information' },
            {
              t: 'p',
              text: 'When you use Kadi Sasa we may collect IP address, browser and device type, operating system, access times, security and error logs, and browser storage. We use these to operate, maintain and secure the platform.',
            },
          ],
        },
        {
          id: 'use',
          h2: '4. How we use personal information',
          blocks: [
            {
              t: 'ol',
              items: [
                'Creating and managing host accounts.',
                'Creating and sending digital and printed invitations.',
                'Maintaining guest lists and committee access.',
                'Receiving and recording attendance replies.',
                'Sending reminders and service notifications.',
                'Letting hosts keep records of contributions.',
                'Verifying cards and guest entry, and preventing duplicate entry, fraud and unauthorised access.',
                'Keeping the platform secure and reliable.',
                'Providing customer support.',
                'Meeting legal obligations, resolving disputes and protecting legitimate business interests.',
              ],
            },
          ],
        },
        {
          id: 'basis',
          h2: '5. Lawful basis',
          blocks: [
            {
              t: 'p',
              text: 'We process personal information on a lawful basis recognised by the applicable law. Depending on the activity and country, that may be consent, performance of a contract, a legal obligation, legitimate interests balanced against individual rights, or another ground the country’s law recognises.',
            },
            {
              t: 'p',
              text: 'We assess the appropriate basis for each activity. Where we rely on consent, you may withdraw it at any time, subject to legal requirements.',
            },
          ],
        },
        {
          id: 'hosts',
          h2: '6. Hosts and guest information',
          blocks: [
            { t: 'p', text: 'The host is generally responsible for:' },
            {
              t: 'ul',
              items: [
                'Making sure guest information was collected lawfully.',
                'Telling guests how their information is used.',
                'Providing accurate guest information.',
                'Giving access only to authorised committee members.',
                'Using guest information only for legitimate event purposes.',
                'Responding to guests’ privacy requests about their event.',
              ],
            },
            {
              t: 'p',
              text: 'We process guest information on the host’s instructions and under our service obligations. We do not allow hosts to use Kadi Sasa to collect or distribute personal information unlawfully.',
            },
          ],
        },
        {
          id: 'providers',
          h2: '7. Who we share information with',
          blocks: [
            {
              t: 'p',
              text: 'We share information only where needed to run the platform, deliver a requested service or comply with the law.',
            },
            {
              t: 'table',
              head: ['Provider', 'What they receive'],
              rows: [
                [
                  'Messaging (WhatsApp and SMS)',
                  'Phone number and the text of the invitation, reminder or notice',
                ],
                [
                  'Billing payments',
                  'Transaction details when a host pays for Kadi Sasa services. They receive no guest or contribution information',
                ],
                [
                  'Google Firebase (sign-in verification)',
                  'The phone number of the host or committee member signing in, IP address and anti-abuse device signals (reCAPTCHA or Play Integrity)',
                ],
                ['Hosting and infrastructure', 'Information needed to operate Kadi Sasa'],
                ['Security and error monitoring', 'Technical logs, where engaged'],
                [
                  'Legal and regulatory authorities',
                  'Only where the law, a valid legal process or a lawful regulatory request requires it',
                ],
              ],
            },
            {
              t: 'p',
              text: 'Providers acting on our behalf must protect personal information and use it only for authorised purposes. Each provider also has its own privacy policy. For the current list of provider names, write to faragha@kadisasa.com.',
            },
            { t: 'h3', text: '7.1 Sign-in codes and Google' },
            {
              t: 'p',
              text: 'Hosts, committee members and our staff sign in with a phone number. The one-time code (OTP) is sent and checked by Google Firebase Authentication. Firebase receives the phone number being signed in, the IP address, and anti-abuse device signals (reCAPTCHA in the browser, Play Integrity on Android). Once the code is confirmed, we receive from Firebase a signed token that contains only the verified phone number; we then end the Firebase session and use our own.',
            },
            {
              t: 'p',
              text: 'We do not offer "Sign in with Google" and we do not request access to your Google Account. We do not read your Gmail, contacts, Drive files, calendar, photos or any other Google Account data. The verified phone number is used only to sign you in to Kadi Sasa and protect your account; it is not sold, not used for advertising, and not shared with anyone except as described in this policy.',
            },
            {
              t: 'p',
              text: 'Guests never sign in: they open their card from their own link and do not go through Firebase. Google processes this information under the Firebase terms and the Google Privacy Policy (https://policies.google.com/privacy).',
            },
          ],
        },
        {
          id: 'transfers',
          h2: '8. International transfers',
          blocks: [
            {
              t: 'p',
              text: 'Some providers may store or process information outside the country where a host or guest lives. Before information crosses a border we assess the applicable legal requirements and put appropriate safeguards in place, such as an adequacy decision or equivalent protection, approved contractual terms, regulatory authorisation, consent where permitted, or other safeguards the law requires.',
            },
            {
              t: 'p',
              text: 'The servers that store Kadi Sasa data are in the United States, so host and guest information is stored outside Tanzania. Sign-in verification is handled by Google Firebase on Google’s global infrastructure. We apply the safeguards described above to these transfers.',
            },
          ],
        },
        {
          id: 'retention',
          h2: '9. Retention and deletion',
          blocks: [
            {
              t: 'table',
              head: ['Information', 'How long we keep it'],
              rows: [
                [
                  'Accounts',
                  'While the account is active, plus any period needed for legal, security or accounting reasons',
                ],
                [
                  'Events and guests',
                  'While the event is active or as the host instructs, subject to the law',
                ],
                ['Billing payment records', 'As financial, accounting and legal rules require'],
                [
                  'Gate and attendance records',
                  'For event administration, dispute resolution and legal requirements',
                ],
                ['Technical and security logs', 'Under our internal retention schedule'],
              ],
            },
            {
              t: 'p',
              text: 'When we receive a request to delete an account, we delete the account and its events within 30 days unless the law requires us to keep something. When a guest is erased, their name, phone and notes are removed; a contribution amount may stay without anything identifying them, for the event’s accounts. Information no longer needed is deleted or anonymised. Protected backups may hold deleted information briefly until the backup deletion cycle completes.',
            },
          ],
        },
        {
          id: 'device',
          h2: '10. Cookies and device storage',
          blocks: [
            {
              t: 'p',
              text: 'We use browser storage and similar technologies for sign-in, security, essential preferences, offline copies of invitation cards, and replies waiting to be sent.',
            },
            {
              t: 'p',
              text: 'The gate app temporarily stores the guest list on an authorised device so entry can be checked offline, and sends scan records once the connection returns. The gate PIN is not stored on the device.',
            },
            {
              t: 'p',
              text: 'We do not use advertising cookies. You can manage cookies in your browser settings; clearing storage may remove the offline copy of a card and replies not yet sent. More detail is on the cookies page.',
            },
          ],
        },
        {
          id: 'security',
          h2: '11. Information security',
          blocks: [
            {
              t: 'ul',
              items: [
                'Role-based access: host, committee and gate agent each see only what they need; gate agents never see financial information.',
                'Secure sign-in, with a second factor for our staff.',
                'Encryption in transit and in relevant storage, including contribution records.',
                'Card links are unique and cannot be guessed; we store only hashed forms, plus an encrypted copy used to resend the link.',
                'QR signing keys are encrypted and never leave the server.',
                'Monitoring of suspicious activity, audit logs of administrative actions, and backup and recovery procedures.',
              ],
            },
            {
              t: 'p',
              text: 'No electronic system is completely secure. If a personal data breach happens, we assess it, contain it, and notify affected people and the relevant authorities as the law requires.',
            },
          ],
        },
        {
          id: 'rights',
          h2: '12. Your rights',
          blocks: [
            {
              t: 'p',
              text: 'Depending on your country and the applicable law, you have the right to:',
            },
            {
              t: 'ul',
              items: [
                'Know whether we process your information, and get a copy.',
                'Correct inaccurate or incomplete information.',
                'Ask for erasure.',
                'Object to certain processing, or ask for it to be restricted where available.',
                'Withdraw consent where consent is the lawful basis.',
                'Challenge certain decisions made solely by automated means.',
                'Get information about international transfers.',
                'Complain to your country’s data protection authority.',
              ],
            },
            {
              t: 'p',
              text: 'To make a request, email faragha@kadisasa.com with your name, contact details, the event or account concerned, the type of request, and the information needed to identify you. We may ask for more to confirm your identity so we do not disclose information to the wrong person. We respond within the time the applicable law sets. More detail is on the data requests page.',
            },
            {
              t: 'p',
              text: 'Guests can stop reminders with the button on their card or by contacting the host. Stopping reminders does not delete other event records.',
            },
          ],
        },
        {
          id: 'children',
          h2: '13. Children',
          blocks: [
            {
              t: 'p',
              text: 'Kadi Sasa is for adult hosts and committee members. Guest lists may include children when a host invites them. Tanzanian law treats children’s information as sensitive, so hosts must have the legal authority, parental or guardian involvement or consent, or another lawful basis where required, and should enter only the minimum needed (for example, a name within a household).',
            },
            {
              t: 'p',
              text: 'We do not give accounts to children, and we do not use children’s information for advertising or unrelated profiling.',
            },
          ],
        },
        {
          id: 'sensitive',
          h2: '14. Sensitive information',
          blocks: [
            {
              t: 'p',
              text: 'Some event information may count as sensitive under the law, such as information about children, financial records, health, religion, or biometric information if such a service is introduced later. We do not require hosts to collect unnecessary sensitive information. Where it is processed, we apply additional safeguards and require a lawful basis.',
            },
          ],
        },
        {
          id: 'automated',
          h2: '15. Automated processing',
          blocks: [
            {
              t: 'p',
              text: 'The system automatically verifies card validity, detects duplicate scans, updates attendance status and records message delivery status. These support event administration. A gate agent can always look a guest up by name and admit them manually, so no significant decision is made by the system alone without a person involved.',
            },
          ],
        },
        {
          id: 'third-party',
          h2: '16. Third-party websites and services',
          blocks: [
            {
              t: 'p',
              text: 'Kadi Sasa may link to external services such as maps, WhatsApp and payment providers. Those services have their own privacy policies and terms, and we are not responsible for their privacy practices.',
            },
          ],
        },
        {
          id: 'marketing',
          h2: '17. Marketing and communications',
          blocks: [
            {
              t: 'p',
              text: 'We do not sell guest information or use it for third-party advertising, and we do not send promotional messages to guests. We may send hosts service messages such as account notices, invitation delivery updates, billing confirmations, security alerts and important platform announcements. If we introduce promotional messages, we will get any consent the law requires and provide a way to unsubscribe.',
            },
          ],
        },
        {
          id: 'africa',
          h2: '18. Data protection across Africa',
          blocks: [
            {
              t: 'p',
              text: 'African countries have different data protection laws and authorities. Our privacy framework is designed to support national requirements, including:',
            },
            {
              t: 'table',
              head: ['Country', 'Law'],
              rows: [
                ['Tanzania', 'Personal Data Protection Act, 2022 (Act No. 11 of 2022)'],
                ['Kenya', 'Data Protection Act, 2019'],
                ['Uganda', 'Data Protection and Privacy Act, 2019'],
                ['Rwanda', 'Law No. 058/2021 on the protection of personal data and privacy'],
                ['Nigeria', 'Nigeria Data Protection Act, 2023'],
                ['South Africa', 'Protection of Personal Information Act (POPIA), 2013'],
                ['Ghana', 'Data Protection Act, 2012'],
                ['Malawi', 'Data Protection Act, 2024'],
                ['Botswana', 'Data Protection Act, 2024'],
              ],
            },
            {
              t: 'p',
              text: 'Where a country’s mandatory law gives more protection, it takes precedence over any inconsistent part of this policy. We may publish country-specific notices where needed.',
            },
          ],
        },
        {
          id: 'complaints',
          h2: '19. Complaints and authorities',
          blocks: [
            {
              t: 'p',
              text: 'If you think we have mishandled your information, contact us first at faragha@kadisasa.com. You also have the right to complain to your country’s data protection authority: the Personal Data Protection Commission (PDPC) in Tanzania, the Office of the Data Protection Commissioner (ODPC) in Kenya, and the relevant national authority elsewhere.',
            },
          ],
        },
        {
          id: 'changes',
          h2: '20. Changes to this policy',
          blocks: [
            {
              t: 'p',
              text: 'We may update this policy when our services, providers, the law or security needs change. The latest version is published at https://kadisasa.com/privacy and the date at the top is updated. Where the law requires, we will tell users about significant changes.',
            },
          ],
        },
        {
          id: 'contact',
          h2: '21. Contact us',
          blocks: [
            {
              t: 'p',
              text: 'Kadi Sasa Privacy Team. Email: faragha@kadisasa.com. Website: https://kadisasa.com. Country: Tanzania. Address: KADISASA, Soweto, Moshi, Tanzania.',
            },
          ],
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
      title: 'Masharti ya Matumizi | Kadi Sasa',
      description:
        'Masharti ya kutumia Kadi Sasa: akaunti, wajibu wa mwenyeji, ujumbe, malipo ya michango, walinda lango, mipaka ya dhima na mabadiliko.',
      h1: 'Masharti ya matumizi',
      answer:
        'Kwa kutumia Kadi Sasa unakubali masharti haya. Mwenyeji anawajibika kwa orodha ya wageni na ujumbe anaotuma, michango inalipwa kupitia watoa huduma wa malipo walioidhinishwa, na huduma iko kwenye majaribio na inatolewa kama ilivyo.',
      sections: [
        {
          id: 'ukubali',
          h2: 'Kukubali masharti',
          blocks: [
            {
              t: 'p',
              text: 'Ukiingia au kutumia Kadi Sasa unakubali masharti haya na sera ya faragha. Kama hukubali, usitumie huduma. Wageni wanaofungua kadi hawahitaji kukubali masharti ya mwenyeji, lakini wanafunikwa na sera ya faragha.',
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
              text: 'Michango inalipwa kupitia watoa huduma wa malipo walioidhinishwa. Kadi Sasa si benki wala mtoa huduma wa pesa za simu, na haihifadhi PIN za malipo. Uhusiano wa mchango upo kati ya mgeni na mwenyeji. Jinsi kamati inavyopokea pesa, ada na marejesho vitaelezwa hapa kabla ya kuanza kupokea malipo halisi.',
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
              text: 'Orodha za wageni na maandishi ya kadi ni yako. Unatupa ruhusa ya kuyatumia kadri inavyohitajika kuendesha huduma. Nembo, muundo na programu ya Kadi Sasa ni mali yetu.',
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
      title: 'Terms of Use | Kadi Sasa',
      description:
        'Terms for using Kadi Sasa: accounts, host responsibilities, messages, contribution payments, gate agents, limits of liability and changes.',
      h1: 'Terms of use',
      answer:
        'By using Kadi Sasa you accept these terms. The host is responsible for the guest list and the messages they send, contributions are paid through approved payment providers, and the service is in a pilot and provided as is.',
      sections: [
        {
          id: 'accept',
          h2: 'Accepting the terms',
          blocks: [
            {
              t: 'p',
              text: 'By signing in or using Kadi Sasa you accept these terms and the privacy policy. If you do not, do not use the service. Guests who open a card do not need to accept the host’s terms, but the privacy policy covers them.',
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
              text: 'Contributions are paid through approved payment providers. Kadi Sasa is not a bank or a mobile money provider and does not store payment PINs. A contribution is between the guest and the host. How the committee receives funds, fees and refunds will be set out here before real payments begin.',
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
              text: 'Guest lists and card text are yours. You give us permission to use them as needed to run the service. The Kadi Sasa name, design and software are ours.',
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
      title: 'Sera ya Vidakuzi na Hifadhi ya Kifaa | Kadi Sasa',
      description:
        'Kadi Sasa inatumia kidakuzi cha lugha na hifadhi ya kifaa kwa kadi kuonekana bila mtandao. Hatutumii vidakuzi vya matangazo wala vya uchanganuzi.',
      h1: 'Vidakuzi na hifadhi ya kifaa',
      answer:
        'Kadi Sasa inatumia kidakuzi kimoja cha lugha na hifadhi ya kivinjari ili kadi yako ionekane bila mtandao. Kwa sasa hatutumii vidakuzi vya matangazo wala vya uchanganuzi, kwa hiyo hakuna bango la kukubali vidakuzi.',
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
                'Zana za uchanganuzi zinazotuma data kwa makampuni ya nje.',
              ],
            },
          ],
        },
        {
          id: 'takwimu',
          h2: 'Takwimu zisizo na jina',
          blocks: [
            {
              t: 'p',
              text: 'Ili tujue kurasa zipi zinasaidia na ni ngapi zinaanzisha usajili, tunahifadhi idadi tu — bila kidakuzi, bila kutuma taarifa kwa mtu yeyote. Tunakokotoa alama ya kipindi kutoka IP yako na kivinjari pamoja na tarehe ya leo na siri yetu; IP na kivinjari havihifadhiwi, na alama inabadilika kila siku.',
            },
            {
              t: 'p',
              text: 'Hatuhifadhi jina lako, namba yako ya simu wala kitambulisho cha mwaliko kwenye takwimu hizi. Zinakaa siku 180 pekee, zikisomwa na wafanyakazi wetu peke yao.',
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
      title: 'Cookies and Device Storage Policy | Kadi Sasa',
      description:
        'Kadi Sasa uses a language cookie and browser storage so your card shows offline. We do not use advertising or analytics cookies.',
      h1: 'Cookies and device storage',
      answer:
        'Kadi Sasa uses one language cookie and browser storage so your card shows offline. We do not currently use advertising or analytics cookies, so there is no cookie consent banner.',
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
                'Analytics tools that send data to outside companies.',
              ],
            },
          ],
        },
        {
          id: 'anonymous',
          h2: 'Anonymous counts',
          blocks: [
            {
              t: 'p',
              text: 'So we know which pages help and how many people start signing up, we keep counts only — no cookies, nothing sent to anyone else. A per-day session key is derived from your IP and user-agent together with today’s date and our secret; the IP and user-agent are never stored, and the key changes every day.',
            },
            {
              t: 'p',
              text: 'We never put your name, phone number or invitation id into these counts. They are kept for 180 days and read only by our own staff.',
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
      title: 'Ombi la Data: Pata Nakala au Futa Taarifa Zako | Kadi Sasa',
      description:
        'Jinsi ya kuomba nakala ya taarifa zako, kuzisahihisha au kuzifuta kutoka Kadi Sasa. Mgeni au mwenyeji, na muda tunaochukua kujibu.',
      h1: 'Maombi ya data: nakala, usahihishaji na kufuta',
      answer:
        'Mgeni au mwenyeji anaweza kuomba nakala ya taarifa zake, kuzisahihisha au kuzifuta. Andika kwa faragha@kadisasa.com au mwombe mwenyeji wa tukio. Tunathibitisha kuwa ni wewe, kisha tunatekeleza ndani ya siku 30.',
      sections: [
        {
          id: 'nani',
          h2: 'Nani anaweza kuomba',
          blocks: [
            {
              t: 'ul',
              items: [
                'Mgeni aliyealikwa kwenye tukio lolote kupitia Kadi Sasa.',
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
                'Andika barua pepe kwa faragha@kadisasa.com. Eleza unachotaka: nakala, usahihishaji au kufuta.',
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
      title: 'Data Request: Copy or Delete Your Data | Kadi Sasa',
      description:
        'How to ask for a copy of your information, correct it or delete it from Kadi Sasa, as a guest or a host, and how long we take to respond.',
      h1: 'Data requests: copy, correction and deletion',
      answer:
        'A guest or host can ask for a copy of their information, ask for it to be corrected, or ask for it to be deleted. Email faragha@kadisasa.com or ask the event host. We check it is you, then act within 30 days.',
      sections: [
        {
          id: 'who',
          h2: 'Who can ask',
          blocks: [
            {
              t: 'ul',
              items: [
                'A guest invited to any event through Kadi Sasa.',
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
                'Email faragha@kadisasa.com. Say what you want: a copy, a correction or deletion.',
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
      title: 'Matumizi Yanayokubalika | Kadi Sasa',
      description:
        'Sheria za kutumia Kadi Sasa kwa heshima: bila ulaghai, bila matangazo, bila kuiga mtu, na kwa watu unaowafahamu tu.',
      h1: 'Matumizi yanayokubalika',
      answer:
        'Tumia Kadi Sasa kualika watu unaowafahamu kwenye tukio la kweli. Usitumie kutuma matangazo, kutapeli, kuiga mtu mwingine, au kukusanya pesa kwa udanganyifu. Tukiona ukiukaji tunaweza kusimamisha akaunti au tukio.',
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
      title: 'Acceptable Use Policy | Kadi Sasa',
      description:
        'Rules for using Kadi Sasa respectfully: no scams, no advertising, no impersonation, and only for people you know.',
      h1: 'Acceptable use',
      answer:
        'Use Kadi Sasa to invite people you know to a real event. Do not use it to send advertising, scam, impersonate someone, or collect money deceptively. If we see a breach we may suspend an account or event.',
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
