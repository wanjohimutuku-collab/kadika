import { SiteLink as Link } from '@/components/site/site-link';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { SiteEdition } from '@/lib/site-nav';

const LABELS: Record<SiteEdition, { name: string; short: string; lang: string }> = {
  sw: { name: 'Tanzania (Kiswahili)', short: 'TZ · SW', lang: 'sw' },
  en: { name: 'Tanzania (English)', short: 'TZ · EN', lang: 'en' },
  ke: { name: 'Kenya (English)', short: 'KE · EN', lang: 'en' },
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
}: {
  current: SiteEdition;
  targets: Record<SiteEdition, string>;
  label: string;
  align?: 'left' | 'right';
  /** Open above the button (in the footer). */
  up?: boolean;
}) {
  return (
    <details className="group relative">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-1.5 rounded-ks border border-ks-line bg-white px-3 text-sm font-semibold">
        <Globe className="size-4" aria-hidden="true" />
        {/* The spoken name starts with the visible text, so voice control ("click TZ SW") works. */}
        <span className="tabular">{LABELS[current].short}</span>
        <span className="sr-only">
          , {label}: {LABELS[current].name}
        </span>
        <ChevronDown
          className="size-4 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <ul
        className={cn(
          'absolute z-50 w-60 rounded-ks border border-ks-line bg-white p-1.5 shadow-lg',
          align === 'right' ? 'right-0' : 'left-0',
          up ? 'bottom-full mb-1' : 'mt-1',
        )}
      >
        {(Object.keys(LABELS) as SiteEdition[]).map((e) => (
          <li key={e}>
            <Link
              href={targets[e]}
              hrefLang={e === 'ke' ? 'en-KE' : `${e}-TZ`}
              lang={LABELS[e].lang}
              aria-current={e === current ? 'true' : undefined}
              className="flex min-h-12 items-center justify-between gap-2 rounded-lg px-3 text-ks-ink hover:bg-ks-green-100"
            >
              {LABELS[e].name}
              {e === current ? (
                <Check className="size-4 text-ks-green-700" aria-hidden="true" />
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
