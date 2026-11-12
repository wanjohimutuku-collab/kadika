'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CreditCard, MessageSquareText } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * The first choice a new customer makes (ADR 055): invitation cards, or SMS reminders only. Each choice
 * leads to its own form; the SMS one creates an account with the smaller SMS console.
 */
export function ProductChooser({ current }: { current: 'cards' | 'sms' }) {
  const t = useTranslations('sms.chooser');
  const items = [
    {
      key: 'cards' as const,
      href: '/app/events/new',
      icon: <CreditCard className="size-6" aria-hidden="true" />,
      title: t('cards'),
      body: t('cardsBody'),
    },
    {
      key: 'sms' as const,
      href: '/app/events/new/sms',
      icon: <MessageSquareText className="size-6" aria-hidden="true" />,
      title: t('sms'),
      body: t('smsBody'),
    },
  ];
  return (
    <nav aria-label={t('title')} className="mb-5">
      <p className="mb-2 font-semibold">{t('title')}</p>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2" data-testid="product-chooser">
        {items.map((i) => {
          const active = i.key === current;
          return (
            <li key={i.key}>
              <Link
                href={i.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-full min-h-20 items-start gap-3 rounded-card border p-4 transition-colors',
                  active
                    ? 'border-primary bg-primary/8 ring-1 ring-primary'
                    : 'border-border bg-surface hover:bg-bg',
                )}
              >
                <span
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-full',
                    active ? 'bg-primary text-on-primary' : 'bg-primary/10 text-primary',
                  )}
                >
                  {i.icon}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 font-semibold">
                    {i.title}
                    {active ? (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-on-primary">
                        {t('current')}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted">{i.body}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
