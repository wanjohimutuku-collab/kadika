import { SiteLink as Link } from '@/components/site/site-link';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { SiteEdition } from '@/lib/site-nav';

const LABELS: Record<SiteEdition, { name: string; short: string; lang: string }> = {
  sw: { name: 'Tanzania (Kiswahili)', short: 'TZ · SW', lang: 'sw' },
  en: { name: 'Tanzania (English)', short: 'TZ · EN', lang: 'en' },
  ke: { name: 'Kenya (English)', short: 'KE · EN', lang: 'en' },
  ug: { name: 'Uganda (English)', short: 'UG · EN', lang: 'en' },
};

/**
 * Tanzania (Kiswahili) · Tanzania (English) · Kenya. Plain links to the matching page, inside a native
 * <details>, so it needs no JavaScript and every edition stays crawlable.
 */
export function LocaleSwitch({
  current,
  targets,
  label,
  align = 'right',
  up = false,
  pill = false,
}: {
  current: SiteEdition;
  targets: Record<SiteEdition, string>;
  label: string;
  align?: 'left' | 'right';
  /** Open above the button (in the footer). */
  up?: boolean;
  /** Pill shape for the floating header bar. */
  pill?: boolean;
}) {
  return (
    <details className="group relative">
      <summary
        className={cn(
          'flex cursor-pointer list-none items-center gap-1.5 whitespace-nowrap border text-[#0a2640] transition-colors',
          pill
            ? 'h-9 rounded-full border-[#e3e8ee] bg-[#f6f9fc] px-3 text-[13px] font-semibold hover:border-[#5469d4]/45 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5469d4]'
            : 'min-h-12 rounded-ks border-[#e3e8ee] bg-white px-3 text-sm font-semibold hover:border-[#5469d4]/45 hover:bg-[#f6f9fc]',
        )}
      >
        <Globe className="size-4 text-[#5469d4]" aria-hidden="true" />
        {/* The spoken name starts with the visible text, so voice control ("click TZ SW") works. */}
        <span className="tabular">{LABELS[current].short}</span>
        <span className="sr-only">
          , {label}: {LABELS[current].name}
        </span>
        <ChevronDown
          className="size-4 text-[#494d59] transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <ul
        className={cn(
          'absolute z-50 w-60 rounded-2xl border border-[#e3e8ee] bg-white p-1.5 shadow-[0_18px_40px_-14px_rgb(10_38_64/0.22)]',
          align === 'right' ? 'right-0' : 'left-0',
          up ? 'bottom-full mb-1' : 'mt-1.5',
        )}
      >
        {(Object.keys(LABELS) as SiteEdition[]).map((e) => (
          <li key={e}>
            <Link
              href={targets[e]}
              hrefLang={e === 'ke' ? 'en-KE' : e === 'ug' ? 'en-UG' : `${e}-TZ`}
              lang={LABELS[e].lang}
              aria-current={e === current ? 'true' : undefined}
              className="flex min-h-12 items-center justify-between gap-2 rounded-xl px-3 text-[#0a2640] transition-colors hover:bg-[#f6f9fc] hover:text-[#5469d4]"
            >
              {LABELS[e].name}
              {e === current ? (
                <Check className="size-4 text-[#5469d4]" aria-hidden="true" />
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
