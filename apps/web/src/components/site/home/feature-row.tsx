import type { ReactNode } from 'react';
import { ArrowUpRight, Check } from 'lucide-react';
import { SiteLink as Link } from '@/components/site/site-link';
import { cn } from '@/lib/cn';

/**
 * One feature row in the alternating zig-zag between the try-section and the pricing teaser.
 * Server-rendered; the visual slot accepts any node so each row can show a bespoke mockup.
 */
export interface FeatureRowProps {
  eyebrow: string;
  title: string;
  bullets: string[];
  linkLabel?: string;
  linkHref?: string;
  visual: ReactNode;
  reverse?: boolean;
}

export function FeatureRow({
  eyebrow,
  title,
  bullets,
  linkLabel,
  linkHref,
  visual,
  reverse,
}: FeatureRowProps) {
  return (
    <section
      className={cn('mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-2 md:gap-16 md:py-24')}
    >
      <div className={cn('flex flex-col gap-5', reverse && 'md:order-2')}>
        <span className="text-xs tracking-widest text-ks-muted">{eyebrow}</span>
        <h2 className="font-serif text-3xl leading-tight tracking-[-0.02em] md:text-4xl">
          {title}
        </h2>
        <ul className="flex flex-col gap-3">
          {bullets.map((b) => (
            <li key={b} className="flex gap-3 leading-relaxed">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-ks-green-700">
                <Check className="size-3.5" strokeWidth={2.25} />
              </span>
              {b}
            </li>
          ))}
        </ul>
        {linkLabel && linkHref ? (
          <Link
            href={linkHref}
            className="inline-flex w-fit items-center gap-2 text-ks-green-700 underline-offset-4 hover:underline"
          >
            {linkLabel}
            <ArrowUpRight className="size-4" strokeWidth={1.75} />
          </Link>
        ) : null}
      </div>
      <div className={cn('flex items-center justify-center', reverse && 'md:order-1')}>
        {visual}
      </div>
    </section>
  );
}
