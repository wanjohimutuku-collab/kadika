'use client';

import { BrandMark } from '@/components/brand/brand-provider';
import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { DropdownMenu } from 'radix-ui';
import {
  BarChart3,
  ChevronDown,
  CircleUserRound,
  CloudOff,
  Cloud,
  CreditCard,
  HandCoins,
  Images,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  ShieldCheck,
  Plus,
  RefreshCw,
  ScanLine,
  Send,
  Settings,
  Users,
  UsersRound,
  Wallet,
} from 'lucide-react';
import type { WeddingEvent } from '@harusi/api-client';
import { cn } from '@/lib/cn';
import { getMock, getRepository } from '@/lib/repo';
import { useNetworkStatus } from '@/lib/use-mock-controls';
import { useEvents, useSession } from '@/lib/queries';
import { LanguageChip } from '@/components/ui/language-chip';
import { BottomSheet } from '@/components/ui/overlay';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { Avatar } from '@/components/ui/display';
import { formatRelative } from '@/lib/format';
import type { Locale } from '@harusi/i18n';

type NavKey =
  | 'overview'
  | 'guests'
  | 'send'
  | 'gate'
  | 'pledges'
  | 'cards'
  | 'album'
  | 'team'
  | 'reports'
  | 'billing'
  | 'settings';

interface NavItem {
  key: NavKey;
  href: string;
  icon: ReactNode;
  ownerOnly?: boolean;
}

export function navItems(eventId: string): { primary: NavItem[]; secondary: NavItem[] } {
  const base = `/app/e/${eventId}`;
  const i = 'size-6';
  return {
    primary: [
      { key: 'overview', href: base, icon: <LayoutDashboard className={i} aria-hidden="true" /> },
      { key: 'guests', href: `${base}/guests`, icon: <Users className={i} aria-hidden="true" /> },
      { key: 'send', href: `${base}/send`, icon: <Send className={i} aria-hidden="true" /> },
      { key: 'gate', href: `${base}/gate`, icon: <ScanLine className={i} aria-hidden="true" /> },
      {
        key: 'pledges',
        href: `${base}/pledges`,
        icon: <HandCoins className={i} aria-hidden="true" />,
      },
    ],
    secondary: [
      {
        key: 'cards',
        href: `${base}/cards`,
        icon: <CreditCard className={i} aria-hidden="true" />,
      },
      // ADR 050: the temporary photo album; owner and committee add and remove photos.
      {
        key: 'album',
        href: `${base}/album`,
        icon: <Images className={i} aria-hidden="true" />,
      },
      // §17.3: committee members do not manage members or event settings.
      {
        key: 'team',
        href: `${base}/team`,
        icon: <UsersRound className={i} aria-hidden="true" />,
        ownerOnly: true,
      },
      {
        key: 'reports',
        href: `${base}/reports`,
        icon: <BarChart3 className={i} aria-hidden="true" />,
      },
      // ADR 042: the owner buys card bundles and message packs here.
      {
        key: 'billing',
        href: `${base}/billing`,
        icon: <Wallet className={i} aria-hidden="true" />,
        ownerOnly: true,
      },
      {
        key: 'settings',
        href: `${base}/settings`,
        icon: <Settings className={i} aria-hidden="true" />,
        ownerOnly: true,
      },
    ],
  };
}

function isActive(pathname: string, href: string, exact: boolean): boolean {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function SyncIndicator() {
  const t = useTranslations('states');
  const tn = useTranslations('nav');
  const tc = useTranslations('common');
  const locale = useLocale() as Locale;
  const net = useNetworkStatus();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const pendingItems = getMock()?.controls.get().pending ?? [];
  const label = !net.online
    ? t('offline')
    : net.pending
      ? t('syncPending', { n: net.pending })
      : t('synced');
  const sync = async () => {
    const mock = getMock();
    if (!mock) return;
    setSyncing(true);
    try {
      const r = await mock.syncNow();
      toast({ tone: 'success', title: tn('syncedToast', { count: r.synced }) });
      await queryClient.invalidateQueries();
    } catch {
      toast({ tone: 'error', title: tn('syncFailed') });
    } finally {
      setSyncing(false);
    }
  };
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex min-h-10 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium',
          !net.online
            ? 'bg-ink text-white'
            : net.pending
              ? 'bg-warning/15 text-ink'
              : 'text-muted hover:bg-ink/6',
        )}
        aria-label={label}
        data-testid="sync-indicator"
      >
        {net.online ? (
          <Cloud className="size-5" aria-hidden="true" />
        ) : (
          <CloudOff className="size-5" aria-hidden="true" />
        )}
        <span className="hidden sm:inline">{label}</span>
        {net.pending ? <span className="tabular sm:hidden">{net.pending}</span> : null}
      </button>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title={tn('syncSheetTitle')}
        description={
          net.lastSyncAt
            ? t('lastSync', { time: formatRelative(net.lastSyncAt, locale) })
            : undefined
        }
        closeLabel={tc('close')}
        footer={
          <Button
            onClick={sync}
            loading={syncing}
            disabled={!net.online}
            icon={<RefreshCw className="size-5" aria-hidden="true" />}
          >
            {t('syncNow')}
          </Button>
        }
      >
        {!net.online ? (
          <p className="mb-3 rounded-input bg-ink/6 p-3 text-sm">{t('offlineBanner')}</p>
        ) : null}
        {pendingItems.length ? (
          <>
            <p className="mb-2 font-semibold">{tn('syncQueued')}</p>
            <ul className="flex flex-col divide-y divide-border">
              {pendingItems.map((p) => (
                <li key={p.id} className="flex justify-between gap-2 py-2 text-sm">
                  <span>{p.label}</span>
                  <span className="text-muted">{formatRelative(p.at, locale)}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-muted">{tn('syncQueueEmpty')}</p>
        )}
      </BottomSheet>
    </>
  );
}

/** Slim persistent banner while offline (§17.10). */
export function OfflineBanner() {
  const t = useTranslations('states');
  const net = useNetworkStatus();
  if (net.online && !net.slow) return null;
  return (
    <div
      role="status"
      className={cn(
        'px-4 py-2 text-center text-sm font-medium',
        net.online ? 'bg-warning/15 text-ink' : 'bg-ink text-white',
      )}
      data-testid="offline-banner"
    >
      {net.online ? t('slowBanner') : t('offlineBanner')}
    </div>
  );
}

function EventSwitcher({ current }: { current?: WeddingEvent }) {
  const t = useTranslations('nav');
  const events = useEvents();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className="inline-flex min-h-12 min-w-0 max-w-[52vw] items-center gap-1.5 rounded-input px-2 text-left font-semibold hover:bg-ink/6 md:max-w-xs"
        aria-label={current ? t('currentEvent', { name: current.coupleNames }) : t('switchEvent')}
      >
        <span className="truncate text-lg">{current?.coupleNames ?? t('events')}</span>
        <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="fade-in z-50 min-w-64 rounded-card border border-border bg-surface p-1 shadow-lg"
        >
          <DropdownMenu.Label className="px-3 py-2 text-xs font-semibold tracking-wide text-muted uppercase">
            {t('switchEvent')}
          </DropdownMenu.Label>
          {(events.data ?? []).map((e) => (
            <DropdownMenu.Item key={e.id} asChild>
              <Link
                href={`/app/e/${e.id}`}
                className={cn(
                  'flex min-h-12 items-center rounded-input px-3 outline-none data-[highlighted]:bg-primary/8',
                  e.id === current?.id && 'font-semibold',
                )}
              >
                {e.coupleNames}
              </Link>
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item asChild>
            <Link
              href="/app"
              className="flex min-h-12 items-center rounded-input px-3 outline-none data-[highlighted]:bg-primary/8"
            >
              {t('events')}
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link
              href="/app/events/new"
              className="flex min-h-12 items-center gap-2 rounded-input px-3 font-semibold text-primary outline-none data-[highlighted]:bg-primary/8"
            >
              <Plus className="size-4" aria-hidden="true" />
              {t('newEvent')}
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function UserMenu() {
  const t = useTranslations('nav');
  const session = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const name = session.data?.user.name || session.data?.user.phoneE164 || '';
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className="inline-flex size-12 items-center justify-center rounded-full hover:bg-ink/6"
        aria-label={t('userMenu')}
      >
        {name ? (
          <Avatar name={name} size={34} />
        ) : (
          <CircleUserRound className="size-7" aria-hidden="true" />
        )}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="fade-in z-50 min-w-56 rounded-card border border-border bg-surface p-1 shadow-lg"
        >
          <div className="px-3 py-2">
            <p className="font-semibold">{name}</p>
            <p className="text-sm text-muted">
              {session.data?.role === 'committee' ? t('roleCommittee') : t('roleOwner')}
            </p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item asChild>
            <Link
              href="/app/account"
              className="flex min-h-12 items-center gap-2 rounded-input px-3 outline-none data-[highlighted]:bg-primary/8"
            >
              <CircleUserRound className="size-5" aria-hidden="true" />
              {t('account')}
            </Link>
          </DropdownMenu.Item>
          {session.data?.user.roleGlobal === 'admin' ? (
            <DropdownMenu.Item asChild>
              <Link
                href="/ops"
                className="flex min-h-12 items-center gap-2 rounded-input px-3 outline-none data-[highlighted]:bg-primary/8"
              >
                <ShieldCheck className="size-5" aria-hidden="true" />
                {t('opsLink')}
              </Link>
            </DropdownMenu.Item>
          ) : null}
          <DropdownMenu.Item
            onSelect={async () => {
              await getRepository().signOut();
              queryClient.clear();
              router.replace('/login');
            }}
            className="flex min-h-12 cursor-pointer items-center gap-2 rounded-input px-3 text-danger outline-none data-[highlighted]:bg-danger/8"
          >
            <LogOut className="size-5" aria-hidden="true" />
            {t('signOut')}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function ConsoleHeader({ event, onMore }: { event?: WeddingEvent; onMore?: () => void }) {
  const t = useTranslations('nav');
  return (
    <header className="no-print sticky top-0 z-30 flex min-h-16 items-center gap-1 border-b border-border bg-surface/95 px-2 backdrop-blur md:px-4">
      <Link href="/app" className="shrink-0 px-1 md:hidden" aria-label={t('events')}>
        <BrandMark logoOnly logoClassName="h-8 max-w-20" />
      </Link>
      <EventSwitcher current={event} />
      <div className="ml-auto flex items-center gap-1">
        <SyncIndicator />
        <span className="hidden sm:inline-flex">
          <LanguageChip />
        </span>
        {onMore ? (
          <button
            type="button"
            onClick={onMore}
            className="inline-flex min-h-12 flex-col items-center justify-center px-2 text-xs font-medium md:hidden"
            aria-haspopup="dialog"
          >
            <LayoutGrid className="size-5" aria-hidden="true" />
            {t('more')}
          </button>
        ) : null}
        <UserMenu />
      </div>
    </header>
  );
}

export function ConsoleShell({
  eventId,
  event,
  children,
}: {
  eventId?: string;
  event?: WeddingEvent;
  children: ReactNode;
}) {
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  const pathname = usePathname();
  const session = useSession();
  const [moreOpen, setMoreOpen] = useState(false);
  const isOwner = session.data?.role === 'owner';
  const nav = eventId ? navItems(eventId) : null;
  const visibleSecondary = nav?.secondary.filter((n) => isOwner || !n.ownerOnly) ?? [];
  const all = nav ? [...nav.primary, ...visibleSecondary] : [];

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[248px_1fr]">
      <a
        href="#main"
        className="sr-only z-[90] rounded-input bg-primary px-4 py-3 text-on-primary focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {tc('skipToContent')}
      </a>
      <aside className="no-print sticky top-0 hidden h-dvh flex-col border-r border-border bg-surface md:flex">
        <Link
          href="/app"
          className="flex min-h-16 items-center gap-2 border-b border-border px-5 text-xl"
        >
          <BrandMark />
        </Link>
        {nav ? (
          <nav
            aria-label={t('mainNav')}
            className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3"
          >
            {all.map((n, idx) => {
              const active = isActive(pathname, n.href, n.key === 'overview');
              return (
                <Link
                  key={n.key}
                  href={n.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-11 items-center gap-3 rounded-input px-3 font-medium',
                    active ? 'bg-primary/10 text-primary' : 'text-ink hover:bg-ink/5',
                    idx === nav.primary.length && 'mt-3',
                  )}
                >
                  {n.icon}
                  {t(n.key)}
                </Link>
              );
            })}
          </nav>
        ) : (
          <div className="flex-1" />
        )}
        <div className="border-t border-border p-3">
          <LanguageChip />
        </div>
      </aside>
      <div className="flex min-w-0 flex-col">
        <ConsoleHeader event={event} onMore={nav ? () => setMoreOpen(true) : undefined} />
        <OfflineBanner />
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-28 outline-none md:px-8 md:pt-6 md:pb-10"
        >
          {children}
        </main>
      </div>
      {nav ? (
        <nav
          aria-label={t('mainNav')}
          className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
        >
          <ul className="grid grid-cols-5">
            {nav.primary.map((n) => {
              const active = isActive(pathname, n.href, n.key === 'overview');
              return (
                <li key={n.key}>
                  <Link
                    href={n.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-medium',
                      active ? 'text-primary' : 'text-muted',
                    )}
                  >
                    {n.icon}
                    <span className="max-w-full truncate px-0.5">{t(n.key)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
      <BottomSheet
        open={moreOpen}
        onOpenChange={setMoreOpen}
        title={t('more')}
        closeLabel={tc('close')}
      >
        <ul className="grid grid-cols-2 gap-2">
          {[
            ...visibleSecondary,
            {
              key: 'account' as const,
              href: '/app/account',
              icon: <CircleUserRound className="size-6" aria-hidden="true" />,
            },
          ].map((n) => (
            <li key={n.key}>
              <Link
                href={n.href}
                onClick={() => setMoreOpen(false)}
                className="flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-card border border-border bg-surface font-medium hover:bg-bg"
              >
                {n.icon}
                {t(n.key)}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-center sm:hidden">
          <LanguageChip />
        </div>
      </BottomSheet>
    </div>
  );
}
