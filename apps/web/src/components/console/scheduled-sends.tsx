'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock } from 'lucide-react';
import type { Locale } from '@harusi/i18n';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/display';
import { useToast } from '@/components/ui/toast';
import { formatDateTimeShort } from '@/lib/format';
import { qk } from '@/lib/queries';
import { getRepository } from '@/lib/repo';

/**
 * Invitations and reminders waiting for their time (ADR 030), each with a cancel button. Shows nothing when
 * none are waiting, so the send page looks the same until the organiser schedules something.
 */
export function ScheduledSends({ eventId }: { eventId: string }) {
  const t = useTranslations('send.scheduled');
  const ts = useTranslations('states');
  const locale = useLocale() as Locale;
  const toast = useToast();
  const queryClient = useQueryClient();
  const list = useQuery({
    queryKey: qk.scheduled(eventId),
    queryFn: () => getRepository().listScheduledSends(eventId),
  });
  const cancel = useMutation({
    mutationFn: (jobId: string) => getRepository().cancelScheduledSend(eventId, jobId),
    onSuccess: async () => {
      toast({ tone: 'success', title: t('cancelled') });
      await queryClient.invalidateQueries({ queryKey: qk.scheduled(eventId) });
    },
    onError: async (e) => {
      const conflict = (e as { code?: string }).code === 'conflict';
      toast({ tone: 'error', title: conflict ? t('cancelFailed') : ts('errorTitle') });
      await queryClient.invalidateQueries({ queryKey: qk.scheduled(eventId) });
    },
  });

  const waiting = (list.data ?? []).filter((j) => j.status === 'scheduled' && j.scheduledFor);
  if (waiting.length === 0) return null;
  return (
    <Card
      className="mb-5"
      title={
        <span className="flex items-center gap-2">
          <Clock className="size-5 text-primary" aria-hidden="true" />
          {t('title')}
        </span>
      }
    >
      <ul className="flex flex-col divide-y divide-border" data-testid="scheduled-sends">
        {waiting.map((j) => {
          const kind = t(
            j.cardKind === 'contribution'
              ? 'contribution'
              : j.kind === 'reminder'
                ? 'reminder'
                : 'invite',
          );
          const when = formatDateTimeShort(j.scheduledFor!, locale);
          return (
            <li key={j.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="font-medium">
                  {kind} · {when}
                </p>
                <p className="text-sm text-muted">{t('guests', { count: j.total })}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                aria-label={t('cancelLabel', { kind: kind.toLowerCase(), date: when })}
                loading={cancel.isPending && cancel.variables === j.id}
                onClick={() => cancel.mutate(j.id)}
              >
                {t('cancel')}
              </Button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-sm text-muted">{t('note')}</p>
    </Card>
  );
}
