'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, ContactRound, MessageSquareText, Package, Send } from 'lucide-react';
import type { WeddingEvent } from '@harusi/api-client';
import type { Locale } from '@harusi/i18n';
import { PageHeader } from '@/components/console/page-header';
import { buttonClasses } from '@/components/ui/button';
import { Banner, Card, EmptyState, KpiTile, Skeleton } from '@/components/ui/display';
import { getRepository } from '@/lib/repo';
import { qk } from '@/lib/queries';
import { formatDate, formatDateTimeShort, formatNumber } from '@/lib/format';
import {
  CampaignStatus,
  useCampaignError,
  useContacts,
  useSmsCampaigns,
  useTargetLabel,
} from './shared';

/** Fewer SMS than this left shows a "running low" banner. */
const LOW = 50;

/**
 * Muhtasari for an SMS-reminders-only customer (ADR 055): SMS left, contacts, what is scheduled next
 * and the latest sends, with the three things they come to do one tap away.
 */
export function SmsOverview({ event }: { event: WeddingEvent }) {
  const t = useTranslations('sms.overview');
  const tc = useTranslations('sms.contacts');
  const locale = useLocale() as Locale;
  const id = event.id;
  const base = `/app/e/${id}`;
  const billing = useQuery({
    queryKey: qk.billing(id),
    queryFn: () => getRepository().getBilling(id),
  });
  const contacts = useContacts(id);
  const campaigns = useSmsCampaigns(id);
  const targetLabel = useTargetLabel();
  const errorText = useCampaignError();

  const list = campaigns.data ?? [];
  const next = list
    .filter((c) => c.status === 'scheduled' && c.scheduledFor)
    .sort((a, b) => a.scheduledFor!.localeCompare(b.scheduledFor!))[0];
  const recent = list.filter((c) => c.status !== 'scheduled').slice(0, 3);
  const scheduledCount = list.filter((c) => c.status === 'scheduled').length;
  const b = billing.data;
  const contactCount = contacts.data?.length ?? 0;
  const withPhone = contacts.data?.filter((g) => g.phoneE164).length ?? 0;

  return (
    <>
      <PageHeader
        title={event.title}
        subtitle={t('eventOn', { date: formatDate(event.dateStart, locale) })}
        actions={
          <Link href={`${base}/sms/compose`} className={buttonClasses('primary')}>
            <Send className="size-5" aria-hidden="true" />
            {t('compose')}
          </Link>
        }
      />
      <div className="flex flex-col gap-4" data-testid="sms-overview">
        {b && b.enforced && b.remaining.messages < LOW ? (
          <Banner
            tone="warning"
            live="polite"
            action={
              <Link href={`${base}/billing`} className={buttonClasses('secondary', 'sm')}>
                {t('buy')}
              </Link>
            }
          >
            {t('lowCredits', { count: formatNumber(b.remaining.messages) })}
          </Banner>
        ) : null}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {b ? (
            <KpiTile
              label={t('credits')}
              icon={<Package className="size-4" />}
              tone={b.enforced && b.remaining.messages < LOW ? 'warning' : 'primary'}
              value={formatNumber(b.remaining.messages)}
              sub={t('creditsSub', { used: formatNumber(b.used.messages) })}
            />
          ) : (
            <Skeleton className="h-24" />
          )}
          {contacts.data ? (
            <KpiTile
              label={t('contacts')}
              icon={<ContactRound className="size-4" />}
              value={formatNumber(contactCount)}
              sub={
                contactCount !== withPhone
                  ? tc('subtitle', { count: contactCount, withPhone: formatNumber(withPhone) })
                  : undefined
              }
            />
          ) : (
            <Skeleton className="h-24" />
          )}
          {b ? (
            <KpiTile
              label={t('sent30')}
              icon={<MessageSquareText className="size-4" />}
              value={formatNumber(b.used.messages)}
            />
          ) : (
            <Skeleton className="h-24" />
          )}
          <KpiTile
            label={t('scheduled')}
            icon={<CalendarClock className="size-4" />}
            value={campaigns.data ? formatNumber(scheduledCount) : '—'}
          />
        </div>

        {contacts.data && contactCount === 0 ? (
          <Card>
            <EmptyState
              icon={<ContactRound className="size-7" />}
              title={t('noContacts')}
              action={
                <Link href={`${base}/sms/contacts`} className={buttonClasses('primary')}>
                  {t('addContacts')}
                </Link>
              }
            />
          </Card>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card title={t('nextTitle')} titleId="sms-next">
            {next ? (
              <div className="flex flex-col gap-2">
                <p className="flex items-center gap-2 font-semibold">
                  <CalendarClock className="size-5 text-primary" aria-hidden="true" />
                  {formatDateTimeShort(next.scheduledFor!, locale)}
                </p>
                <p className="line-clamp-3 whitespace-pre-line">{next.body}</p>
                <p className="text-sm text-muted">{targetLabel(next.target)}</p>
              </div>
            ) : (
              <p className="text-muted">{t('nextNone')}</p>
            )}
          </Card>
          <Card
            title={t('recent')}
            titleId="sms-recent"
            action={
              list.length ? (
                <Link
                  href={`${base}/sms/history`}
                  className="min-h-11 content-center text-sm font-semibold text-primary"
                >
                  {t('seeAll')}
                </Link>
              ) : null
            }
          >
            {campaigns.isPending ? (
              <Skeleton lines={3} />
            ) : recent.length === 0 ? (
              <p className="text-muted">{t('nextNone')}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {recent.map((c) => (
                  <li key={c.id} className="flex flex-col gap-1 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-muted">
                        {formatDateTimeShort(c.finishedAt ?? c.createdAt, locale)}
                      </span>
                      <CampaignStatus c={c} />
                    </div>
                    <p className="line-clamp-2">{c.body}</p>
                    {errorText(c) ? <p className="text-sm text-danger">{errorText(c)}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={`${base}/sms/contacts`} className={buttonClasses('secondary')}>
            <ContactRound className="size-5" aria-hidden="true" />
            {t('addContacts')}
          </Link>
          <Link href={`${base}/billing`} className={buttonClasses('secondary')}>
            <Package className="size-5" aria-hidden="true" />
            {t('buy')}
          </Link>
        </div>
      </div>
    </>
  );
}
