import { IdCard, QrCode, Wallet } from 'lucide-react';
import { SiteLink as Link } from '@/components/site/site-link';
import type { FeatureRowCopy } from '@/content/home';
import { Container } from '@/components/site/blocks';

/**
 * A tight 3-column strip replacing the three alternating `FeatureRow`s. Each column is an icon,
 * a short title and a one-line body (the first bullet of the row). The fourth tile is a gold
 * promo card echoing the reference layout — "5 FREE cards to start, pay only when you send".
 */

export interface FeatureStripProps {
  rows: readonly [FeatureRowCopy, FeatureRowCopy, FeatureRowCopy];
  rowHrefs?: readonly [string | undefined, string | undefined, string | undefined];
  promoTitle: string;
  promoBody: string;
  sectionLabel?: string;
}

const ICONS = [IdCard, QrCode, Wallet] as const;

export function FeatureStrip({
  rows,
  rowHrefs,
  promoTitle,
  promoBody,
  sectionLabel = 'Features',
}: FeatureStripProps) {
  return (
    <Container as="section" aria-label={sectionLabel} className="py-16 md:py-20">
      <div className="ks-reveal grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {rows.map((row, i) => {
          const Icon = ICONS[i] ?? IdCard;
          const href = rowHrefs?.[i];
          return (
            <article
              key={row.title}
              className="flex flex-col gap-3 rounded-2xl border border-ks-border/60 bg-white p-6 shadow-[0_18px_40px_-28px_rgb(10_63_53/0.2)]"
            >
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-ks-green-700/10 text-ks-green-700">
                <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <h3 className="text-base font-semibold leading-tight text-ks-ink">{row.title}</h3>
              <p className="text-sm leading-relaxed text-ks-muted">{row.bullets[0]}</p>
              {row.linkLabel && href ? (
                <Link
                  href={href}
                  className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-ks-green-700 underline-offset-4 hover:underline"
                >
                  {row.linkLabel}
                  <span aria-hidden="true">→</span>
                </Link>
              ) : null}
            </article>
          );
        })}
        {/* Promo tile echoes the reference's "5 FREE invitations" card. */}
        <article className="flex flex-col justify-between gap-3 rounded-2xl border border-ks-gold-500/30 bg-ks-gold-100/70 p-6 shadow-[0_18px_40px_-28px_rgb(217_164_65/0.4)]">
          <span className="font-serif text-4xl font-bold leading-none text-ks-green-900">
            {promoTitle}
          </span>
          <p className="text-sm leading-relaxed text-ks-ink">{promoBody}</p>
        </article>
      </div>
    </Container>
  );
}
