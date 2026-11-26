import { SiteLink as Link } from '@/components/site/site-link';
import type { Locale } from '@harusi/i18n';
import type { PricingCatalog } from '@harusi/schemas/billing';
import {
  ArrowUpRight,
  Globe,
  HandCoins,
  HeartHandshake,
  Mail,
  MessageSquare,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  WifiOff,
} from 'lucide-react';
import { CtaBand, Container, Faq, PillLink, SectionHeading } from '@/components/site/blocks';
import { JsonLd } from '@/components/site/json-ld';
import { pagePath, textOf } from '@/content';
import type { ContentPageDef } from '@/content/types';
import { APP_DOWNLOAD_PATH } from '@/lib/app-download';
import { SITE_URL, absoluteLocaleUrl, localeUrl, organizationNode } from '@/lib/seo';
import { PRICING_PATH } from '@/lib/server-pricing';

const PRINCIPLE_ICONS = [MessageSquare, ShieldCheck, HandCoins, WifiOff, Users] as const;
const STAGE_ICONS = [Sparkles, MessageSquare, HandCoins, QrCode, HeartHandshake] as const;

/**
 * Dedicated layout for `/about` and `/sw/kuhusu` matching the front page visual system:
 * white/navy/indigo palette, `.qw-hero-trapezoid` header backdrop, `.qw-navy-band` dark accents,
 * and `.qw-card` panels. Reuses `company.ts` as single source of truth for copy, metadata & FAQ.
 */
export function AboutPage({
  page,
  locale,
  catalog,
}: {
  page: ContentPageDef;
  locale: Locale;
  catalog: PricingCatalog;
}) {
  const sw = locale === 'sw';
  const t = textOf(page, locale);
  const path = pagePath(page, locale);
  const pageUrl = absoluteLocaleUrl(path, locale);
  const homeUrl = absoluteLocaleUrl('/', locale);
  const pricingHref = localeUrl(PRICING_PATH, locale);
  const appHref = localeUrl(APP_DOWNLOAD_PATH, locale);
  const safetyHref = localeUrl(
    sw ? '/usalama-wa-kadi-za-mtandaoni' : '/security-of-online-invitations',
    locale,
  );
  const contactHref = localeUrl(sw ? '/mawasiliano' : '/contact', locale);
  const freeCards = catalog.free.cards;

  const facts = sw
    ? [
        { value: '0%', label: 'Makato kwenye michango na ahadi' },
        { value: '3', label: 'Njia: WhatsApp, SMS na PDF ya QR' },
        { value: '100%', label: 'Lango linascan QR hata bila mtandao' },
        { value: String(freeCards), label: 'Kadi za mwanzo bure Tanzania' },
      ]
    : [
        { value: '0%', label: 'Platform cut on michango & pledges' },
        { value: '3', label: 'Channels: WhatsApp, SMS & printable QR' },
        { value: '100%', label: 'Offline gate QR & short-code scanning' },
        { value: String(freeCards), label: 'Free starter cards in Tanzania' },
      ];

  const story = sw
    ? {
        eyebrow: 'Chanzo chetu',
        title: 'Kwa nini tulijenga mfumo wa kadi unaoanza na kamati.',
        problemLabel: 'Kabla ya Kadi Sasa',
        problemTitle: 'Picha moja kwenye magroup, daftari linalopotea, na msongamano mlangoni',
        problemPoints: [
          'Kadi za karatasi hazirekebishiki ukumbi au saa ikibadilika, na gharama ya kuchapisha tena ni kubwa.',
          'Picha ya kadi kwenye WhatsApp husambazwa kwa watu wasioalikwa, huku wazazi wasio na smartphone wakikosa kadi.',
          'Ahadi za michango zinapotawanyika kwenye meseji za WhatsApp, wahasibu huchukua muda mrefu kuandaa ripoti ya kikao.',
        ],
        solutionLabel: 'Ndani ya Kadi Sasa',
        solutionTitle: 'Kadi binafsi kwa kila mgeni, uaminifu wazi, na usimamizi mmoja',
        solutionPoints: [
          'Kila mgeni anapata kiungo chake, SMS yenye namba fupi ya lango, au kadi ya PDF ya kuchapisha yenye QR ileile.',
          'Kila kadi inaonyesha mtumaji na namba ya kamati ya kupiga — bila maombi ya PIN wala nenosiri.',
          'Mlinzi wa mlango anapakua orodha kwenye simu ya Android kabla ya tukio na kuscan offline kwa sekunde.',
        ],
      }
    : {
        eyebrow: 'Why we started',
        title: 'Built around real committee rooms, not generic templates.',
        problemLabel: 'Before Kadi Sasa',
        problemTitle: 'Forwarded flyers, scattered pledge notes, and slow entrance tables',
        problemPoints: [
          'Paper cards cannot be updated when reception halls or start times shift without paying to reprint.',
          'Static WhatsApp images get forwarded freely while parents and grandparents on feature phones receive nothing.',
          'Tracking michango or harambee pledges across group chats creates stress for treasurers before every meeting.',
        ],
        solutionLabel: 'With Kadi Sasa',
        solutionTitle: 'One personal card per guest, transparent ledgers, and calm gates',
        solutionPoints: [
          'Guests receive their own link on WhatsApp, plain SMS with a short code, or a printable QR PDF card.',
          'Every card highlights the committee name and phone number with zero PIN or password prompts.',
          'Gate ushers sync the encrypted list ahead of time and verify QR codes offline without mobile signal.',
        ],
      };

  const occasions = sw
    ? [
        'Harusi',
        'Send-off',
        'Kitchen party',
        'Uchumba',
        'Nikah & Walima',
        'Ruracio',
        'Harambee',
        'Kanisa & Msikiti',
        'Mahafali & Birthday',
        'Makongamano & Kampuni',
      ]
    : [
        'Weddings',
        'Send-offs',
        'Kitchen parties',
        'Engagements',
        'Nikah & Walima',
        'Ruracio',
        'Harambee',
        'Church & Mosque',
        'Birthdays & Graduations',
        'Corporate Events',
      ];

  const stages = sw
    ? [
        {
          title: '1. Andaa kadi na mandhari',
          body: 'Weka majina, ukumbi, ramani, lugha (SW/EN) na jina la kamati.',
        },
        {
          title: '2. Tuma WhatsApp, SMS & PDF',
          body: 'Kila mgeni anapata njia inayomfaa; kama WhatsApp ikichelewa, SMS huingia yenyewe.',
        },
        {
          title: '3. RSVP na vikumbusho',
          body: 'Kusanya majibu ya watakaokuja na idadi ya viti kabla ya kuagiza chakula.',
        },
        {
          title: '4. Michango (0% makato)',
          body: 'Fuatilia ahadi na malipo ya M-Pesa, Mixx, Airtel au HaloPesa moja kwa moja kwa kamati.',
        },
        {
          title: '5. Lango offline & Kumbukumbu',
          body: 'Skani QR mlangoni bila mtandao na shiriki picha za Kumbukumbu baada ya sherehe.',
        },
      ]
    : [
        {
          title: '1. Design cards & details',
          body: 'Set couple or host names, venue map, SW/EN wording, and verified committee contacts.',
        },
        {
          title: '2. Reach every phone',
          body: 'Send WhatsApp links, automatic SMS fallback with short codes, or printable A6/A4 QR PDFs.',
        },
        {
          title: '3. Track RSVPs clearly',
          body: 'Know exact confirmed seats (including +1s) and schedule polite T-14, T-7, and T-1 reminders.',
        },
        {
          title: '4. 0% cut michango ledger',
          body: 'Track pledges and direct host payments via mobile money, bank, or cash with CSV exports.',
        },
        {
          title: '5. Offline gate & Kumbukumbu',
          body: 'Scan QR codes or search last 4 phone digits offline at the door, then share private event photos.',
        },
      ];

  const regions = sw
    ? [
        {
          code: 'TZ',
          country: 'Tanzania',
          status: 'Huduma kamili',
          statusTone: 'border-[#5469d4]/25 bg-[#f6f9fc] text-[#5469d4]',
          desc: `Bei za uwazi za TZS, kadi ${freeCards} za mwanzo bure, na malipo ya moja kwa moja kwa M-Pesa, Mixx by Yas, Airtel Money na HaloPesa.`,
          href: pricingHref,
          cta: 'Angalia bei za Tanzania',
        },
        {
          code: 'KE',
          country: 'Kenya',
          status: 'Majaribio (Pilot)',
          statusTone: 'border-[#e3e8ee] bg-[#f6f9fc] text-[#0a2640]',
          desc: 'Namba za +254, saa ya Nairobi, na miongozo ya harusi, ruracio na harambee zenye ufuatiliaji wa M-Pesa Paybill na Till.',
          href: '/ke',
          cta: 'Fungua ukurasa wa Kenya',
        },
        {
          code: 'UG',
          country: 'Uganda',
          status: 'Miongozo ya mwanzo',
          statusTone: 'border-[#e3e8ee] bg-[#f6f9fc] text-[#494d59]',
          desc: 'Miongozo ya kadi za kidijitali na michango kwa sherehe za Kwanjula, Kuhingira na kamati za harusi Uganda.',
          href: '/ug',
          cta: 'Fungua ukurasa wa Uganda',
        },
      ]
    : [
        {
          code: 'TZ',
          country: 'Tanzania',
          status: 'Live & billing active',
          statusTone: 'border-[#5469d4]/25 bg-[#f6f9fc] text-[#5469d4]',
          desc: `Transparent TZS per-card tiers, ${freeCards} free starter cards, and direct host contributions via M-Pesa, Mixx by Yas, Airtel Money, and HaloPesa.`,
          href: pricingHref,
          cta: 'See Tanzania pricing',
        },
        {
          code: 'KE',
          country: 'Kenya',
          status: 'Early pilot',
          statusTone: 'border-[#e3e8ee] bg-[#f6f9fc] text-[#0a2640]',
          desc: 'Built for +254 numbers, Nairobi time, and ruracio, harambee, and wedding committees tracking M-Pesa Paybill/Till pledges.',
          href: '/ke',
          cta: 'Explore Kenya pilot',
        },
        {
          code: 'UG',
          country: 'Uganda',
          status: 'Early guides',
          statusTone: 'border-[#e3e8ee] bg-[#f6f9fc] text-[#494d59]',
          desc: 'Practical guides for digital invitations and pledge coordination across Kwanjula, Kuhingira, and wedding receptions.',
          href: '/ug',
          cta: 'Explore Uganda guides',
        },
      ];

  const heroEyebrow = sw
    ? 'Imeundwa Dar es Salaam · Afrika Mashariki'
    : 'Built in Dar es Salaam · East Africa';

  const principles = t.sections.find((s) => s.id === 'misingi' || s.id === 'believe');
  const principleItems =
    principles?.blocks.find((b): b is { t: 'ul'; items: string[] } => b.t === 'ul')?.items ?? [];

  return (
    <main>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            organizationNode(t.description),
            {
              '@type': 'AboutPage',
              '@id': pageUrl,
              url: pageUrl,
              name: t.h1,
              description: t.description,
              inLanguage: sw ? 'sw-TZ' : 'en-TZ',
              datePublished: page.published ?? page.updated,
              dateModified: page.updated,
              isPartOf: { '@id': `${SITE_URL}/#website` },
              about: { '@id': `${SITE_URL}/#org` },
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: sw ? 'Nyumbani' : 'Home',
                  item: homeUrl,
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: t.nav,
                  item: pageUrl,
                },
              ],
            },
            ...(t.faq?.length
              ? [
                  {
                    '@type': 'FAQPage',
                    mainEntity: t.faq.map((f) => ({
                      '@type': 'Question',
                      name: f.q,
                      acceptedAnswer: { '@type': 'Answer', text: f.a },
                    })),
                  },
                ]
              : []),
          ],
        }}
      />

      {/* Front-page matched Hero */}
      <section className="relative overflow-hidden border-b border-[#e3e8ee] bg-white">
        <div
          aria-hidden="true"
          className="qw-hero-trapezoid pointer-events-none absolute inset-x-0 top-0 h-[320px] opacity-25 md:h-[380px]"
        />
        <Container className="relative grid items-center gap-10 pt-10 pb-16 md:grid-cols-[1.15fr_0.85fr] md:gap-12 md:pt-14 md:pb-24">
          <div className="ks-enter flex flex-col gap-5">
            <nav aria-label="Breadcrumb" className="text-sm text-[#494d59]">
              <ol className="flex flex-wrap items-center gap-1.5">
                <li>
                  <Link
                    href={localeUrl('/', locale)}
                    className="inline-flex min-h-10 items-center underline underline-offset-4 hover:text-[#5469d4]"
                  >
                    {sw ? 'Nyumbani' : 'Home'}
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="font-medium text-[#0a2640]">
                  {t.nav}
                </li>
              </ol>
            </nav>

            <div>
              <span className="inline-flex items-center gap-2.5 rounded-full border border-[#e3e8ee] bg-white/95 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.16em] text-[#0a2640] uppercase shadow-xs">
                <span aria-hidden="true" className="qw-ripple-dot" />
                {heroEyebrow}
              </span>
            </div>

            <h1 className="text-[36px] leading-[1.08] font-bold tracking-[-0.03em] text-[#0a2640] [text-wrap:balance] sm:text-[46px] lg:text-[52px]">
              {t.h1}
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-[#494d59] sm:text-[18px]">
              {t.answer}
            </p>
            <div className="flex flex-wrap items-center gap-3.5 pt-1">
              <PillLink href="/login" kind="primary">
                {sw ? `Anza bure (${freeCards} kadi)` : `Start free (${freeCards} cards)`}
              </PillLink>
              <PillLink href={pricingHref} kind="secondary">
                {sw ? 'Angalia bei' : 'See pricing'}
              </PillLink>
            </div>
          </div>

          <div className="qw-navy-band relative overflow-hidden rounded-3xl border border-[#5469d4]/30 p-6 text-white shadow-[0_24px_56px_-20px_rgb(10_38_64/0.38)]">
            <p className="mb-4 text-[11px] font-semibold tracking-[0.18em] text-[#93c5fd] uppercase">
              {sw ? 'Kadi Sasa kwa muhtasari' : 'Kadi Sasa at a glance'}
            </p>
            <div className="grid grid-cols-2 gap-3.5">
              {facts.map((f) => (
                <div
                  key={f.label}
                  className="flex flex-col justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <span className="text-[30px] leading-none font-bold text-white md:text-[36px]">
                    {f.value}
                  </span>
                  <span className="text-xs leading-snug text-white/80 md:text-sm">{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Problem -> Solution */}
      <section className="bg-[#f6f9fc] py-16 md:py-24" aria-labelledby="about-story">
        <Container>
          <SectionHeading id="about-story" eyebrow={story.eyebrow}>
            {story.title}
          </SectionHeading>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <article className="qw-card flex flex-col gap-4 p-6 md:p-8">
              <span className="w-fit rounded-full border border-[#e3e8ee] bg-[#f6f9fc] px-3 py-1 text-xs font-semibold tracking-wider text-[#494d59] uppercase">
                {story.problemLabel}
              </span>
              <h3 className="text-xl font-bold text-[#0a2640]">{story.problemTitle}</h3>
              <ul className="mt-1 space-y-3 text-[15px] leading-relaxed text-[#494d59]">
                {story.problemPoints.map((pt) => (
                  <li key={pt} className="flex gap-2.5">
                    <span
                      aria-hidden="true"
                      className="mt-2 size-1.5 shrink-0 rounded-full bg-[#494d59]"
                    />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="qw-card flex flex-col gap-4 border-[#5469d4]/30 bg-white p-6 md:p-8">
              <span className="w-fit rounded-full border border-[#5469d4]/25 bg-[#f6f9fc] px-3 py-1 text-xs font-semibold tracking-wider text-[#5469d4] uppercase">
                {story.solutionLabel}
              </span>
              <h3 className="text-xl font-bold text-[#0a2640]">{story.solutionTitle}</h3>
              <ul className="mt-1 space-y-3 text-[15px] leading-relaxed text-[#0a2640]">
                {story.solutionPoints.map((pt) => (
                  <li key={pt} className="flex gap-2.5">
                    <span
                      aria-hidden="true"
                      className="mt-2 size-1.5 shrink-0 rounded-full bg-[#5469d4]"
                    />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </Container>
      </section>

      {/* Core Principles */}
      {principleItems.length ? (
        <section className="bg-white py-16 md:py-24" aria-labelledby="about-principles">
          <Container>
            <SectionHeading id="about-principles" eyebrow={sw ? 'Maadili yetu' : 'How we build'}>
              {sw ? 'Misingi mitano inayoongoza kila kadi' : 'Five principles behind every card'}
            </SectionHeading>
            <ul className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {principleItems.map((item, idx) => {
                const Icon = PRINCIPLE_ICONS[idx % PRINCIPLE_ICONS.length]!;
                const [head, ...rest] = item.split(':');
                const body = rest.join(':').trim();
                return (
                  <li key={item} className="qw-card flex flex-col gap-3 p-6">
                    <span className="flex size-11 items-center justify-center rounded-xl border border-[#e3e8ee] bg-[#f6f9fc] text-[#5469d4]">
                      <Icon className="size-5" strokeWidth={1.85} aria-hidden="true" />
                    </span>
                    {body ? (
                      <>
                        <h3 className="text-lg font-bold text-[#0a2640]">{head}</h3>
                        <p className="text-[15px] leading-relaxed text-[#494d59]">{body}</p>
                      </>
                    ) : (
                      <p className="text-[15px] leading-relaxed font-medium text-[#0a2640]">
                        {item}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </Container>
        </section>
      ) : null}

      {/* Occasions & Workflow */}
      <section className="bg-[#f6f9fc] py-16 md:py-24" aria-labelledby="about-workflow">
        <Container>
          <SectionHeading
            id="about-workflow"
            eyebrow={sw ? 'Mfumo mzima' : 'Built for every gathering'}
            sub={
              sw
                ? 'Kuanzia harusi kubwa za kamati hadi mialiko ya familia au makongamano.'
                : 'From large family wedding committees to private celebrations and conferences.'
            }
          >
            {sw
              ? 'Sherehe moja, mtiririko mmoja kuanzia mwanzo hadi picha'
              : 'One flow from card creation to reception photos'}
          </SectionHeading>

          <div className="mt-6 flex flex-wrap gap-2">
            {occasions.map((occ) => (
              <span
                key={occ}
                className="rounded-full border border-[#e3e8ee] bg-white px-3.5 py-1.5 text-sm font-medium text-[#0a2640] shadow-xs"
              >
                {occ}
              </span>
            ))}
          </div>

          <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {stages.map((s, idx) => {
              const Icon = STAGE_ICONS[idx % STAGE_ICONS.length]!;
              return (
                <li key={s.title} className="qw-card flex flex-col gap-3 p-5">
                  <span className="flex size-10 items-center justify-center rounded-xl border border-[#e3e8ee] bg-[#f6f9fc] text-[#5469d4]">
                    <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <h3 className="text-base font-bold text-[#0a2640]">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-[#494d59]">{s.body}</p>
                </li>
              );
            })}
          </ol>
        </Container>
      </section>

      {/* East Africa Markets */}
      <section className="bg-white py-16 md:py-24" aria-labelledby="about-regions">
        <Container>
          <SectionHeading
            id="about-regions"
            eyebrow={sw ? 'Afrika Mashariki' : 'Regional availability'}
            sub={
              sw
                ? 'Tunatangaza huduma zilizokamilika na zilizo kwenye majaribio kwa uwazi.'
                : 'Transparent rollout status across Tanzania, Kenya, and Uganda.'
            }
          >
            {sw ? 'Mahali Kadi Sasa inapofanya kazi leo' : 'Where Kadi Sasa is available today'}
          </SectionHeading>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {regions.map((r) => (
              <div key={r.code} className="qw-card flex flex-col justify-between gap-5 p-6 md:p-7">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 font-bold text-[#0a2640]">
                      <Globe className="size-4 text-[#5469d4]" aria-hidden="true" />
                      {r.country}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${r.statusTone}`}
                    >
                      {r.status}
                    </span>
                  </div>
                  <p className="text-[15px] leading-relaxed text-[#494d59]">{r.desc}</p>
                </div>
                <Link
                  href={r.href}
                  className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-[#5469d4] underline-offset-4 hover:text-[#0a2640] hover:underline"
                >
                  <span>{r.cta}</span>
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* FAQ */}
      {t.faq?.length ? (
        <Faq
          id="maswali-kuhusu"
          title={sw ? 'Maswali ya haraka kuhusu Kadi Sasa' : 'Quick answers about Kadi Sasa'}
          eyebrow={sw ? 'Maswali' : 'FAQ'}
          items={t.faq}
          emitSchema={false}
        />
      ) : null}

      {/* Direct Support & Safety Links */}
      <Container as="section" className="pb-12">
        <div className="qw-card flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold text-[#0a2640]">
              {sw ? 'Unahitaji kuzungumza na timu yetu?' : 'Want to reach our team directly?'}
            </h2>
            <p className="max-w-2xl text-[15px] text-[#494d59]">
              {sw
                ? 'Tuandikie kuhusu mahitaji ya kamati yako, usalama wa kadi, au majaribio ya Kenya.'
                : 'Write to us for committee onboarding, card safety verification, or Kenya early pilot access.'}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-4 text-sm font-semibold">
              <a
                href="mailto:faragha@kadisasa.com"
                className="inline-flex min-h-10 items-center gap-1.5 text-[#5469d4] hover:text-[#0a2640] hover:underline"
              >
                <Mail className="size-4" aria-hidden="true" />
                faragha@kadisasa.com
              </a>
              <Link
                href={contactHref}
                className="inline-flex min-h-10 items-center gap-1 text-[#0a2640] underline underline-offset-4 hover:text-[#5469d4]"
              >
                {sw ? 'Ukurasa wa mawasiliano' : 'Contact page'}
              </Link>
              <Link
                href={safetyHref}
                className="inline-flex min-h-10 items-center gap-1 text-[#0a2640] underline underline-offset-4 hover:text-[#5469d4]"
              >
                {sw ? 'Usalama wa kadi' : 'Card safety'}
              </Link>
              <Link
                href={appHref}
                className="inline-flex min-h-10 items-center gap-1 text-[#0a2640] underline underline-offset-4 hover:text-[#5469d4]"
              >
                <Smartphone className="size-4" aria-hidden="true" />
                {sw ? 'Programu ya Android' : 'Android gate app'}
              </Link>
            </div>
          </div>
        </div>
      </Container>

      <CtaBand
        eyebrow={sw ? 'Tayari kuanza?' : 'Ready to start?'}
        text={
          sw
            ? `Jaribu kadi ${freeCards} za mwanzo bure na kamati yako leo.`
            : `Try your first ${freeCards} starter cards free with your committee.`
        }
        primary={{ href: '/login', label: sw ? 'Anza bure' : 'Start free' }}
        secondary={{ href: '/k', label: sw ? 'Nina namba ya kadi' : 'I have a card number' }}
      />
    </main>
  );
}
