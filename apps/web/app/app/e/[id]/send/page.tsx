'use client';

import { Suspense, use, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Clock,
  FlaskConical,
  MessageCircle,
  MessageSquareText,
  Printer,
  RefreshCw,
  Send,
  Sparkles,
  XCircle,
} from 'lucide-react';
import {
  buildInviteSms,
  buildReminderSms,
  smsSegments,
  type SendJob,
  type SendRequest,
} from '@harusi/api-client';
import { eventKindLabel, type MessageChannel } from '@harusi/schemas';
import type { Locale } from '@harusi/i18n';
import { PageHeader } from '@/components/console/page-header';
import { QueryState } from '@/components/console/query-state';
import { Button } from '@/components/ui/button';
import { Banner, Card, KpiTile, ProgressBar, Skeleton } from '@/components/ui/display';
import { SegmentedControl, Switch } from '@/components/ui/navigation';
import { ConfirmSheet } from '@/components/ui/overlay';
import { TextField } from '@/components/ui/form';
import { useToast } from '@/components/ui/toast';
import { getRepository, newIdempotencyKey } from '@/lib/repo';
import { eventScopedKeys, qk, useEvent } from '@/lib/queries';
import { useNetworkStatus } from '@/lib/use-mock-controls';
import { formatDateShort, formatDateTimeShort, formatTzs, fromLocalInput } from '@/lib/format';
import { daysUntil } from '@/lib/dates';
import { SELECTED_GUESTS_KEY } from '@/lib/download';
import { APP_DOMAIN } from '@/lib/env';
import { cn } from '@/lib/cn';

type AudienceKind = 'unsent' | 'group' | 'selected' | 'all';
type Channel = 'auto' | MessageChannel;
type Kind = 'invite' | 'reminder';

const CHANNEL_ICON: Record<Channel, React.ReactNode> = {
  auto: <Sparkles className="size-5 text-primary" aria-hidden="true" />,
  whatsapp: <MessageCircle className="size-5 text-success" aria-hidden="true" />,
  sms: <MessageSquareText className="size-5 text-info" aria-hidden="true" />,
  print: <Printer className="size-5" aria-hidden="true" />,
};

function SendInner({ id }: { id: string }) {
  const t = useTranslations('send');
  const tch = useTranslations('channel');
  const tk = useTranslations('guestDetail.kind');
  const tc = useTranslations('common');
  const ts = useTranslations('states');
  const locale = useLocale() as Locale;
  const params = useSearchParams();
  const toast = useToast();
  const queryClient = useQueryClient();
  const net = useNetworkStatus();
  const event = useEvent(id);
  const groups = useQuery({
    queryKey: qk.groups(id),
    queryFn: () => getRepository().listGroups(id),
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [audience, setAudience] = useState<AudienceKind>(
    params.get('audience') === 'selected' ? 'selected' : 'unsent',
  );
  const [kind, setKind] = useState<Kind>(params.get('kind') === 'reminder' ? 'reminder' : 'invite');
  const [group, setGroup] = useState('');
  const [channel, setChannel] = useState<Channel>('auto');
  const [fallback, setFallback] = useState(true);
  const [when, setWhen] = useState<'now' | 'later'>('now');
  const [scheduleAt, setScheduleAt] = useState('');
  const [previewLang, setPreviewLang] = useState<Locale>(locale);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const idem = useRef(newIdempotencyKey());
  const progressRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    try {
      const ids = JSON.parse(sessionStorage.getItem(SELECTED_GUESTS_KEY) ?? '[]') as string[];
      setSelectedIds(ids);
    } catch {
      setSelectedIds([]);
    }
  }, []);

  const audienceReq: SendRequest['audience'] = useMemo(() => {
    if (audience === 'group') return { kind: 'group', group };
    if (audience === 'selected') return { kind: 'selected', guestIds: selectedIds };
    return { kind: audience };
  }, [audience, group, selectedIds]);

  const preview = useQuery({
    queryKey: ['send-preview', id, audienceReq, channel, fallback, kind],
    queryFn: () =>
      getRepository().previewSend(id, {
        audience: audienceReq,
        channel,
        whatsappFallbackToSms: fallback,
        kind,
      }),
    enabled: !(audience === 'group' && !group) && !(audience === 'selected' && !selectedIds.length),
  });
  const autoBreakdown = useQuery({
    queryKey: ['send-preview', id, audienceReq, 'auto', true, kind],
    queryFn: () =>
      getRepository().previewSend(id, {
        audience: audienceReq,
        channel: 'auto',
        whatsappFallbackToSms: true,
        kind,
      }),
    enabled: !(audience === 'group' && !group) && !(audience === 'selected' && !selectedIds.length),
  });

  const job = useQuery({
    queryKey: qk.job(jobId ?? 'none'),
    queryFn: () => getRepository().getSendJob(jobId!),
    enabled: !!jobId,
    refetchInterval: (q) =>
      (q.state.data as SendJob | undefined)?.status === 'done' ? false : 700,
  });
  useEffect(() => {
    if (job.data?.status === 'done')
      void Promise.all(
        eventScopedKeys(id).map((k) => queryClient.invalidateQueries({ queryKey: k })),
      );
  }, [job.data?.status, id, queryClient]);

  const send = useMutation({
    mutationFn: () =>
      getRepository().sendInvitations(id, {
        audience: audienceReq,
        channel,
        whatsappFallbackToSms: fallback,
        scheduleAt: when === 'later' && scheduleAt ? fromLocalInput(scheduleAt) : null,
        kind,
        idempotencyKey: idem.current,
      }),
    onSuccess: (j) => {
      setConfirmOpen(false);
      setJobId(j.id);
      idem.current = newIdempotencyKey();
      sessionStorage.removeItem(SELECTED_GUESTS_KEY);
      requestAnimationFrame(() => progressRef.current?.focus());
    },
    onError: (e) =>
      toast({
        tone: 'error',
        title: (e as { code?: string }).code === 'offline' ? t('offline') : ts('errorTitle'),
      }),
  });
  const retry = useMutation({
    mutationFn: () => getRepository().retryFailed(jobId!),
    onSuccess: (j) => setJobId(j.id),
    onError: () => toast({ tone: 'error', title: ts('errorTitle') }),
  });
  const test = useMutation({
    mutationFn: (c: 'whatsapp' | 'sms') => getRepository().sendTestMessage(id, c),
    onSuccess: (r) => toast({ tone: 'success', title: t('testSent', { to: r.to }) }),
    onError: () => toast({ tone: 'error', title: ts('errorTitle') }),
  });
  const reminders = useMutation({
    mutationFn: (r: { t14: boolean; t7: boolean; t1: boolean }) =>
      getRepository().updateEvent(id, { reminders: r }),
    onSuccess: async () => {
      toast({ tone: 'success', title: t('remindersSaved') });
      await queryClient.invalidateQueries({ queryKey: qk.event(id) });
    },
    onError: () => toast({ tone: 'error', title: ts('rolledBack') }),
  });

  return (
    <QueryState query={event} skeleton={<Skeleton className="h-96" />}>
      {(e) => {
        const host = typeof window === 'undefined' ? APP_DOMAIN : window.location.host;
        const shortLink = `${host}/s/KH-4826`;
        const dateText = formatDateShort(e.dateStart, previewLang);
        const smsText =
          kind === 'reminder'
            ? buildReminderSms({
                locale: previewLang,
                partnerA: e.partnerA,
                partnerB: e.partnerB,
                kind: e.eventKind,
                dateText,
                shortLink,
                code: 'KH-4826',
                daysLeft: Math.max(0, daysUntil(e.dateStart)),
              })
            : buildInviteSms({
                locale: previewLang,
                partnerA: e.partnerA,
                partnerB: e.partnerB,
                kind: e.eventKind,
                dateText,
                shortLink,
                code: 'KH-4826',
              });
        const segs = smsSegments(smsText);
        const p = preview.data;
        const counts = autoBreakdown.data?.byChannel ?? { whatsapp: 0, sms: 0, print: 0 };

        if (jobId && job.data) {
          const j = job.data;
          const done = j.status === 'done';
          const handled = j.counts.delivered + j.counts.failed;
          return (
            <section
              className="mx-auto flex max-w-2xl flex-col gap-4"
              aria-live="polite"
              data-testid="send-progress"
            >
              <h1
                ref={progressRef}
                tabIndex={-1}
                className="flex items-center gap-2 text-2xl font-semibold outline-none"
              >
                {j.status === 'scheduled' ? (
                  <Clock className="size-6 text-primary" aria-hidden="true" />
                ) : done ? (
                  <CheckCircle2 className="size-6 text-success" aria-hidden="true" />
                ) : (
                  <Send className="size-6 text-primary" aria-hidden="true" />
                )}
                {j.status === 'scheduled'
                  ? t('progressScheduled')
                  : done
                    ? t('progressDone')
                    : t('progressTitle')}
              </h1>
              {j.scheduledFor ? (
                <p>
                  {t('confirmScheduled', { date: formatDateTimeShort(j.scheduledFor, locale) })}
                </p>
              ) : null}
              <ProgressBar
                value={j.total ? handled / j.total : 0}
                label={t('progressTitle')}
                valueText={`${handled} / ${j.total}`}
                tone={j.counts.failed ? 'warning' : 'primary'}
              />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="send-counters">
                <KpiTile label={t('counters.queued')} value={j.counts.queued} />
                <KpiTile label={t('counters.sent')} value={j.counts.sent} />
                <KpiTile
                  label={t('counters.delivered')}
                  value={j.counts.delivered}
                  tone="success"
                  icon={<CheckCircle2 className="size-4" />}
                />
                <KpiTile
                  label={t('counters.failed')}
                  value={j.counts.failed}
                  tone="danger"
                  icon={<XCircle className="size-4" />}
                />
              </div>
              {done && j.failures.length ? (
                <Card
                  title={t('failures')}
                  titleId="fail-h"
                  action={
                    <Button
                      size="sm"
                      icon={<RefreshCw className="size-4" aria-hidden="true" />}
                      onClick={() => retry.mutate()}
                      loading={retry.isPending}
                      loadingLabel={t('retrying')}
                      data-testid="retry-failed"
                    >
                      {t('retryFailed')}
                    </Button>
                  }
                >
                  <p className="mb-2 text-sm">
                    {ts('partialFailure', { failed: j.failures.length, total: j.total })}
                  </p>
                  <ul className="flex max-h-72 flex-col divide-y divide-border overflow-y-auto">
                    {j.failures.map((f) => (
                      <li key={f.guestId} className="flex items-center justify-between gap-2 py-2">
                        <Link
                          href={`/app/e/${id}/guests/${f.guestId}`}
                          className="font-medium underline-offset-2 hover:underline"
                        >
                          {f.guestName}
                        </Link>
                        <span className="text-sm text-muted">
                          {tch(f.channel)} · {f.error}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}
              {done ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button variant="secondary" onClick={() => setJobId(null)}>
                    {t('newSend')}
                  </Button>
                  <Link
                    href={`/app/e/${id}`}
                    className="inline-flex min-h-12 items-center justify-center rounded-input px-4 font-semibold text-primary"
                  >
                    {tc('done')}
                  </Link>
                </div>
              ) : null}
            </section>
          );
        }

        const total = p?.total ?? 0;
        const canSend = total > 0 && net.online && !(when === 'later' && !scheduleAt);
        return (
          <div className="pb-24 md:pb-0">
            <PageHeader title={t('title')} />
            {!net.online ? (
              <Banner tone="offline" className="mb-4">
                {t('offline')}
              </Banner>
            ) : null}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.3fr_1fr]">
              <div className="flex flex-col gap-5">
                <Card>
                  <div className="flex flex-col gap-4">
                    <SegmentedControl<Kind>
                      label={t('title')}
                      value={kind}
                      onChange={setKind}
                      options={[
                        { value: 'invite', label: tk('invite') },
                        { value: 'reminder', label: tk('reminder') },
                      ]}
                    />
                    <div className="flex flex-col gap-2">
                      <h2 className="font-semibold">{t('audience')}</h2>
                      <SegmentedControl<AudienceKind>
                        label={t('audience')}
                        value={audience}
                        onChange={setAudience}
                        options={(['unsent', 'group', 'selected', 'all'] as const).map((a) => ({
                          value: a,
                          label: t(`audiences.${a}`),
                        }))}
                      />
                      {audience === 'group' ? (
                        <select
                          value={group}
                          onChange={(ev) => setGroup(ev.target.value)}
                          className="min-h-12 rounded-input border border-border bg-surface px-3"
                          aria-label={t('chooseGroup')}
                        >
                          <option value="">{t('chooseGroup')}</option>
                          {(groups.data ?? []).map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                        </select>
                      ) : null}
                      {audience === 'selected' ? (
                        <p className="text-sm text-muted">
                          {t('selectedCount', { count: selectedIds.length })}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </Card>

                <Card title={t('channel')} titleId="ch-h">
                  <div
                    className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                    role="radiogroup"
                    aria-labelledby="ch-h"
                  >
                    {(['auto', 'whatsapp', 'sms', 'print'] as const).map((c) => {
                      const n = c === 'auto' ? (autoBreakdown.data?.total ?? 0) : counts[c];
                      return (
                        <label
                          key={c}
                          className={cn(
                            'flex min-h-16 cursor-pointer items-start gap-3 rounded-card border-2 p-3',
                            channel === c ? 'border-primary bg-primary/5' : 'border-border',
                          )}
                        >
                          <input
                            type="radio"
                            name="channel"
                            className="mt-1 size-5 accent-[var(--hp-primary)]"
                            checked={channel === c}
                            onChange={() => setChannel(c)}
                          />
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="flex items-center gap-2 font-semibold">
                              {CHANNEL_ICON[c]}
                              {tch(c)}
                            </span>
                            <span className="text-sm text-muted">
                              {c === 'auto' ? t('channelAutoHelp') : t('recipients', { count: n })}
                            </span>
                          </span>
                          {c !== 'auto' ? <span className="tabular font-semibold">{n}</span> : null}
                        </label>
                      );
                    })}
                  </div>
                  <div className="mt-3 border-t border-border pt-3">
                    <Switch
                      checked={fallback}
                      onCheckedChange={setFallback}
                      label={t('fallback')}
                      description={t('fallbackHelp', { hours: e.whatsappFallbackHours })}
                    />
                  </div>
                </Card>

                <Card title={t('when')} titleId="when-h">
                  <SegmentedControl<'now' | 'later'>
                    label={t('when')}
                    value={when}
                    onChange={setWhen}
                    options={[
                      { value: 'now', label: t('now') },
                      { value: 'later', label: t('later') },
                    ]}
                  />
                  {when === 'later' ? (
                    <TextField
                      wrapperClassName="mt-3"
                      label={t('scheduleAt')}
                      type="datetime-local"
                      value={scheduleAt}
                      onChange={(ev) => setScheduleAt(ev.target.value)}
                    />
                  ) : null}
                </Card>

                <Card title={t('reminders')} titleId="rem-h">
                  <p className="mb-2 text-sm text-muted">{t('remindersHelp')}</p>
                  {(['t14', 't7', 't1'] as const).map((k) => (
                    <Switch
                      key={k}
                      checked={e.reminders[k]}
                      onCheckedChange={(v) => reminders.mutate({ ...e.reminders, [k]: v })}
                      label={t(`reminder.${k}`)}
                    />
                  ))}
                </Card>
              </div>

              <div className="flex flex-col gap-5">
                <Card title={t('preview')} titleId="pv-h">
                  <SegmentedControl<Locale>
                    label={t('previewLang')}
                    value={previewLang}
                    onChange={setPreviewLang}
                    options={[
                      { value: 'sw', label: 'Kiswahili' },
                      { value: 'en', label: 'English' },
                    ]}
                  />
                  <div className="mt-3 flex flex-col gap-3">
                    <div>
                      <p className="mb-1 text-sm font-semibold">{t('previewSms')}</p>
                      <p
                        className="rounded-2xl rounded-bl-sm bg-ink/6 p-3 text-sm"
                        lang={previewLang}
                        data-testid="sms-preview"
                      >
                        {smsText}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {smsText.length} · {t('smsSegments', { segments: segs.segments })} ·{' '}
                        {segs.encoding}
                      </p>
                    </div>
                    <div>
                      <p className="mb-1 text-sm font-semibold">{t('previewWhatsapp')}</p>
                      <p
                        className="rounded-2xl rounded-bl-sm bg-success/12 p-3 text-sm"
                        lang={previewLang}
                      >
                        {t('whatsappTemplate', {
                          guest: 'Asha',
                          couple: e.coupleNames,
                          kind: eventKindLabel(e.eventKind, previewLang),
                          date: dateText,
                          venue: e.venueName,
                          link: `${host}/c/…`,
                        })}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<FlaskConical className="size-4" aria-hidden="true" />}
                        onClick={() => test.mutate('whatsapp')}
                        loading={test.isPending}
                        disabled={!net.online}
                      >
                        {t('testSend')}
                      </Button>
                    </div>
                  </div>
                </Card>
                <Card>
                  {preview.isPending && preview.fetchStatus !== 'idle' ? (
                    <Skeleton lines={3} />
                  ) : p ? (
                    <div className="flex flex-col gap-1" data-testid="send-summary">
                      <p className="text-2xl font-bold">{t('recipients', { count: p.total })}</p>
                      <p className="text-sm text-muted">
                        WhatsApp {p.byChannel.whatsapp} · SMS {p.byChannel.sms} · {tch('print')}{' '}
                        {p.byChannel.print}
                      </p>
                      <p className="font-medium">
                        {t('smsCost', { cost: formatTzs(p.estimatedSmsCostTzs) })}
                      </p>
                      {p.withoutPhone ? (
                        <p className="text-sm text-muted">
                          {t('withoutPhone', { count: p.withoutPhone })}
                        </p>
                      ) : null}
                      {!p.total ? <p className="text-muted">{t('noRecipients')}</p> : null}
                    </div>
                  ) : (
                    <p className="text-muted">{t('noRecipients')}</p>
                  )}
                </Card>
              </div>
            </div>

            <div className="fixed inset-x-0 bottom-16 z-20 border-t border-border bg-surface p-3 md:static md:mt-5 md:border-0 md:bg-transparent md:p-0">
              <div className="mx-auto flex max-w-6xl justify-end">
                <Button
                  size="lg"
                  block
                  className="md:w-auto"
                  icon={
                    when === 'later' ? (
                      <Clock className="size-5" aria-hidden="true" />
                    ) : (
                      <Send className="size-5" aria-hidden="true" />
                    )
                  }
                  disabled={!canSend}
                  onClick={() => setConfirmOpen(true)}
                  data-testid="send-now"
                >
                  {when === 'later' ? t('schedule') : t('sendNow')} {total ? `(${total})` : ''}
                </Button>
              </div>
            </div>

            <ConfirmSheet
              open={confirmOpen}
              onOpenChange={setConfirmOpen}
              tone="primary"
              title={t('confirmTitle', { count: total })}
              consequence={
                <div className="flex flex-col gap-2">
                  <p>
                    {t('confirmBody', {
                      whatsapp: p?.byChannel.whatsapp ?? 0,
                      sms: p?.byChannel.sms ?? 0,
                      print: p?.byChannel.print ?? 0,
                      cost: formatTzs(p?.estimatedSmsCostTzs ?? 0),
                    })}
                  </p>
                  {when === 'later' && scheduleAt ? (
                    <p>
                      {t('confirmScheduled', {
                        date: formatDateTimeShort(fromLocalInput(scheduleAt), locale),
                      })}
                    </p>
                  ) : null}
                </div>
              }
              confirmLabel={when === 'later' ? t('schedule') : t('sendNow')}
              cancelLabel={tc('cancel')}
              closeLabel={tc('close')}
              loading={send.isPending}
              onConfirm={() => send.mutate()}
            />
          </div>
        );
      }}
    </QueryState>
  );
}

export default function SendPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense>
      <SendInner id={id} />
    </Suspense>
  );
}
