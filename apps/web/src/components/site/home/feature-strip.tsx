import { ArrowUpRight, Check, IdCard, QrCode, Sparkles, Wallet } from 'lucide-react';
import { SiteLink as Link } from '@/components/site/site-link';
import type { FeatureRowCopy } from '@/content/home';
import { Container } from '@/components/site/blocks';

/**
 * 4-card editorial Bento Feature Grid rendered inside `.ks-bezel` / `.ks-core` shells. Displays
 * each row's eyebrow, icon, title, all three feature bullets, and a deep link to its guide page,
 * paired with a dark/gold conversion tile.
 */

export interface FeatureStripProps {
  rows: readonly [FeatureRowCopy, FeatureRowCopy, FeatureRowCopy];
  rowHrefs?: readonly [string | undefined, string | undefined, string | undefined];
  promoTitle: string;
  promoBody: string;
  promoHref?: string;
  promoCta?: string;
  sectionLabel?: string;
}

const ICONS = [IdCard, QrCode, Wallet] as const;

export function FeatureStrip({
  rows,
  rowHrefs,
  promoTitle,
  promoBody,
  promoHref = '/jaribu',
  promoCta,
  sectionLabel = 'Features',
}: FeatureStripProps) {
  return (
    <Container as="section" aria-label={sectionLabel} className="py-12 md:py-16">
      <div className="ks-reveal grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {rows.map((row, i) => {
          const Icon = ICONS[i] ?? IdCard;
          const href = rowHrefs?.[i];
          return (
            <article key={row.title} className="qw-card flex">
              <div className="flex w-full flex-col gap-4 p-6">
                <div className="flex items-center justify-between">
                  <span className="inline-flex size-10 items-center justify-center rounded-xl bg-[#f6f9fc] text-[#5469d4] ring-1 ring-[#e3e8ee]">
                    <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <span className="rounded-full border border-[#e3e8ee] bg-[#f6f9fc] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5469d4]">
                    {row.eyebrow}
                  </span>
                </div>
                <h3 className="text-lg font-bold leading-snug text-[#0a2640]">{row.title}</h3>
                <ul className="flex flex-col gap-2 text-sm leading-relaxed text-[#494d59]">
                  {row.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <Check
                        className="mt-1 size-3.5 shrink-0 text-[#5469d4]"
                        strokeWidth={2.2}
                        aria-hidden="true"
                      />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                {row.linkLabel && href ? (
                  <Link
                    href={href}
                    className="group mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-[#5469d4] underline-offset-4 hover:text-[#0a2640] hover:underline"
                  >
                    <span>{row.linkLabel}</span>
                    <ArrowUpRight
                      className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-px"
                      aria-hidden="true"
                    />
                  </Link>
                ) : null}
              </div>
            </article>
          );
        })}
        {/* Highlight promo tile in Quickwork navy */}
        <article className="qw-navy-band relative flex overflow-hidden rounded-[1.25rem] border border-[#5469d4]/30 text-white shadow-[0_18px_40px_-18px_rgb(10_38_64/0.45)]">
          <div className="flex w-full flex-col justify-between gap-4 p-6">
            <div className="flex flex-col gap-3 pt-1">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#90e0ff] ring-1 ring-white/15">
                <Sparkles className="size-3 text-[#7dff7a]" aria-hidden="true" />
                Free Start
              </span>
              <p className="text-[32px] font-bold leading-none text-white">{promoTitle}</p>
              <p className="text-sm leading-relaxed text-white/80">{promoBody}</p>
            </div>
            <Link
              href={promoHref}
              className="group mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#0a2640] transition hover:bg-[#f6f9fc]"
            >
              <span>{promoCta ?? promoTitle}</span>
              <ArrowUpRight
                className="size-4 text-[#5469d4] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-px"
                aria-hidden="true"
              />
            </Link>
          </div>
        </article>
      </div>
    </Container>
  );
}
