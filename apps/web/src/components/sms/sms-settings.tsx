'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert, Trash2 } from 'lucide-react';
import type { WeddingEvent } from '@harusi/api-client';
import { PageHeader } from '@/components/console/page-header';
import { Button } from '@/components/ui/button';
import { Card, EmptyState, KeyValue } from '@/components/ui/display';
import { Select, TextField } from '@/components/ui/form';
import { ConfirmSheet } from '@/components/ui/overlay';
import { useToast } from '@/components/ui/toast';
import { getRepository } from '@/lib/repo';
import { qk, useSession } from '@/lib/queries';
import { fromLocalInput, toLocalInput } from '@/lib/format';

/** Mipangilio for an SMS-reminders-only account (ADR 055): name, sender, date, language, delete. */
export function SmsSettings({ event }: { event: WeddingEvent }) {
  const t = useTranslations('sms.settings');
  const tn = useTranslations('sms.new');
  const tnav = useTranslations('nav');
  const tc = useTranslations('common');
  const ts = useTranslations('states');
  const tl = useTranslations('common.languageName');
  const toast = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useSession();
  const [title, setTitle] = useState(event.title);
  const [sender, setSender] = useState(event.senderName);
  const [date, setDate] = useState(toLocalInput(event.dateStart));
  const [language, setLanguage] = useState(event.languageDefault);
  const [deleting, setDeleting] = useState(false);

  const save = useMutation({
    mutationFn: () =>
      getRepository().updateEvent(event.id, {
        title: title.trim(),
        coupleNames: title.trim(),
        senderName: sender.trim(),
        dateStart: fromLocalInput(date),
        languageDefault: language,
      }),
    onSuccess: async () => {
      toast({ tone: 'success', title: t('saved') });
      await Promise.all(
        [qk.event(event.id), qk.events].map((k) => queryClient.invalidateQueries({ queryKey: k })),
      );
    },
    onError: () => toast({ tone: 'error', title: ts('errorTitle') }),
  });
  const del = useMutation({
    mutationFn: () => getRepository().deleteEvent(event.id),
    onSuccess: async () => {
      toast({ tone: 'success', title: t('deleted') });
      await queryClient.invalidateQueries({ queryKey: qk.events });
      router.replace('/app');
    },
    onError: () => toast({ tone: 'error', title: ts('errorTitle') }),
  });

  if (session.data && session.data.role !== 'owner') {
    return <EmptyState icon={<ShieldAlert className="size-7" />} title={tnav('ownerOnly')} />;
  }

  return (
    <>
      <PageHeader title={t('title')} />
      <div className="flex max-w-2xl flex-col gap-4">
        <Card>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <TextField
              label={tn('name')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={2}
              maxLength={80}
            />
            <TextField
              label={tn('sender')}
              hint={tn('senderHint')}
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              maxLength={60}
            />
            <TextField
              label={tn('date')}
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <Select
              label={tn('language')}
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'sw' | 'en')}
              options={[
                { value: 'sw', label: tl('sw') },
                { value: 'en', label: tl('en') },
              ]}
            />
            <div>
              <Button type="submit" loading={save.isPending} disabled={title.trim().length < 2}>
                {t('save')}
              </Button>
            </div>
          </form>
        </Card>
        <Card>
          <KeyValue label={t('product')}>{t('productValue')}</KeyValue>
          <p className="mt-2 text-sm text-muted">{t('productHint')}</p>
        </Card>
        <Card>
          <Button
            variant="danger"
            icon={<Trash2 className="size-5" aria-hidden="true" />}
            onClick={() => setDeleting(true)}
          >
            {t('delete')}
          </Button>
        </Card>
      </div>
      <ConfirmSheet
        open={deleting}
        onOpenChange={setDeleting}
        title={t('deleteTitle', { name: event.title })}
        consequence={t('deleteConsequence')}
        confirmLabel={t('delete')}
        cancelLabel={tc('cancel')}
        closeLabel={tc('close')}
        loading={del.isPending}
        onConfirm={() => del.mutate()}
      />
    </>
  );
}
