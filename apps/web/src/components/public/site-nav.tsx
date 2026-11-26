'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { SiteLink as Link } from '@/components/site/site-link';
import { usePathname } from 'next/navigation';
import {
  ArrowUpRight,
  BookOpen,
  Briefcase,
  ChevronDown,
  Compass,
  FileText,
  Heart,
  MessageSquare,
  QrCode,
  ShieldCheck,
  Sparkles,
  Ticket,
} from 'lucide-react';
import { cn } from '@/lib/cn';

export interface NavLink {
  href: string;
  label: string;
  description?: string;
}

const MEGA_ICONS = [
  Sparkles,
  MessageSquare,
  QrCode,
  Heart,
  Briefcase,
  FileText,
  BookOpen,
  Compass,
  ShieldCheck,
] as const;

export interface NavGroup {
  id: string;
  label: string;
  links: NavLink[];
}

export interface SiteNavProps {
  groups: NavGroup[];
  /** Plain links shown after the dropdowns. */
  links: NavLink[];
  brand: ReactNode;
  cta: NavLink;
  loginLink?: NavLink;
  cardLink: NavLink;
  /** Language and market switch, shown beside the menu on every width. */
  localeSwitch?: ReactNode;
  labels: { menu: string; close: string; main: string };
}

const linkBase =
  'inline-flex h-9 items-center whitespace-nowrap rounded-full px-3 text-[14px] font-medium text-[#0a2640]/80 transition-colors duration-200 hover:bg-[#f6f9fc] hover:text-[#5469d4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5469d4]';

/**
 * Floating glass pill navigation, detached from the top edge so it floats over the warm hero mesh.
 * Dropdowns on wide screens, a full-height sheet below 1024 px. Server-rendered content stays
 * crawlable: every link is a real anchor, also while closed on mobile.
 */
export function SiteNav({
  groups,
  links,
  brand,
  cta,
  loginLink,
  cardLink,
  localeSwitch,
  labels,
}: SiteNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  // Close everything on navigation.
  useEffect(() => {
    setOpen(null);
    setSheet(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open && !sheet) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(null);
        setSheet(false);
      }
    };
    const onDown = (e: MouseEvent) => {
      if (open && barRef.current && !barRef.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open, sheet]);

  useEffect(() => {
    document.body.style.overflow = sheet ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sheet]);

  const isActive = (href: string) => pathname === href.split('?')[0];

  return (
    <>
      <header ref={barRef} className="sticky top-0 z-40 px-3 pt-3 md:px-6 md:pt-4">
        <nav
          aria-label={labels.main}
          className={cn(
            'ks-ease relative mx-auto flex min-h-[3.5rem] max-w-[1120px] items-center justify-between gap-3 rounded-full py-1.5 pr-1.5 pl-4 backdrop-blur-xl transition-all duration-500 md:pl-5',
            scrolled || sheet
              ? 'bg-white/95 shadow-[0_18px_44px_-22px_rgb(10_38_64/0.25)] ring-1 ring-[#e3e8ee]'
              : 'bg-white/90 shadow-[0_10px_28px_-20px_rgb(10_38_64/0.16)] ring-1 ring-[#e3e8ee]',
          )}
        >
          {/* Brand mark */}
          <div className="flex flex-1 items-center gap-1 lg:flex-none">{brand}</div>

          {/* Primary desktop navigation */}
          <ul className="ml-2 hidden shrink-0 items-center gap-1 lg:flex">
            {groups.map((g) => {
              const expanded = open === g.id;
              const groupHasActive = g.links.some((l) => isActive(l.href));
              return (
                <li key={g.id}>
                  <button
                    type="button"
                    className={cn(
                      linkBase,
                      'gap-1',
                      (expanded || groupHasActive) && 'bg-[#f6f9fc] font-semibold text-[#5469d4]',
                    )}
                    aria-expanded={expanded}
                    aria-controls={`nav-${g.id}`}
                    onClick={() => setOpen(expanded ? null : g.id)}
                  >
                    {g.label}
                    <ChevronDown
                      className={cn(
                        'ks-ease size-3.5 text-[#494d59] transition-transform duration-300',
                        expanded && 'rotate-180 text-[#5469d4]',
                      )}
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  </button>
                  <div
                    id={`nav-${g.id}`}
                    hidden={!expanded}
                    className="absolute inset-x-0 top-full mt-3 rounded-2xl border border-[#e3e8ee] bg-white p-5 shadow-[0_24px_56px_-18px_rgb(10_38_64/0.18)] md:p-6"
                  >
                    <ul className="grid max-h-[68vh] grid-cols-1 gap-1.5 overflow-auto md:grid-cols-2 lg:grid-cols-3 lg:gap-3">
                      {g.links.map((l, idx) => {
                        const active = isActive(l.href);
                        const Icon = MEGA_ICONS[idx % MEGA_ICONS.length]!;
                        return (
                          <li key={l.href}>
                            <Link
                              href={l.href}
                              className={cn(
                                'group flex items-start gap-3.5 rounded-xl p-3 transition-colors',
                                active ? 'bg-[#f6f9fc] text-[#5469d4]' : 'hover:bg-[#f6f9fc]',
                              )}
                              aria-current={active ? 'page' : undefined}
                            >
                              <span
                                aria-hidden="true"
                                className={cn(
                                  'flex size-10 shrink-0 items-center justify-center rounded-xl border transition-colors',
                                  active
                                    ? 'border-[#5469d4] bg-[#5469d4] text-white'
                                    : 'border-[#e3e8ee] bg-[#f6f9fc] text-[#5469d4] group-hover:border-[#5469d4] group-hover:bg-[#5469d4] group-hover:text-white',
                                )}
                              >
                                <Icon className="size-[18px]" strokeWidth={1.9} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <span
                                  className={cn(
                                    'block text-[14.5px] leading-snug font-bold transition-colors',
                                    active
                                      ? 'text-[#5469d4]'
                                      : 'text-[#0a2640] group-hover:text-[#5469d4]',
                                  )}
                                >
                                  {l.label}
                                </span>
                                {l.description ? (
                                  <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-[#494d59]">
                                    {l.description}
                                  </span>
                                ) : null}
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </li>
              );
            })}
            {links.map((l) => {
              const active = isActive(l.href);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className={cn(
                      linkBase,
                      active && 'bg-[#f6f9fc] font-semibold text-[#5469d4]',
                    )}
                    aria-current={active ? 'page' : undefined}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Right utility & conversion cluster (desktop) */}
          <div className="ml-auto hidden shrink-0 items-center gap-1.5 lg:flex">
            <Link
              href={cardLink.href}
              className={cn(
                'inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[13.5px] font-medium text-[#0a2640]/80 transition-colors duration-200 hover:bg-[#f6f9fc] hover:text-[#5469d4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5469d4] xl:px-3',
                isActive(cardLink.href) && 'bg-[#f6f9fc] font-semibold text-[#5469d4]',
              )}
            >
              <Ticket className="size-3.5 text-[#5469d4]" strokeWidth={2.2} aria-hidden="true" />
              <span>{cardLink.label}</span>
            </Link>
            <span aria-hidden="true" className="h-4 w-px bg-[#e3e8ee]" />
            {localeSwitch}
            {loginLink ? (
              <Link
                href={loginLink.href}
                className={cn(
                  'inline-flex h-10 items-center justify-center whitespace-nowrap rounded-full border border-[#e3e8ee] bg-white px-4 text-[14px] font-semibold text-[#0a2640] transition-colors duration-200 hover:border-[#5469d4]/40 hover:bg-[#f6f9fc] hover:text-[#5469d4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5469d4]',
                  isActive(loginLink.href) &&
                    'border-[#5469d4]/40 bg-[#f6f9fc] text-[#5469d4]',
                )}
                aria-current={isActive(loginLink.href) ? 'page' : undefined}
              >
                {loginLink.label}
              </Link>
            ) : null}
            <Link
              href={cta.href}
              className="qw-btn-primary min-h-10! py-1! pr-1.5! pl-4! text-[14px]!"
            >
              <span>{cta.label}</span>
              <span
                aria-hidden="true"
                className="flex size-7 items-center justify-center rounded-full bg-white/15 text-white"
              >
                <ArrowUpRight className="size-4" strokeWidth={2} />
              </span>
            </Link>
          </div>

          {/* Mobile controls */}
          <div className="ml-auto flex items-center gap-1.5 lg:hidden">
            {localeSwitch}
            <button
              type="button"
              className="ks-ease relative inline-flex size-10 items-center justify-center rounded-full bg-[#0a2640] text-white shadow-[0_8px_18px_-8px_rgb(10_38_64/0.45)] transition-transform duration-500 active:scale-95"
              aria-label={sheet ? labels.close : labels.menu}
              aria-expanded={sheet}
              aria-controls="nav-sheet"
              onClick={() => setSheet((v) => !v)}
            >
              {/* Two lines that turn into an X. */}
              <span aria-hidden="true" className="relative block h-3 w-4">
                <span
                  className={cn(
                    'ks-ease absolute left-0 h-[1.5px] w-4 rounded-full bg-current transition-transform duration-500',
                    sheet ? 'top-1/2 -translate-y-1/2 rotate-45' : 'top-0',
                  )}
                />
                <span
                  className={cn(
                    'ks-ease absolute left-0 h-[1.5px] w-4 rounded-full bg-current transition-transform duration-500',
                    sheet ? 'top-1/2 -translate-y-1/2 -rotate-45' : 'bottom-0',
                  )}
                />
              </span>
            </button>
          </div>
        </nav>
      </header>

      {sheet ? (
        <div
          id="nav-sheet"
          className="fixed inset-0 z-30 overflow-y-auto bg-white/95 px-4 pt-24 pb-32 backdrop-blur-2xl lg:hidden"
        >
          <div className="ks-stagger mx-auto flex max-w-lg flex-col">
            {/* Relatable quick-access card for invited guests */}
            <Link
              href={cardLink.href}
              className="mb-4 flex min-h-14 items-center justify-between rounded-2xl border border-[#e3e8ee] bg-[#f6f9fc] px-4 text-base font-semibold text-[#0a2640] shadow-xs"
            >
              <span className="inline-flex items-center gap-2.5">
                <span className="inline-flex size-8 items-center justify-center rounded-full bg-white text-[#5469d4] shadow-xs ring-1 ring-[#e3e8ee]">
                  <Ticket className="size-4" strokeWidth={2.2} aria-hidden="true" />
                </span>
                {cardLink.label}
              </span>
              <ArrowUpRight className="size-4 text-[#5469d4]" aria-hidden="true" />
            </Link>

            {groups.map((g) => (
              <details key={g.id} className="group border-b border-[#e3e8ee]">
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between text-2xl font-semibold tracking-[-0.02em] text-[#0a2640]">
                  {g.label}
                  <ChevronDown
                    className="ks-ease size-5 text-[#494d59] transition-transform duration-500 group-open:rotate-180 group-open:text-[#5469d4]"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                </summary>
                <ul className="grid gap-0.5 pb-4">
                  {g.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="flex min-h-11 items-center rounded-xl px-2 text-base text-[#0a2640]/85 hover:bg-[#f6f9fc] hover:text-[#5469d4]"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="flex min-h-16 items-center border-b border-[#e3e8ee] text-2xl font-semibold tracking-[-0.02em] text-[#0a2640]"
              >
                {l.label}
              </Link>
            ))}
          </div>
          <div className="fixed inset-x-0 bottom-0 border-t border-[#e3e8ee] bg-white/95 p-4 backdrop-blur-md">
            <div className={cn(loginLink && 'grid grid-cols-2 gap-2.5')}>
              {loginLink ? (
                <Link
                  href={loginLink.href}
                  className={cn(
                    'inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[#e3e8ee] bg-white px-4 text-sm font-semibold text-[#0a2640] transition-colors duration-200 hover:border-[#5469d4]/40 hover:bg-[#f6f9fc] hover:text-[#5469d4]',
                    isActive(loginLink.href) &&
                      'border-[#5469d4]/40 bg-[#f6f9fc] text-[#5469d4]',
                  )}
                  aria-current={isActive(loginLink.href) ? 'page' : undefined}
                >
                  {loginLink.label}
                </Link>
              ) : null}
              <Link href={cta.href} className="qw-btn-primary w-full justify-center">
                <span>{cta.label}</span>
                <ArrowUpRight className="size-[18px]" strokeWidth={2} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
