import { SiteLink as Link } from '@/components/site/site-link';
import { ArrowUpRight, Check } from 'lucide-react';
import { sortedTiers, type PricingCatalog } from '@harusi/schemas/billing';
import { DEFAULT_BRANDING } from '@harusi/schemas/branding';
import { ALL_PAGES, getPage, marketOf, pagePath, textOf } from '@/content';
import { homeCopy } from '@/content/home';
import { SeoLinks } from '@/components/public/seo-links';
import { ORG_ID, SITE_URL, absoluteLocaleUrl, localeUrl, organizationNode } from '@/lib/seo';
import { APP_DOWNLOAD_PATH } from '@/lib/app-download';
import { PRICING_PATH } from '@/lib/server-pricing';
import type { SiteEdition } from '@/lib/site-nav';
import { AnswerBlock, Container, Faq, PillLink, SectionHeading, Steps } from './blocks';
import { JsonLd } from './json-ld';
import { AppMockup, CardAndSms, GateChip, MichangoBar, TrustStrip } from './mockups';
import { Hero } from './home/hero';
import { HeroLive } from './home/hero-live';
import { TrySection } from './home/try-section';
import { FeatureStrip } from './home/feature-strip';
import { PricingTeaser } from './home/pricing-teaser';
import { CtaBand } from './home/cta-band';

/** Tanzania event pages linked from the home page (kit content-tz.md § Home, section 8). */
const TZ_EVENTS = [
  'kadi-ya-harusi-mtandaoni',
  'kadi-ya-send-off',
  'kadi-ya-kitchen-party',
  'kadi-ya-uchumba',
  'kadi-ya-nikah-na-walima',
  'kadi-ya-mahafali',
  'kadi-ya-kuzaliwa',
  'kadi-za-mwaliko-biashara',
  'kadi-za-kanisa',
  'kadi-za-mwaliko-tanzania',
] as const;

/** Pillar guides and comparison articles linked from the home page to pass internal PageRank. */
const TZ_GUIDES = [
  'jinsi-ya-kuunda-kadi-ya-harusi-tanzania',
  'kutuma-kadi-za-mwaliko-whatsapp',
  'kadi-ya-mtandaoni-vs-karatasi',
  'kusimamia-majibu-ya-rsvp',
  'lango-la-harusi-qr',
  'jinsi-ya-kuchagua-huduma-ya-kadi-za-mwaliko',
  'michango-ya-harusi',
  'kadi-ya-harusi-bila-smartphone',
  'kamusi-ya-harusi',
] as const;

const KE_GUIDES = [
  'wedding-committee-guide',
  'wedding-contributions-guide',
  'wedding-invitation-wording',
  'is-a-digital-wedding-invitation-safe',
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
  const market = edition === 'ke' ? 'ke' : 'tz';
  const locale = edition === 'sw' ? 'sw' : 'en';
  const path = market === 'ke' ? '/ke' : '/';
  const currency = market === 'ke' ? 'KES' : 'TZS';
  const contact = getPage('mawasiliano');
  const pilotHref = contact ? localeUrl(pagePath(contact, 'en'), 'en') : '/';
  const primaryHref = market === 'ke' ? pilotHref : '/login';
  const appHref = localeUrl(APP_DOWNLOAD_PATH, locale);
  const jaribuBase = market === 'ke' ? '/en/jaribu' : locale === 'sw' ? '/jaribu' : '/jaribu';
  const demoHrefSeed = `${jaribuBase}?names=${encodeURIComponent('Asha & Juma')}&date=2026-12-19&event=harusi`;
  const name = DEFAULT_BRANDING.businessName;
  const events =
    market === 'ke'
      ? ALL_PAGES.filter((p) => marketOf(p) === 'ke' && p.slug && p.group !== 'legal')
      : TZ_EVENTS.map((s) => getPage(s)).filter((p) => !!p);
  const guides = (market === 'ke' ? KE_GUIDES : TZ_GUIDES)
    .map((s) => getPage(s, market))
    .filter((p) => !!p);
  const pageUrl = absoluteLocaleUrl(path, locale);
  const rsvpCopy = {
    yes: locale === 'sw' ? 'Nitahudhuria' : 'I will attend',
    no: locale === 'sw' ? 'Sitahudhuria' : "I can't attend",
    confirmed: locale === 'sw' ? 'Umethibitisha' : 'Confirmed',
    partyLabel: locale === 'sw' ? 'Idadi' : 'Party',
  };
  const perCardLabel = locale === 'sw' ? 'Kwa kadi' : 'per card';
  const fromLabel = locale === 'sw' ? 'Kuanzia' : 'From';
  const tiers = sortedTiers(pricing.cardTiers);
  const tierPrices = tiers.map((t) => t.price[currency]);
  const readGuideLabel = locale === 'sw' ? 'Soma mwongozo' : 'Read guide';
  const heroCapabilities =
    locale === 'sw'
      ? [
          'WhatsApp, SMS na karatasi (A6/A4)',
          'Skani ya QR bila mtandao',
          'Daftari la ahadi na michango',
          'Kiswahili na Kiingereza',
        ]
      : [
          'WhatsApp, SMS & printable PDF',
          'Offline QR gate verification',
          'Direct-to-host pledge ledger',
          'Swahili & English support',
        ];
  const answerBadges =
    market === 'ke'
      ? ['WhatsApp + SMS Cards', 'RSVP & Party Size', 'Offline QR Gate', 'M-Pesa Harambee Ledger']
      : locale === 'sw'
        ? ['WhatsApp + SMS + PDF', 'Majibu (RSVP)', 'Lango bila mtandao', 'Daftari la Michango']
        : ['WhatsApp + SMS + PDF', 'Guest RSVP', 'Offline QR Gate', 'Michango Ledger'];

  return (
    <main>
      <SeoLinks path={path} locale={locale} counterpartPath={market === 'ke' ? '/' : '/ke'} />
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
              inLanguage: ['sw-TZ', 'en-TZ', 'en-KE'],
              publisher: { '@id': ORG_ID },
            },
            {
              '@type': 'WebPage',
              '@id': `${pageUrl}#page`,
              url: pageUrl,
              name: c.title,
              description: c.description,
              inLanguage: market === 'ke' ? 'en-KE' : `${locale}-TZ`,
              isPartOf: { '@id': `${SITE_URL}/#site` },
              about: { '@id': ORG_ID },
              speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', '#jibu'] },
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: market === 'ke' ? 'Kenya' : locale === 'sw' ? 'Nyumbani' : 'Home',
                  item: pageUrl,
                },
              ],
            },
            {
              '@type': 'Service',
              name: c.title.split(' | ')[0],
              serviceType: 'Digital invitations, RSVP, contribution tracking and QR guest check-in',
              provider: { '@id': ORG_ID },
              areaServed: market === 'ke' ? 'KE' : 'TZ',
              availableLanguage: market === 'ke' ? ['en', 'sw'] : ['sw', 'en'],
              description: c.description,
            },
            {
              '@type': 'SoftwareApplication',
              name,
              applicationCategory: 'LifestyleApplication',
              operatingSystem: 'Web, Android',
              url: SITE_URL,
              inLanguage: market === 'ke' ? ['en-KE'] : ['sw-TZ', 'en-TZ'],
              featureList: [
                'WhatsApp and SMS digital invitation cards',
                'Printable A6, A5 and A4 QR cards',
                'RSVP tracking and reminders',
                'Michango and pledge tracking',
                'Offline Android QR gate check-in',
              ],
              offers:
                pricing.enforced && tiers.length
                  ? {
                      '@type': 'AggregateOffer',
                      priceCurrency: currency,
                      lowPrice: Math.min(...tierPrices),
                      highPrice: Math.max(...tierPrices),
                      offerCount: tiers.length,
                      description: c.heroTrustLine,
                    }
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
              inLanguage: market === 'ke' ? 'en-KE' : `${locale}-TZ`,
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
      />

      <div id="jibu">
        <AnswerBlock label={c.answerLabel} text={c.answer} badges={answerBadges} />
      </div>

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
      />

      <TrySection
        copy={c.trySection}
        demoHref={demoHrefSeed}
        smsPreview={c.sms}
        gateCopy={{
          ok: c.gate.chips.ok,
          duplicate: c.gate.chips.duplicate,
          denied: c.gate.chips.missing,
        }}
        rsvpCopy={rsvpCopy}
      />

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

      {/* Four-step workflow & signature product deep dives */}
      <section aria-labelledby="jinsi-inavyofanya-kazi" className="bg-ks-paper py-16 md:py-24">
        <Container className="flex flex-col gap-12">
          <SectionHeading id="jinsi-inavyofanya-kazi" eyebrow={c.eyebrows.steps}>
            {c.stepsTitle}
          </SectionHeading>
          <Steps items={c.steps} />

          {/* Signature bento cards: No smartphone + Michango + Offline Gate */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Non-smartphone / SMS + Printed card showcase */}
            <article className="ks-bezel ks-reveal flex lg:col-span-2">
              <div className="ks-core grid w-full items-center gap-8 p-6 md:grid-cols-[1.05fr_0.95fr] md:p-10">
                <div className="flex flex-col gap-4">
                  <h3 className="font-serif text-[26px] leading-[1.12] tracking-[-0.02em] text-ks-green-900 md:text-[32px]">
                    {c.noPhone.h2}
                  </h3>
                  <p className="text-base leading-relaxed text-ks-muted">{c.noPhone.body}</p>
                  <ul className="flex flex-col gap-2 text-sm text-ks-ink">
                    {c.noPhone.items.map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <Check
                          className="mt-0.5 size-4 shrink-0 text-ks-green-700"
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
            <article className="ks-bezel ks-reveal flex">
              <div className="ks-core flex w-full flex-col justify-between gap-6 p-6 md:p-8">
                <div className="flex flex-col gap-3">
                  <h3 className="font-serif text-[24px] leading-[1.15] tracking-[-0.02em] text-ks-green-900 md:text-[28px]">
                    {c.michango.h2}
                  </h3>
                  <p className="text-sm leading-relaxed text-ks-muted md:text-base">
                    {c.michango.body}
                  </p>
                  <ul className="flex flex-col gap-1.5 text-sm text-ks-ink">
                    {c.michango.items.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Check
                          className="mt-0.5 size-4 shrink-0 text-ks-green-700"
                          aria-hidden="true"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="rounded-xl bg-ks-gold-100/80 px-3.5 py-2.5 text-xs font-medium text-ks-green-900">
                    {c.michango.note}
                  </p>
                </div>
                <MichangoBar rows={c.michango.rows} currency={currency} labels={c.michango.bar} />
              </div>
            </article>

            {/* Offline gate verification showcase */}
            <article className="ks-bezel ks-reveal flex">
              <div className="ks-core flex w-full flex-col justify-between gap-6 p-6 md:p-8">
                <div className="flex flex-col gap-3">
                  <h3 className="font-serif text-[24px] leading-[1.15] tracking-[-0.02em] text-ks-green-900 md:text-[28px]">
                    {c.gate.h2}
                  </h3>
                  <p className="text-sm leading-relaxed text-ks-muted md:text-base">
                    {c.gate.body}
                  </p>
                  <ul className="flex flex-col gap-1.5 text-sm text-ks-ink">
                    {c.gate.items.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Check
                          className="mt-0.5 size-4 shrink-0 text-ks-green-700"
                          aria-hidden="true"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-wrap gap-2.5 rounded-2xl border border-ks-line bg-ks-paper p-4">
                  <GateChip state="ok" label={c.gate.chips.ok} />
                  <GateChip state="duplicate" label={c.gate.chips.duplicate} />
                  <GateChip state="missing" label={c.gate.chips.missing} />
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

      <Container as="section" aria-labelledby="programu" className="py-6 md:py-10">
        <div className="ks-mesh-dark ks-reveal relative overflow-hidden rounded-[2.5rem] text-white">
          <div className="grid gap-12 px-6 py-12 md:grid-cols-[1fr_1.05fr] md:items-center md:gap-10 md:px-14 md:py-16">
            <div className="flex flex-col gap-6">
              <SectionHeading id="programu" eyebrow={c.eyebrows.app} sub={c.app.body} dark>
                {c.app.h2}
              </SectionHeading>
              <ul className="flex flex-col gap-3">
                {c.app.items.map((i) => (
                  <li key={i} className="flex gap-3 leading-relaxed">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10"
                    >
                      <Check className="size-3.5 text-ks-gold-500" aria-hidden="true" />
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
        </div>
      </Container>

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

      <Container
        as="section"
        aria-labelledby="sherehe"
        className="flex flex-col gap-10 py-16 md:py-24"
      >
        <SectionHeading id="sherehe" eyebrow={c.eyebrows.events}>
          {c.eventsTitle}
        </SectionHeading>
        <ul className="ks-reveal grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((p, i) => {
            const pt = textOf(p, locale);
            const palette = [
              { pill: 'bg-ks-magenta-100 text-ks-magenta', dot: 'bg-ks-magenta' },
              { pill: 'bg-ks-saffron-100 text-ks-saffron', dot: 'bg-ks-saffron' },
              { pill: 'bg-ks-green-100 text-ks-green-700', dot: 'bg-ks-green-700' },
              { pill: 'bg-[#e4e8fb] text-ks-indigo', dot: 'bg-ks-indigo' },
              { pill: 'bg-[#fbe6dc] text-ks-terracotta', dot: 'bg-ks-terracotta' },
            ][i % 5]!;
            return (
              <li key={p.slug} className="ks-bezel ks-bento flex">
                <Link
                  href={localeUrl(pagePath(p, locale), locale)}
                  className="group ks-core flex w-full flex-col justify-between gap-3 p-5 md:p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex items-center gap-2 font-semibold text-ks-ink group-hover:text-ks-green-700">
                      <span aria-hidden="true" className={`size-2 rounded-full ${palette.dot}`} />
                      {pt.nav}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`flex size-8 shrink-0 items-center justify-center rounded-full transition-transform duration-500 ks-ease group-hover:translate-x-0.5 group-hover:-translate-y-px ${palette.pill}`}
                    >
                      <ArrowUpRight className="size-4" strokeWidth={1.75} />
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm leading-relaxed text-ks-muted">
                    {pt.description}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </Container>

      {guides.length ? (
        <Container
          as="section"
          aria-labelledby="miongozo"
          className="flex flex-col gap-8 pb-12 md:pb-16"
        >
          <SectionHeading id="miongozo" eyebrow={c.guidesEyebrow}>
            {c.guidesTitle}
          </SectionHeading>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((g) => {
              const gt = textOf(g, locale);
              return (
                <li key={g.slug} className="ks-bezel ks-bento ks-reveal flex">
                  <Link
                    href={localeUrl(pagePath(g, locale), locale)}
                    className="group ks-core flex w-full flex-col justify-between gap-4 p-6"
                  >
                    <div className="flex flex-col gap-2">
                      <h3 className="text-lg leading-snug font-semibold text-ks-ink group-hover:text-ks-green-700">
                        {gt.nav}
                      </h3>
                      <p className="line-clamp-3 text-sm leading-relaxed text-ks-muted">
                        {gt.description}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ks-green-700">
                      {readGuideLabel}
                      <ArrowUpRight
                        aria-hidden="true"
                        className="size-4 shrink-0 transition-transform duration-500 ks-ease group-hover:translate-x-0.5 group-hover:-translate-y-px"
                        strokeWidth={1.75}
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
