import type { HTMLAttributes, ReactNode } from 'react';
import { SiteLink as Link } from '@/components/site/site-link';
import { ArrowUpRight, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { JsonLd } from './json-ld';

/**
 * Layout blocks of the Kadi Sasa marketing site (kit templates.md § Shared components). Server components,
 * no client JS. They use the `ks-*` tokens, so they only look right inside the `.ks` public layout.
 *
 * 2026-11 redesign: warm editorial paper, nested "bezel" cards (outer tray + inner core), pill buttons
 * with the arrow in its own circle, eyebrow tags over headings, CSS-only scroll reveals (globals.css).
 */

export interface SiteLink {
  href: string;
  label: string;
}

type ButtonKind = 'primary' | 'secondary' | 'onDark' | 'outlineOnDark';

const btnBase =
  'group inline-flex min-h-12 items-center justify-center gap-3 rounded-full whitespace-nowrap text-base font-semibold transition-[transform,background-color,color,box-shadow] duration-500 ks-ease active:scale-[0.98] focus-visible:outline-3 focus-visible:outline-offset-2';

/** Primary = filled green, secondary = outline green, onDark = for green-900 sections (brand.md). */
export function siteButton(kind: ButtonKind = 'primary') {
  return cn(
    btnBase,
    kind === 'primary' &&
      'bg-ks-green-700 py-1.5 pr-1.5 pl-6 text-white shadow-[0_10px_24px_-12px_rgb(15_92_77/0.7)] hover:bg-ks-green-900',
    kind === 'secondary' &&
      'bg-white px-6 text-ks-green-900 shadow-[inset_0_0_0_1px_rgb(15_92_77/0.25)] hover:shadow-[inset_0_0_0_1.5px_rgb(15_92_77/0.6)]',
    kind === 'onDark' && 'bg-white py-1.5 pr-1.5 pl-6 text-ks-green-900 hover:bg-ks-gold-100',
    kind === 'outlineOnDark' &&
      'px-6 text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.4)] hover:bg-white/10',
  );
}

/** The trailing arrow sits in its own circle and moves on hover (button-in-button). */
function ArrowDot({ dark }: { dark?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-9 items-center justify-center rounded-full transition-transform duration-500 ks-ease group-hover:translate-x-0.5 group-hover:-translate-y-px group-hover:scale-105',
        dark ? 'bg-ks-green-100 text-ks-green-900' : 'bg-white/15 text-white',
      )}
    >
      <ArrowUpRight className="size-[18px]" strokeWidth={1.75} />
    </span>
  );
}

/** A call-to-action link: filled kinds get the arrow circle, outline kinds stay text-only. */
export function PillLink({
  href,
  kind = 'primary',
  children,
  className,
}: {
  href: string;
  kind?: ButtonKind;
  children: ReactNode;
  className?: string;
}) {
  const withArrow = kind === 'primary' || kind === 'onDark';
  return (
    <Link href={href} className={cn(siteButton(kind), className)}>
      {children}
      {withArrow ? <ArrowDot dark={kind === 'onDark'} /> : null}
    </Link>
  );
}

/** Content width wrapper: 1120 px max, 16 px gutters on phones. */
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
    <Tag className={cn('mx-auto w-full max-w-[1120px] px-4 md:px-6', className)} {...rest}>
      {children}
    </Tag>
  );
}

/** Tiny pill over a heading. */
export function Eyebrow({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return (
    <p
      className={cn(
        'inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.18em] uppercase',
        dark
          ? 'bg-white/10 text-ks-gold-100 ring-1 ring-white/15'
          : 'bg-white text-ks-green-700 ring-1 ring-ks-green-700/15',
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-ks-gold-500" />
      {children}
    </p>
  );
}

export function SectionHeading({
  id,
  children,
  sub,
  eyebrow,
  dark,
  center,
}: {
  id: string;
  children: ReactNode;
  sub?: ReactNode;
  eyebrow?: string;
  dark?: boolean;
  center?: boolean;
}) {
  return (
    <div
      className={cn('flex max-w-2xl flex-col gap-4', center && 'mx-auto items-center text-center')}
    >
      {eyebrow ? <Eyebrow dark={dark}>{eyebrow}</Eyebrow> : null}
      <h2 id={id} className="text-[28px] leading-[1.1] font-bold tracking-[-0.02em] md:text-[44px]">
        {children}
      </h2>
      {sub ? (
        <p className={cn('text-lg leading-relaxed', dark ? 'text-white/75' : 'text-ks-muted')}>
          {sub}
        </p>
      ) : null}
    </div>
  );
}

export function Hero({
  h1,
  sub,
  primary,
  secondary,
  visual,
  eyebrow,
  footnote,
}: {
  h1: string;
  sub: string;
  primary: SiteLink;
  secondary?: SiteLink;
  visual?: ReactNode;
  eyebrow?: string;
  /** Short reassurance line under the buttons. */
  footnote?: ReactNode;
}) {
  return (
    // Pulled up under the floating header so the light reaches the top edge.
    <section className="ks-mesh relative -mt-20 overflow-hidden md:-mt-24">
      <Container className="grid min-h-[min(92dvh,860px)] gap-12 pt-32 pb-20 md:grid-cols-[1.15fr_1fr] md:items-center md:gap-16 md:pt-44 md:pb-28">
        <div className="flex flex-col gap-6">
          {eyebrow ? (
            <div className="ks-enter">
              <Eyebrow>{eyebrow}</Eyebrow>
            </div>
          ) : null}
          <h1 className="ks-enter text-[40px] leading-[1.02] font-bold tracking-[-0.035em] text-ks-green-900 md:text-[52px] xl:text-[64px]">
            {h1}
          </h1>
          <p className="ks-enter-2 max-w-xl text-lg leading-relaxed text-ks-muted md:text-xl">
            {sub}
          </p>
          <div className="ks-enter-3 flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
            <PillLink href={primary.href}>{primary.label}</PillLink>
            {secondary ? (
              <PillLink href={secondary.href} kind="secondary">
                {secondary.label}
              </PillLink>
            ) : null}
          </div>
          {footnote ? <div className="ks-enter-3 text-sm text-ks-muted">{footnote}</div> : null}
        </div>
        {visual ? (
          <div className="ks-enter-2 flex justify-center md:justify-end">{visual}</div>
        ) : null}
      </Container>
    </section>
  );
}

/**
 * The quotable 40–60 word answer, placed high on the page for search and AI answers. Rendered as
 * a self-contained "answer card" so the passage reads as an authoritative snippet rather than a
 * side-note: soft white panel, centred gold accent bar, a `?` glyph next to the eyebrow, and a
 * wider line-height on the body copy to invite reading.
 */
export function AnswerBlock({ label, text }: { label: string; text: string }) {
  return (
    <Container as="section" aria-label={label} className="py-14 md:py-20">
      <div className="ks-reveal mx-auto max-w-3xl">
        <article className="relative rounded-[2rem] border border-ks-border/60 bg-white px-6 py-10 shadow-[0_28px_70px_-48px_rgb(10_63_53/0.28)] md:px-12 md:py-14">
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-0 h-1 w-24 -translate-x-1/2 rounded-full bg-ks-gold-500/80"
          />
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-ks-green-700/10 font-serif text-lg font-semibold text-ks-green-700"
            >
              ?
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-ks-green-700">
              {label}
            </span>
          </div>
          <p className="mt-5 text-[20px] leading-[1.6] text-ks-ink md:mt-6 md:text-[26px] md:leading-[1.55]">
            {text}
          </p>
        </article>
      </div>
    </Container>
  );
}

export function Steps({ items }: { items: { title: string; body?: string }[] }) {
  return (
    <ol className="grid gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-4">
      {items.map((s, i) => (
        <li key={s.title} className="ks-bezel ks-reveal">
          <div className="ks-core flex h-full flex-col gap-6 p-6">
            <span
              aria-hidden="true"
              className="tabular font-ks-names text-[40px] leading-none text-ks-green-700 italic"
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-semibold">{s.title}</h3>
              {s.body ? <p className="leading-relaxed text-ks-muted">{s.body}</p> : null}
            </div>
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
    <div className="ks-bezel">
      <div className="ks-core overflow-x-auto" role="region" aria-label={caption} tabIndex={0}>
        <table className="w-full min-w-[30rem] border-collapse text-left">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-ks-line">
              {head.map((h, i) => (
                <th
                  key={h}
                  scope="col"
                  className={cn(
                    'px-5 py-4 text-sm font-semibold tracking-wide uppercase',
                    i === head.length - 1 ? 'text-ks-green-700' : 'text-ks-muted',
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
                    <th key={j} scope="row" className="px-5 py-4 font-semibold">
                      {c}
                    </th>
                  ) : (
                    <td key={j} className="px-5 py-4 align-top">
                      {c}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Questions as disclosure rows inside one bezel card. */
export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="ks-bezel">
      <div className="ks-core divide-y divide-ks-line px-2 md:px-4">
        {items.map((f) => (
          <details key={f.q} className="group px-3">
            <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-3">
              <h3 className="text-lg font-semibold">{f.q}</h3>
              <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ks-green-100 text-ks-green-700 transition-transform duration-500 ks-ease group-open:rotate-45"
              >
                <Plus className="size-4" strokeWidth={1.75} />
              </span>
            </summary>
            <p className="max-w-2xl pb-5 leading-relaxed text-ks-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

/** Questions as disclosure rows, plus the matching FAQPage structured data. */
export function Faq({
  id = 'maswali',
  title,
  items,
  eyebrow,
}: {
  id?: string;
  title: string;
  items: { q: string; a: string }[];
  eyebrow?: string;
}) {
  return (
    <Container
      as="section"
      aria-labelledby={id}
      className="grid gap-10 py-20 md:grid-cols-[0.8fr_1.2fr] md:gap-16 md:py-32"
    >
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
      <div className="md:sticky md:top-28 md:self-start">
        <SectionHeading id={id} eyebrow={eyebrow}>
          {title}
        </SectionHeading>
      </div>
      <div className="ks-reveal">
        <FaqList items={items} />
      </div>
    </Container>
  );
}

export function CtaBand({
  text,
  primary,
  secondary,
  eyebrow,
}: {
  text: string;
  primary: SiteLink;
  secondary?: SiteLink;
  eyebrow?: string;
}) {
  return (
    <Container as="section" className="pb-20 md:pb-28">
      <div className="ks-mesh-dark ks-reveal relative overflow-hidden rounded-[2.5rem] px-6 py-16 text-white md:px-16 md:py-24">
        <div className="ks-kanga absolute inset-x-0 top-0 h-1.5 opacity-80" aria-hidden="true" />
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="flex max-w-2xl flex-col gap-5">
            {eyebrow ? <Eyebrow dark>{eyebrow}</Eyebrow> : null}
            <p className="text-[30px] leading-[1.1] font-bold tracking-[-0.025em] md:text-[48px]">
              {text}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <PillLink href={primary.href} kind="onDark">
              {primary.label}
            </PillLink>
            {secondary ? (
              <PillLink href={secondary.href} kind="outlineOnDark">
                {secondary.label}
              </PillLink>
            ) : null}
          </div>
        </div>
      </div>
    </Container>
  );
}
