import type { ReactNode } from 'react';
import { SiteLink as Link } from '@/components/site/site-link';
import { ArrowUpRight, Check } from 'lucide-react';
import type { PricingCatalog } from '@harusi/schemas/billing';
import { DEFAULT_BRANDING } from '@harusi/schemas/branding';
import { ALL_PAGES, getPage, marketOf, pagePath, textOf } from '@/content';
import { homeCopy } from '@/content/home';
import { SeoLinks } from '@/components/public/seo-links';
import { cn } from '@/lib/cn';
import { ORG_ID, SITE_URL, absoluteLocaleUrl, localeUrl, organizationNode } from '@/lib/seo';
import { APP_DOWNLOAD_PATH } from '@/lib/app-download';
import type { SiteEdition } from '@/lib/site-nav';
import {
  AnswerBlock,
  Container,
  CtaBand,
  Eyebrow,
  Faq,
  Hero,
  PillLink,
  SectionHeading,
  Steps,
} from './blocks';
import { JsonLd } from './json-ld';
import { AppMockup, CardAndSms, GateChip, MichangoBar, SmsBubble, TrustStrip } from './mockups';

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

const domainOf = (url: string) => url.replace(/^https?:\/\//, '');

function Bullets({ items, dark }: { items: string[]; dark?: boolean }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((i) => (
        <li key={i} className="flex gap-3 leading-relaxed">
          <span
            aria-hidden="true"
            className={cn(
              'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full',
              dark ? 'bg-white/10 text-ks-gold-500' : 'bg-ks-green-100 text-ks-green-700',
            )}
          >
            <Check className="size-3.5" strokeWidth={2.25} />
          </span>
          {i}
        </li>
      ))}
    </ul>
  );
}

/** One bento tile: outer tray, inner core, its own heading for crawlers and screen readers. */
function Tile({
  id,
  h2,
  body,
  className,
  coreClassName,
  children,
}: {
  id: string;
  h2: string;
  body: string;
  className?: string;
  coreClassName?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={cn('ks-bezel ks-reveal', className)}>
      <div className={cn('ks-core flex h-full flex-col gap-6 p-6 md:p-10', coreClassName)}>
        <div className="flex flex-col gap-3">
          <h2
            id={id}
            className="text-[24px] leading-[1.15] font-bold tracking-[-0.02em] md:text-[32px]"
          >
            {h2}
          </h2>
          <p className="text-lg leading-relaxed text-ks-muted">{body}</p>
        </div>
        {children}
      </div>
    </section>
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
  const appHref = localeUrl(APP_DOWNLOAD_PATH, locale);
  const name = DEFAULT_BRANDING.businessName;
  const events =
    market === 'ke'
      ? ALL_PAGES.filter((p) => marketOf(p) === 'ke' && p.slug && p.group !== 'legal')
      : TZ_EVENTS.map((s) => getPage(s)).filter((p) => !!p);
  const pageUrl = absoluteLocaleUrl(path, locale);

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
              // Lets voice and AI assistants read the short answer aloud.
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
              name: c.stepsTitle,
              inLanguage: market === 'ke' ? 'en-KE' : `${locale}-TZ`,
              step: c.steps.map((s, i) => ({
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
        eyebrow={c.eyebrows.hero}
        h1={c.hero.h1}
        sub={c.hero.sub}
        primary={{ href: primaryHref, label: c.hero.primary }}
        secondary={{ href: '/k', label: c.hero.secondary }}
        footnote={c.heroNote}
        visual={<CardAndSms card={c.card} sms={c.sms} />}
      />

      <div id="jibu">
        <AnswerBlock label={c.answerLabel} text={c.answer} />
      </div>

      <Container
        as="section"
        aria-labelledby="hatua"
        className="flex flex-col gap-12 py-20 md:py-28"
      >
        <SectionHeading id="hatua" eyebrow={c.eyebrows.steps}>
          {c.stepsTitle}
        </SectionHeading>
        <Steps items={c.steps} />
      </Container>

      {/* Asymmetrical bento: the feature-phone story is the big tile, the gate and michango sit beside it. */}
      <Container className="flex flex-col gap-10 py-20 md:py-28">
        <Eyebrow>{c.eyebrows.features}</Eyebrow>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
          <Tile
            id="bila-smartphone"
            h2={c.noPhone.h2}
            body={c.noPhone.body}
            className="md:col-span-7"
            coreClassName="bg-ks-green-100/70"
          >
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <Bullets items={c.noPhone.items} />
              <div className="flex justify-center lg:justify-end">
                <SmsBubble {...c.sms} />
              </div>
            </div>
          </Tile>
          <Tile id="lango" h2={c.gate.h2} body={c.gate.body} className="md:col-span-5">
            <Bullets items={c.gate.items} />
            <div className="mt-auto flex flex-col items-start gap-3" aria-hidden="true">
              <GateChip state="ok" label={c.gate.chips.ok} />
              <GateChip state="duplicate" label={c.gate.chips.duplicate} />
              <GateChip state="missing" label={c.gate.chips.missing} />
            </div>
          </Tile>
          <section aria-labelledby="michango" className="ks-bezel ks-reveal md:col-span-12">
            <div className="ks-core grid gap-10 p-6 md:grid-cols-2 md:items-center md:gap-16 md:p-12">
              <div className="flex flex-col gap-5">
                <h2
                  id="michango"
                  className="text-[24px] leading-[1.15] font-bold tracking-[-0.02em] md:text-[32px]"
                >
                  {c.michango.h2}
                </h2>
                <p className="text-lg leading-relaxed text-ks-muted">{c.michango.body}</p>
                <Bullets items={c.michango.items} />
                <p className="rounded-2xl bg-ks-gold-100 px-5 py-4 font-semibold">
                  {c.michango.note}
                </p>
              </div>
              <div className="flex justify-center">
                <MichangoBar rows={c.michango.rows} currency={currency} labels={c.michango.bar} />
              </div>
            </div>
          </section>
        </div>
      </Container>

      {/* The Android app: organizer dashboard plus the offline gate. */}
      <Container as="section" aria-labelledby="programu" className="py-12 md:py-20">
        <div className="ks-mesh-dark ks-reveal relative overflow-hidden rounded-[2.5rem] text-white">
          <div className="grid gap-12 px-6 py-16 md:grid-cols-[1fr_1.05fr] md:items-center md:gap-10 md:px-14 md:py-20">
            <div className="flex flex-col gap-6">
              <SectionHeading id="programu" eyebrow={c.eyebrows.app} sub={c.app.body} dark>
                {c.app.h2}
              </SectionHeading>
              <Bullets items={c.app.items} dark />
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

      <Container as="section" aria-label={c.trust.title} className="py-20 md:py-28">
        <div className="ks-reveal">
          <TrustStrip
            title={c.trust.title}
            items={c.trust.items}
            cta={{ href: '/k', label: c.trust.cta }}
          />
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
                href={localeUrl(pagePath(p), locale)}
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

      <CtaBand
        eyebrow={c.eyebrows.cta}
        text={c.ctaBand.text}
        primary={{ href: primaryHref, label: c.ctaBand.primary }}
        secondary={{ href: '/k', label: c.ctaBand.secondary }}
      />
    </main>
  );
}
