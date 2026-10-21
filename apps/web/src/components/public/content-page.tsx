import Link from 'next/link';
import type { Locale } from '@harusi/i18n';
import { DEFAULT_BRANDING } from '@harusi/schemas/branding';
import { buttonClasses } from '@/components/ui/button';
import { SeoLinks } from '@/components/public/seo-links';
import { formatDate } from '@/lib/format';
import { SITE_URL, absoluteLocaleUrl, localeUrl } from '@/lib/seo';
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
              <p key={i} className="leading-relaxed">
                {b.text}
              </p>
            );
          case 'h3':
            return (
              <h3 key={i} className="mt-2 text-lg font-semibold">
                {b.text}
              </h3>
            );
          case 'ul':
            return (
              <ul key={i} className="list-disc space-y-1.5 pl-6 leading-relaxed">
                {b.items.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={i} className="list-decimal space-y-1.5 pl-6 leading-relaxed">
                {b.items.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ol>
            );
          case 'note':
            return (
              <blockquote
                key={i}
                className="rounded-input border-l-4 border-accent bg-surface px-4 py-3 leading-relaxed"
              >
                {b.text}
              </blockquote>
            );
          case 'table':
            return (
              <div
                key={i}
                className="overflow-x-auto rounded-card border border-border bg-surface"
                role="region"
                aria-label={b.head.join(', ')}
                tabIndex={0}
              >
                <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg">
                      {b.head.map((h) => (
                        <th key={h} scope="col" className="px-3 py-2 font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r) => (
                      <tr key={r.join('|')} className="border-b border-border last:border-0">
                        {r.map((c, j) => (
                          <td key={j} className="px-3 py-2 align-top">
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
  const path = pagePath(page);
  const market = marketOf(page);
  const url = absoluteLocaleUrl(path, locale);
  const name = DEFAULT_BRANDING.businessName;
  const org = { '@type': 'Organization', name, url: SITE_URL };
  const graph: Record<string, unknown>[] = [
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
      isPartOf: { '@type': 'WebSite', name, url: SITE_URL },
      author: org,
      publisher: {
        ...org,
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/icons/512.png` },
      },
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
  const path = pagePath(page);
  const related = page.related
    .map((s) => resolveRelated(page, s))
    .filter((p): p is ContentPageDef => !!p);
  const counterpart = counterpartOf(page);
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <SeoLinks
        path={path}
        locale={locale}
        counterpartPath={counterpart ? pagePath(counterpart) : undefined}
      />
      <script
        type="application/ld+json"
        // Static, server-built object; `<` is escaped so the JSON cannot close the tag.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd(page, locale)).replace(/</g, '\\u003c'),
        }}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href={localeUrl('/', locale)} className="underline">
              {ui.home}
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          {market === 'ke' && page.slug ? (
            <>
              <li>
                <Link href={localeUrl('/ke', locale)} className="underline">
                  {ui.kenya}
                </Link>
              </li>
              <li aria-hidden="true">›</li>
            </>
          ) : null}
          <li aria-current="page">{t.nav}</li>
        </ol>
      </nav>
      {page.draft ? (
        <p
          role="note"
          className="rounded-input border border-warning/40 bg-warning/10 px-4 py-3 text-sm"
        >
          {ui.draft}
        </p>
      ) : null}
      <h1 className="text-4xl leading-tight font-semibold [text-wrap:balance]">{t.h1}</h1>
      <p className="text-sm text-muted">
        {ui.updated}:{' '}
        <time dateTime={page.updated}>{formatDate(`${page.updated}T09:00:00Z`, locale)}</time>
      </p>
      <section
        aria-label={ui.short}
        className="rounded-card border border-primary/30 bg-surface p-5 text-lg leading-relaxed"
      >
        <p className="mb-1 text-sm font-semibold tracking-wide text-primary uppercase">
          {ui.short}
        </p>
        <p>{t.answer}</p>
      </section>
      {t.sections.length >= 4 ? (
        <nav aria-label={ui.toc} className="rounded-card border border-border bg-surface p-4">
          <p className="mb-2 font-semibold">{ui.toc}</p>
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {t.sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="inline-flex min-h-8 items-center underline">
                  {s.h2}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      {t.sections.map((s) => (
        <section key={s.id} id={s.id} className="flex scroll-mt-4 flex-col gap-3">
          <h2 className="text-2xl font-semibold">{s.h2}</h2>
          <Blocks blocks={s.blocks} />
        </section>
      ))}
      {t.faq?.length ? (
        <section aria-labelledby="faq" className="flex flex-col gap-3">
          <h2 id="faq" className="text-2xl font-semibold">
            {ui.faq}
          </h2>
          <div className="divide-y divide-border rounded-card border border-border bg-surface">
            {t.faq.map((f) => (
              <details key={f.q} className="group px-4">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 py-2 font-semibold">
                  {f.q}
                  <span
                    aria-hidden="true"
                    className="text-muted transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="pb-4 text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      ) : null}
      {page.group !== 'legal' ? (
        <section className="flex flex-col gap-3 rounded-card bg-primary p-6 text-on-primary">
          {market === 'ke' ? (
            <>
              <p className="text-lg font-semibold">{ui.ctaKe}</p>
              <div className="flex">
                <Link
                  href={localeUrl('/mawasiliano', locale)}
                  className={buttonClasses('secondary', 'lg', 'border-transparent')}
                >
                  {ui.ctaKeButton}
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold">{ui.ctaBody}</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/login"
                  className={buttonClasses('secondary', 'lg', 'border-transparent')}
                >
                  {ui.cta}
                </Link>
                <Link
                  href="/k"
                  className={buttonClasses('ghost', 'lg', 'text-on-primary hover:bg-white/10')}
                >
                  {ui.ctaCard}
                </Link>
              </div>
            </>
          )}
        </section>
      ) : null}
      {related.length ? (
        <nav aria-label={ui.related} className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">{ui.related}</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={localeUrl(pagePath(r), locale)}
                  className="flex min-h-12 items-center rounded-card border border-border bg-surface px-4 font-medium underline-offset-2 hover:underline"
                >
                  {textOf(r, locale).nav}
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
