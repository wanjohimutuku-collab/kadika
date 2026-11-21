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
    <section aria-labelledby="bei" className="bg-[#f6f9fc] py-16 md:py-24">
      <div className="mx-auto max-w-[1120px] px-4 md:px-6">
        <div className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2">
            <h2
              id="bei"
              className="text-[30px] font-bold leading-[1.12] tracking-[-0.025em] text-[#0a2640] md:text-[42px]"
            >
              {copy.title}
            </h2>
            <p className="text-base text-[#494d59] md:text-lg">{copy.sub}</p>
          </div>
          <Link
            href={comparisonHref}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#5469d4] underline decoration-[#5469d4]/35 underline-offset-4 hover:text-[#0a2640] hover:decoration-[#0a2640]"
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
                className={cn(
                  'flex rounded-[1.25rem] transition-transform duration-300 hover:-translate-y-1',
                  emphasised
                    ? 'qw-navy-band border border-[#5469d4]/50 text-white shadow-[0_24px_48px_-20px_rgb(10_38_64/0.45)]'
                    : 'qw-card text-[#0a2640]',
                )}
              >
                <div className="relative flex w-full flex-col gap-5 p-6 md:p-8">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        'text-xs font-semibold uppercase tracking-[0.18em]',
                        emphasised ? 'text-[#90e0ff]' : 'text-[#494d59]',
                      )}
                    >
                      {i === 0 ? `${fromLabel} ${rangeText}` : rangeText}
                    </p>
                    {emphasised ? (
                      <span className="rounded-full bg-[#5469d4] px-2.5 py-0.5 text-[11px] font-bold text-white">
                        {popularBadge}
                      </span>
                    ) : null}
                  </div>
                  <div>
                    <p className="tabular text-4xl font-bold tracking-tight">
                      {formatMoney(t.price[currency], currency)}
                    </p>
                    <p className={cn('mt-1 text-sm', emphasised ? 'text-white/80' : 'text-[#494d59]')}>
                      {perCardLabel} · {formatNumber(exampleCount)} = {exampleTotal}
                    </p>
                  </div>
                  <ul
                    className={cn(
                      'flex flex-col gap-2 border-t pt-4 text-sm',
                      emphasised ? 'border-white/15 text-white/90' : 'border-[#e3e8ee] text-[#494d59]',
                    )}
                  >
                    {list.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Check
                          className={cn(
                            'mt-0.5 size-4 shrink-0',
                            emphasised ? 'text-[#7dff7a]' : 'text-[#5469d4]',
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
                        ? 'bg-white text-[#0a2640] hover:bg-[#f6f9fc]'
                        : 'bg-[#5469d4] text-white hover:bg-[#0a2640]',
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
        <p className="mt-6 text-sm text-[#494d59]">
          {copy.footnote} ·{' '}
          <Link href={comparisonHref} className="font-medium text-[#5469d4] underline underline-offset-4">
            {copy.comparisonLink}
          </Link>
        </p>
      </div>
    </section>
  );
}
