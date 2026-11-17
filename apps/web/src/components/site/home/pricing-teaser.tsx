import { sortedTiers, type PricingCatalog } from '@harusi/schemas/billing';
import type { Currency } from '@harusi/schemas/country';
import { ArrowUpRight, Check } from 'lucide-react';
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
  highlights?: readonly string[];
}

export function PricingTeaser({
  catalog,
  locale,
  currency,
  copy,
  comparisonHref,
  perCardLabel,
  fromLabel,
  highlights,
}: PricingTeaserProps) {
  const tiers = sortedTiers(catalog.cardTiers).slice(0, 3);
  const loginBase = locale === 'sw' ? '/login' : '/en/login';
  const popularBadge = locale === 'sw' ? 'Maarufu zaidi' : 'Most popular';
  const list =
    highlights ??
    (locale === 'sw'
      ? ['WhatsApp, SMS na PDF', 'Majibu (RSVP) na Daftari la Michango', 'Skani ya QR bila mtandao']
      : [
          'WhatsApp, SMS & printable PDF',
          'RSVP tracking & Michango ledger',
          'Offline QR gate scan',
        ]);

  return (
    <section aria-labelledby="bei" className="bg-ks-paper py-16 md:py-24">
      <div className="mx-auto max-w-[1120px] px-4 md:px-6">
        <div className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2">
            <h2
              id="bei"
              className="font-serif text-[30px] leading-[1.1] tracking-[-0.02em] text-ks-green-900 md:text-[42px]"
            >
              {copy.title}
            </h2>
            <p className="text-base text-ks-muted md:text-lg">{copy.sub}</p>
          </div>
          <Link
            href={comparisonHref}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ks-green-700 underline decoration-ks-green-700/35 underline-offset-4 hover:decoration-ks-green-700"
          >
            <span>{copy.comparisonLink}</span>
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {tiers.map((t, i) => {
            const emphasised = i === 1 && tiers.length === 3;
            const nextMin = tiers[i + 1]?.minCards;
            const rangeText =
              nextMin !== undefined
                ? `${formatNumber(t.minCards)}–${formatNumber(nextMin - 1)}`
                : `${formatNumber(t.minCards)}+`;
            const exampleCount = nextMin ? Math.max(t.minCards, i === 0 ? 50 : 150) : t.minCards;
            const exampleTotal = formatMoney(exampleCount * t.price[currency], currency);

            return (
              <article
                key={t.minCards}
                className={cn('ks-bezel ks-bento flex', emphasised && 'ring-2 ring-ks-gold-500/50')}
              >
                <div
                  className={cn(
                    'relative flex w-full flex-col gap-5 rounded-[calc(2rem-0.375rem)] p-6 md:p-8',
                    emphasised ? 'ks-mesh-dark text-white' : 'ks-core text-ks-ink',
                  )}
                >
                  {emphasised ? (
                    <div
                      aria-hidden="true"
                      className="ks-kanga absolute inset-x-0 top-0 h-1 rounded-t-[calc(2rem-0.375rem)] opacity-85"
                    />
                  ) : null}
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        'text-xs font-semibold uppercase tracking-[0.18em]',
                        emphasised ? 'text-ks-gold-100' : 'text-ks-muted',
                      )}
                    >
                      {i === 0 ? `${fromLabel} ${rangeText}` : rangeText}
                    </p>
                    {emphasised ? (
                      <span className="rounded-full bg-ks-gold-500 px-2.5 py-0.5 text-[11px] font-bold text-ks-ink">
                        {popularBadge}
                      </span>
                    ) : null}
                  </div>
                  <div>
                    <p className="tabular text-4xl font-bold tracking-tight">
                      {formatMoney(t.price[currency], currency)}
                    </p>
                    <p
                      className={cn('mt-1 text-sm', emphasised ? 'text-white/80' : 'text-ks-muted')}
                    >
                      {perCardLabel} · {formatNumber(exampleCount)} = {exampleTotal}
                    </p>
                  </div>
                  <ul
                    className={cn(
                      'flex flex-col gap-2 border-t pt-4 text-sm',
                      emphasised ? 'border-white/15 text-white/90' : 'border-ks-line text-ks-muted',
                    )}
                  >
                    {list.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Check
                          className={cn(
                            'mt-0.5 size-4 shrink-0',
                            emphasised ? 'text-ks-gold-500' : 'text-ks-green-700',
                          )}
                          aria-hidden="true"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`${loginBase}?min=${t.minCards}`}
                    className={cn(
                      'mt-auto inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition',
                      emphasised
                        ? 'bg-white text-ks-green-900 hover:bg-ks-gold-100'
                        : 'bg-ks-green-700 text-white hover:bg-ks-green-900',
                    )}
                  >
                    <span>{copy.cta}</span>
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
        <p className="mt-6 text-sm text-ks-muted">
          {copy.footnote} ·{' '}
          <Link href={comparisonHref} className="font-medium underline underline-offset-4">
            {copy.comparisonLink}
          </Link>
        </p>
      </div>
    </section>
  );
}
