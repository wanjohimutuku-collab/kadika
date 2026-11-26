import { SiteLink as Link } from '@/components/site/site-link';
import {
  ArrowUpRight,
  Briefcase,
  Cake,
  Check,
  Gem,
  Gift,
  Globe,
  GraduationCap,
  Heart,
  Landmark,
  MoonStar,
  Sparkles,
} from 'lucide-react';
import { type PricingCatalog } from '@harusi/schemas/billing';
import { DEFAULT_BRANDING } from '@harusi/schemas/branding';
import { ALL_PAGES, getPage, marketOf, pagePath, textOf } from '@/content';
import { homeCopy } from '@/content/home';
import {
  ORG_ID,
  SITE_URL,
  absoluteLocaleUrl,
  localeUrl,
  organizationNode,
  pricingOffersNode,
} from '@/lib/seo';
import { APP_DOWNLOAD_PATH } from '@/lib/app-download';
import { PRICING_PATH } from '@/lib/server-pricing';
import type { SiteEdition } from '@/lib/site-nav';
import { AnswerBlock, Container, Faq, PillLink, SectionHeading, Steps } from './blocks';
import { JsonLd } from './json-ld';
import { AppMockup, CardAndSms, GateChip, MichangoBar, TrustStrip } from './mockups';
import { Hero } from './home/hero';
import { HeroLive } from './home/hero-live';
import { OccasionShowcase } from './home/occasion-showcase';
import { FeatureStrip } from './home/feature-strip';
import { GalleryShowcase } from './home/gallery-showcase';
import { PricingTeaser } from './home/pricing-teaser';
import { CtaBand } from './home/cta-band';
import {
  QuickworkDarkReliability,
  QuickworkFourPlanes,
  QuickworkPersonas,
  QuickworkStandout,
  QuickworkSyncFlow,
} from './home/quickwork-sections';

/** Tanzania event pages linked from the home page (social/weddings first, corporate last). */
const TZ_EVENTS = [
  'kadi-ya-harusi-mtandaoni',
  'kadi-ya-send-off',
  'kadi-ya-kitchen-party',
  'kadi-ya-uchumba',
  'kadi-ya-nikah-na-walima',
  'kadi-za-kanisa',
  'kadi-ya-mahafali',
  'kadi-ya-kuzaliwa',
  'kadi-za-mwaliko-tanzania',
  'kadi-za-kidijitali-tanzania',
  'kadi-za-mwaliko-biashara',
] as const;

/** Pillar guides and comparison articles linked from the home page to pass internal PageRank. */
const TZ_GUIDES = [
  'kadi-za-harusi-online',
  'michango-ya-harusi',
  'kadi-ya-send-off-kitchen-party',
  'mwaliko-bila-smartphone',
  'kadi-sasa-vs-karatasi-na-zana-za-kubuni',
  'gharama-halisi-za-huduma-ya-mialiko',
  'jinsi-ya-kuunda-kadi-ya-harusi-tanzania',
  'kutuma-kadi-za-mwaliko-whatsapp',
  'kadi-ya-mtandaoni-vs-karatasi',
  'kusimamia-majibu-ya-rsvp',
  'lango-la-harusi-qr',
  'jinsi-ya-kuchagua-huduma-ya-kadi-za-mwaliko',
  'kadi-ya-harusi-bila-smartphone',
  'kamusi-ya-harusi',
] as const;

const KE_GUIDES = [
  'digital-wedding-invitations-kenya',
  'ruracio-harambee-invitations-contributions',
  'wedding-committee-guide',
  'wedding-contributions-guide',
  'wedding-invitation-wording',
  'is-a-digital-wedding-invitation-safe',
] as const;

const UG_GUIDES = [
  'kwanjula-kuhingira-digital-invitation',
  'uganda-wedding-pledge-cards-guide',
  'uganda-wedding-committee-guide',
  'ecard-uganda-vs-paper',
] as const;

const domainOf = (url: string) => url.replace(/^https?:\/\//, '');

/** Server-computed seed so SSR and the hero island's client state start in agreement. */
function nextSaturdayFromToday(): string {
  const d = new Date();
  d.setDate(d.getDate() + 60);
  const day = d.getDay();
  const shift = (6 - day + 7) % 7;
  d.setDate(d.getDate() + shift);
  return d.toISOString().slice(0, 10);
}

/** `/`, `/en` and `/ke`: one page, copy per edition, prices from the live catalogue. */
export function HomePage({ edition, pricing }: { edition: SiteEdition; pricing: PricingCatalog }) {
  const domain = domainOf(SITE_URL);
  const c = homeCopy(edition, pricing, domain);
  const market = edition === 'ke' ? 'ke' : edition === 'ug' ? 'ug' : 'tz';
  const locale = edition === 'sw' ? 'sw' : 'en';
  const path = market === 'tz' ? '/' : `/${market}`;
  const currency = market === 'ke' ? 'KES' : 'TZS';
  const contact = getPage('mawasiliano');
  const pilotHref = contact ? localeUrl(pagePath(contact, 'en'), 'en') : '/';
  const primaryHref = market !== 'tz' ? pilotHref : '/login';
  const appHref = localeUrl(APP_DOWNLOAD_PATH, locale);
  const jaribuBase = '/jaribu';
  const demoSeed =
    market === 'ke'
      ? {
          coupleNames: 'Wanjiru & Otieno',
          partnerA: 'Wanjiru',
          partnerB: 'Otieno',
          guestName: 'Mr & Mrs Kamau',
          shortCode: 'WK-3725',
          venue: 'Safari Park Gardens, Nairobi',
        }
      : market === 'ug'
        ? {
            coupleNames: 'Namukasa & Kato',
            partnerA: 'Namukasa',
            partnerB: 'Kato',
            guestName: 'Ssenga Grace',
            shortCode: 'UG-2104',
            venue: 'Serena Gardens, Kampala',
          }
        : {
            coupleNames: 'Asha & Juma',
            partnerA: 'Asha',
            partnerB: 'Juma',
            guestName: 'Mwanaidi Salim',
            shortCode: 'KH-4826',
            venue: 'Ukumbi wa Mwanga, Kibaha',
          };
  const demoHrefSeed = `${jaribuBase}?names=${encodeURIComponent(demoSeed.coupleNames)}&date=2026-12-19&event=harusi`;
  const name = DEFAULT_BRANDING.businessName;
  const events =
    market !== 'tz'
      ? ALL_PAGES.filter((p) => marketOf(p) === market && p.slug && p.group !== 'legal')
      : TZ_EVENTS.map((s) => getPage(s)).filter((p) => !!p);
  const guides = (market === 'ke' ? KE_GUIDES : market === 'ug' ? UG_GUIDES : TZ_GUIDES)
    .map((s) => getPage(s, market))
    .filter((p) => !!p);
  const pageUrl = absoluteLocaleUrl(path, locale);
  const perCardLabel = locale === 'sw' ? 'Kwa kadi' : 'per card';
  const fromLabel = locale === 'sw' ? 'Kuanzia' : 'From';
  const readGuideLabel = locale === 'sw' ? 'Soma mwongozo' : 'Read guide';
  const heroCapabilities =
    market === 'ke'
      ? [
          'WhatsApp, SMS & printable PDF',
          'Offline QR gate verification',
          '0% cut on M-Pesa harambee pledges',
          'Swahili & English support',
        ]
      : market === 'ug'
        ? [
            'WhatsApp, SMS & printable PDF',
            'Offline QR gate verification',
            '0% cut on UGX pledge cards',
            'Swahili & English support',
          ]
        : locale === 'sw'
          ? [
              'WhatsApp, SMS na karatasi (A6/A4)',
              'Skani ya QR bila mtandao',
              '0% makato kwenye michango',
              'Kiswahili na Kiingereza',
            ]
          : [
              'WhatsApp, SMS & printable PDF',
              'Offline QR gate verification',
              '0% commission on michango',
              'Swahili & English support',
            ];
  const answerBadges =
    market === 'ke'
      ? ['WhatsApp + SMS Cards', 'RSVP & Party Size', 'Offline QR Gate', 'M-Pesa Harambee Ledger']
      : market === 'ug'
        ? ['WhatsApp + SMS E-Cards', 'Kwanjula & Weddings', 'Offline QR Gate', 'UGX Pledge Ledger']
        : locale === 'sw'
          ? ['WhatsApp + SMS + PDF', 'Majibu (RSVP)', 'Lango bila mtandao', 'Daftari la Michango']
          : ['WhatsApp + SMS + PDF', 'Guest RSVP', 'Offline QR Gate', 'Michango Ledger'];

  return (
    <main>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            organizationNode(c.answer),
            {
              '@type': 'WebSite',
              '@id': `${SITE_URL}/#site`,
              name,
              url: SITE_URL,
              inLanguage: ['sw-TZ', 'en-TZ', 'en-KE', 'en-UG'],
              publisher: { '@id': ORG_ID },
            },
            {
              '@type': 'WebPage',
              '@id': `${pageUrl}#page`,
              url: pageUrl,
              name: c.title,
              description: c.description,
              inLanguage: market === 'ke' ? 'en-KE' : market === 'ug' ? 'en-UG' : `${locale}-TZ`,
              isPartOf: { '@id': `${SITE_URL}/#site` },
              about: { '@id': ORG_ID },
              speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', '#jibu'] },
            },
            {
              '@type': 'Service',
              name: c.title.split(' | ')[0],
              serviceType:
                'Digital e-cards, invitations, RSVP, contribution tracking and QR guest check-in',
              provider: { '@id': ORG_ID },
              areaServed: market === 'ke' ? 'KE' : market === 'ug' ? 'UG' : 'TZ',
              availableLanguage: market === 'tz' ? ['sw', 'en'] : ['en', 'sw'],
              description: c.description,
            },
            {
              '@type': 'SoftwareApplication',
              name,
              applicationCategory: 'LifestyleApplication',
              operatingSystem: 'Web, Android',
              url: SITE_URL,
              inLanguage:
                market === 'ke' ? ['en-KE'] : market === 'ug' ? ['en-UG'] : ['sw-TZ', 'en-TZ'],
              featureList: [
                'Digital invitations for weddings, parties, community and corporate events',
                'WhatsApp and SMS digital invitation cards',
                'Printable A6, A5 and A4 QR cards',
                'RSVP and headcount tracking',
                'Optional michango and pledge tracking',
                'Private guest photo gallery (Kumbukumbu)',
                'Offline Android QR gate and reception check-in',
              ],
              offers:
                market === 'tz'
                  ? pricingOffersNode(pricing, 'TZS', locale)
                  : {
                      '@type': 'Offer',
                      price: '0',
                      priceCurrency: currency,
                      description: c.heroTrustLine,
                    },
              publisher: { '@id': ORG_ID },
            },
            {
              '@type': 'HowTo',
              name: c.trySection.title,
              inLanguage: market === 'ke' ? 'en-KE' : market === 'ug' ? 'en-UG' : `${locale}-TZ`,
              step: c.trySection.steps.map((s, i) => ({
                '@type': 'HowToStep',
                position: i + 1,
                name: s.title,
                text: s.body,
              })),
            },
          ],
        }}
      />

      <Hero
        h1={c.hero.h1}
        accentWord={c.heroAccent}
        sub={c.hero.sub}
        primary={{ href: primaryHref, label: c.hero.primary }}
        howHref="#jaribu-mwenyewe"
        howLabel={c.heroHowLink}
        guestCard={{ href: '/k', label: c.hero.secondary }}
        trustLine={c.heroTrustLine}
        kickerEvents={c.kickerEvents}
        previewFrameAlt={c.hero.h1}
        statCards={c.heroStatCards}
        capabilities={heroCapabilities}
        demoCard={demoSeed}
      />

      <QuickworkStandout locale={locale} />

      <div id="jibu" className="bg-white">
        <AnswerBlock label={c.answerLabel} text={c.answer} badges={answerBadges} />
      </div>

      <QuickworkFourPlanes locale={locale} market={market} />

      <QuickworkSyncFlow locale={locale} market={market} />

      <OccasionShowcase
        copy={c.occasionShowcase}
        primaryHref={primaryHref}
        jaribuBase={jaribuBase}
        initialDateISO={nextSaturdayFromToday()}
        locale={locale}
      />

      <HeroLive
        locale={locale}
        eyebrow={c.demoStudio.eyebrow}
        h1={c.demoStudio.title}
        sub={c.demoStudio.sub}
        secondaryBaseHref={jaribuBase}
        secondaryLabel={c.heroPreviewOpen}
        form={c.formLabels}
        previewFrameAlt={c.hero.h1}
        initialDateISO={nextSaturdayFromToday()}
        defaultNames={demoSeed.coupleNames}
      />

      <div className="bg-[#f6f9fc]">
        <FeatureStrip
          rows={c.featureRows}
          rowHrefs={[
            c.featureRows[0].linkSlug && getPage(c.featureRows[0].linkSlug, market)
              ? localeUrl(pagePath(getPage(c.featureRows[0].linkSlug, market)!, locale), locale)
              : undefined,
            c.featureRows[1].linkSlug && getPage(c.featureRows[1].linkSlug, market)
              ? localeUrl(pagePath(getPage(c.featureRows[1].linkSlug, market)!, locale), locale)
              : undefined,
            c.featureRows[2].linkSlug && getPage(c.featureRows[2].linkSlug, market)
              ? localeUrl(pagePath(getPage(c.featureRows[2].linkSlug, market)!, locale), locale)
              : undefined,
          ]}
          promoTitle={c.featurePromo.title}
          promoBody={c.featurePromo.body}
          promoHref={primaryHref}
          promoCta={c.hero.primary}
          sectionLabel={locale === 'sw' ? 'Vipengele vikuu' : 'Key features'}
        />
      </div>

      {/* Platform Bento Grid: Four-step workflow & signature product deep dives */}
      <section
        aria-labelledby="jinsi-inavyofanya-kazi"
        className="bg-[#f6f9fc] pb-16 pt-8 md:pb-24"
      >
        <Container className="flex flex-col gap-12">
          <SectionHeading id="jinsi-inavyofanya-kazi" eyebrow={c.eyebrows.steps}>
            {c.stepsTitle}
          </SectionHeading>
          <Steps items={c.steps} />

          {/* Signature bento cards: No smartphone + Michango + Offline Gate */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Non-smartphone / SMS + Printed card showcase */}
            <article className="qw-card ks-reveal flex lg:col-span-2">
              <div className="grid w-full items-center gap-8 p-6 md:grid-cols-[1.05fr_0.95fr] md:p-10">
                <div className="flex flex-col gap-4">
                  <h3 className="text-[26px] font-bold leading-[1.15] tracking-[-0.02em] text-[#0a2640] md:text-[32px]">
                    {c.noPhone.h2}
                  </h3>
                  <p className="text-base leading-relaxed text-[#494d59]">{c.noPhone.body}</p>
                  <ul className="flex flex-col gap-2 text-sm text-[#0a2640]">
                    {c.noPhone.items.map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <Check
                          className="mt-0.5 size-4 shrink-0 text-[#5469d4]"
                          aria-hidden="true"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex justify-center md:justify-end">
                  <CardAndSms card={c.card} sms={c.sms} />
                </div>
              </div>
            </article>

            {/* Michango ledger showcase */}
            <article className="qw-card ks-reveal flex">
              <div className="flex w-full flex-col justify-between gap-6 p-6 md:p-8">
                <div className="flex flex-col gap-3">
                  <h3 className="text-[24px] font-bold leading-[1.15] tracking-[-0.02em] text-[#0a2640] md:text-[28px]">
                    {c.michango.h2}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#494d59] md:text-base">
                    {c.michango.body}
                  </p>
                  <ul className="flex flex-col gap-1.5 text-sm text-[#0a2640]">
                    {c.michango.items.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Check
                          className="mt-0.5 size-4 shrink-0 text-[#5469d4]"
                          aria-hidden="true"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="rounded-xl bg-[#f6f9fc] px-3.5 py-2.5 text-xs font-medium text-[#5469d4]">
                    {c.michango.note}
                  </p>
                </div>
                <MichangoBar rows={c.michango.rows} currency={currency} labels={c.michango.bar} />
              </div>
            </article>

            {/* Offline gate verification showcase */}
            <article className="qw-card ks-reveal flex">
              <div className="flex w-full flex-col justify-between gap-6 p-6 md:p-8">
                <div className="flex flex-col gap-3">
                  <h3 className="text-[24px] font-bold leading-[1.15] tracking-[-0.02em] text-[#0a2640] md:text-[28px]">
                    {c.gate.h2}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#494d59] md:text-base">
                    {c.gate.body}
                  </p>
                  <ul className="flex flex-col gap-1.5 text-sm text-[#0a2640]">
                    {c.gate.items.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Check
                          className="mt-0.5 size-4 shrink-0 text-[#5469d4]"
                          aria-hidden="true"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col gap-3 rounded-2xl border border-[#e3e8ee] bg-[#f6f9fc] p-5">
                  <div className="flex items-center justify-between border-b border-[#e3e8ee] pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#0a2640]">
                      {locale === 'sw' ? 'Matokeo ya Skani' : 'Gate Scan States'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0f7a47]">
                      <span aria-hidden="true" className="qw-ripple-dot" />
                      {locale === 'sw' ? 'Bila Mtandao' : 'Offline Cache'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between rounded-xl bg-white px-3.5 py-2.5 ring-1 ring-[#e3e8ee]">
                      <GateChip state="ok" label={c.gate.chips.ok} />
                      <span className="text-xs font-medium text-[#494d59]">Gate A · 0.3s</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white px-3.5 py-2.5 ring-1 ring-[#e3e8ee]">
                      <GateChip state="duplicate" label={c.gate.chips.duplicate} />
                      <span className="text-xs font-medium text-[#494d59]">Blocked</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white px-3.5 py-2.5 ring-1 ring-[#e3e8ee]">
                      <GateChip state="missing" label={c.gate.chips.missing} />
                      <span className="text-xs font-medium text-[#494d59]">Rejected</span>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>

          <TrustStrip
            title={c.trust.title}
            items={c.trust.items}
            cta={{ href: '/k', label: c.trust.cta }}
          />
        </Container>
      </section>

      <GalleryShowcase locale={locale} primaryHref={primaryHref} />

      <QuickworkDarkReliability locale={locale}>
        <section aria-labelledby="programu" className="pt-2">
          <div className="grid gap-12 md:grid-cols-[1fr_1.05fr] md:items-center md:gap-10">
            <div className="flex flex-col gap-6">
              <SectionHeading id="programu" eyebrow={c.eyebrows.app} sub={c.app.body} dark>
                {c.app.h2}
              </SectionHeading>
              <ul className="flex flex-col gap-3">
                {c.app.items.map((i) => (
                  <li key={i} className="flex gap-3 leading-relaxed text-white/90">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10"
                    >
                      <Check className="size-3.5 text-[#7dff7a]" aria-hidden="true" />
                    </span>
                    {i}
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <PillLink href={appHref} kind="onDark">
                  {c.app.cta}
                </PillLink>
                <PillLink href={market === 'ke' ? pilotHref : '/login'} kind="outlineOnDark">
                  {c.app.secondary}
                </PillLink>
              </div>
            </div>
            <div className="flex justify-center pt-4 md:justify-end md:pt-0">
              <AppMockup labels={c.app.mock} />
            </div>
          </div>
        </section>
      </QuickworkDarkReliability>

      <QuickworkPersonas locale={locale} />

      {market === 'tz' ? (
        <PricingTeaser
          catalog={pricing}
          locale={locale}
          currency={currency}
          copy={c.pricingTeaser}
          comparisonHref={localeUrl(PRICING_PATH, locale)}
          perCardLabel={perCardLabel}
          fromLabel={fromLabel}
        />
      ) : null}

      {c.status ? (
        <Container as="section" aria-labelledby="kenya-status" className="pb-12">
          <div className="ks-bezel ks-reveal">
            <div className="ks-core flex flex-col gap-4 bg-ks-gold-100 p-6 md:p-10">
              <h2 id="kenya-status" className="text-[24px] font-bold tracking-[-0.02em]">
                {c.status.h2}
              </h2>
              <p className="max-w-3xl leading-relaxed">{c.status.body}</p>
              <PillLink href={pilotHref} kind="secondary" className="w-fit">
                {c.status.cta}
              </PillLink>
            </div>
          </div>
        </Container>
      ) : null}

      <section aria-labelledby="sherehe" className="bg-[#f6f9fc] py-16 md:py-24">
        <Container className="flex flex-col gap-10">
          <SectionHeading id="sherehe" eyebrow={c.eyebrows.events}>
            {c.eventsTitle}
          </SectionHeading>
          <ul className="ks-reveal grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((p, i) => {
              const pt = textOf(p, locale);
              const isSpotlight = events.length % 3 === 1 && i === events.length - 1;
              const eventIcons = [
                Briefcase,
                Heart,
                Sparkles,
                Gift,
                Gem,
                MoonStar,
                GraduationCap,
                Cake,
                Landmark,
                Globe,
              ] as const;
              const Icon = eventIcons[i % eventIcons.length]!;
              const accents = [
                'bg-[#eef2ff] text-[#4f46e5]',
                'bg-[#fdf2f8] text-[#db2777]',
                'bg-[#fffbeb] text-[#d97706]',
                'bg-[#ecfdf5] text-[#059669]',
                'bg-[#f5f3ff] text-[#7c3aed]',
              ][i % 5]!;

              if (isSpotlight) {
                return (
                  <li key={p.slug} className="sm:col-span-2 lg:col-span-3">
                    <Link
                      href={localeUrl(pagePath(p, locale), locale)}
                      className="qw-navy-band group relative flex flex-col justify-between gap-6 overflow-hidden rounded-[1.5rem] border border-[#5469d4]/35 p-6 text-white shadow-[0_24px_48px_-22px_rgb(10_38_64/0.5)] transition hover:-translate-y-0.5 md:flex-row md:items-center md:p-8"
                    >
                      <div className="flex items-start gap-4">
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-[#90e0ff] ring-1 ring-white/15">
                          <Icon className="size-6" strokeWidth={1.85} aria-hidden="true" />
                        </span>
                        <div className="flex flex-col gap-1.5">
                          <span className="inline-flex w-fit items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#90e0ff]">
                            <span aria-hidden="true" className="qw-ripple-dot" />
                            {locale === 'sw' ? 'Sherehe Zote' : 'All Celebrations'}
                          </span>
                          <h3 className="text-xl font-bold text-white md:text-2xl">{pt.nav}</h3>
                          <p className="max-w-2xl text-sm leading-relaxed text-white/80">
                            {pt.description}
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#0a2640] transition group-hover:bg-[#f6f9fc]">
                        <span>{locale === 'sw' ? 'Fungua mwongozo' : 'Explore all'}</span>
                        <ArrowUpRight
                          className="size-4 text-[#5469d4] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-px"
                          aria-hidden="true"
                        />
                      </span>
                    </Link>
                  </li>
                );
              }

              return (
                <li key={p.slug} className="flex">
                  <Link
                    href={localeUrl(pagePath(p, locale), locale)}
                    className="qw-card group relative flex w-full flex-col justify-between gap-4 overflow-hidden p-6"
                  >
                    <div className="flex flex-col gap-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${accents}`}
                        >
                          <Icon className="size-5" strokeWidth={1.9} aria-hidden="true" />
                        </span>
                        <span
                          aria-hidden="true"
                          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[#e3e8ee] bg-[#f6f9fc] text-[#5469d4] transition-all duration-300 group-hover:border-[#5469d4] group-hover:bg-[#5469d4] group-hover:text-white"
                        >
                          <ArrowUpRight className="size-4" strokeWidth={2} />
                        </span>
                      </div>
                      <h3 className="text-lg font-bold leading-snug text-[#0a2640] transition-colors group-hover:text-[#5469d4]">
                        {pt.nav}
                      </h3>
                      <p className="line-clamp-2 text-sm leading-relaxed text-[#494d59]">
                        {pt.description}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Container>
      </section>

      {guides.length ? (
        <Container
          as="section"
          aria-labelledby="miongozo"
          className="flex flex-col gap-8 py-16 md:py-20"
        >
          <SectionHeading id="miongozo" eyebrow={c.guidesEyebrow}>
            {c.guidesTitle}
          </SectionHeading>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((g) => {
              const gt = textOf(g, locale);
              return (
                <li key={g.slug} className="ks-reveal flex">
                  <Link
                    href={localeUrl(pagePath(g, locale), locale)}
                    className="qw-card group flex w-full flex-col justify-between gap-4 p-6"
                  >
                    <div className="flex flex-col gap-2">
                      <h3 className="text-lg leading-snug font-bold text-[#0a2640] group-hover:text-[#5469d4]">
                        {gt.nav}
                      </h3>
                      <p className="line-clamp-3 text-sm leading-relaxed text-[#494d59]">
                        {gt.description}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#5469d4]">
                      {readGuideLabel}
                      <ArrowUpRight
                        aria-hidden="true"
                        className="size-4 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-px"
                        strokeWidth={2}
                      />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Container>
      ) : null}

      <Faq title={c.faqTitle} items={c.faq} eyebrow={c.eyebrows.faq} />

      <CtaBand copy={c.ctaBand} primaryHref={primaryHref} demoHref={demoHrefSeed} />
    </main>
  );
}
