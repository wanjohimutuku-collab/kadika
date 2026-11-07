import { sortedTiers, type PricingCatalog } from '@harusi/schemas/billing';
import type { Currency } from '@harusi/schemas/country';
import { formatMoney, formatNumber } from '@/lib/format';
import { SiteLink as Link } from '@/components/site/site-link';
import { cn } from '@/lib/cn';
import type { PricingTeaserCopy } from '@/content/home';

/**
 * Three live card tiers from the catalogue (never placeholders): the cheapest, the middle tier
 * emphasised, and the bulk tier. CTA deep-links /login so the signup flow picks up where the
 * visitor started. `tier.minCards` is used as a querystring hint — the console reads it or
 * ignores it, nothing depends on a specific value.
 */

export interface PricingTeaserProps {
  catalog: PricingCatalog;
  locale: 'sw' | 'en' | 'ke';
  currency: Currency;
  copy: PricingTeaserCopy;
  comparisonHref: string;
  perCardLabel: string;
  fromLabel: string;
}

export function PricingTeaser({
  catalog,
  locale,
  currency,
  copy,
  comparisonHref,
  perCardLabel,
  fromLabel,
}: PricingTeaserProps) {
  const tiers = sortedTiers(catalog.cardTiers).slice(0, 3);
  const loginBase = locale === 'sw' ? '/login' : '/en/login';
  return (
    <section aria-labelledby="bei" className="bg-ks-surface py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-10 flex flex-col gap-2">
          <h2 id="bei" className="font-serif text-3xl tracking-[-0.02em] md:text-4xl">
            {copy.title}
          </h2>
          <p className="text-ks-muted">{copy.sub}</p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {tiers.map((t, i) => {
            const emphasised = i === 1 && tiers.length === 3;
            return (
              <article
                key={t.minCards}
                className={cn(
                  'flex h-full flex-col gap-4 rounded-2xl border border-ks-border bg-ks-bg p-6 md:p-8',
                  emphasised && 'ring-2 ring-ks-green-700/40',
                )}
              >
                <p className="text-xs uppercase tracking-widest text-ks-muted">
                  {i === 0 ? fromLabel : `${formatNumber(t.minCards)}+`}
                </p>
                <p className="text-3xl font-bold tracking-tight">
                  {formatMoney(t.price[currency], currency)}
                </p>
                <p className="text-ks-muted">{perCardLabel}</p>
                <Link
                  href={`${loginBase}?min=${t.minCards}`}
                  className={cn(
                    'mt-auto inline-flex min-h-12 items-center justify-center rounded-full px-5 font-semibold',
                    emphasised
                      ? 'bg-ks-green-700 text-white'
                      : 'border border-ks-green-700 text-ks-green-700',
                  )}
                >
                  {copy.cta}
                </Link>
              </article>
            );
          })}
        </div>
        <p className="mt-6 text-sm text-ks-muted">
          {copy.footnote} ·{' '}
          <Link href={comparisonHref} className="underline">
            {copy.comparisonLink}
          </Link>
        </p>
      </div>
    </section>
  );
}
