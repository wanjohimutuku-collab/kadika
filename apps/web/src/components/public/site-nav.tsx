'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { SiteLink as Link } from '@/components/site/site-link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
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
  'inline-flex min-h-11 items-center rounded-full px-3.5 text-[15px] font-medium text-ks-ink transition-colors duration-300 hover:bg-ks-green-100/70 focus-visible:outline-2 focus-visible:outline-ks-green-700';

/**
 * Floating glass pill navigation (2026-11 redesign), detached from the top edge. Dropdowns on wide screens, a full-height sheet below 1024 px.
 * Server-rendered content stays crawlable: every link is a real anchor, also while closed on mobile
 * (the sheet is only mounted when open, the desktop row is always in the DOM).
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
    const onScroll = () => setScrolled(window.scrollY > 4);
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

  return (
    <>
      <header ref={barRef} className="sticky top-0 z-40 px-3 pt-3 md:px-6 md:pt-4">
        <nav
          aria-label={labels.main}
          className={cn(
            'ks-ease mx-auto flex min-h-16 max-w-[1120px] items-center gap-2 rounded-full bg-white/80 py-2 pr-2 pl-5 ring-1 ring-ks-ink/[0.06] backdrop-blur-xl transition-shadow duration-500 supports-[backdrop-filter]:bg-white/65',
            scrolled || sheet
              ? 'shadow-[0_16px_40px_-24px_rgb(10_63_53/0.45)]'
              : 'shadow-[0_8px_24px_-20px_rgb(10_63_53/0.3)]',
          )}
        >
          <div className="flex flex-1 items-center gap-1 lg:flex-none">{brand}</div>

          <ul className="ml-4 hidden items-center gap-0.5 lg:flex">
            {groups.map((g) => {
              const expanded = open === g.id;
              return (
                <li key={g.id} className="relative">
                  <button
                    type="button"
                    className={cn(linkBase, 'gap-1', expanded && 'bg-ks-green-100/70')}
                    aria-expanded={expanded}
                    aria-controls={`nav-${g.id}`}
                    onClick={() => setOpen(expanded ? null : g.id)}
                  >
                    {g.label}
                    <ChevronDown
                      className={cn(
                        'ks-ease size-4 transition-transform duration-500',
                        expanded && 'rotate-180',
                      )}
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  </button>
                  <div
                    id={`nav-${g.id}`}
                    hidden={!expanded}
                    className="absolute top-full left-0 mt-3 w-80 rounded-[1.75rem] bg-white/70 p-1.5 shadow-[0_24px_48px_-24px_rgb(10_63_53/0.4)] ring-1 ring-ks-ink/[0.06] backdrop-blur-xl"
                  >
                    <ul className="ks-stagger max-h-[70vh] overflow-auto rounded-[calc(1.75rem-0.375rem)] bg-white p-2">
                      {g.links.map((l) => (
                        <li key={l.href}>
                          <Link
                            href={l.href}
                            className="flex min-h-11 items-center rounded-2xl px-3 text-[15px] hover:bg-ks-green-100/70"
                            aria-current={pathname === l.href.split('?')[0] ? 'page' : undefined}
                          >
                            {l.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              );
            })}
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={linkBase}
                  aria-current={pathname === l.href.split('?')[0] ? 'page' : undefined}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="ml-auto hidden items-center gap-1.5 lg:flex">
            <Link href={cardLink.href} className={linkBase}>
              {cardLink.label}
            </Link>
            {localeSwitch}
            <Link href={cta.href} className={cn(siteButton('primary'), 'min-h-11 text-[15px]')}>
              {cta.label}
              <span
                aria-hidden="true"
                className="ks-ease flex size-8 items-center justify-center rounded-full bg-white/15 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-px"
              >
                <ArrowUpRight className="size-4" strokeWidth={1.75} />
              </span>
            </Link>
          </div>

          <div className="ml-auto flex items-center gap-1.5 lg:hidden">
            {localeSwitch}
            <button
              type="button"
              className="ks-ease relative inline-flex size-12 items-center justify-center rounded-full bg-ks-green-900 text-white transition-transform duration-500 active:scale-95"
              aria-label={sheet ? labels.close : labels.menu}
              aria-expanded={sheet}
              aria-controls="nav-sheet"
              onClick={() => setSheet((v) => !v)}
            >
              {/* Two lines that turn into an X. */}
              <span aria-hidden="true" className="relative block h-3 w-5">
                <span
                  className={cn(
                    'ks-ease absolute left-0 h-[1.5px] w-5 rounded-full bg-current transition-transform duration-500',
                    sheet ? 'top-1/2 -translate-y-1/2 rotate-45' : 'top-0',
                  )}
                />
                <span
                  className={cn(
                    'ks-ease absolute left-0 h-[1.5px] w-5 rounded-full bg-current transition-transform duration-500',
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
          className="fixed inset-0 z-30 overflow-y-auto bg-ks-paper/90 px-4 pt-28 pb-32 backdrop-blur-2xl lg:hidden"
        >
          <div className="ks-stagger mx-auto flex max-w-lg flex-col">
            {groups.map((g) => (
              <details key={g.id} className="group border-b border-ks-line">
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between text-2xl font-semibold tracking-[-0.02em]">
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
                        className="flex min-h-12 items-center px-1 text-base text-ks-ink/85"
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
                className="flex min-h-16 items-center border-b border-ks-line text-2xl font-semibold tracking-[-0.02em]"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href={cardLink.href}
              className="flex min-h-16 items-center border-b border-ks-line text-2xl font-semibold tracking-[-0.02em]"
            >
              {cardLink.label}
            </Link>
          </div>
          <div className="fixed inset-x-0 bottom-0 p-4">
            <Link href={cta.href} className={cn(siteButton('primary'), 'w-full')}>
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
