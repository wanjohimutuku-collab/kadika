'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { KeyRound } from 'lucide-react';
import { useBrand } from '@/components/brand/brand-provider';
import { resolveLogoSrc } from '@/lib/branding';
import { cn } from '@/lib/cn';

/**
 * The public site scope (`.ks`) pins `--hp-primary` to the site red. Sign-in is the business's own
 * door, so it takes the theme colours saved in /ops → Settings → Branding (ADR 036) when there are any,
 * and keeps the site red otherwise.
 */
const BRAND_SCOPE = {
  '--hp-primary': 'var(--brand-primary, #c81018)',
  '--hp-on-primary': 'var(--brand-on-primary, #ffffff)',
} as CSSProperties;

/**
 * Layout for every sign-in step (phone, code, second factor, name). Desktop: a brand panel beside the
 * form card. Phone: the panel shrinks to a band above the card. The panel ends in a ticket-stub
 * perforation, the "kadi" the business sends its guests.
 */
export function AuthShell({
  children,
  testId,
  className,
}: {
  children: ReactNode;
  testId?: string;
  className?: string;
}) {
  const t = useTranslations('auth');
  const { brand } = useBrand();
  const logo = resolveLogoSrc(brand.logoUrl);
  return (
    <main
      style={BRAND_SCOPE}
      data-testid={testId}
      className="mx-auto w-full max-w-5xl px-4 pt-6 pb-12 sm:pt-8 lg:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)] lg:items-stretch lg:gap-8 lg:pt-12"
    >
      <aside
        className="auth-panel relative flex flex-col overflow-hidden rounded-[28px] bg-primary text-on-primary"
        aria-label={brand.businessName}
      >
        <div className="relative flex flex-1 flex-col gap-3 p-6 sm:p-8 lg:p-10">
          {logo ? (
            <span className="mb-2 hidden w-fit rounded-2xl bg-white/95 px-3 py-2 lg:inline-flex">
              <img src={logo} alt="" className="h-8 w-auto" />
            </span>
          ) : null}
          <p className="text-xs font-semibold tracking-[0.18em] uppercase opacity-75">
            {brand.businessName}
          </p>
          <p className="font-display text-[28px] leading-[1.1] tracking-[-0.01em] text-balance sm:text-[34px] lg:mt-auto lg:text-[44px]">
            {t('panelHeading')}
          </p>
          <p className="hidden max-w-sm text-[15px] leading-relaxed opacity-85 lg:block">
            {t('panelBody')}
          </p>
        </div>
        {/* Ticket stub: a perforated tear line, then the one promise that matters at this door. */}
        <div className="auth-perforation" aria-hidden="true" />
        <div className="relative flex items-center gap-2.5 px-6 py-4 text-sm sm:px-8 lg:px-10 lg:py-5">
          <KeyRound className="size-4 shrink-0 opacity-80" aria-hidden="true" />
          <span className="opacity-90">{t('panelNoPassword')}</span>
        </div>
      </aside>
      <div
        className={cn(
          'mx-auto mt-5 flex w-full max-w-md flex-col gap-5 lg:mt-0 lg:justify-center',
          className,
        )}
      >
        {children}
      </div>
    </main>
  );
}

/** The white card that holds a sign-in form. */
export function AuthCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        'auth-card rounded-[24px] border border-border bg-surface p-6 sm:p-8',
        className,
      )}
    >
      {children}
    </section>
  );
}
