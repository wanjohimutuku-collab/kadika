'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Activity,
  BarChart3,
  CalendarHeart,
  CreditCard,
  FileClock,
  LifeBuoy,
  ShieldAlert,
  ShieldCheck,
  Users,
  Gauge,
} from 'lucide-react';
import { useSession } from '@/lib/queries';
import { getRepository } from '@/lib/repo';
import { Skeleton } from '@/components/ui/display';
import { Button, buttonClasses } from '@/components/ui/button';
import { LanguageChip } from '@/components/ui/language-chip';
import { SyncIndicator, OfflineBanner } from '@/components/console/shell';
import { cn } from '@/lib/cn';
import { useEffect } from 'react';

const ITEMS = [
  { key: 'overview', href: '/ops', icon: BarChart3 },
  { key: 'organizers', href: '/ops/organizers', icon: Users },
  { key: 'events', href: '/ops/events', icon: CalendarHeart },
  { key: 'usage', href: '/ops/usage', icon: Activity },
  { key: 'pilot', href: '/ops/pilot', icon: Gauge },
  { key: 'payments', href: '/ops/payments', icon: CreditCard },
  { key: 'support', href: '/ops/support', icon: LifeBuoy },
  { key: 'requests', href: '/ops/requests', icon: ShieldCheck },
  { key: 'audit', href: '/ops/audit', icon: FileClock },
] as const;

/** Harusi Pass staff area. Customers (role_global = user) are refused; the data layer enforces it too. */
export function OpsShell({ children }: { children: ReactNode }) {
  const t = useTranslations('ops');
  const tc = useTranslations('common');
  const tn = useTranslations('nav');
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const user = session.data?.user;

  useEffect(() => {
    if (session.isSuccess && !session.data)
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [session.isSuccess, session.data, router, pathname]);

  if (!user) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6" aria-busy="true">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (user.roleGlobal !== 'admin') {
    return (
      <main
        className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center"
        data-testid="ops-refused"
      >
        <ShieldAlert className="size-12 text-warning" aria-hidden="true" />
        <h1 className="text-2xl font-semibold">{t('staffOnlyTitle')}</h1>
        <p className="text-muted">{t('staffOnly')}</p>
        <Link href="/app" className={buttonClasses('secondary')}>
          {t('backToConsole')}
        </Link>
      </main>
    );
  }

  const active = (href: string) =>
    href === '/ops' ? pathname === '/ops' : pathname.startsWith(href);
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[248px_1fr]">
      <a
        href="#main"
        className="sr-only z-[90] rounded-input bg-primary px-4 py-3 text-on-primary focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {tc('skipToContent')}
      </a>
      <aside className="no-print sticky top-0 hidden h-dvh flex-col border-r border-border bg-surface md:flex">
        <div className="flex min-h-16 flex-col justify-center border-b border-border px-5">
          <span className="text-xl font-semibold text-primary">{tc('appName')}</span>
          <span className="text-xs text-muted">{t('title')}</span>
        </div>
        <nav aria-label={t('title')} className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
          {ITEMS.map(({ key, href, icon: Icon }) => (
            <Link
              key={key}
              href={href}
              aria-current={active(href) ? 'page' : undefined}
              className={cn(
                'flex min-h-11 items-center gap-3 rounded-input px-3 font-medium',
                active(href) ? 'bg-primary/10 text-primary' : 'hover:bg-ink/5',
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
              {t(`nav.${key}`)}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col gap-2 border-t border-border p-3">
          <p className="truncate px-1 text-sm text-muted">
            {user.name} · {t(`role.${user.staffRole ?? 'support'}`)}
          </p>
          <LanguageChip />
        </div>
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="no-print sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
          <div className="flex min-h-14 items-center justify-between gap-2 px-3 md:px-6">
            <span className="font-semibold md:hidden">{t('title')}</span>
            <span className="hidden text-sm text-muted md:block">{user.name}</span>
            <div className="flex items-center gap-1">
              <SyncIndicator />
              <span className="md:hidden">
                <LanguageChip />
              </span>
              <Link
                href="/app"
                className="inline-flex min-h-10 items-center px-2 text-sm font-semibold text-primary"
              >
                {t('backToConsole')}
              </Link>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await getRepository().signOut();
                  router.replace('/login');
                }}
              >
                {tn('signOut')}
              </Button>
            </div>
          </div>
          <nav aria-label={t('title')} className="flex gap-1 overflow-x-auto px-2 pb-2 md:hidden">
            {ITEMS.map(({ key, href }) => (
              <Link
                key={key}
                href={href}
                aria-current={active(href) ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm font-medium',
                  active(href) ? 'bg-primary text-on-primary' : 'bg-ink/6',
                )}
              >
                {t(`nav.${key}`)}
              </Link>
            ))}
          </nav>
        </header>
        <OfflineBanner />
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-16 outline-none md:px-8 md:pt-6"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
