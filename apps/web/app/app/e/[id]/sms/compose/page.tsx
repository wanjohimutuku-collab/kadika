'use client';

import { use, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Send, Smartphone, X } from 'lucide-react';
import { isRepositoryError } from '@harusi/api-client';
import { renderTemplate, splitName, templatePlaceholders } from '@harusi/schemas/card-content';
import {
  SMS_CAMPAIGN_VARS,
  SMS_MAX_SEGMENTS,
  smsCampaignProblem,
  smsSegments,
  type SmsTarget,
} from '@harusi/schemas/sms';
import type { Locale } from '@harusi/i18n';
import { PageHeader } from '@/components/console/page-header';
import { TemplateVarChips } from '@/components/console/template-var-chips';
import { useQuotaToast } from '@/components/console/quota';
import { Button, buttonClasses } from '@/components/ui/button';
import { Banner, Card, Skeleton } from '@/components/ui/display';
import { Select, Textarea, TextField } from '@/components/ui/form';
import { SegmentedControl } from '@/components/ui/navigation';
import { ConfirmSheet } from '@/components/ui/overlay';
import { useToast } from '@/components/ui/toast';
import { getRepository } from '@/lib/repo';
import { qk, useEvent } from '@/lib/queries';
import {
  formatClock,
  formatDateShort,
  formatDateTimeShort,
  formatNumber,
  formatPhone,
  fromLocalInput,
} from '@/lib/format';
import { readDraft, readPicked, saveDraft, savePicked } from '@/components/sms/shared';

type To = 'all' | 'group' | 'picked';
type When = 'now' | 'later';

/**
 * Tuma SMS (ADR 055): the customer writes their own text, picks who gets it and when, sees how many
 * SMS it uses before sending, and confirms. One SMS part = one credit per contact.
 */
export default function SmsComposePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('sms.compose');
  const te = useTranslations('sms.errors');
  const tc = useTranslations('common');
  const ts = useTranslations('states');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const toast = useToast();
  const quota = useQuotaToast(id);
  const queryClient = useQueryClient();
  const event = useEvent(id);

  const [body, setBody] = useState('');
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [to, setTo] = useState<To>('all');
  const [picked, setPicked] = useState<string[]>([]);
  const [group, setGroup] = useState('');
  const [when, setWhen] = useState<When>('now');
  const [at, setAt] = useState('');
  const [confirming, setConfirming] = useState(false);

  // Restore an unsent draft and contacts picked on Wapokeaji (this tab only).
  useEffect(() => {
    setBody(readDraft(id));
    const ids = readPicked(id);
    if (ids.length && new URLSearchParams(window.location.search).get('to') === 'picked') {
      setPicked(ids);
      setTo('picked');
    }
  }, [id]);
  useEffect(() => {
    const h = setTimeout(() => saveDraft(id, body), 300);
    return () => clearTimeout(h);
  }, [id, body]);
  // The "picked" chip only shows while there are picks; keep `to` consistent if the list empties.
  useEffect(() => {
    if (to === 'picked' && picked.length === 0) setTo('all');
  }, [to, picked.length]);

  const groups = useQuery({
    queryKey: qk.groups(id),
    queryFn: () => getRepository().listGroups(id),
  });
  useEffect(() => {
    if (!group && groups.data?.length) setGroup(groups.data[0]!);
  }, [groups.data, group]);

  const sender = event.data?.senderName || event.data?.title || '';
  const sampleVars = useMemo(() => {
    const sampleGuest = 'Asha Juma';
    const { firstName, lastName } = splitName(sampleGuest);
    const ev = event.data;
    const hosts = ev?.coupleNames || ev?.title || '';
    const [hostA = '', hostB = ''] = hosts.split('&').map((x) => x.trim());
    return {
      guest: sampleGuest,
      firstName,
      lastName,
      group: group || 'Kamati',
      title: ev?.title || '',
      hosts,
      hostA,
      hostB,
      kind: ev?.eventKind || '',
      date: ev?.dateStart ? formatDateShort(ev.dateStart, locale) : '',
      time: ev?.dateStart ? formatClock(ev.dateStart) : '',
      venue: ev?.venueName || 'Ukumbi wa Mwanga',
      mapUrl: ev?.venueMapUrl || '',
      dress: ev?.dressCode || '',
      sender,
      phone: ev?.committeePhone ? formatPhone(ev.committeePhone, ev.country) : '',
    };
  }, [event.data, group, locale, sender]);
  const hasVars = templatePlaceholders(body).length > 0;
  const previewText = body.trim() ? (hasVars ? renderTemplate(body, sampleVars) : body.trim()) : '';
  const seg = smsSegments(previewText || ' ');
  const tooLong = seg.segments > SMS_MAX_SEGMENTS;
  const varProblem = body ? smsCampaignProblem(body) : null;
  const bodyError = varProblem
    ? te('unknownVar', { name: varProblem.split(':')[1] ?? '' })
    : tooLong
      ? t('tooLong', { max: SMS_MAX_SEGMENTS })
      : undefined;
  const target: SmsTarget | null =
    to === 'all'
      ? 'all'
      : to === 'group'
        ? group
          ? { group }
          : null
        : picked.length
          ? { guestIds: picked }
          : null;
  const targetKey = JSON.stringify(target);
  const preview = useQuery({
    queryKey: ['sms-preview', id, targetKey],
    queryFn: () => getRepository().previewSmsCampaign(id, { body: ' ', target: target! }),
    enabled: !!target,
  });
  const recipients = preview.data?.recipients ?? 0;
  const credits = recipients * seg.segments;
  const remaining = preview.data?.remaining ?? null;
  const short = remaining !== null && credits > remaining;
  const scheduleIso = when === 'later' && at ? fromLocalInput(at) : undefined;
  const timeOk = when === 'now' || (!!scheduleIso && Date.parse(scheduleIso) > Date.now() + 60_000);
  const canSend =
    body.trim().length >= 2 &&
    !tooLong &&
    !varProblem &&
    !!target &&
    recipients > 0 &&
    !short &&
    timeOk;

  const send = useMutation({
    mutationFn: () =>
      getRepository().sendSmsCampaign(
        id,
        { body: body.trim(), target: target!, scheduleAt: scheduleIso },
        crypto.randomUUID(),
      ),
    onSuccess: async (c) => {
      setConfirming(false);
      toast({
        tone: 'success',
        title:
          c.status === 'scheduled'
            ? t('scheduled', { when: formatDateTimeShort(c.scheduledFor!, locale) })
            : t('sent', { sent: c.sent, failed: c.failed }),
      });
      saveDraft(id, '');
      savePicked(id, []);
      await Promise.all(
        [qk.smsCampaigns(id), qk.billing(id)].map((k) =>
          queryClient.invalidateQueries({ queryKey: k }),
        ),
      );
      router.push(`/app/e/${id}/sms/history`);
    },
    onError: (e) => {
      setConfirming(false);
      if (quota(e)) return;
      const reason = isRepositoryError(e)
        ? ((e.details as { reason?: string; field?: string } | undefined) ?? {})
        : {};
      const title =
        reason.reason === 'no_recipients'
          ? te('no_recipients')
          : reason.reason?.startsWith('placeholder_unknown:')
            ? te('unknownVar', { name: reason.reason.split(':')[1] ?? '' })
            : reason.field === 'scheduleAt'
              ? te('scheduleAt')
              : ts('errorTitle');
      toast({ tone: 'error', title });
    },
  });

  // Recomputed when the datetime picker opens, so the floor never drifts into the past while the page sits.
  const { minLocal, maxLocal } = useMemo(() => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const now = Date.now();
    return {
      minLocal: fmt(new Date(now + 5 * 60_000)),
      // Server refuses anything more than a year ahead; mirror that in the picker.
      maxLocal: fmt(new Date(now + 365 * 24 * 3_600_000)),
    };
    // `when` as a dep so the floor refreshes every time the user switches to "later".
  }, [when]);

  return (
    <>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <div className="grid grid-cols-1 gap-4 pb-28 md:grid-cols-[1fr_320px] md:pb-0">
        <div className="flex flex-col gap-4">
          <Card>
            <TemplateVarChips
              vars={SMS_CAMPAIGN_VARS}
              locale={locale}
              label={t('placeholders')}
              hint={t('insert')}
              textareaRef={bodyRef}
              value={body}
              onChange={setBody}
            />
            <Textarea
              ref={bodyRef}
              label={t('message')}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t('placeholder')}
              rows={6}
              maxLength={1000}
              error={bodyError}
              hint={
                <span className="tabular" data-testid="sms-counter">
                  {t('counter', { chars: previewText.length, parts: seg.segments })}
                </span>
              }
            />
            {seg.encoding === 'UCS-2' && body ? (
              <p className="mt-2 text-sm text-muted">{t('unicode')}</p>
            ) : null}
          </Card>

          <Card title={t('to')} titleId="sms-to">
            <SegmentedControl<To>
              label={t('to')}
              value={to}
              onChange={setTo}
              options={[
                { value: 'all', label: t('toAll') },
                { value: 'group', label: t('toGroup') },
                ...(picked.length
                  ? [{ value: 'picked' as const, label: t('toPicked', { count: picked.length }) }]
                  : []),
              ]}
            />
            {to === 'picked' && picked.length > 0 ? (
              <div className="mt-3 flex items-center justify-between gap-2 rounded-card border border-border bg-bg px-3 py-2">
                <span className="text-sm">{t('pickedSummary', { count: picked.length })}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<X className="size-4" aria-hidden="true" />}
                  onClick={() => {
                    setPicked([]);
                    savePicked(id, []);
                    setTo('all');
                  }}
                  data-testid="sms-clear-picked"
                >
                  {t('clearPicked')}
                </Button>
              </div>
            ) : null}
            {to === 'group' ? (
              <div className="mt-3">
                {groups.data?.length ? (
                  <Select
                    label={t('pickGroup')}
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                    options={groups.data.map((g) => ({ value: g, label: g }))}
                  />
                ) : (
                  <p className="text-muted">{t('noGroups')}</p>
                )}
              </div>
            ) : null}
          </Card>

          <Card title={t('when')} titleId="sms-when">
            <SegmentedControl<When>
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
                label={t('at')}
                type="datetime-local"
                min={minLocal}
                max={maxLocal}
                value={at}
                onChange={(e) => setAt(e.target.value)}
                error={at && !timeOk ? te('scheduleAt') : undefined}
              />
            ) : null}
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card title={t('phonePreview')} titleId="sms-phone">
            <div className="rounded-card bg-bg p-3">
              <p className="mb-2 flex items-center gap-1.5 text-sm text-muted">
                <Smartphone className="size-4" aria-hidden="true" />
                {t('senderLine', { sender })}
              </p>
              <p
                className="max-w-full rounded-2xl rounded-tl-sm bg-surface p-3 break-words whitespace-pre-line shadow-sm"
                data-testid="sms-bubble"
              >
                {previewText || t('placeholder')}
              </p>
              {hasVars ? (
                <p className="mt-2 text-xs text-muted">
                  {t('sampleNote', { name: sampleVars.guest })}
                </p>
              ) : null}
            </div>
          </Card>
          <Card title={t('preview')} titleId="sms-summary">
            {preview.isPending && target ? (
              <Skeleton lines={3} />
            ) : (
              <dl className="flex flex-col gap-1.5" data-testid="sms-summary">
                <dd className="text-lg font-semibold">{t('recipients', { count: recipients })}</dd>
                {preview.data?.withoutPhone ? (
                  <dd className="text-sm text-warning">
                    {t('withoutPhone', { count: preview.data.withoutPhone })}
                  </dd>
                ) : null}
                <dd className="tabular">{t('credits', { count: formatNumber(credits) })}</dd>
                {remaining !== null ? (
                  <dd className="tabular text-muted">
                    {t('remaining', { count: formatNumber(remaining) })}
                  </dd>
                ) : null}
              </dl>
            )}
            {short ? (
              <Banner
                tone="warning"
                className="mt-3"
                live="polite"
                action={
                  <Link href={`/app/e/${id}/billing`} className={buttonClasses('secondary', 'sm')}>
                    {t('buy')}
                  </Link>
                }
              >
                {t('short', {
                  needed: formatNumber(credits),
                  remaining: formatNumber(remaining ?? 0),
                })}
              </Banner>
            ) : null}
          </Card>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-border bg-surface p-3 md:static md:mt-4 md:border-0 md:bg-transparent md:p-0">
        <Button
          block
          size="lg"
          disabled={!canSend}
          icon={
            when === 'later' ? (
              <CalendarClock className="size-5" aria-hidden="true" />
            ) : (
              <Send className="size-5" aria-hidden="true" />
            )
          }
          onClick={() => setConfirming(true)}
          data-testid="sms-send"
          className="md:w-auto"
        >
          {when === 'later' ? t('schedule') : t('send')}
        </Button>
      </div>

      <ConfirmSheet
        open={confirming}
        onOpenChange={setConfirming}
        tone="primary"
        title={t('confirmTitle', { count: recipients })}
        consequence={t('confirmBody', { credits: formatNumber(credits) })}
        confirmLabel={when === 'later' ? t('schedule') : t('send')}
        cancelLabel={tc('cancel')}
        closeLabel={tc('close')}
        loading={send.isPending}
        onConfirm={() => send.mutate()}
      />
    </>
  );
}
