import type { HTMLAttributes, ReactNode } from 'react';
import { SiteLink as Link } from '@/components/site/site-link';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { JsonLd } from './json-ld';

/**
 * Layout blocks of the Kadi Sasa marketing site (kit templates.md § Shared components). Server components,
 * no client JS. They use the `ks-*` tokens, so they only look right inside the `.ks` public layout.
 */

export interface SiteLink {
  href: string;
  label: string;
}

const btnBase =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-ks px-5 text-base font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2';

/** Primary = filled green, secondary = outline green, onDark = for green-900 sections (brand.md). */
export function siteButton(kind: 'primary' | 'secondary' | 'onDark' | 'outlineOnDark' = 'primary') {
  return cn(
    btnBase,
    kind === 'primary' && 'bg-ks-green-700 text-white hover:bg-ks-green-900',
    kind === 'secondary' && 'border-2 border-ks-green-700 text-ks-green-700 hover:bg-ks-green-100',
    kind === 'onDark' && 'bg-white text-ks-green-900 hover:bg-ks-green-100',
    kind === 'outlineOnDark' && 'border-2 border-white/70 text-white hover:bg-white/10',
  );
}

/** Content width wrapper with the brand spacing: 24 px between blocks on phones, 48 px on desktop. */
export function Container({
  children,
  className,
  as: Tag = 'div',
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section';
} & HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={cn('mx-auto w-full max-w-[1120px] px-4', className)} {...rest}>
      {children}
    </Tag>
  );
}

export function SectionHeading({
  id,
  children,
  sub,
}: {
  id: string;
  children: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="flex max-w-2xl flex-col gap-2">
      <h2 id={id} className="text-[22px] font-bold md:text-[28px]">
        {children}
      </h2>
      {sub ? <p className="text-lg text-ks-muted">{sub}</p> : null}
    </div>
  );
}

export function Hero({
  h1,
  sub,
  primary,
  secondary,
  visual,
}: {
  h1: string;
  sub: string;
  primary: SiteLink;
  secondary?: SiteLink;
  visual?: ReactNode;
}) {
  return (
    <section className="border-b border-ks-line bg-ks-green-100/60">
      <Container className="grid gap-8 py-10 md:grid-cols-[1.1fr_1fr] md:items-center md:gap-12 md:py-16">
        <div className="flex flex-col gap-5">
          <h1 className="text-[28px] font-bold md:text-[36px]">{h1}</h1>
          <p className="max-w-xl text-lg text-ks-muted">{sub}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href={primary.href} className={siteButton('primary')}>
              {primary.label}
            </Link>
            {secondary ? (
              <Link href={secondary.href} className={siteButton('secondary')}>
                {secondary.label}
              </Link>
            ) : null}
          </div>
        </div>
        {visual ? <div className="flex justify-center md:justify-end">{visual}</div> : null}
      </Container>
    </section>
  );
}

/** The quotable 40–60 word answer, placed high on the page for search and AI answers. */
export function AnswerBlock({ label, text }: { label: string; text: string }) {
  return (
    <Container as="section" aria-label={label} className="py-6 md:py-12">
      <div className="max-w-3xl rounded-ks border border-ks-line bg-white p-5 md:p-6">
        <p className="mb-1 text-sm font-semibold text-ks-green-700">{label}</p>
        <p className="text-lg leading-relaxed">{text}</p>
      </div>
    </Container>
  );
}

export function Steps({ items }: { items: { title: string; body?: string }[] }) {
  return (
    <ol className="grid gap-3 md:grid-cols-4 md:gap-4">
      {items.map((s, i) => (
        <li
          key={s.title}
          className="flex gap-3 rounded-ks border border-ks-line bg-white p-4 md:flex-col"
        >
          <span
            aria-hidden="true"
            className="tabular flex size-9 shrink-0 items-center justify-center rounded-full bg-ks-green-700 font-bold text-white"
          >
            {i + 1}
          </span>
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-semibold">{s.title}</h3>
            {s.body ? <p className="text-ks-muted">{s.body}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function CompareTable({
  caption,
  head,
  rows,
}: {
  caption: string;
  head: string[];
  rows: string[][];
}) {
  return (
    <div
      className="overflow-x-auto rounded-ks border border-ks-line bg-white"
      role="region"
      aria-label={caption}
      tabIndex={0}
    >
      <table className="w-full min-w-[30rem] border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-ks-line bg-ks-green-100">
            {head.map((h, i) => (
              <th
                key={h}
                scope="col"
                className={cn(
                  'px-4 py-3 font-semibold',
                  i === head.length - 1 && 'text-ks-green-700',
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]} className="border-b border-ks-line last:border-0">
              {r.map((c, j) =>
                j === 0 ? (
                  <th key={j} scope="row" className="px-4 py-3 font-semibold">
                    {c}
                  </th>
                ) : (
                  <td key={j} className="px-4 py-3 align-top">
                    {c}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Questions as disclosure rows, plus the matching FAQPage structured data. */
export function Faq({
  id = 'maswali',
  title,
  items,
}: {
  id?: string;
  title: string;
  items: { q: string; a: string }[];
}) {
  return (
    <Container as="section" aria-labelledby={id} className="flex flex-col gap-4 py-6 md:py-12">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: items.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }}
      />
      <SectionHeading id={id}>{title}</SectionHeading>
      <div className="max-w-3xl divide-y divide-ks-line rounded-ks border border-ks-line bg-white">
        {items.map((f) => (
          <details key={f.q} className="group px-4">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 py-2 text-lg font-semibold">
              <h3 className="text-lg font-semibold">{f.q}</h3>
              <ChevronDown
                className="size-5 shrink-0 text-ks-muted transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <p className="pb-4 text-ks-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </Container>
  );
}

export function CtaBand({
  text,
  primary,
  secondary,
}: {
  text: string;
  primary: SiteLink;
  secondary?: SiteLink;
}) {
  return (
    <section className="bg-ks-green-900 text-white">
      <Container className="flex flex-col gap-5 py-10 md:flex-row md:items-center md:justify-between md:py-14">
        <p className="max-w-xl text-[22px] font-bold md:text-[28px]">{text}</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href={primary.href} className={siteButton('onDark')}>
            {primary.label}
          </Link>
          {secondary ? (
            <Link href={secondary.href} className={siteButton('outlineOnDark')}>
              {secondary.label}
            </Link>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
