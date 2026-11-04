import Link from 'next/link';
import { Check } from 'lucide-react';
import type { PricingCatalog } from '@harusi/schemas/billing';
import { DEFAULT_BRANDING } from '@harusi/schemas/branding';
import { ALL_PAGES, getPage, marketOf, pagePath, textOf } from '@/content';
import { homeCopy } from '@/content/home';
import { SeoLinks } from '@/components/public/seo-links';
import { SITE_URL, localeUrl } from '@/lib/seo';
import type { SiteEdition } from '@/lib/site-nav';
import {
  AnswerBlock,
  Container,
  CtaBand,
  Faq,
  Hero,
  SectionHeading,
  Steps,
  siteButton,
} from './blocks';
import { JsonLd } from './json-ld';
import { CardAndSms, GateChip, MichangoBar, SmsBubble, TrustStrip } from './mockups';

/** Tanzania event pages linked from the home page (kit content-tz.md § Home, section 8). */
const TZ_EVENTS = [
  'kadi-ya-harusi-mtandaoni',
  'kadi-ya-send-off',
  'kadi-ya-kitchen-party',
  'kadi-ya-uchumba',
  'kadi-ya-mahafali',
  'kadi-ya-kuzaliwa',
  'kadi-za-mwaliko-biashara',
] as const;

const domainOf = (url: string) => url.replace(/^https?:\/\//, '');

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((i) => (
        <li key={i} className="flex gap-2">
          <Check className="mt-1 size-5 shrink-0 text-ks-green-700" aria-hidden="true" />
          {i}
        </li>
      ))}
    </ul>
  );
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
  const pilotHref = contact ? localeUrl(pagePath(contact), 'en') : '/en';
  const primaryHref = market === 'ke' ? pilotHref : '/login';
  const name = DEFAULT_BRANDING.businessName;
  const events =
    market === 'ke'
      ? ALL_PAGES.filter((p) => marketOf(p) === 'ke' && p.slug && p.group !== 'legal')
      : TZ_EVENTS.map((s) => getPage(s)).filter((p) => !!p);

  return (
    <main>
      <SeoLinks path={path} locale={locale} counterpartPath={market === 'ke' ? '/' : '/ke'} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'Organization',
              '@id': `${SITE_URL}/#org`,
              name,
              url: SITE_URL,
              logo: `${SITE_URL}/icons/512.png`,
              description: c.answer,
              areaServed: ['TZ', 'KE'],
            },
            {
              '@type': 'WebSite',
              '@id': `${SITE_URL}/#site`,
              name,
              url: SITE_URL,
              inLanguage: ['sw-TZ', 'en-TZ', 'en-KE'],
              publisher: { '@id': `${SITE_URL}/#org` },
            },
            {
              '@type': 'Service',
              name: c.title.split(' | ')[0],
              serviceType: 'Digital invitations and guest check-in',
              provider: { '@id': `${SITE_URL}/#org` },
              areaServed: market === 'ke' ? 'KE' : 'TZ',
              description: c.description,
            },
          ],
        }}
      />

      <Hero
        h1={c.hero.h1}
        sub={c.hero.sub}
        primary={{ href: primaryHref, label: c.hero.primary }}
        secondary={{ href: '/k', label: c.hero.secondary }}
        visual={<CardAndSms card={c.card} sms={c.sms} />}
      />

      <AnswerBlock label={c.answerLabel} text={c.answer} />

      <Container as="section" aria-labelledby="hatua" className="flex flex-col gap-5 py-6 md:py-12">
        <SectionHeading id="hatua">{c.stepsTitle}</SectionHeading>
        <Steps items={c.steps} />
      </Container>

      <section aria-labelledby="bila-smartphone" className="bg-ks-green-100">
        <Container className="grid gap-6 py-8 md:grid-cols-2 md:items-center md:gap-12 md:py-14">
          <div className="flex flex-col gap-4">
            <SectionHeading id="bila-smartphone" sub={c.noPhone.body}>
              {c.noPhone.h2}
            </SectionHeading>
            <Bullets items={c.noPhone.items} />
          </div>
          <div className="flex justify-center">
            <SmsBubble {...c.sms} />
          </div>
        </Container>
      </section>

      <Container
        as="section"
        aria-labelledby="michango"
        className="grid gap-6 py-8 md:grid-cols-2 md:items-center md:gap-12 md:py-14"
      >
        <div className="flex flex-col gap-4">
          <SectionHeading id="michango" sub={c.michango.body}>
            {c.michango.h2}
          </SectionHeading>
          <Bullets items={c.michango.items} />
          <p className="rounded-ks border-l-4 border-ks-gold-500 bg-ks-gold-100 px-4 py-3 font-semibold">
            {c.michango.note}
          </p>
        </div>
        <div className="flex justify-center">
          <MichangoBar rows={c.michango.rows} currency={currency} labels={c.michango.bar} />
        </div>
      </Container>

      <section aria-labelledby="lango" className="bg-white">
        <Container className="grid gap-6 border-y border-ks-line py-8 md:grid-cols-2 md:items-center md:gap-12 md:py-14">
          <div className="flex flex-col gap-4">
            <SectionHeading id="lango" sub={c.gate.body}>
              {c.gate.h2}
            </SectionHeading>
            <Bullets items={c.gate.items} />
          </div>
          <div className="flex flex-col items-start gap-3 md:items-center" aria-hidden="true">
            <GateChip state="ok" label={c.gate.chips.ok} />
            <GateChip state="duplicate" label={c.gate.chips.duplicate} />
            <GateChip state="missing" label={c.gate.chips.missing} />
          </div>
        </Container>
      </section>

      <Container as="section" aria-label={c.trust.title} className="py-6 md:py-12">
        <TrustStrip
          title={c.trust.title}
          items={c.trust.items}
          cta={{ href: '/k', label: c.trust.cta }}
        />
      </Container>

      {c.status ? (
        <Container as="section" aria-labelledby="kenya-status" className="py-2 md:py-4">
          <div className="flex max-w-3xl flex-col gap-3 rounded-ks border border-ks-line bg-ks-gold-100 p-5 md:p-6">
            <h2 id="kenya-status" className="text-[22px] font-bold">
              {c.status.h2}
            </h2>
            <p>{c.status.body}</p>
            <Link href={pilotHref} className={`${siteButton('secondary')} w-fit`}>
              {c.status.cta}
            </Link>
          </div>
        </Container>
      ) : null}

      <Container
        as="section"
        aria-labelledby="sherehe"
        className="flex flex-col gap-4 py-6 md:py-12"
      >
        <SectionHeading id="sherehe">{c.eventsTitle}</SectionHeading>
        <ul className="flex flex-wrap gap-2">
          {events.map((p) => (
            <li key={p.slug}>
              <Link
                href={localeUrl(pagePath(p), locale)}
                className="inline-flex min-h-12 items-center rounded-full border border-ks-line bg-white px-4 font-medium hover:border-ks-green-700 hover:bg-ks-green-100"
              >
                {textOf(p, locale).nav}
              </Link>
            </li>
          ))}
        </ul>
      </Container>

      <Faq title={c.faqTitle} items={c.faq} />

      <CtaBand
        text={c.ctaBand.text}
        primary={{ href: primaryHref, label: c.ctaBand.primary }}
        secondary={{ href: '/k', label: c.ctaBand.secondary }}
      />
    </main>
  );
}
