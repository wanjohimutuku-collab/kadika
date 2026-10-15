'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { CalendarHeart, MapPin, Plus } from 'lucide-react';
import type { Locale } from '@harusi/i18n';
import { ConsoleShell } from '@/components/console/shell';
import { PageHeader } from '@/components/console/page-header';
import { QueryState } from '@/components/console/query-state';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState, Skeleton, StatusPill } from '@/components/ui/display';
import { useEvents } from '@/lib/queries';
import { formatDate, formatMoneyCompact } from '@/lib/format';
import { daysUntil } from '@/lib/dates';
import { themeStyle } from '@/lib/theme';

export default function EventsPage() {
  const t = useTranslations('events');
  const locale = useLocale() as Locale;
  const events = useEvents();
  const newBtn = (
    <Link href="/app/events/new" className={buttonClasses('primary')}>
      <Plus className="size-5" aria-hidden="true" />
      {t('new')}
    </Link>
  );
  return (
    <ConsoleShell>
      <PageHeader title={t('title')} actions={newBtn} />
      <QueryState
        query={events}
        skeleton={
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Skeleton className="h-52" />
            <Skeleton className="h-52" />
          </div>
        }
        isEmpty={(d) => d.length === 0}
        empty={
          <EmptyState
            icon={<CalendarHeart className="size-7" />}
            title={t('empty')}
            action={newBtn}
          />
        }
      >
        {(list) => (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2" data-testid="event-list">
            {list.map((e) => {
              const days = daysUntil(e.dateStart);
              return (
                <li key={e.id}>
                  <Link
                    href={`/app/e/${e.id}`}
                    aria-label={t('open', { name: e.coupleNames })}
                    className="group flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface transition-shadow hover:shadow-md"
                    style={themeStyle(e.themeId, e.palette)}
                  >
                    <div
                      className="flex items-start justify-between gap-3 p-4 text-on-primary"
                      style={{ background: e.coverGradient || 'var(--hp-primary)' }}
                    >
                      <div>
                        <p className="text-3xl font-semibold">{e.coupleNames}</p>
                        <p className="mt-1 opacity-95">{formatDate(e.dateStart, locale)}</p>
                      </div>
                      <span className="rounded-full bg-white/90 px-2.5 py-1 text-sm font-semibold whitespace-nowrap text-ink">
                        {days >= 0 ? t('daysLeft', { days }) : t('daysAgo', { days: -days })}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col gap-3 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5 text-muted">
                          <MapPin className="size-4 shrink-0" aria-hidden="true" />
                          <span className="truncate">{e.venueName}</span>
                        </span>
                        <StatusPill
                          tone={
                            e.status === 'active'
                              ? 'success'
                              : e.status === 'completed'
                                ? 'info'
                                : 'neutral'
                          }
                        >
                          {t(`statusPill.${e.status}`)}
                        </StatusPill>
                      </div>
                      <dl className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-input bg-bg p-2">
                          <dt className="text-xs text-muted">{t('statInvited')}</dt>
                          <dd className="tabular text-lg font-bold">{e.stats.invited}</dd>
                        </div>
                        <div className="rounded-input bg-bg p-2">
                          <dt className="text-xs text-muted">{t('statConfirmed')}</dt>
                          <dd className="tabular text-lg font-bold">{e.stats.confirmed}</dd>
                        </div>
                        <div className="rounded-input bg-bg p-2">
                          <dt className="text-xs text-muted">{t('statCollected')}</dt>
                          <dd className="tabular text-lg font-bold">
                            {formatMoneyCompact(e.stats.collected, e.currency).replace(
                              `${e.currency} `,
                              '',
                            )}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </QueryState>
    </ConsoleShell>
  );
}
