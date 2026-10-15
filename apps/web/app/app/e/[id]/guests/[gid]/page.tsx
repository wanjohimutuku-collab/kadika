'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  FileDown,
  NotebookPen,
  Pencil,
  QrCode,
  RefreshCw,
  RotateCcw,
  Wallet,
} from 'lucide-react';
import { STATUS_RANK, mockQrPayload, type Guest } from '@harusi/api-client';
import type { InvitationStatus } from '@harusi/schemas';
import type { Locale } from '@harusi/i18n';
import { QueryState } from '@/components/console/query-state';
import { ChannelIcon, GuestStatusPill } from '@/components/console/status';
import { GuestForm } from '@/components/console/guests/guest-form';
import { RecordPaymentSheet } from '@/components/console/record-payment';
import { Button, IconButton } from '@/components/ui/button';
import { Avatar, Card, KeyValue, Skeleton, StatusPill } from '@/components/ui/display';
import { Timeline, type TimelineStep } from '@/components/ui/data';
import { BottomSheet, ConfirmSheet } from '@/components/ui/overlay';
import { TextField, Textarea } from '@/components/ui/form';
import { QrBlock } from '@/components/ui/qr-block';
import { useToast } from '@/components/ui/toast';
import { getRepository, newIdempotencyKey } from '@/lib/repo';
import { eventScopedKeys, qk, useSession } from '@/lib/queries';
import { formatDateTimeShort, formatPhone, formatMoney } from '@/lib/format';
import { useCurrency } from '@/lib/country';
import { downloadBlob } from '@/lib/download';

const STAGES: InvitationStatus[] = [
  'created',
  'sent',
  'delivered',
  'opened',
  'confirmed',
  'checked_in',
];

function timeline(
  g: Guest,
  label: (s: InvitationStatus) => string,
  fmt: (iso: string) => string,
): TimelineStep[] {
  const declined = g.status === 'declined';
  return STAGES.map((s) => {
    const stage: InvitationStatus = declined && s === 'confirmed' ? 'declined' : s;
    const at = g.timeline[stage];
    const reached = declined
      ? s === 'checked_in'
        ? false
        : s === 'confirmed'
          ? true
          : STATUS_RANK.declined >= STATUS_RANK[s]
      : STATUS_RANK[g.status] >= STATUS_RANK[s];
    const isCurrent = !declined && g.status === s;
    return {
      key: s,
      label: label(stage),
      at: at ? fmt(at) : null,
      state:
        declined && s === 'checked_in'
          ? 'skipped'
          : isCurrent
            ? 'current'
            : reached
              ? 'done'
              : 'pending',
    };
  });
}

export default function GuestDetailPage({
  params,
}: {
  params: Promise<{ id: string; gid: string }>;
}) {
  const { id, gid } = use(params);
  const cur = useCurrency();
  const t = useTranslations('guestDetail');
  const tg = useTranslations('guests');
  const tp = useTranslations('pledges');
  const tl = useTranslations('timelineStatus');
  const tch = useTranslations('channel');
  const tc = useTranslations('common');
  const ts = useTranslations('states');
  const locale = useLocale() as Locale;
  const toast = useToast();
  const queryClient = useQueryClient();
  const session = useSession();
  const guest = useQuery({ queryKey: qk.guest(gid), queryFn: () => getRepository().getGuest(gid) });
  const messages = useQuery({
    queryKey: qk.guestMessages(gid),
    queryFn: () => getRepository().listGuestMessages(gid),
  });
  const audit = useQuery({
    queryKey: qk.guestAudit(gid),
    queryFn: () => getRepository().listGuestAudit(gid),
  });
  const link = useQuery({
    queryKey: ['guest-link', gid, guest.data?.tokenVersion],
    queryFn: () => getRepository().getGuestCardLink(gid),
    enabled: !!guest.data,
  });

  const [editOpen, setEditOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [reissueOpen, setReissueOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  const [pledgeOpen, setPledgeOpen] = useState(false);
  const [pledgeAmount, setPledgeAmount] = useState('');
  const [payOpen, setPayOpen] = useState(false);

  const refresh = async () => {
    await Promise.all(
      [qk.guest(gid), qk.guestMessages(gid), qk.guestAudit(gid), ...eventScopedKeys(id)].map((k) =>
        queryClient.invalidateQueries({ queryKey: k }),
      ),
    );
  };

  const resend = useMutation({
    mutationFn: () =>
      getRepository().sendInvitations(id, {
        audience: { kind: 'selected', guestIds: [gid] },
        channel: 'auto',
        whatsappFallbackToSms: true,
        scheduleAt: null,
        kind: 'invite',
        idempotencyKey: newIdempotencyKey(),
      }),
    onSuccess: () => {
      toast({ tone: 'success', title: t('resent') });
      setTimeout(() => void refresh(), 2500);
    },
    onError: () => toast({ tone: 'error', title: ts('errorTitle') }),
  });
  const reissue = useMutation({
    mutationFn: () => getRepository().reissueGuest(gid),
    onSuccess: async (g) => {
      setReissueOpen(false);
      toast({ tone: 'success', title: t('reissued', { version: g.tokenVersion }) });
      await refresh();
    },
    onError: () => toast({ tone: 'error', title: ts('errorTitle') }),
  });
  const addNote = useMutation({
    mutationFn: () => getRepository().addGuestNote(gid, note),
    onSuccess: async () => {
      setNoteOpen(false);
      setNote('');
      toast({ tone: 'success', title: t('noteSaved') });
      await refresh();
    },
  });
  const savePledge = useMutation({
    mutationFn: () => getRepository().upsertPledge(gid, Number(pledgeAmount.replace(/\D/g, ''))),
    onSuccess: async () => {
      setPledgeOpen(false);
      toast({ tone: 'success', title: t('pledgeSaved') });
      await refresh();
    },
  });
  const printCard = useMutation({
    mutationFn: () =>
      getRepository().requestCardsPdf(id, { format: 'A6', layout: 'single', guestIds: [gid] }),
    onSuccess: (blob) => downloadBlob(blob, `kadi-${guest.data?.shortCode ?? gid}.pdf`),
  });

  const fmt = (iso: string) => formatDateTimeShort(iso, locale);
  const back = (
    <Link
      href={`/app/e/${id}/guests`}
      className="inline-flex min-h-10 items-center gap-1.5 self-start font-semibold text-primary"
    >
      <ArrowLeft className="size-5" aria-hidden="true" />
      {t('back')}
    </Link>
  );

  return (
    <div className="flex flex-col gap-4">
      {back}
      <QueryState
        query={guest}
        skeleton={
          <div className="flex flex-col gap-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-64" />
          </div>
        }
      >
        {(g) => (
          <>
            <Card>
              <div className="flex flex-wrap items-start gap-4">
                <Avatar name={g.displayName} size={56} />
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl font-semibold">{g.displayName}</h1>
                  <p className="text-muted">
                    {g.phoneE164 ? formatPhone(g.phoneE164) : tg('noPhone')}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <GuestStatusPill guest={g} />
                    {!g.hasSmartphone ? <StatusPill>{tg('featurePhone')}</StatusPill> : null}
                  </div>
                </div>
                <div className="flex items-center gap-1 rounded-input border border-border bg-bg py-1 pr-1 pl-3">
                  <span className="flex flex-col">
                    <span className="text-xs text-muted">{t('code')}</span>
                    <span
                      className="font-mono text-xl font-bold tracking-widest"
                      data-testid="detail-code"
                    >
                      {g.shortCode}
                    </span>
                  </span>
                  <IconButton
                    label={t('copyCode', { code: g.shortCode })}
                    icon={<Copy className="size-5" aria-hidden="true" />}
                    onClick={async () => {
                      await navigator.clipboard?.writeText(g.shortCode).catch(() => undefined);
                      toast({ tone: 'success', title: tc('copied') });
                    }}
                  />
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KeyValue label={t('group')}>{g.groupLabel || '—'}</KeyValue>
                <KeyValue label={t('party')}>
                  {g.rsvpPartySize
                    ? t('partyConfirmed', { count: g.rsvpPartySize })
                    : t('partyAllowed', { count: g.partySizeAllowed })}
                </KeyValue>
                <KeyValue label={t('channel')}>
                  <span className="inline-flex items-center gap-1.5">
                    <ChannelIcon
                      channel={
                        g.channelLast ??
                        (g.inviteChannelPref === 'mixed' ? 'whatsapp' : g.inviteChannelPref)
                      }
                      className="size-4"
                    />
                    {tch(g.inviteChannelPref)}
                  </span>
                </KeyValue>
                <KeyValue label={t('version', { version: g.tokenVersion })}>
                  {g.checkedInAt
                    ? t('checkedIn', { time: fmt(g.checkedInAt), count: g.partyAdmitted })
                    : '—'}
                </KeyValue>
              </dl>
            </Card>

            <div className="flex flex-wrap gap-2" role="group" aria-label={t('actions')}>
              <Button
                size="sm"
                icon={<RefreshCw className="size-4" aria-hidden="true" />}
                onClick={() => resend.mutate()}
                loading={resend.isPending}
                disabled={!g.phoneE164}
              >
                {t('resend')}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={<QrCode className="size-4" aria-hidden="true" />}
                onClick={() => setQrOpen(true)}
              >
                {t('showQr')}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={<Pencil className="size-4" aria-hidden="true" />}
                onClick={() => setEditOpen(true)}
              >
                {tg('edit')}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={<FileDown className="size-4" aria-hidden="true" />}
                onClick={() => printCard.mutate()}
                loading={printCard.isPending}
              >
                {t('printCard')}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={<NotebookPen className="size-4" aria-hidden="true" />}
                onClick={() => setNoteOpen(true)}
              >
                {t('addNote')}
              </Button>
              <Button
                size="sm"
                variant="danger"
                icon={<RotateCcw className="size-4" aria-hidden="true" />}
                onClick={() => setReissueOpen(true)}
                data-testid="reissue"
              >
                {t('reissue')}
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card title={t('timeline')} titleId="tl-h">
                <Timeline
                  label={t('timeline')}
                  steps={timeline(g, (s) => tl(s as 'created'), fmt)}
                />
              </Card>

              <div className="flex flex-col gap-4">
                {session.data?.role !== 'gate' ? (
                  <Card
                    title={t('pledge')}
                    titleId="pl-h"
                    action={
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setPledgeAmount(String(g.pledge?.amountTzs ?? ''));
                          setPledgeOpen(true);
                        }}
                      >
                        {t('setPledge')}
                      </Button>
                    }
                  >
                    {g.pledge && g.pledge.amountTzs > 0 ? (
                      <dl className="grid grid-cols-3 gap-2">
                        <KeyValue label={tp('pledged')}>
                          {formatMoney(g.pledge.amountTzs, cur)}
                        </KeyValue>
                        <KeyValue label={tp('paid')}>{formatMoney(g.pledge.paidTzs, cur)}</KeyValue>
                        <KeyValue label={tp('balance')}>
                          {formatMoney(g.pledge.balanceTzs, cur)}
                        </KeyValue>
                      </dl>
                    ) : (
                      <p className="text-muted">{t('pledgeNone')}</p>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-3"
                      icon={<Wallet className="size-4" aria-hidden="true" />}
                      onClick={() => setPayOpen(true)}
                    >
                      {t('recordPayment')}
                    </Button>
                  </Card>
                ) : null}

                <Card title={t('messages')} titleId="msg-h">
                  <QueryState
                    query={messages}
                    skeleton={<Skeleton lines={3} />}
                    isEmpty={(d) => d.length === 0}
                    empty={<p className="text-muted">{t('messagesEmpty')}</p>}
                  >
                    {(list) => (
                      <ul className="flex flex-col divide-y divide-border">
                        {list.map((m) => (
                          <li key={m.id} className="flex items-start gap-3 py-2">
                            <ChannelIcon channel={m.channel} />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium">
                                {t(`kind.${m.kind}`)} · {t(`msgStatus.${m.status}`)}
                              </p>
                              {m.error ? (
                                <p className="text-sm text-danger">
                                  {t(
                                    `errors.${(['not_on_whatsapp', 'invalid_number', 'provider_timeout', 'rate_limited'].includes(m.error) ? m.error : 'unknown') as 'unknown'}`,
                                  )}
                                </p>
                              ) : null}
                              <p className="text-sm text-muted">
                                {fmt(m.createdAt)}
                                {m.costTzs ? ` · ${formatMoney(m.costTzs, cur)}` : ''}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </QueryState>
                </Card>
              </div>
            </div>

            <Card title={t('audit')} titleId="au-h">
              <QueryState
                query={audit}
                skeleton={<Skeleton lines={3} />}
                isEmpty={(d) => d.length === 0}
                empty={<p className="text-muted">{t('auditEmpty')}</p>}
              >
                {(list) => (
                  <ul className="flex flex-col divide-y divide-border" data-testid="audit">
                    {list.map((a) => (
                      <li key={a.id} className="py-2">
                        <p>{a.details}</p>
                        <p className="text-sm text-muted">
                          {a.actorName} · {fmt(a.at)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </QueryState>
            </Card>

            <BottomSheet
              open={editOpen}
              onOpenChange={setEditOpen}
              title={g.displayName}
              closeLabel={tc('close')}
              size="lg"
            >
              <GuestForm
                eventId={id}
                guest={g}
                onDone={() => {
                  setEditOpen(false);
                  void refresh();
                }}
              />
            </BottomSheet>

            <BottomSheet
              open={qrOpen}
              onOpenChange={setQrOpen}
              title={g.displayName}
              closeLabel={tc('close')}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-card border border-border bg-white p-3">
                  <QrBlock
                    payload={mockQrPayload(id, g.id, g.partySizeAllowed, g.tokenVersion)}
                    alt={`QR ${g.shortCode}`}
                    size={220}
                  />
                </div>
                <p className="font-mono text-3xl font-bold tracking-widest">{g.shortCode}</p>
                {link.data ? (
                  <div className="flex w-full flex-col gap-2">
                    <a
                      href={link.data.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-input border border-border font-semibold"
                    >
                      <ExternalLink className="size-4" aria-hidden="true" />
                      {t('openCard')}
                    </a>
                    <Button
                      variant="ghost"
                      icon={<Copy className="size-4" aria-hidden="true" />}
                      onClick={async () => {
                        await navigator.clipboard
                          ?.writeText(link.data!.shortUrl)
                          .catch(() => undefined);
                        toast({ tone: 'success', title: tc('copied') });
                      }}
                    >
                      {t('copyLink')}
                    </Button>
                  </div>
                ) : null}
              </div>
            </BottomSheet>

            <ConfirmSheet
              open={reissueOpen}
              onOpenChange={setReissueOpen}
              title={t('reissueTitle', { name: g.displayName })}
              consequence={t('reissueBody', { name: g.displayName, version: g.tokenVersion })}
              confirmLabel={t('reissue')}
              cancelLabel={tc('cancel')}
              closeLabel={tc('close')}
              loading={reissue.isPending}
              onConfirm={() => reissue.mutate()}
            />

            <BottomSheet
              open={noteOpen}
              onOpenChange={setNoteOpen}
              title={t('addNote')}
              closeLabel={tc('close')}
              footer={
                <Button
                  onClick={() => addNote.mutate()}
                  disabled={!note.trim()}
                  loading={addNote.isPending}
                >
                  {tc('save')}
                </Button>
              }
            >
              <Textarea
                label={t('noteLabel')}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                autoFocus
              />
            </BottomSheet>

            <BottomSheet
              open={pledgeOpen}
              onOpenChange={setPledgeOpen}
              title={t('setPledge')}
              closeLabel={tc('close')}
              footer={
                <Button
                  onClick={() => savePledge.mutate()}
                  disabled={!pledgeAmount.replace(/\D/g, '')}
                  loading={savePledge.isPending}
                >
                  {tc('save')}
                </Button>
              }
            >
              <TextField
                label={t('pledgeAmount')}
                prefix={cur}
                inputMode="numeric"
                value={pledgeAmount}
                onChange={(e) => setPledgeAmount(e.target.value.replace(/[^\d]/g, ''))}
                autoFocus
              />
            </BottomSheet>

            <RecordPaymentSheet
              eventId={id}
              open={payOpen}
              onOpenChange={setPayOpen}
              preselected={g}
              onSaved={refresh}
            />
          </>
        )}
      </QueryState>
    </div>
  );
}
