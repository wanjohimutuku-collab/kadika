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
import { siteButton } from '@/components/site/blocks';

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
  cardLink: NavLink;
  /** Language and market switch, shown beside the menu on every width. */
  localeSwitch?: ReactNode;
  labels: { menu: string; close: string; main: string };
}

const linkBase =
  'inline-flex min-h-10 items-center rounded-full px-3.5 text-[14.5px] font-medium text-ks-ink/85 transition-all duration-300 hover:bg-ks-green-100/70 hover:text-ks-green-900 focus-visible:outline-2 focus-visible:outline-ks-green-700';

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
            'ks-ease relative mx-auto flex min-h-[3.75rem] max-w-[1120px] items-center gap-2 rounded-full py-1.5 pr-1.5 pl-4 backdrop-blur-xl transition-all duration-500 md:pl-5',
            scrolled || sheet
              ? 'bg-white/90 shadow-[0_18px_44px_-22px_rgb(10_10_7/0.35),inset_0_1px_0_rgb(255_255_255/0.9)] ring-1 ring-ks-ink/[0.08]'
              : 'bg-ks-paper/80 shadow-[0_10px_28px_-20px_rgb(10_10_7/0.22),inset_0_1px_0_rgb(255_255_255/0.8)] ring-1 ring-ks-ink/[0.06]',
          )}
        >
          {/* Brand mark */}
          <div className="flex flex-1 items-center gap-1 lg:flex-none">{brand}</div>

          {/* Primary desktop navigation */}
          <ul className="ml-3 hidden items-center gap-0.5 lg:flex">
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
                      (expanded || groupHasActive) && 'bg-[#f6f9fc] text-[#5469d4]',
                    )}
                    aria-expanded={expanded}
                    aria-controls={`nav-${g.id}`}
                    onClick={() => setOpen(expanded ? null : g.id)}
                  >
                    {g.label}
                    <ChevronDown
                      className={cn(
                        'ks-ease size-3.5 text-ks-muted transition-transform duration-300',
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
                      active && 'bg-ks-green-100/75 font-semibold text-ks-green-900',
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
          <div className="ml-auto hidden items-center gap-1.5 lg:flex">
            <Link
              href={cardLink.href}
              className={cn(
                'inline-flex min-h-10 items-center gap-1.5 rounded-full border border-ks-line/90 bg-white/85 px-3.5 text-[14px] font-medium text-ks-ink transition-all duration-300 hover:border-ks-green-700/35 hover:bg-ks-green-100/55 hover:text-ks-green-900 focus-visible:outline-2 focus-visible:outline-ks-green-700',
                isActive(cardLink.href) &&
                  'border-ks-green-700/40 bg-ks-green-100/75 font-semibold',
              )}
            >
              <Ticket className="size-3.5 text-ks-saffron" strokeWidth={2.2} aria-hidden="true" />
              <span>{cardLink.label}</span>
            </Link>
            {localeSwitch}
            <Link
              href={cta.href}
              className="group inline-flex min-h-10 items-center justify-center gap-2.5 rounded-full bg-ks-green-900 py-1 pr-1 pl-4 text-[14.5px] font-semibold text-white shadow-[0_12px_26px_-12px_rgb(10_63_53/0.65)] transition-all duration-500 ks-ease hover:bg-ks-ink active:scale-[0.98]"
            >
              <span>{cta.label}</span>
              <span
                aria-hidden="true"
                className="ks-ease flex size-8 items-center justify-center rounded-full bg-white/15 text-white transition-all duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-px group-hover:bg-ks-saffron group-hover:text-ks-ink"
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
              className="ks-ease relative inline-flex size-10 items-center justify-center rounded-full bg-ks-green-900 text-white shadow-[0_8px_18px_-8px_rgb(10_63_53/0.55)] transition-transform duration-500 active:scale-95"
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
          className="fixed inset-0 z-30 overflow-y-auto bg-ks-paper/95 px-4 pt-24 pb-32 backdrop-blur-2xl lg:hidden"
        >
          <div className="ks-stagger mx-auto flex max-w-lg flex-col">
            {/* Relatable quick-access card for invited guests */}
            <Link
              href={cardLink.href}
              className="mb-4 flex min-h-14 items-center justify-between rounded-2xl border border-ks-gold-500/35 bg-ks-gold-100/65 px-4 text-base font-semibold text-ks-green-900 shadow-[0_8px_20px_-14px_rgb(217_164_65/0.45)]"
            >
              <span className="inline-flex items-center gap-2.5">
                <span className="inline-flex size-8 items-center justify-center rounded-full bg-white text-ks-saffron shadow-xs">
                  <Ticket className="size-4" strokeWidth={2.2} aria-hidden="true" />
                </span>
                {cardLink.label}
              </span>
              <ArrowUpRight className="size-4 text-ks-green-700" aria-hidden="true" />
            </Link>

            {groups.map((g) => (
              <details key={g.id} className="group border-b border-ks-line">
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between text-2xl font-semibold tracking-[-0.02em] text-ks-ink">
                  {g.label}
                  <ChevronDown
                    className="ks-ease size-5 text-ks-muted transition-transform duration-500 group-open:rotate-180"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                </summary>
                <ul className="grid gap-0.5 pb-4">
                  {g.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="flex min-h-11 items-center rounded-xl px-2 text-base text-ks-ink/85 hover:bg-ks-green-100/60"
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
                className="flex min-h-16 items-center border-b border-ks-line text-2xl font-semibold tracking-[-0.02em] text-ks-ink"
              >
                {l.label}
              </Link>
            ))}
          </div>
          <div className="fixed inset-x-0 bottom-0 border-t border-ks-line/70 bg-ks-paper/90 p-4 backdrop-blur-md">
            <Link href={cta.href} className={cn(siteButton('primary'), 'w-full bg-ks-green-900')}>
              {cta.label}
              <span
                aria-hidden="true"
                className="flex size-9 items-center justify-center rounded-full bg-white/15"
              >
                <ArrowUpRight className="size-[18px]" strokeWidth={1.75} />
              </span>
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
