import { SiteLink as Link } from '@/components/site/site-link';
import { ArrowUpRight } from 'lucide-react';
import type { PricingCatalog } from '@harusi/schemas/billing';
import { DEFAULT_BRANDING } from '@harusi/schemas/branding';
import { ALL_PAGES, getPage, marketOf, pagePath, textOf } from '@/content';
import { homeCopy } from '@/content/home';
import { SeoLinks } from '@/components/public/seo-links';
import { ORG_ID, SITE_URL, absoluteLocaleUrl, localeUrl, organizationNode } from '@/lib/seo';
import { APP_DOWNLOAD_PATH } from '@/lib/app-download';
import { PRICING_PATH } from '@/lib/server-pricing';
import type { SiteEdition } from '@/lib/site-nav';
import { AnswerBlock, Container, Faq, PillLink, SectionHeading } from './blocks';
import { JsonLd } from './json-ld';
import { AppMockup } from './mockups';
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
              offers: {
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
        trustLine={c.heroTrustLine}
        kickerEvents={c.kickerEvents}
        previewFrameAlt={c.hero.h1}
        statCards={c.heroStatCards}
      />

      <div id="jibu">
        <AnswerBlock label={c.answerLabel} text={c.answer} />
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
        sectionLabel={locale === 'sw' ? 'Vipengele vikuu' : 'Key features'}
      />

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
                      className="mt-0.5 size-6 shrink-0 rounded-full bg-white/10"
                    />
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
        className="flex flex-col gap-10 py-20 md:py-28"
      >
        <SectionHeading id="sherehe" eyebrow={c.eyebrows.events}>
          {c.eventsTitle}
        </SectionHeading>
        <ul className="ks-reveal flex flex-wrap gap-3">
          {events.map((p, i) => {
            // Rotate pill accents across five kanga colours so the strip reads like a
            // string of celebrations rather than a nav bar of chips.
            const palette = [
              {
                pill: 'bg-ks-magenta-100 text-ks-magenta',
                dot: 'bg-ks-magenta',
                hover: 'hover:shadow-[inset_0_0_0_1.5px_rgb(200_31_106/0.55)]',
              },
              {
                pill: 'bg-ks-saffron-100 text-ks-saffron',
                dot: 'bg-ks-saffron',
                hover: 'hover:shadow-[inset_0_0_0_1.5px_rgb(232_149_48/0.6)]',
              },
              {
                pill: 'bg-ks-green-100 text-ks-green-700',
                dot: 'bg-ks-green-700',
                hover: 'hover:shadow-[inset_0_0_0_1.5px_rgb(15_92_77/0.55)]',
              },
              {
                pill: 'bg-[#e4e8fb] text-ks-indigo',
                dot: 'bg-ks-indigo',
                hover: 'hover:shadow-[inset_0_0_0_1.5px_rgb(36_50_114/0.55)]',
              },
              {
                pill: 'bg-[#fbe6dc] text-ks-terracotta',
                dot: 'bg-ks-terracotta',
                hover: 'hover:shadow-[inset_0_0_0_1.5px_rgb(193_85_44/0.55)]',
              },
            ][i % 5]!;
            return (
              <li key={p.slug}>
                <Link
                  href={localeUrl(pagePath(p, locale), locale)}
                  className={`group inline-flex min-h-12 items-center gap-3 rounded-full bg-white py-1.5 pr-1.5 pl-5 font-medium shadow-[inset_0_0_0_1px_rgb(26_31_29/0.08)] transition-[box-shadow,transform] duration-500 ks-ease active:scale-[0.98] ${palette.hover}`}
                >
                  <span aria-hidden="true" className={`size-2 rounded-full ${palette.dot}`} />
                  {textOf(p, locale).nav}
                  <span
                    aria-hidden="true"
                    className={`flex size-8 items-center justify-center rounded-full transition-transform duration-500 ks-ease group-hover:translate-x-0.5 group-hover:-translate-y-px ${palette.pill}`}
                  >
                    <ArrowUpRight className="size-4" strokeWidth={1.75} />
                  </span>
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
                <li key={g.slug} className="ks-reveal flex">
                  <Link
                    href={localeUrl(pagePath(g, locale), locale)}
                    className="group ks-ease flex w-full flex-col justify-between gap-4 rounded-[1.5rem] bg-white p-6 shadow-[inset_0_0_0_1px_rgb(26_31_29/0.08)] transition-[box-shadow,transform] duration-500 hover:shadow-[inset_0_0_0_1.5px_rgb(15_92_77/0.5)] active:scale-[0.99]"
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
                      {gt.h1.split('—')[0]}
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
