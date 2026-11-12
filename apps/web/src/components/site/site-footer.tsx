import type { ReactNode } from 'react';
import { SiteLink as Link } from '@/components/site/site-link';
import type { SiteMarket } from '@/lib/site-locale';
import type { SiteLink } from './blocks';

/** brand.md § Footer line by market. Never the Tanzania line on `/ke`. */
export const FOOTER_LINE = {
  sw: 'Imetengenezwa Tanzania kwa sherehe za Afrika Mashariki.',
  en: 'Made in Tanzania for East African celebrations.',
  ke: 'Built in East Africa for Kenyan committees.',
} as const;

export interface FooterColumn {
  title: string;
  links: SiteLink[];
}

/** Green-900 footer with the logo in white (brand.md § Logo use). */
export function SiteFooter({
  market,
  line,
  columns,
  brand,
  bottomLinks,
  localeSwitch,
}: {
  market: SiteMarket;
  line: string;
  columns: FooterColumn[];
  brand: ReactNode;
  bottomLinks: SiteLink[];
  localeSwitch: ReactNode;
}) {
  return (
    <footer
      className="ks-mesh-dark relative mt-12 overflow-hidden rounded-t-[2.5rem] text-white"
      data-market={market}
    >
      <div className="ks-kanga absolute inset-x-0 top-0 h-1.5 opacity-80" aria-hidden="true" />
      <div className="mx-auto grid w-full max-w-[1120px] grid-cols-2 gap-x-4 gap-y-10 px-4 pt-16 pb-12 md:grid-cols-[1.3fr_repeat(4,1fr)] md:gap-8 md:px-6 md:pt-20">
        <div className="col-span-2 flex flex-col gap-4 md:col-span-1">
          <div className="inline-flex w-fit rounded-full bg-white px-4 py-2 text-xl">{brand}</div>
          <p className="max-w-xs leading-relaxed text-white/80">{line}</p>
        </div>
        {columns.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <p className="mb-3 text-[11px] font-semibold tracking-[0.18em] text-ks-gold-100/80 uppercase">
              {c.title}
            </p>
            <ul className="space-y-0.5">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="inline-flex min-h-11 min-w-6 items-center text-white/80 underline-offset-4 transition-colors duration-300 hover:text-white hover:underline"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-3 px-4 py-6 md:px-6 text-sm md:flex-row md:items-center md:justify-between">
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {bottomLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="inline-flex min-h-11 items-center underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="text-ks-ink">{localeSwitch}</div>
        </div>
      </div>
    </footer>
  );
}
