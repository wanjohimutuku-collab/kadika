'use client';

import { use } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  CopyX,
  DoorOpen,
  Eye,
  HandCoins,
  MapPin,
  MessageSquareWarning,
  Send,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import type { Activity, WeddingEvent } from '@harusi/api-client';
import type { Locale } from '@harusi/i18n';
import { QueryState } from '@/components/console/query-state';
import { buttonClasses } from '@/components/ui/button';
import { Card, KpiTile, ProgressBar, Skeleton } from '@/components/ui/display';
import { FunnelBar } from '@/components/ui/data';
import { getRepository } from '@/lib/repo';
import { qk, useEvent, useSession, useEventCurrency } from '@/lib/queries';
import {
  formatDate,
  formatRelative,
  formatTime,
  formatMoney,
  formatMoneyCompact,
} from '@/lib/format';
import { daysUntil } from '@/lib/dates';
import { cn } from '@/lib/cn';

type NextKey = 'import' | 'failed' | 'send' | 'remind' | 'pledges' | 'gate' | 'done';

function nextStep(e: WeddingEvent, days: number): { key: NextKey; count: number; href: string } {
  const s = e.stats;
  const base = `/app/e/${e.id}`;
  const unsent = s.invited - s.sent;
  const noReply = s.sent - s.confirmed - s.declined;

  if (s.invited === 0) return { key: 'import', count: 0, href: `${base}/guests/import` };
  if (s.failedMessages > 0)
    return { key: 'failed', count: s.failedMessages, href: `${base}/guests?filter=failed` };
  if (unsent > 0) return { key: 'send', count: unsent, href: `${base}/send` };
  if (noReply > 0 && days <= 21 && days >= 0)
    return { key: 'remind', count: noReply, href: `${base}/send?kind=reminder` };
  if (s.guestsWithBalance > 0 && days >= 0)
    return { key: 'pledges', count: s.guestsWithBalance, href: `${base}/pledges?tab=unpaid` };
  if (days >= 0 && days <= 7) return { key: 'gate', count: 0, href: `${base}/gate` };
  return { key: 'done', count: 0, href: `${base}/reports` };
}

const ACT_ICON: Record<Activity['kind'], React.ReactNode> = {
  rsvp_yes: <CheckCircle2 className="size-5 text-success" aria-hidden="true" />,
  rsvp_no: <XCircle className="size-5 text-muted" aria-hidden="true" />,
  opened: <Eye className="size-5 text-primary" aria-hidden="true" />,
  payment: <CircleDollarSign className="size-5 text-success" aria-hidden="true" />,
  message_failed: <MessageSquareWarning className="size-5 text-danger" aria-hidden="true" />,
  checked_in: <DoorOpen className="size-5 text-success" aria-hidden="true" />,
  duplicate_scan: <CopyX className="size-5 text-warning" aria-hidden="true" />,
  guest_added: <UserPlus className="size-5 text-primary" aria-hidden="true" />,
  import: <UserPlus className="size-5 text-primary" aria-hidden="true" />,
  send: <Send className="size-5 text-primary" aria-hidden="true" />,
};

export default function OverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('overview');
  const ts = useTranslations('status');
  const locale = useLocale() as Locale;
  const event = useEvent(id);
  const cur = useEventCurrency(id);
  const session = useSession();
  const activity = useQuery({
    queryKey: qk.activity(id),
    queryFn: () => getRepository().listActivity(id, 12),
  });
  const gate = useQuery({
    queryKey: qk.gate(id),
    queryFn: () => getRepository().getGateOverview(id),
  });

  return (
    <QueryState
      query={event}
      skeleton={
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-2/3" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-48" />
        </div>
      }
    >
      {(e) => {
        const days = daysUntil(e.dateStart);
        const s = e.stats;
        const next = nextStep(e, days);
        const pledgePct =
          e.contributionTargetTzs > 0 ? s.collectedTzs / e.contributionTargetTzs : 0;
        const deadlineDays = e.rsvpDeadline ? daysUntil(e.rsvpDeadline) : null;
        const alerts: { key: string; tone: 'danger' | 'warning'; text: string; href: string }[] =
          [];
        if (s.failedMessages > 0)
          alerts.push({
            key: 'failed',
            tone: 'danger',
            text: t('alertFailed', { count: s.failedMessages }),
            href: `/app/e/${id}/guests?filter=failed`,
          });
        if ((gate.data?.duplicates ?? 0) > 0)
          alerts.push({
            key: 'dup',
            tone: 'warning',
            text: t('alertDuplicates', { count: gate.data!.duplicates }),
            href: `/app/e/${id}/gate`,
          });
        if (
          s.guestsWithBalance > 0 &&
          deadlineDays !== null &&
          deadlineDays >= 0 &&
          deadlineDays <= 7
        )
          alerts.push({
            key: 'unpaid',
            tone: 'warning',
            text: t('alertUnpaid', { count: s.guestsWithBalance }),
            href: `/app/e/${id}/pledges?tab=unpaid`,
          });
        const funnelBase = `/app/e/${id}/guests`;
        return (
          <div className="flex flex-col gap-5" data-testid="overview">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-3xl font-semibold md:text-4xl">{e.coupleNames}</h1>
                <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="size-4" aria-hidden="true" />
                    {formatDate(e.dateStart, locale)} · {formatTime(e.dateStart, locale)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-4" aria-hidden="true" />
                    {e.venueName}
                  </span>
                </p>
              </div>
              {days >= 0 ? (
                <span
                  className="rounded-full bg-primary px-3 py-1.5 font-semibold text-on-primary"
                  data-testid="countdown"
                >
                  {t('countdown', { days })}
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <KpiTile
                label={t('kpiInvited')}
                value={s.invited}
                icon={<Users className="size-4" />}
              />
              <KpiTile
                label={t('kpiConfirmed')}
                value={s.confirmed}
                sub={t('kpiPeople', { count: s.headcountConfirmed })}
                tone="success"
                icon={<CheckCircle2 className="size-4" />}
              />
              <KpiTile
                label={t('kpiAttended')}
                value={s.attended}
                sub={t('kpiPeople', { count: s.headcountAttended })}
                icon={<DoorOpen className="size-4" />}
              />
              {session.data?.role !== 'gate' ? (
                <KpiTile
                  label={t('kpiPledges')}
                  value={formatMoneyCompact(s.collectedTzs, cur)}
                  sub={
                    e.contributionTargetTzs
                      ? t('kpiOfTarget', {
                          target: formatMoneyCompact(e.contributionTargetTzs, cur),
                        })
                      : undefined
                  }
                  icon={<HandCoins className="size-4" />}
                />
              ) : null}
            </div>

            <Link
              href={next.href}
              className="group flex items-center gap-4 rounded-card border-2 border-primary bg-primary/6 p-4 hover:bg-primary/10"
              data-testid="next-step"
            >
              <span
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary"
                aria-hidden="true"
              >
                <ArrowRight className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-primary">{t('nextStep')}</span>
                <span className="block text-lg font-semibold">
                  {t(`next.${next.key}`, { count: next.count })}
                </span>
              </span>
              <span className="hidden shrink-0 sm:block">
                <span className={buttonClasses('primary', 'sm')}>
                  {t(`nextAction.${next.key}`)}
                </span>
              </span>
            </Link>

            {alerts.length ? (
              <section aria-labelledby="alerts-h" className="flex flex-col gap-2">
                <h2 id="alerts-h" className="sr-only">
                  {t('alerts')}
                </h2>
                {alerts.map((a) => (
                  <Link
                    key={a.key}
                    href={a.href}
                    className={cn(
                      'flex min-h-12 items-center gap-3 rounded-card border p-3 font-medium',
                      a.tone === 'danger'
                        ? 'border-danger/30 bg-danger/6'
                        : 'border-warning/40 bg-warning/10',
                    )}
                  >
                    <AlertTriangle
                      className={cn(
                        'size-5 shrink-0',
                        a.tone === 'danger' ? 'text-danger' : 'text-warning',
                      )}
                      aria-hidden="true"
                    />
                    <span className="flex-1">{a.text}</span>
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                ))}
              </section>
            ) : null}

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
              <Card title={t('funnelTitle')} titleId="funnel-h">
                <FunnelBar
                  caption={t('funnelTitle')}
                  stages={[
                    {
                      key: 'created',
                      label: t('funnel.created'),
                      count: s.invited,
                      href: funnelBase,
                    },
                    {
                      key: 'sent',
                      label: t('funnel.sent'),
                      count: s.sent,
                      href: `${funnelBase}?filter=unsent`,
                    },
                    {
                      key: 'delivered',
                      label: t('funnel.delivered'),
                      count: s.delivered,
                      href: `${funnelBase}?filter=no_reply`,
                    },
                    {
                      key: 'opened',
                      label: t('funnel.opened'),
                      count: s.opened,
                      href: `${funnelBase}?filter=no_reply`,
                    },
                    {
                      key: 'confirmed',
                      label: t('funnel.confirmed'),
                      count: s.confirmed,
                      href: `${funnelBase}?filter=confirmed`,
                    },
                    {
                      key: 'checked_in',
                      label: t('funnel.checked_in'),
                      count: s.attended,
                      href: `${funnelBase}?filter=checked_in`,
                    },
                  ]}
                  renderLink={(stage, children) => (
                    <Link href={stage.href!} className="block rounded-input p-1 hover:bg-bg">
                      {children}
                    </Link>
                  )}
                />
                <ul className="sr-only">
                  <li>
                    {ts('declined')}: {s.declined}
                  </li>
                </ul>
                {e.contributionTargetTzs > 0 && session.data?.role !== 'gate' ? (
                  <div className="mt-5 flex flex-col gap-2">
                    <p className="flex justify-between text-sm font-semibold">
                      <span>
                        {t('pledgeProgress', {
                          collected: formatMoneyCompact(s.collectedTzs, cur),
                          target: formatMoneyCompact(e.contributionTargetTzs, cur),
                        })}
                      </span>
                      <span className="tabular">{Math.round(pledgePct * 100)}%</span>
                    </p>
                    <ProgressBar
                      value={pledgePct}
                      label={t('kpiPledges')}
                      valueText={`${formatMoney(s.collectedTzs, cur)} / ${formatMoney(e.contributionTargetTzs, cur)}`}
                      tone="accent"
                    />
                  </div>
                ) : null}
              </Card>

              <Card title={t('activity')} titleId="act-h">
                <QueryState
                  query={activity}
                  skeleton={<Skeleton lines={6} />}
                  isEmpty={(d) => d.length === 0}
                  empty={<p className="text-muted">{t('activityEmpty')}</p>}
                >
                  {(items) => (
                    <ul className="flex flex-col divide-y divide-border" data-testid="activity">
                      {items.map((a) => (
                        <li key={a.id} className="flex items-start gap-3 py-2.5">
                          <span className="mt-0.5">{ACT_ICON[a.kind]}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block">
                              {t(`act.${a.kind}`, {
                                name: a.guestName ?? '',
                                count: a.count ?? 1,
                                amount: formatMoney(a.amountTzs ?? 0, cur),
                              })}
                            </span>
                            <span className="text-sm text-muted">
                              {formatRelative(a.at, locale)}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </QueryState>
              </Card>
            </div>
          </div>
        );
      }}
    </QueryState>
  );
}
