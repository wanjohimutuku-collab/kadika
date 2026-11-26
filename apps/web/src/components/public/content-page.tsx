import { SiteLink as Link } from '@/components/site/site-link';
import type { Locale } from '@harusi/i18n';
import { DEFAULT_BRANDING } from '@harusi/schemas/branding';
import { ArrowUpRight } from 'lucide-react';
import { FaqList, PillLink } from '@/components/site/blocks';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import {
  ORG_ID,
  SITE_URL,
  absoluteLocaleUrl,
  localeUrl,
  ogImages,
  organizationNode,
} from '@/lib/seo';
import { ALL_PAGES, getPage, marketOf, pagePath, resolveRelated, textOf } from '@/content';
import type { Block, ContentPageDef } from '@/content/types';

const UI = {
  sw: {
    home: 'Nyumbani',
    short: 'Jibu fupi',
    toc: 'Yaliyomo',
    faq: 'Maswali yanayoulizwa mara kwa mara',
    related: 'Soma pia',
    updated: 'Imesasishwa',
    draft:
      'Rasimu — maandishi haya si ya mwisho na yatapitiwa na mwanasheria kabla ya kuzinduliwa.',
    cta: 'Anza bure',
    ctaBody: 'Anza na kadi 5 za kwanza bure.',
    ctaCard: 'Nina namba ya kadi',
    kenya: 'Kenya',
    uganda: 'Uganda',
    ctaKe: 'Unataka huduma hii Kenya? Tuambie.',
    ctaUg: 'Unataka huduma hii Uganda? Tuambie.',
    ctaKeButton: 'Wasiliana nasi',
    quickLinksTitle: 'Hatua za haraka',
    quickLinks: [
      { href: '/jaribu', label: 'Jaribu kadi' },
      { href: '/bei', label: 'Angalia bei' },
      { href: '/usalama-wa-kadi-za-mtandaoni', label: 'Je, ni salama?' },
      { href: '/programu', label: 'Programu ya Android' },
      { href: '/k', label: 'Nina namba ya kadi' },
    ],
  },
  en: {
    home: 'Home',
    short: 'Short answer',
    toc: 'Contents',
    faq: 'Frequently asked questions',
    related: 'Related',
    updated: 'Updated',
    draft: 'Draft — this text is not final and will be reviewed by a lawyer before launch.',
    cta: 'Start free',
    ctaBody: 'Start with 5 free cards.',
    ctaCard: 'I have a card number',
    kenya: 'Kenya',
    uganda: 'Uganda',
    ctaKe: 'Want this in Kenya? Tell us.',
    ctaUg: 'Want this in Uganda? Tell us.',
    ctaKeButton: 'Contact us',
    quickLinksTitle: 'Quick links',
    quickLinks: [
      { href: '/jaribu', label: 'Try a demo card' },
      { href: '/bei', label: 'See pricing' },
      { href: '/security-of-online-invitations', label: 'Is it safe?' },
      { href: '/programu', label: 'Android app' },
      { href: '/k', label: 'Open card by code' },
    ],
  },
} as const;

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'p':
            return (
              <p key={i} className="leading-[1.75] text-[#494d59]">
                {b.text}
              </p>
            );
          case 'h3':
            return (
              <h3 key={i} className="mt-3 text-xl font-bold tracking-[-0.01em] text-[#0a2640]">
                {b.text}
              </h3>
            );
          case 'ul':
            return (
              <ul
                key={i}
                className="list-disc space-y-2 pl-6 leading-[1.7] text-[#494d59] marker:text-[#5469d4]"
              >
                {b.items.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol
                key={i}
                className="list-decimal space-y-2 pl-6 leading-[1.7] text-[#494d59] marker:font-semibold marker:text-[#5469d4]"
              >
                {b.items.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ol>
            );
          case 'note':
            return (
              <blockquote
                key={i}
                className="rounded-2xl border border-[#e3e8ee] border-l-4 border-l-[#5469d4] bg-[#f6f9fc] px-5 py-4 leading-relaxed text-[#0a2640]"
              >
                {b.text}
              </blockquote>
            );
          case 'table':
            return (
              <div key={i} className="qw-card overflow-hidden">
                <div
                  className="overflow-x-auto"
                  role="region"
                  aria-label={b.head.join(', ')}
                  tabIndex={0}
                >
                  <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#e3e8ee] bg-[#f6f9fc]">
                        {b.head.map((h, idx) => (
                          <th
                            key={h}
                            scope="col"
                            className={cn(
                              'px-4 py-3 text-xs font-semibold tracking-wider uppercase',
                              idx === b.head.length - 1 ? 'text-[#5469d4]' : 'text-[#0a2640]',
                            )}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {b.rows.map((r) => (
                        <tr key={r.join('|')} className="border-b border-[#e3e8ee] last:border-0">
                          {r.map((c, j) => (
                            <td
                              key={j}
                              className={cn(
                                'px-4 py-3 align-top',
                                j === 0 ? 'font-semibold text-[#0a2640]' : 'text-[#494d59]',
                              )}
                            >
                              {c}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
        }
      })}
    </>
  );
}

function jsonLd(page: ContentPageDef, locale: Locale) {
  const t = textOf(page, locale);
  const path = pagePath(page, locale);
  const market = marketOf(page);
  const url = absoluteLocaleUrl(path, locale);
  const name = DEFAULT_BRANDING.businessName;
  const org = { '@id': ORG_ID };
  // Articles are written by the company, so the author is the shared organisation entity, not a made-up
  // "Person" (a team is not a person, and Google reads author type as an expertise signal).
  const authorNode = org;
  const graph: Record<string, unknown>[] = [
    organizationNode(),
    {
      '@type': page.schema,
      '@id': `${url}#page`,
      url,
      name: t.title,
      ...(page.schema === 'Article'
        ? { headline: t.h1, image: ogImages(locale, market)[0]?.url }
        : {}),
      description: t.description,
      inLanguage: `${locale}-${market.toUpperCase()}`,
      dateModified: page.updated,
      datePublished: page.published ?? page.updated,
      isPartOf: { '@type': 'WebSite', '@id': `${SITE_URL}/#site`, name, url: SITE_URL },
      author: authorNode,
      publisher: org,
      speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', '#jibu-fupi'] },
    },
    ...(page.group === 'product'
      ? [
          {
            '@type': 'Service',
            '@id': `${url}#service`,
            name: t.h1,
            description: t.answer,
            url,
            provider: org,
            areaServed: market === 'ke' ? 'KE' : market === 'ug' ? 'UG' : 'TZ',
            availableLanguage: market === 'tz' ? ['sw', 'en'] : ['en', 'sw'],
          },
        ]
      : []),
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: UI[locale].home,
          item: absoluteLocaleUrl('/', locale),
        },
        ...(market !== 'tz' && page.slug
          ? [
              {
                '@type': 'ListItem',
                position: 2,
                name: market === 'ke' ? UI[locale].kenya : UI[locale].uganda,
                item: absoluteLocaleUrl(`/${market}`, locale),
              },
            ]
          : []),
        {
          '@type': 'ListItem',
          position: market !== 'tz' && page.slug ? 3 : 2,
          name: t.nav,
          item: url,
        },
      ],
    },
  ];
  if (page.group === 'guide') {
    const firstOl = t.sections
      .flatMap((s) => s.blocks)
      .find((b): b is Extract<Block, { t: 'ol' }> => b.t === 'ol');
    if (firstOl?.items.length) {
      graph.push({
        '@type': 'HowTo',
        name: t.h1,
        description: t.answer,
        step: firstOl.items.map((text, idx) => ({
          '@type': 'HowToStep',
          position: idx + 1,
          name: text.split(':')[0]?.trim() || `Step ${idx + 1}`,
          text,
        })),
      });
    }
  }
  if (t.faq?.length)
    graph.push({
      '@type': 'FAQPage',
      mainEntity: t.faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
  return { '@context': 'https://schema.org', '@graph': graph };
}

/** Server-rendered content page: answer-first, sectioned, with FAQ and structured data. */
export function ContentPage({ page, locale }: { page: ContentPageDef; locale: Locale }) {
  const t = textOf(page, locale);
  const ui = UI[locale];
  const market = marketOf(page);
  const related = page.related
    .map((s) => resolveRelated(page, s))
    .filter((p): p is ContentPageDef => !!p);
  const showToc = t.sections.length >= 3;
  const marketLabel =
    market === 'ke'
      ? ui.kenya
      : market === 'ug'
        ? ui.uganda
        : locale === 'sw'
          ? page.group === 'product'
            ? 'Huduma'
            : page.group === 'guide'
              ? 'Mwongozo'
              : page.group === 'company'
                ? 'Kampuni'
                : 'Sheria'
          : page.group === 'product'
            ? 'Service'
            : page.group === 'guide'
              ? 'Guide'
              : page.group === 'company'
                ? 'Company'
                : 'Legal';
  return (
    <main>
      <script
        type="application/ld+json"
        // Static, server-built object; `<` is escaped so the JSON cannot close the tag.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd(page, locale)).replace(/</g, '\\u003c'),
        }}
      />
      <header className="relative overflow-hidden border-b border-[#e3e8ee] bg-white">
        <div
          aria-hidden="true"
          className="qw-hero-trapezoid pointer-events-none absolute inset-x-0 top-0 h-[280px] opacity-20 md:h-[340px]"
        />
        <div className="relative mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-4 pt-10 pb-14 md:px-6 md:pt-14 md:pb-20">
          <nav aria-label="Breadcrumb" className="ks-enter text-sm text-[#494d59]">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link
                  href={localeUrl('/', locale)}
                  className="inline-flex min-h-10 items-center underline underline-offset-4 hover:text-[#5469d4]"
                >
                  {ui.home}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              {market !== 'tz' && page.slug ? (
                <>
                  <li>
                    <Link
                      href={localeUrl(`/${market}`, locale)}
                      className="inline-flex min-h-10 items-center underline underline-offset-4 hover:text-[#5469d4]"
                    >
                      {market === 'ke' ? ui.kenya : ui.uganda}
                    </Link>
                  </li>
                  <li aria-hidden="true">/</li>
                </>
              ) : null}
              <li aria-current="page" className="font-medium text-[#0a2640]">
                {t.nav}
              </li>
            </ol>
          </nav>
          {page.draft ? (
            <p
              role="note"
              className="max-w-3xl rounded-2xl border border-[#e3e8ee] bg-[#f6f9fc] px-4 py-3 text-sm text-[#0a2640]"
            >
              {ui.draft}
            </p>
          ) : null}
          <div className="ks-enter flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-2.5 rounded-full border border-[#e3e8ee] bg-white/95 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.16em] text-[#0a2640] uppercase shadow-xs">
              <span aria-hidden="true" className="qw-ripple-dot" />
              {marketLabel}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#e3e8ee] bg-white/90 px-3 py-1 text-xs font-medium text-[#494d59]">
              {ui.updated}:{' '}
              <time dateTime={page.updated}>{formatDate(`${page.updated}T09:00:00Z`, locale)}</time>
            </span>
          </div>
          <h1 className="ks-enter max-w-4xl text-[36px] leading-[1.06] font-bold tracking-[-0.03em] text-[#0a2640] md:text-[52px]">
            {t.h1}
          </h1>
          <section
            id="jibu-fupi"
            aria-label={ui.short}
            className="ks-enter-2 qw-card relative max-w-3xl overflow-hidden p-6 md:p-8"
          >
            <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-[#5469d4] uppercase">
              {ui.short}
            </p>
            <p className="text-lg leading-relaxed text-[#0a2640] md:text-xl">{t.answer}</p>
          </section>
        </div>
      </header>

      <div
        className={cn(
          'mx-auto grid w-full max-w-[1120px] gap-12 px-4 py-14 md:px-6 md:py-20',
          showToc && 'lg:grid-cols-[minmax(0,1fr)_270px] lg:gap-16',
        )}
      >
        {showToc ? (
          <nav aria-label={ui.toc} className="lg:order-2">
            <div className="flex flex-col gap-4 lg:sticky lg:top-24">
              <div className="qw-card relative overflow-hidden p-5">
                <p className="mb-3 text-xs font-semibold tracking-[0.16em] text-[#5469d4] uppercase">
                  {ui.toc}
                </p>
                <ul className="grid gap-0.5 text-[14.5px]">
                  {t.sections.map((s) => (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        className="flex min-h-10 items-center rounded-xl px-2.5 py-1.5 leading-snug text-[#494d59] transition-colors hover:bg-[#f6f9fc] hover:text-[#5469d4]"
                      >
                        {s.h2}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              {page.group !== 'legal' && market === 'tz' ? (
                <div className="hidden rounded-2xl border border-[#e3e8ee] bg-[#f6f9fc] p-5 lg:flex lg:flex-col lg:gap-3">
                  <p className="text-sm font-semibold text-[#0a2640]">{ui.ctaBody}</p>
                  <PillLink href="/login" className="w-full text-sm">
                    {ui.cta}
                  </PillLink>
                </div>
              ) : null}
            </div>
          </nav>
        ) : null}

        <article className="flex max-w-3xl min-w-0 flex-col gap-12 text-[17px] lg:order-1">
          {t.sections.map((s) => (
            <section
              key={s.id}
              id={s.id}
              className="ks-reveal flex scroll-mt-24 flex-col gap-4 border-t border-[#e3e8ee] pt-10 first:border-t-0 first:pt-0"
            >
              <h2 className="text-[26px] leading-[1.15] font-bold tracking-[-0.02em] text-[#0a2640] md:text-[32px]">
                {s.h2}
              </h2>
              <Blocks blocks={s.blocks} />
            </section>
          ))}
          {t.faq?.length ? (
            <section
              aria-labelledby={t.h1 === ui.faq ? undefined : 'faq'}
              aria-label={t.h1 === ui.faq ? ui.faq : undefined}
              className="flex flex-col gap-5 border-t border-[#e3e8ee] pt-10"
            >
              {/* The FAQ page's own H1 already says this; a second identical heading adds nothing. */}
              {t.h1 === ui.faq ? null : (
                <h2
                  id="faq"
                  className="text-[26px] leading-[1.15] font-bold tracking-[-0.02em] text-[#0a2640] md:text-[32px]"
                >
                  {ui.faq}
                </h2>
              )}
              <FaqList items={t.faq} />
            </section>
          ) : null}
        </article>
      </div>

      {page.group !== 'legal' ? (
        <section className="mx-auto w-full max-w-[1120px] px-4 pb-12 md:px-6">
          <div className="qw-navy-band ks-reveal relative overflow-hidden rounded-[2rem] border border-[#5469d4]/30 px-6 py-12 text-white shadow-[0_24px_56px_-20px_rgb(10_38_64/0.4)] md:px-12 md:py-16">
            {market !== 'tz' ? (
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <p className="max-w-xl text-[24px] leading-tight font-bold tracking-[-0.02em] md:text-[32px]">
                  {market === 'ke' ? ui.ctaKe : ui.ctaUg}
                </p>
                <PillLink
                  href={(() => {
                    const contact = getPage('mawasiliano');
                    return contact ? localeUrl(pagePath(contact, 'en'), 'en') : '/contact';
                  })()}
                  kind="onDark"
                >
                  {ui.ctaKeButton}
                </PillLink>
              </div>
            ) : (
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <p className="max-w-xl text-[24px] leading-tight font-bold tracking-[-0.02em] md:text-[32px]">
                  {ui.ctaBody}
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <PillLink href="/login" kind="onDark">
                    {ui.cta}
                  </PillLink>
                  <PillLink href="/k" kind="outlineOnDark">
                    {ui.ctaCard}
                  </PillLink>
                </div>
              </div>
            )}
          </div>
          {market === 'tz' ? (
            <div className="mt-6 flex flex-wrap items-center gap-2.5 text-sm">
              <span className="font-semibold text-[#494d59]">{ui.quickLinksTitle}:</span>
              {ui.quickLinks.map((ql) => (
                <Link
                  key={ql.href}
                  href={localeUrl(ql.href, locale)}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#e3e8ee] bg-white px-4 font-medium text-[#0a2640] shadow-xs transition hover:border-[#5469d4]/50 hover:bg-[#f6f9fc] hover:text-[#5469d4]"
                >
                  <span>{ql.label}</span>
                  <ArrowUpRight className="size-3.5 text-[#5469d4]" aria-hidden="true" />
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {related.length ? (
        <nav
          aria-label={ui.related}
          className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-4 pb-20 md:px-6"
        >
          <h2 className="text-[26px] font-bold tracking-[-0.02em] text-[#0a2640]">{ui.related}</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => {
              const rt = textOf(r, locale);
              return (
                <li key={r.slug} className="ks-reveal flex">
                  <Link
                    href={localeUrl(pagePath(r, locale), locale)}
                    className="group qw-card flex w-full flex-col justify-between gap-3 p-5 md:p-6"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-bold text-[#0a2640] group-hover:text-[#5469d4]">
                        {rt.nav}
                      </span>
                      <span
                        aria-hidden="true"
                        className="ks-ease flex size-8 shrink-0 items-center justify-center rounded-full border border-[#e3e8ee] bg-[#f6f9fc] text-[#5469d4] transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-px group-hover:border-[#5469d4] group-hover:bg-[#5469d4] group-hover:text-white"
                      >
                        <ArrowUpRight className="size-4" strokeWidth={1.75} />
                      </span>
                    </div>
                    <p className="line-clamp-2 text-sm leading-relaxed text-[#494d59]">
                      {rt.description}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </main>
  );
}

export { ALL_PAGES };
