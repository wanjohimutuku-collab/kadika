'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Menu, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { buttonClasses } from '@/components/ui/button';
import { LanguageChip } from '@/components/ui/language-chip';

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
  labels: { menu: string; close: string; main: string };
}

const linkBase =
  'inline-flex min-h-11 items-center rounded-input px-3 text-[15px] font-medium text-ink hover:bg-bg focus-visible:outline-2 focus-visible:outline-primary';

/**
 * Sticky public top navigation. Dropdowns on wide screens, a full-height sheet below 1024 px.
 * Server-rendered content stays crawlable: every link is a real anchor, also while closed on mobile
 * (the sheet is only mounted when open, the desktop row is always in the DOM).
 */
export function SiteNav({ groups, links, brand, cta, cardLink, labels }: SiteNavProps) {
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
      <header
        ref={barRef}
        className={cn(
          'sticky top-0 z-40 border-b bg-surface/95 backdrop-blur transition-shadow supports-[backdrop-filter]:bg-surface/85',
          scrolled ? 'border-border shadow-[0_1px_0_0_var(--color-border)]' : 'border-transparent',
        )}
      >
        <nav
          aria-label={labels.main}
          className="mx-auto flex min-h-16 max-w-6xl items-center gap-2 px-4"
        >
          <div className="flex flex-1 items-center gap-1 lg:flex-none">{brand}</div>

          <ul className="ml-4 hidden items-center gap-1 lg:flex">
            {groups.map((g) => {
              const expanded = open === g.id;
              return (
                <li key={g.id} className="relative">
                  <button
                    type="button"
                    className={cn(linkBase, 'gap-1', expanded && 'bg-bg')}
                    aria-expanded={expanded}
                    aria-controls={`nav-${g.id}`}
                    onClick={() => setOpen(expanded ? null : g.id)}
                  >
                    {g.label}
                    <ChevronDown
                      className={cn('size-4 transition-transform', expanded && 'rotate-180')}
                      aria-hidden="true"
                    />
                  </button>
                  <ul
                    id={`nav-${g.id}`}
                    hidden={!expanded}
                    className="absolute top-full left-0 mt-1 max-h-[70vh] w-72 overflow-auto rounded-card border border-border bg-surface p-2 shadow-lg"
                  >
                    {g.links.map((l) => (
                      <li key={l.href}>
                        <Link
                          href={l.href}
                          className="flex min-h-11 items-center rounded-input px-3 text-[15px] hover:bg-bg"
                          aria-current={pathname === l.href.split('?')[0] ? 'page' : undefined}
                        >
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
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

          <div className="ml-auto hidden items-center gap-2 lg:flex">
            <Link href={cardLink.href} className={linkBase}>
              {cardLink.label}
            </Link>
            <LanguageChip />
            <Link href={cta.href} className={buttonClasses('primary', 'md')}>
              {cta.label}
            </Link>
          </div>

          <div className="ml-auto flex items-center gap-2 lg:hidden">
            <LanguageChip />
            <button
              type="button"
              className="inline-flex size-12 items-center justify-center rounded-input border border-border bg-surface"
              aria-label={sheet ? labels.close : labels.menu}
              aria-expanded={sheet}
              aria-controls="nav-sheet"
              onClick={() => setSheet((v) => !v)}
            >
              {sheet ? (
                <X className="size-6" aria-hidden="true" />
              ) : (
                <Menu className="size-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </nav>
      </header>

      {sheet ? (
        <div
          id="nav-sheet"
          className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto bg-surface px-4 pt-2 pb-24 lg:hidden"
        >
          <div className="mx-auto flex max-w-lg flex-col gap-1">
            {groups.map((g) => (
              <details key={g.id} className="group border-b border-border">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between text-lg font-semibold">
                  {g.label}
                  <ChevronDown
                    className="size-5 text-muted transition-transform group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <ul className="pb-3">
                  {g.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="flex min-h-12 items-center px-1 text-base">
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
                className="flex min-h-14 items-center border-b border-border text-lg font-semibold"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href={cardLink.href}
              className="flex min-h-14 items-center border-b border-border text-lg font-semibold"
            >
              {cardLink.label}
            </Link>
          </div>
          <div className="fixed inset-x-0 bottom-0 border-t border-border bg-surface p-4">
            <Link href={cta.href} className={buttonClasses('primary', 'lg', 'w-full')}>
              {cta.label}
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
