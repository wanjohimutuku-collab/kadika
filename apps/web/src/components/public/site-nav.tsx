'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { SiteLink as Link } from '@/components/site/site-link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, ChevronDown, Ticket } from 'lucide-react';
import { cn } from '@/lib/cn';
import { siteButton } from '@/components/site/blocks';

export interface NavLink {
  href: string;
  label: string;
}

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
              ? 'bg-white/90 shadow-[0_18px_44px_-22px_rgb(10_63_53/0.45),inset_0_1px_0_rgb(255_255_255/0.9)] ring-1 ring-ks-ink/[0.08]'
              : 'bg-ks-paper/80 shadow-[0_10px_28px_-20px_rgb(10_63_53/0.28),inset_0_1px_0_rgb(255_255_255/0.8)] ring-1 ring-ks-ink/[0.06]',
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
                <li key={g.id} className="relative">
                  <button
                    type="button"
                    className={cn(
                      linkBase,
                      'gap-1',
                      (expanded || groupHasActive) && 'bg-ks-green-100/75 text-ks-green-900',
                    )}
                    aria-expanded={expanded}
                    aria-controls={`nav-${g.id}`}
                    onClick={() => setOpen(expanded ? null : g.id)}
                  >
                    {g.label}
                    <ChevronDown
                      className={cn(
                        'ks-ease size-3.5 text-ks-muted transition-transform duration-500',
                        expanded && 'rotate-180 text-ks-green-900',
                      )}
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  </button>
                  <div
                    id={`nav-${g.id}`}
                    hidden={!expanded}
                    className="absolute top-full left-0 mt-3 w-80 rounded-[1.5rem] bg-ks-paper/90 p-1.5 shadow-[0_26px_54px_-22px_rgb(10_63_53/0.42)] ring-1 ring-ks-ink/[0.08] backdrop-blur-xl"
                  >
                    <div className="mb-1 flex items-center justify-between px-3 pt-1.5 pb-1">
                      <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ks-green-700">
                        {g.label}
                      </span>
                      <span className="h-1 w-6 rounded-full bg-ks-gold-500/60" aria-hidden="true" />
                    </div>
                    <ul className="ks-stagger max-h-[68vh] overflow-auto rounded-[calc(1.5rem-0.375rem)] bg-white p-1.5 ring-1 ring-ks-ink/[0.04]">
                      {g.links.map((l) => {
                        const active = isActive(l.href);
                        return (
                          <li key={l.href}>
                            <Link
                              href={l.href}
                              className={cn(
                                'group flex min-h-10 items-center justify-between rounded-xl px-3 text-[14.5px] transition-colors',
                                active
                                  ? 'bg-ks-green-100/80 font-semibold text-ks-green-900'
                                  : 'text-ks-ink/85 hover:bg-ks-green-100/55 hover:text-ks-green-900',
                              )}
                              aria-current={active ? 'page' : undefined}
                            >
                              <span>{l.label}</span>
                              <ArrowUpRight
                                className={cn(
                                  'size-3.5 transition-all duration-300',
                                  active
                                    ? 'text-ks-green-700 opacity-100'
                                    : 'text-ks-muted opacity-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100',
                                )}
                                aria-hidden="true"
                              />
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
