import type { Metadata } from 'next';
import { SiteLink as Link } from '@/components/site/site-link';
import { connection } from 'next/server';
import { getLocale, getTranslations } from 'next-intl/server';
import {
  ArrowUpRight,
  CheckCircle2,
  CreditCard,
  HandCoins,
  MessageCircle,
  MessageSquare,
} from 'lucide-react';
import type { Locale } from '@harusi/i18n';
import { JsonLd } from '@/components/site/json-ld';
import { CompareTable, Eyebrow, Faq, PillLink } from '@/components/site/blocks';
import {
  ORG_ID,
  PUBLIC_ROBOTS,
  SITE_URL,
  absoluteLocaleUrl,
  localeUrl,
  ogImages,
  organizationNode,
  pricingOffersNode,
  twitterSummaryCard,
} from '@/lib/seo';
import { getBrandingOnServer } from '@/lib/server-branding';
import { getPricingOnServer, PRICING_PATH } from '@/lib/server-pricing';
import { sortedTiers } from '@harusi/schemas/billing';
import { formatMoney, formatNumber } from '@/lib/format';
import { getPage, pagePath, textOf } from '@/content';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('pricing');
  const locale = (await getLocale()) as Locale;
  const brand = (await getBrandingOnServer()).businessName;
  const title = t('metaTitle', { brand });
  const description = t('metaDescription', { brand });
  const url = absoluteLocaleUrl(PRICING_PATH, locale);
  return {
    title: { absolute: title },
    description,
    robots: PUBLIC_ROBOTS,
    alternates: {
      canonical: url,
      languages: {
        'en-TZ': absoluteLocaleUrl(PRICING_PATH, 'en'),
        'sw-TZ': absoluteLocaleUrl(PRICING_PATH, 'sw'),
        'x-default': absoluteLocaleUrl(PRICING_PATH, 'en'),
      },
    },
    openGraph: {
      type: 'website',
      siteName: brand,
      title,
      description,
      locale: locale === 'sw' ? 'sw_TZ' : 'en_TZ',
      url,
      images: ogImages(locale),
    },
    twitter: twitterSummaryCard(title, description, locale, 'tz'),
  };
}

/**
 * Public prices (ADR 042): a price per generated card that drops with the order size, and reminder packs. Read
 * from the live catalogue staff edit, so this page never quotes a stale price. Tanzanian shillings; Kenya
 * is not open yet. While charging is off it says the pilot is free and these are the prices to come.
 */
export default async function PricingPage() {
  await connection();
  const t = await getTranslations('pricing');
  const locale = (await getLocale()) as Locale;
  const c = await getPricingOnServer();
  const tiers = sortedTiers(c.cardTiers);
  const brand = (await getBrandingOnServer()).businessName;
  const url = absoluteLocaleUrl(PRICING_PATH, locale);

  const firstTier = tiers[0];
  const lastTier = tiers[tiers.length - 1];
  const shortAnswer =
    locale === 'sw'
      ? c.enforced && firstTier && lastTier
        ? `Kadi Sasa huanza na kadi ${formatNumber(c.free.cards)} bure na ujumbe ${formatNumber(c.free.messages)} bure kwa kila tukio. Baada ya hapo bei huanzia ${formatMoney(firstTier.price.TZS, 'TZS')} kwa kadi na hushuka hadi ${formatMoney(lastTier.price.TZS, 'TZS')} kwa oda za kadi ${formatNumber(lastTier.minCards)}+; michango ya wageni huenda moja kwa moja kwa wenye sherehe bila makato.`
        : `Kadi Sasa ni bure wakati wa majaribio ya Tanzania, ikikupa kadi za QR kwa WhatsApp, SMS na PDF ya kuchapisha. Malipo yakianza, bei itakuwa kwa kila kadi kulingana na ukubwa wa orodha ya wageni, na michango ya harusi itaendelea kwenda moja kwa moja kwa wenye sherehe bila makato.`
      : c.enforced && firstTier && lastTier
        ? `Every event on Kadi Sasa starts with ${formatNumber(c.free.cards)} free cards and ${formatNumber(c.free.messages)} messages. Paid tiers run from ${formatMoney(firstTier.price.TZS, 'TZS')} per card down to ${formatMoney(lastTier.price.TZS, 'TZS')} at ${formatNumber(lastTier.minCards)}+ cards, while guest michango go straight to the hosts with zero commission.`
        : `Kadi Sasa is free during the Tanzania pilot with WhatsApp, SMS, and print-ready QR cards included. When billing opens, pricing scales per issued card based on guest count, and guest michango always go directly to the hosts with zero platform cut.`;

  const pricingFaqs =
    locale === 'sw'
      ? [
          {
            q: 'Je, Kadi Sasa inachukua asilimia ya michango ya wageni?',
            a: 'Hapana. Kadi Sasa haishiki wala kukata asilimia yoyote ya michango. Wageni hutuma fedha moja kwa moja kwa kamati au wenye sherehe, na kamati hurekodi ahadi na malipo kwenye daftari.',
          },
          {
            q: 'Je, wageni wasio na smartphone wanalipiwa tofauti?',
            a: `Hapana. Kila kadi tayari inajumuisha kiungo cha WhatsApp, ujumbe ${c.messagesPerCard} wa vikumbusho na PDF ya kuchapisha pamoja na namba fupi ya SMS.`,
          },
          {
            q: 'Tunaweza kuanza na kadi chache kisha kuongeza baadaye?',
            a: 'Ndiyo. Mnaweza kuanza na kadi za bure za majaribio, kisha kuongeza wageni kadiri kikao kinavyoendelea na kulipia tu kadi mnazotuma.',
          },
        ]
      : [
          {
            q: 'Does Kadi Sasa take a percentage of wedding contributions?',
            a: 'No. Guests send michango directly to the couple or committee, and Kadi Sasa only records pledges and payments so the treasurer always has an accurate report.',
          },
          {
            q: 'Do non-smartphone guests cost extra?',
            a: `No. Every issued card includes its WhatsApp/SMS link, ${c.messagesPerCard} reminder messages, a short guest code, and a print-ready PDF for elders.`,
          },
          {
            q: 'Can we start small and add more guests later?',
            a: 'Yes. Start free with your first cards, test the layout with the committee, and add more guests whenever your list grows.',
          },
        ];

  const comparisonHead =
    locale === 'sw'
      ? ['Kiwango cha wageni', 'Bei kwa kadi', 'Mfano wa jumla', 'Yanayojumuishwa']
      : ['Guest tier', 'Price per card', 'Example total', 'Included'];

  const comparisonRows = tiers.map((x, i) => {
    const next = tiers[i + 1]?.minCards;
    const label =
      next === undefined
        ? t('tierFrom', { from: formatNumber(x.minCards) })
        : t('tierRange', {
            from: formatNumber(x.minCards),
            to: formatNumber(next - 1),
          });
    const example = next ? Math.max(x.minCards, 50) : x.minCards;
    const includedText =
      locale === 'sw'
        ? `WhatsApp, SMS, PDF ya QR, RSVP + vikumbusho ${c.messagesPerCard}`
        : `WhatsApp, SMS, printable QR PDF, RSVP + ${c.messagesPerCard} reminders`;
    return [
      label,
      formatMoney(x.price.TZS, 'TZS'),
      t('example', {
        n: formatNumber(example),
        total: formatMoney(example * x.price.TZS, 'TZS'),
      }),
      includedText,
    ];
  });

  const guideLinks = [
    'kadi-ya-harusi-mtandaoni',
    'michango-ya-harusi',
    'gharama-halisi-za-huduma-ya-mialiko',
    'kadi-sasa-vs-karatasi-na-zana-za-kubuni',
  ]
    .map((slug) => getPage(slug))
    .filter((p): p is NonNullable<typeof p> => !!p);

  return (
    <main data-testid="pricing" className="bg-ks-paper">
      {/* Prices come from the same live catalogue as the tiers below; offers only once charging is on. */}
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            organizationNode(),
            {
              '@type': 'WebPage',
              '@id': `${url}#page`,
              url,
              name: t('metaTitle', { brand }),
              description: t('metaDescription', { brand }),
              inLanguage: locale === 'sw' ? 'sw-TZ' : 'en-TZ',
              isPartOf: { '@type': 'WebSite', '@id': `${SITE_URL}/#site` },
              speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', '#jibu-fupi'] },
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: locale === 'sw' ? 'Nyumbani' : 'Home',
                  item: absoluteLocaleUrl('/', locale),
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: locale === 'sw' ? 'Bei' : 'Pricing',
                  item: url,
                },
              ],
            },
            {
              '@type': 'Service',
              '@id': `${url}#service`,
              url,
              name: t('metaTitle', { brand }).split(' | ')[0],
              description: t('metaDescription', { brand }),
              serviceType: 'Digital invitations and guest check-in',
              provider: { '@id': ORG_ID },
              areaServed: 'TZ',
              offers: pricingOffersNode(c, 'TZS', locale),
            },
            {
              '@type': 'FAQPage',
              mainEntity: pricingFaqs.map((f) => ({
                '@type': 'Question',
                name: f.q,
                acceptedAnswer: { '@type': 'Answer', text: f.a },
              })),
            },
          ],
        }}
      />

      <header className="relative -mt-20 overflow-hidden border-b border-[#e3e8ee] bg-white md:-mt-24">
        <div
          className="qw-hero-trapezoid pointer-events-none absolute inset-x-0 top-0 h-[320px] opacity-25 md:h-[380px]"
          aria-hidden="true"
        />
        <div className="relative z-10 mx-auto flex max-w-[1120px] flex-col gap-6 px-4 pt-32 pb-14 md:px-6 md:pt-40 md:pb-20">
          <nav aria-label="Breadcrumb" className="ks-enter text-sm text-[#494d59]">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link
                  href={localeUrl('/', locale)}
                  className="inline-flex min-h-11 items-center underline underline-offset-4 transition-colors hover:text-[#5469d4]"
                >
                  {locale === 'sw' ? 'Nyumbani' : 'Home'}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="font-medium text-[#0a2640]">
                {locale === 'sw' ? 'Bei' : 'Pricing'}
              </li>
            </ol>
          </nav>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#e3e8ee] bg-[#f6f9fc] px-3.5 py-1.5 text-xs font-semibold text-[#0a2640]">
            <span className="qw-ripple-dot" aria-hidden="true" />
            <span>{locale === 'sw' ? 'Bei · Tanzania' : 'Pricing · Tanzania'}</span>
          </div>
          <h1 className="ks-enter max-w-4xl text-[36px] leading-[1.06] font-bold tracking-[-0.03em] text-[#0a2640] [text-wrap:balance] md:text-[54px]">
            {t('title')}
          </h1>
          <p className="ks-enter-2 max-w-2xl text-lg leading-relaxed text-[#494d59]">
            {t('intro')}
          </p>
          {c.enforced ? null : (
            <p
              className="ks-enter-2 w-fit rounded-full border border-[#5469d4]/25 bg-[#eef2ff] px-4 py-2 text-sm font-semibold text-[#5469d4]"
              data-testid="pricing-pilot"
            >
              {t('pilotFree')}
            </p>
          )}
          <section
            id="jibu-fupi"
            aria-label={locale === 'sw' ? 'Jibu fupi' : 'Short answer'}
            className="ks-enter-3 qw-card relative max-w-3xl overflow-hidden bg-white p-6 md:p-8"
          >
            <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-[#5469d4] uppercase">
              {locale === 'sw' ? 'Kwa ufupi' : 'At a glance'}
            </p>
            <p className="text-base leading-relaxed text-[#494d59] md:text-lg">{shortAnswer}</p>
          </section>
        </div>
      </header>

      <section className="bg-[#f6f9fc] py-14 md:py-20" aria-labelledby="tiers-h">
        <div className="mx-auto max-w-[1120px] px-4 md:px-6">
          <div className="mb-8 flex flex-col gap-3">
            <Eyebrow>{locale === 'sw' ? 'Kwa kila kadi' : 'Per-card tiers'}</Eyebrow>
            <h2
              id="tiers-h"
              className="text-[28px] leading-[1.1] font-bold tracking-[-0.02em] text-[#0a2640] md:text-[40px]"
            >
              {t('tiersTitle')}
            </h2>
            <p className="max-w-2xl text-[#494d59]">{t('tiersIntro')}</p>
          </div>
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {tiers.map((x, i) => {
              const next = tiers[i + 1]?.minCards;
              const example = next ? Math.max(x.minCards, 50) : x.minCards;
              const highlight = i === 1 && tiers.length === 3;
              return (
                <li
                  key={x.minCards}
                  className={`flex flex-col justify-between gap-6 rounded-2xl border p-6 shadow-xs transition duration-300 md:p-8 ${
                    highlight
                      ? 'qw-navy-band border-[#5469d4]/50 text-white shadow-[0_24px_60px_-20px_rgba(10,38,64,0.45)]'
                      : 'qw-card border-[#e3e8ee] bg-white text-[#0a2640]'
                  }`}
                  data-testid="pricing-tier"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-2 text-lg font-semibold">
                        <CreditCard
                          className={`size-5 ${highlight ? 'text-[#93c5fd]' : 'text-[#5469d4]'}`}
                          aria-hidden="true"
                        />
                        {next === undefined
                          ? t('tierFrom', { from: formatNumber(x.minCards) })
                          : t('tierRange', {
                              from: formatNumber(x.minCards),
                              to: formatNumber(next - 1),
                            })}
                      </p>
                      {highlight ? (
                        <span className="rounded-full bg-[#5469d4] px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-white uppercase">
                          {locale === 'sw' ? 'Maarufu' : 'Popular'}
                        </span>
                      ) : null}
                    </div>
                    <p className="tabular text-3xl font-bold tracking-tight md:text-4xl">
                      {formatMoney(x.price.TZS, 'TZS')}{' '}
                      <span
                        className={`text-base font-normal ${highlight ? 'text-white/75' : 'text-[#494d59]'}`}
                      >
                        {t('perCard')}
                      </span>
                    </p>
                    <p className={`text-sm ${highlight ? 'text-white/80' : 'text-[#494d59]'}`}>
                      {t('example', {
                        n: formatNumber(example),
                        total: formatMoney(example * x.price.TZS, 'TZS'),
                      })}
                    </p>
                    <ul
                      className={`mt-1 space-y-2 border-t pt-4 text-sm ${
                        highlight
                          ? 'border-white/15 text-white/90'
                          : 'border-[#e3e8ee] text-[#494d59]'
                      }`}
                    >
                      <li className="flex items-center gap-2">
                        <CheckCircle2
                          className={`size-4 shrink-0 ${highlight ? 'text-[#00ec64]' : 'text-[#5469d4]'}`}
                          aria-hidden="true"
                        />
                        <span>{t('includesReminders', { n: c.messagesPerCard })}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2
                          className={`size-4 shrink-0 ${highlight ? 'text-[#00ec64]' : 'text-[#5469d4]'}`}
                          aria-hidden="true"
                        />
                        <span>{t('feature.qr')}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2
                          className={`size-4 shrink-0 ${highlight ? 'text-[#00ec64]' : 'text-[#5469d4]'}`}
                          aria-hidden="true"
                        />
                        <span>{t('feature.gate')}</span>
                      </li>
                    </ul>
                  </div>
                  {highlight ? (
                    <Link
                      href="/login?mode=signup"
                      className="qw-btn-primary inline-flex min-h-11 w-full items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-white"
                    >
                      {t('cta')}
                    </Link>
                  ) : (
                    <PillLink href="/login?mode=signup" kind="secondary" className="w-full">
                      {t('cta')}
                    </PillLink>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="mt-10">
            <CompareTable caption={t('tiersTitle')} head={comparisonHead} rows={comparisonRows} />
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-[1fr_1.6fr]">
            <div className="qw-card flex w-full flex-col justify-between gap-4 bg-white p-6">
              <div>
                <Eyebrow>{locale === 'sw' ? 'Anza bure' : 'Free to start'}</Eyebrow>
                <p className="mt-3 text-lg font-semibold text-[#0a2640]">
                  {t('freeNote', {
                    cards: formatNumber(c.free.cards),
                    messages: formatNumber(c.free.messages),
                  })}
                </p>
              </div>
              <PillLink href="/jaribu" kind="secondary" className="w-fit">
                {locale === 'sw' ? 'Jaribu kadi ya mfano' : 'Try a demo card'}
              </PillLink>
            </div>
            <ul className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <li className="qw-card flex items-center gap-3 bg-white px-4 py-3.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#f6f9fc] text-[#5469d4]">
                  <MessageSquare className="size-4" aria-hidden="true" />
                </span>
                <span className="font-medium text-[#0a2640]">
                  {t('includesReminders', { n: c.messagesPerCard })}
                </span>
              </li>
              {(['qr', 'rsvp', 'gate', 'print'] as const).map((k) => (
                <li key={k} className="qw-card flex items-center gap-3 bg-white px-4 py-3.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#f6f9fc] text-[#5469d4]">
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                  </span>
                  <span className="font-medium text-[#0a2640]">{t(`feature.${k}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {c.packs.length ? (
        <section
          className="mx-auto max-w-[1120px] px-4 pt-14 pb-12 md:px-6"
          aria-labelledby="packs-h"
        >
          <h2
            id="packs-h"
            className="text-[26px] leading-[1.15] font-bold tracking-[-0.02em] text-[#0a2640] md:text-[32px]"
          >
            {t('packsTitle')}
          </h2>
          <p className="mt-2 text-[#494d59]">{t('packsIntro')}</p>
          <ul className="qw-card mt-5 divide-y divide-[#e3e8ee] overflow-hidden bg-white">
            {c.packs.map((p) => (
              <li
                key={p.key}
                className="flex items-center gap-3 px-5 py-4"
                data-testid="pricing-pack"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#f6f9fc] text-[#5469d4]">
                  <MessageCircle className="size-4" aria-hidden="true" />
                </span>
                <span className="flex-1 font-medium text-[#0a2640]">
                  {t('creditPack', { n: formatNumber(p.messages) })}
                </span>
                <span className="tabular font-bold text-[#0a2640]">
                  {formatMoney(p.price.TZS, 'TZS')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mx-auto max-w-[1120px] px-4 pb-12 md:px-6" aria-labelledby="contrib-h">
        <div className="qw-card relative flex flex-col gap-6 overflow-hidden bg-white p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div className="flex gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#f6f9fc] text-[#5469d4]">
              <HandCoins className="size-6" aria-hidden="true" />
            </span>
            <div>
              <h2 id="contrib-h" className="text-lg font-semibold text-[#0a2640]">
                {t('contributionsTitle')}
              </h2>
              <p className="mt-1 max-w-2xl text-[#494d59]">{t('contributionsBody')}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/login?mode=signup"
              className="qw-btn-primary inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-white"
              data-testid="pricing-cta"
            >
              <span>{t('cta')}</span>
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
            <PillLink href="/jaribu" kind="secondary">
              {locale === 'sw' ? 'Jaribu kadi' : 'Try demo card'}
            </PillLink>
          </div>
        </div>
      </section>

      <Faq
        id="maswali-ya-bei"
        title={locale === 'sw' ? 'Maswali kuhusu bei' : 'Pricing questions'}
        eyebrow={locale === 'sw' ? 'Maswali' : 'FAQ'}
        items={pricingFaqs}
        emitSchema={false}
      />

      {guideLinks.length ? (
        <section className="border-t border-[#e3e8ee] bg-[#f6f9fc] py-14 md:py-16">
          <nav
            aria-label={locale === 'sw' ? 'Soma pia' : 'Related'}
            className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-4 md:px-6"
          >
            <h2 className="text-[26px] font-bold tracking-[-0.02em] text-[#0a2640]">
              {locale === 'sw' ? 'Miongozo muhimu' : 'Helpful guides'}
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {guideLinks.map((g) => {
                const gt = textOf(g, locale);
                return (
                  <li key={g.slug} className="flex">
                    <Link
                      href={localeUrl(pagePath(g, locale), locale)}
                      className="group qw-card flex w-full flex-col justify-between gap-3 bg-white p-5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-[#0a2640] transition-colors group-hover:text-[#5469d4]">
                          {gt.nav}
                        </span>
                        <span
                          aria-hidden="true"
                          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#f6f9fc] text-[#5469d4] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-px"
                        >
                          <ArrowUpRight className="size-3.5" strokeWidth={1.75} />
                        </span>
                      </div>
                      <p className="line-clamp-2 text-xs leading-relaxed text-[#494d59]">
                        {gt.description}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </section>
      ) : null}
    </main>
  );
}
