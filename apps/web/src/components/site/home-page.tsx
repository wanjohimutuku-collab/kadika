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
import { AppMockup, GateChip, MichangoBar, SmsBubble } from './mockups';
import { HeroLive } from './home/hero-live';
import { TrustLine } from './home/trust-line';
import { TrySection } from './home/try-section';
import { FeatureRow } from './home/feature-row';
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

const domainOf = (url: string) => url.replace(/^https?:\/\//, '');

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

      <HeroLive
        locale={locale}
        h1={c.hero.h1}
        sub={c.hero.sub}
        primary={{ href: primaryHref, label: c.hero.primary }}
        secondaryBaseHref={jaribuBase}
        secondaryLabel={c.heroPreviewOpen}
        footnote={c.heroNote}
        form={c.formLabels}
        previewFrameAlt={c.hero.h1}
      />

      <TrustLine text={c.trustLine} />

      <div id="jibu">
        <AnswerBlock label={c.answerLabel} text={c.answer} />
      </div>

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

      <FeatureRow
        eyebrow={c.featureRows[0].eyebrow}
        title={c.featureRows[0].title}
        bullets={c.featureRows[0].bullets}
        linkLabel={c.featureRows[0].linkLabel}
        linkHref={
          c.featureRows[0].linkSlug && getPage(c.featureRows[0].linkSlug)
            ? localeUrl(pagePath(getPage(c.featureRows[0].linkSlug)!, locale), locale)
            : undefined
        }
        visual={<SmsBubble {...c.sms} />}
      />

      <FeatureRow
        eyebrow={c.featureRows[1].eyebrow}
        title={c.featureRows[1].title}
        bullets={c.featureRows[1].bullets}
        reverse
        visual={
          <div className="flex flex-col items-center gap-4">
            <img
              src="/site/gate-scanner-admit.svg"
              width={168}
              height={344}
              alt={c.gate.screenshotAlt}
              loading="lazy"
              decoding="async"
              className="max-w-[12rem] rounded-[2rem] shadow-[0_18px_40px_-16px_rgb(10_63_53/0.4)]"
            />
            <div className="flex flex-col items-start gap-2" aria-hidden="true">
              <GateChip state="ok" label={c.gate.chips.ok} />
              <GateChip state="duplicate" label={c.gate.chips.duplicate} />
              <GateChip state="missing" label={c.gate.chips.missing} />
            </div>
          </div>
        }
      />

      <FeatureRow
        eyebrow={c.featureRows[2].eyebrow}
        title={c.featureRows[2].title}
        bullets={c.featureRows[2].bullets}
        visual={<MichangoBar rows={c.michango.rows} currency={currency} labels={c.michango.bar} />}
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

      <Container as="section" aria-labelledby="programu" className="py-12 md:py-20">
        <div className="ks-mesh-dark ks-reveal relative overflow-hidden rounded-[2.5rem] text-white">
          <div className="grid gap-12 px-6 py-16 md:grid-cols-[1fr_1.05fr] md:items-center md:gap-10 md:px-14 md:py-20">
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
          {events.map((p) => (
            <li key={p.slug}>
              <Link
                href={localeUrl(pagePath(p, locale), locale)}
                className="group inline-flex min-h-12 items-center gap-3 rounded-full bg-white py-1.5 pr-1.5 pl-5 font-medium shadow-[inset_0_0_0_1px_rgb(26_31_29/0.08)] transition-[box-shadow,transform] duration-500 ks-ease hover:shadow-[inset_0_0_0_1.5px_rgb(15_92_77/0.5)] active:scale-[0.98]"
              >
                {textOf(p, locale).nav}
                <span
                  aria-hidden="true"
                  className="flex size-8 items-center justify-center rounded-full bg-ks-green-100 text-ks-green-700 transition-transform duration-500 ks-ease group-hover:translate-x-0.5 group-hover:-translate-y-px"
                >
                  <ArrowUpRight className="size-4" strokeWidth={1.75} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>

      <Faq title={c.faqTitle} items={c.faq} eyebrow={c.eyebrows.faq} />

      <CtaBand copy={c.ctaBand} primaryHref={primaryHref} demoHref={demoHrefSeed} />
    </main>
  );
}
