'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { KeyRound, MessageSquare, Palette, Smartphone, WalletCards } from 'lucide-react';
import { NoPermission, OpsPage, useStaffCan } from '@/components/ops/ops-ui';
import { cn } from '@/lib/cn';

const TABS = [
  { key: 'branding', href: '/ops/settings/branding', icon: Palette },
  { key: 'messaging', href: '/ops/settings/messaging', icon: MessageSquare },
  { key: 'payments', href: '/ops/settings/payments', icon: WalletCards },
  { key: 'signin', href: '/ops/settings/signin', icon: KeyRound },
  { key: 'app', href: '/ops/settings/app', icon: Smartphone },
] as const;

/**
 * The Settings section of the staff panel (ADR 036): one title and a tab bar, with the active tab's page
 * below. Everything here holds the public brand or provider secrets, so it is admin staff only; other
 * staff see a refusal here and no menu entry.
 */
export function SettingsFrame({ children }: { children: ReactNode }) {
  const t = useTranslations('ops.settings');
  const pathname = usePathname();
  const canEdit = useStaffCan('settings');
  return (
    <OpsPage title={t('title')}>
      {canEdit ? (
        <>
          <nav
            aria-label={t('navLabel')}
            className="mb-5 flex gap-1 overflow-x-auto border-b border-border"
          >
            {TABS.map(({ key, href, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={key}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    '-mb-px inline-flex min-h-12 shrink-0 items-center gap-2 border-b-2 px-4 font-semibold',
                    active
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted hover:text-ink',
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {t(`tabs.${key}`)}
                </Link>
              );
            })}
          </nav>
          {children}
        </>
      ) : (
        <NoPermission text={t('noPermission')} />
      )}
    </OpsPage>
  );
}
