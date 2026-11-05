'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { History, RotateCcw, Send } from 'lucide-react';
import type { SmsCampaignView } from '@harusi/schemas/sms';
import type { Locale } from '@harusi/i18n';
import { PageHeader } from '@/components/console/page-header';
import { QueryState } from '@/components/console/query-state';
import { Button, buttonClasses } from '@/components/ui/button';
import { EmptyState, Skeleton } from '@/components/ui/display';
import { ConfirmSheet } from '@/components/ui/overlay';
import { useToast } from '@/components/ui/toast';
import { getRepository } from '@/lib/repo';
import { qk } from '@/lib/queries';
import { formatDateTimeShort, formatNumber } from '@/lib/format';
import {
  CampaignStatus,
  saveDraft,
  useCampaignError,
  useSmsCampaigns,
  useTargetLabel,
} from '@/components/sms/shared';

/** Historia (ADR 055): every text sent or waiting, its outcome and SMS used; waiting ones can be stopped. */
export default function SmsHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('sms.history');
  const to = useTranslations('sms.overview');
  const tc = useTranslations('common');
  const ts = useTranslations('states');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const campaigns = useSmsCampaigns(id);
  const targetLabel = useTargetLabel();
  const errorText = useCampaignError();
  const [cancelling, setCancelling] = useState<SmsCampaignView | null>(null);

  const cancel = useMutation({
    mutationFn: (c: SmsCampaignView) => getRepository().cancelSmsCampaign(id, c.id),
    onSuccess: async () => {
      setCancelling(null);
      toast({ tone: 'success', title: t('cancelled') });
      await queryClient.invalidateQueries({ queryKey: qk.smsCampaigns(id) });
    },
    onError: () => {
      setCancelling(null);
      toast({ tone: 'error', title: ts('errorTitle') });
    },
  });

  const reuse = (c: SmsCampaignView) => {
    saveDraft(id, c.body);
    router.push(`/app/e/${id}/sms/compose`);
  };

  const compose = (
    <Link href={`/app/e/${id}/sms/compose`} className={buttonClasses('primary')}>
      <Send className="size-5" aria-hidden="true" />
      {to('compose')}
    </Link>
  );

  return (
    <>
      <PageHeader title={t('title')} />
      <QueryState
        query={campaigns}
        skeleton={<Skeleton lines={8} />}
        isEmpty={(d) => d.length === 0}
        empty={
          <EmptyState icon={<History className="size-7" />} title={t('empty')} action={compose} />
        }
      >
        {(list) => (
          <ul className="flex flex-col gap-3" data-testid="sms-history">
            {list.map((c) => {
              const err = errorText(c);
              return (
                <li
                  key={c.id}
                  className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-muted">
                      {c.status === 'scheduled' && c.scheduledFor
                        ? t('at', { when: formatDateTimeShort(c.scheduledFor, locale) })
                        : t('sentAt', {
                            when: formatDateTimeShort(c.finishedAt ?? c.createdAt, locale),
                          })}
                    </span>
                    <CampaignStatus c={c} />
                  </div>
                  <p className="break-words whitespace-pre-line">{c.body}</p>
                  <p className="text-sm text-muted">
                    {targetLabel(c.target)} · {t('credits', { count: formatNumber(c.credits) })}
                  </p>
                  {c.status === 'done' ? (
                    <p className="tabular text-sm">
                      {t('counts', { sent: c.sent, failed: c.failed, skipped: c.skipped })}
                    </p>
                  ) : null}
                  {err ? <p className="text-sm text-danger">{err}</p> : null}
                  <div className="flex flex-wrap gap-2">
                    {c.status === 'scheduled' ? (
                      <Button variant="secondary" size="sm" onClick={() => setCancelling(c)}>
                        {t('cancel')}
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<RotateCcw className="size-4" aria-hidden="true" />}
                      onClick={() => reuse(c)}
                    >
                      {t('reuse')}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </QueryState>
      <ConfirmSheet
        open={!!cancelling}
        onOpenChange={(o) => !o && setCancelling(null)}
        title={t('cancelTitle')}
        consequence={t('cancelBody')}
        confirmLabel={t('cancel')}
        cancelLabel={tc('close')}
        closeLabel={tc('close')}
        loading={cancel.isPending}
        onConfirm={() => {
          if (cancelling) cancel.mutate(cancelling);
        }}
      />
    </>
  );
}
