import { SiteLink as Link } from '@/components/site/site-link';
import type { Locale } from '@harusi/i18n';
import { DEFAULT_BRANDING } from '@harusi/schemas/branding';
import { ArrowUpRight } from 'lucide-react';
import { FaqList, PillLink } from '@/components/site/blocks';
import { cn } from '@/lib/cn';
import { SeoLinks } from '@/components/public/seo-links';
import { formatDate } from '@/lib/format';
import { ORG_ID, SITE_URL, absoluteLocaleUrl, localeUrl, organizationNode } from '@/lib/seo';
import { ALL_PAGES, counterpartOf, marketOf, pagePath, resolveRelated, textOf } from '@/content';
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
    cta: 'Anza',
    ctaBody: 'Tengeneza kadi ya kwanza bila malipo wakati wa majaribio.',
    ctaCard: 'Nina namba ya kadi',
    kenya: 'Kenya',
    ctaKe: 'Unataka huduma hii Kenya? Tuambie.',
    ctaKeButton: 'Wasiliana nasi',
  },
  en: {
    home: 'Home',
    short: 'Short answer',
    toc: 'Contents',
    faq: 'Frequently asked questions',
    related: 'Related',
    updated: 'Updated',
    draft: 'Draft — this text is not final and will be reviewed by a lawyer before launch.',
    cta: 'Get started',
    ctaBody: 'Create your first card free during the pilot.',
    ctaCard: 'I have a card number',
    kenya: 'Kenya',
    ctaKe: 'Want this in Kenya? Tell us.',
    ctaKeButton: 'Contact us',
  },
} as const;

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'p':
            return (
              <p key={i} className="leading-[1.75] text-ks-ink/90">
                {b.text}
              </p>
            );
          case 'h3':
            return (
              <h3 key={i} className="mt-3 text-xl font-semibold tracking-[-0.01em]">
                {b.text}
              </h3>
            );
          case 'ul':
            return (
              <ul
                key={i}
                className="list-disc space-y-2 pl-6 leading-[1.7] marker:text-ks-gold-500"
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
                className="list-decimal space-y-2 pl-6 leading-[1.7] marker:font-semibold marker:text-ks-green-700"
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
                className="rounded-2xl border-l-2 border-ks-gold-500 bg-ks-gold-100/70 px-5 py-4 leading-relaxed"
              >
                {b.text}
              </blockquote>
            );
          case 'table':
            return (
              <div
                key={i}
                className="overflow-x-auto rounded-[1.5rem] bg-white shadow-[inset_0_0_0_1px_rgb(26_31_29/0.08)]"
                role="region"
                aria-label={b.head.join(', ')}
                tabIndex={0}
              >
                <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-ks-line bg-ks-green-100/60">
                      {b.head.map((h) => (
                        <th key={h} scope="col" className="px-4 py-3 font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r) => (
                      <tr key={r.join('|')} className="border-b border-ks-line last:border-0">
                        {r.map((c, j) => (
                          <td key={j} className="px-4 py-3 align-top">
                            {c}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
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
  const graph: Record<string, unknown>[] = [
    organizationNode(),
    {
      '@type': page.schema,
      '@id': `${url}#page`,
      url,
      name: t.title,
      ...(page.schema === 'Article' ? { headline: t.h1 } : {}),
      description: t.description,
      inLanguage: `${locale}-${market.toUpperCase()}`,
      dateModified: page.updated,
      datePublished: page.updated,
      isPartOf: { '@type': 'WebSite', '@id': `${SITE_URL}/#site`, name, url: SITE_URL },
      author: org,
      publisher: org,
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: UI[locale].home,
          item: absoluteLocaleUrl('/', locale),
        },
        ...(market === 'ke' && page.slug
          ? [
              {
                '@type': 'ListItem',
                position: 2,
                name: UI[locale].kenya,
                item: absoluteLocaleUrl('/ke', locale),
              },
            ]
          : []),
        {
          '@type': 'ListItem',
          position: market === 'ke' && page.slug ? 3 : 2,
          name: t.nav,
          item: url,
        },
      ],
    },
  ];
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
  const path = pagePath(page, locale);
  const related = page.related
    .map((s) => resolveRelated(page, s))
    .filter((p): p is ContentPageDef => !!p);
  const counterpart = counterpartOf(page);
  const showToc = t.sections.length >= 4;
  return (
    <main>
      <SeoLinks
        path={path}
        locale={locale}
        counterpartPath={counterpart ? pagePath(counterpart, locale) : undefined}
        enPath={market === 'tz' ? pagePath(page, 'en') : undefined}
        swPath={market === 'tz' ? pagePath(page, 'sw') : undefined}
      />
      <script
        type="application/ld+json"
        // Static, server-built object; `<` is escaped so the JSON cannot close the tag.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd(page, locale)).replace(/</g, '\\u003c'),
        }}
      />
      <header className="ks-mesh -mt-20 md:-mt-24">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-4 pt-32 pb-14 md:px-6 md:pt-40 md:pb-20">
          <nav aria-label="Breadcrumb" className="ks-enter text-sm text-ks-muted">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link
                  href={localeUrl('/', locale)}
                  className="inline-flex min-h-11 items-center underline underline-offset-4"
                >
                  {ui.home}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              {market === 'ke' && page.slug ? (
                <>
                  <li>
                    <Link
                      href={localeUrl('/ke', locale)}
                      className="inline-flex min-h-11 items-center underline underline-offset-4"
                    >
                      {ui.kenya}
                    </Link>
                  </li>
                  <li aria-hidden="true">/</li>
                </>
              ) : null}
              <li aria-current="page" className="text-ks-ink">
                {t.nav}
              </li>
            </ol>
          </nav>
          {page.draft ? (
            <p
              role="note"
              className="max-w-3xl rounded-2xl bg-ks-gold-100 px-4 py-3 text-sm ring-1 ring-ks-warn/30"
            >
              {ui.draft}
            </p>
          ) : null}
          <h1 className="ks-enter max-w-4xl text-[36px] leading-[1.05] font-bold tracking-[-0.03em] text-ks-green-900 md:text-[56px]">
            {t.h1}
          </h1>
          <p className="ks-enter-2 inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1 text-sm text-ks-muted ring-1 ring-ks-ink/[0.06]">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-ks-gold-500" />
            {ui.updated}:{' '}
            <time dateTime={page.updated}>{formatDate(`${page.updated}T09:00:00Z`, locale)}</time>
          </p>
          <section aria-label={ui.short} className="ks-enter-3 ks-bezel max-w-3xl">
            <div className="ks-core p-6 md:p-8">
              <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-ks-green-700 uppercase">
                {ui.short}
              </p>
              <p className="text-lg leading-relaxed md:text-xl">{t.answer}</p>
            </div>
          </section>
        </div>
      </header>

      <div
        className={cn(
          'mx-auto grid w-full max-w-[1120px] gap-12 px-4 py-14 md:px-6 md:py-20',
          showToc && 'lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-16',
        )}
      >
        {showToc ? (
          <nav aria-label={ui.toc} className="lg:order-2">
            <div className="ks-bezel lg:sticky lg:top-28">
              <div className="ks-core p-5">
                <p className="mb-3 text-xs font-semibold tracking-[0.16em] text-ks-muted uppercase">
                  {ui.toc}
                </p>
                <ul className="grid gap-0.5 text-[15px]">
                  {t.sections.map((s) => (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        className="flex min-h-11 items-center rounded-xl px-2 leading-snug hover:bg-ks-green-100/70"
                      >
                        {s.h2}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </nav>
        ) : null}

        <article className="flex max-w-3xl min-w-0 flex-col gap-14 text-[17px] lg:order-1">
          {t.sections.map((s) => (
            <section key={s.id} id={s.id} className="ks-reveal flex scroll-mt-28 flex-col gap-4">
              <h2 className="text-[26px] leading-[1.15] font-bold tracking-[-0.02em] md:text-[32px]">
                {s.h2}
              </h2>
              <Blocks blocks={s.blocks} />
            </section>
          ))}
          {t.faq?.length ? (
            <section
              aria-labelledby={t.h1 === ui.faq ? undefined : 'faq'}
              aria-label={t.h1 === ui.faq ? ui.faq : undefined}
              className="flex flex-col gap-5"
            >
              {/* The FAQ page's own H1 already says this; a second identical heading adds nothing. */}
              {t.h1 === ui.faq ? null : (
                <h2
                  id="faq"
                  className="text-[26px] leading-[1.15] font-bold tracking-[-0.02em] md:text-[32px]"
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
        <section className="mx-auto w-full max-w-[1120px] px-4 pb-16 md:px-6">
          <div className="ks-mesh-dark ks-reveal relative overflow-hidden rounded-[2.5rem] px-6 py-12 text-white md:px-12 md:py-16">
            <div
              className="ks-kanga absolute inset-x-0 top-0 h-1.5 opacity-80"
              aria-hidden="true"
            />
            {market === 'ke' ? (
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <p className="max-w-xl text-[24px] leading-tight font-bold tracking-[-0.02em] md:text-[32px]">
                  {ui.ctaKe}
                </p>
                <PillLink href={localeUrl('/mawasiliano', locale)} kind="onDark">
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
        </section>
      ) : null}

      {related.length ? (
        <nav
          aria-label={ui.related}
          className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-4 pb-20 md:px-6"
        >
          <h2 className="text-[24px] font-bold tracking-[-0.02em]">{ui.related}</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <li key={r.slug} className="ks-reveal">
                <Link
                  href={localeUrl(pagePath(r, locale), locale)}
                  className="group ks-ease flex min-h-16 items-center justify-between gap-4 rounded-[1.5rem] bg-white py-3 pr-3 pl-5 font-semibold shadow-[inset_0_0_0_1px_rgb(26_31_29/0.08)] transition-[box-shadow,transform] duration-500 hover:shadow-[inset_0_0_0_1.5px_rgb(15_92_77/0.5)] active:scale-[0.99]"
                >
                  {textOf(r, locale).nav}
                  <span
                    aria-hidden="true"
                    className="ks-ease flex size-9 shrink-0 items-center justify-center rounded-full bg-ks-green-100 text-ks-green-700 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-px"
                  >
                    <ArrowUpRight className="size-4" strokeWidth={1.75} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </main>
  );
}

export { ALL_PAGES };
