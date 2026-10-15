'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  CalendarHeart,
  CheckCircle2,
  HandCoins,
  MessageSquare,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type { Locale } from '@harusi/i18n';
import { QueryState } from '@/components/console/query-state';
import { OpsPage } from '@/components/ops/ops-ui';
import { BarChart } from '@/components/ui/data';
import { Banner, Card, KpiTile, Skeleton } from '@/components/ui/display';
import { getRepository } from '@/lib/repo';
import { qk } from '@/lib/queries';
import { formatDateShort, formatNumber, formatTzs, formatTzsCompact } from '@/lib/format';

export default function OpsOverviewPage() {
  const t = useTranslations('ops');
  const locale = useLocale() as Locale;
  const overview = useQuery({
    queryKey: qk.ops('overview'),
    queryFn: () => getRepository().opsOverview(),
  });
  return (
    <OpsPage title={t('nav.overview')}>
      <QueryState
        query={overview}
        skeleton={
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        }
      >
        {(o) => {
          const attention: {
            key: string;
            text: string;
            href: string;
            tone: 'warning' | 'danger';
          }[] = [];
          if (o.openDataRequests)
            attention.push({
              key: 'req',
              text: t('overview.attentionRequests', { count: o.openDataRequests }),
              href: '/ops/requests',
              tone: 'warning',
            });
          if (o.failureRate30d > 0.05)
            attention.push({
              key: 'fail',
              text: t('overview.attentionFailures', { pct: Math.round(o.failureRate30d * 100) }),
              href: '/ops/usage',
              tone: 'danger',
            });
          if (o.suspendedOrganizers)
            attention.push({
              key: 'sus',
              text: t('overview.attentionSuspended', { count: o.suspendedOrganizers }),
              href: '/ops/organizers',
              tone: 'warning',
            });
          return (
            <div className="flex flex-col gap-5" data-testid="ops-overview">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <KpiTile
                  label={t('overview.organizers')}
                  value={o.organizers}
                  sub={`${t('overview.newOrganizers')}: ${o.newOrganizers30d}`}
                  icon={<Users className="size-4" />}
                />
                <KpiTile
                  label={t('overview.events')}
                  value={o.events.total}
                  sub={t('overview.eventsBreakdown', {
                    active: o.events.active,
                    completed: o.events.completed,
                    draft: o.events.draft,
                  })}
                  icon={<CalendarHeart className="size-4" />}
                />
                <KpiTile label={t('overview.guests')} value={formatNumber(o.guests)} />
                <KpiTile
                  label={t('overview.paidPlans')}
                  value={o.paidPlans}
                  tone="success"
                  icon={<CheckCircle2 className="size-4" />}
                />
                <KpiTile
                  label={t('overview.messages')}
                  value={formatNumber(o.messages30d.total)}
                  sub={t('overview.messagesBreakdown', {
                    whatsapp: o.messages30d.whatsapp,
                    sms: o.messages30d.sms,
                  })}
                  icon={<MessageSquare className="size-4" />}
                />
                <KpiTile
                  label={t('overview.failureRate')}
                  value={`${(o.failureRate30d * 100).toFixed(1)}%`}
                  tone={o.failureRate30d > 0.05 ? 'danger' : 'neutral'}
                  sub={`${o.messages30d.failed} / ${o.messages30d.total}`}
                />
                <KpiTile label={t('overview.smsCost')} value={formatTzs(o.smsCost30d)} />
                <KpiTile
                  label={t('overview.contributions')}
                  value={formatTzsCompact(o.contributions30d.amount)}
                  sub={t('overview.contributionsCount', { count: o.contributions30d.count })}
                  icon={<HandCoins className="size-4" />}
                />
              </div>

              <Card title={t('overview.attention')} titleId="att-h">
                {attention.length ? (
                  <ul className="flex flex-col gap-2">
                    {attention.map((a) => (
                      <li key={a.key}>
                        <Link
                          href={a.href}
                          className="flex min-h-12 items-center gap-3 rounded-card border border-border p-3 font-medium hover:bg-bg"
                        >
                          <AlertTriangle
                            className={
                              a.tone === 'danger' ? 'size-5 text-danger' : 'size-5 text-warning'
                            }
                            aria-hidden="true"
                          />
                          <span className="flex-1">{a.text}</span>
                          <ArrowRight className="size-4" aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Banner tone="success">{t('overview.allClear')}</Banner>
                )}
              </Card>

              <Card title={t('overview.messagesChart')} titleId="mc-h">
                {o.messagesByDay.length ? (
                  <BarChart
                    hideCaption
                    caption={t('overview.messagesChart')}
                    data={o.messagesByDay.slice(-14).map((d) => ({
                      label: formatDateShort(`${d.day}T09:00:00Z`, locale)
                        .split(' ')
                        .slice(0, 2)
                        .join(' '),
                      value: d.sent + d.failed,
                    }))}
                  />
                ) : null}
              </Card>
              <p className="flex items-center gap-2 text-sm text-muted">
                <ShieldCheck className="size-4" aria-hidden="true" />
                {t('audit.intro')}
              </p>
            </div>
          );
        }}
      </QueryState>
    </OpsPage>
  );
}
