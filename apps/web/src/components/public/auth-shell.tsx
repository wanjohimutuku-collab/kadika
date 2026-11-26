'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Heart, KeyRound, MessageSquare, QrCode, Sparkles } from 'lucide-react';
import { useBrand } from '@/components/brand/brand-provider';
import { resolveLogoSrc } from '@/lib/branding';
import { cn } from '@/lib/cn';

/**
 * The public site scope (`.ks`) pins `--hp-primary` to the site red. Sign-in is the business's own
 * door, so it takes the theme colours saved in /ops → Settings → Branding (ADR 036) when there are any,
 * and uses the Quickwork indigo accent otherwise.
 */
const BRAND_SCOPE = {
  '--hp-primary': 'var(--brand-primary, #5469d4)',
  '--hp-on-primary': 'var(--brand-on-primary, #ffffff)',
} as CSSProperties;

/**
 * Layout for every sign-in step (phone, code, second factor, name). Desktop: a welcoming navy panel
 * with a live mini invitation card beside the form card. Phone: the panel compacts neatly above the
 * card. The panel ends in a ticket-stub perforation, echoing the digital card sent to guests.
 */
export function AuthShell({
  children,
  testId,
  className,
  mode = 'login',
  previewName,
  previewOccasion,
}: {
  children: ReactNode;
  testId?: string;
  className?: string;
  mode?: 'login' | 'signup';
  previewName?: string;
  previewOccasion?: string;
}) {
  const t = useTranslations('auth');
  const { brand } = useBrand();
  const logo = resolveLogoSrc(brand.logoUrl);
  const firstName = previewName?.trim().split(/\s+/)[0] ?? '';
  const occasion = previewOccasion?.trim() || t('occasionWedding');

  return (
    <main
      style={BRAND_SCOPE}
      data-testid={testId}
      className="relative -mt-20 overflow-hidden bg-white pt-28 pb-16 md:-mt-24 md:pt-36 md:pb-24"
    >
      <div
        className="qw-hero-trapezoid pointer-events-none absolute inset-x-0 top-0 h-[300px] opacity-20 md:h-[360px]"
        aria-hidden="true"
      />
      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 lg:grid lg:grid-cols-[minmax(0,0.96fr)_minmax(0,1fr)] lg:items-stretch lg:gap-8 md:px-6">
        <aside
          className="qw-navy-band auth-panel relative flex flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#0a2640] text-white shadow-[0_28px_60px_-24px_rgba(10,38,64,0.45)]"
          aria-label={brand.businessName}
        >
          <div className="relative flex flex-1 flex-col gap-4 p-6 sm:p-8 lg:p-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                <span className="qw-ripple-dot" aria-hidden="true" />
                <span>{mode === 'signup' ? t('signupBadge') : t('loginBadge')}</span>
              </div>
              {logo ? (
                <span className="hidden rounded-xl bg-white/95 px-2.5 py-1.5 lg:inline-flex">
                  <img src={logo} alt="" className="h-6 w-auto" />
                </span>
              ) : null}
            </div>

            <div className="mt-2 space-y-2.5 lg:mt-4">
              <p className="text-xs font-semibold tracking-[0.18em] text-[#93c5fd] uppercase">
                {brand.businessName}
              </p>
              <p className="text-[28px] leading-[1.1] font-bold tracking-[-0.025em] text-balance text-white sm:text-[34px] lg:text-[40px]">
                {mode === 'signup' ? t('signupPanelHeading') : t('panelHeading')}
              </p>
              <p className="hidden max-w-sm text-[15px] leading-relaxed text-white/75 lg:block">
                {mode === 'signup' ? t('signupPanelBody') : t('panelBody')}
              </p>
            </div>

            {/* Live Mini Invitation Card Preview */}
            <div className="mt-auto pt-3">
              <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/[0.08] p-4 backdrop-blur-md">
                <div className="flex items-center justify-between gap-2 text-[11px] font-semibold tracking-wide text-[#93c5fd] uppercase">
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-[#00ec64]" aria-hidden="true" />
                    {t('previewEyebrow')}
                  </span>
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-medium text-white">
                    {occasion}
                  </span>
                </div>
                <p className="mt-2.5 text-lg font-bold tracking-tight text-white">
                  {firstName
                    ? t('previewNamedTitle', { name: firstName, occasion })
                    : `${t('previewDefaultCouple')} · ${occasion}`}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium text-white/85">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1">
                    <MessageSquare className="size-3 text-[#93c5fd]" aria-hidden="true" />
                    {t('previewBadge1')}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1">
                    <QrCode className="size-3 text-[#00ec64]" aria-hidden="true" />
                    {t('previewBadge2')}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1">
                    <Heart className="size-3 text-[#f9a8d4]" aria-hidden="true" />
                    {t('previewBadge3')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Ticket stub: a perforated tear line, then the one promise that matters at this door. */}
          <div className="auth-perforation" aria-hidden="true" />
          <div className="relative flex items-center gap-2.5 px-6 py-4 text-sm text-white/85 sm:px-8 lg:px-10 lg:py-5">
            <KeyRound className="size-4 shrink-0 text-[#93c5fd]" aria-hidden="true" />
            <span>{t('panelNoPassword')}</span>
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
      </div>
    </main>
  );
}

/** The white card that holds a sign-in form. */
export function AuthCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        'auth-card relative overflow-hidden rounded-[24px] border border-[#e3e8ee] bg-white p-6 sm:p-8',
        className,
      )}
    >
      {children}
    </section>
  );
}
