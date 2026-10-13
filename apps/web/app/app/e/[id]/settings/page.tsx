'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Archive, ShieldAlert, Trash2 } from 'lucide-react';
import type { WeddingEvent } from '@harusi/api-client';
import { normalizeTzPhone } from '@harusi/schemas/phone';
import { PageHeader } from '@/components/console/page-header';
import { QueryState } from '@/components/console/query-state';
import { Button } from '@/components/ui/button';
import { Card, EmptyState, Skeleton } from '@/components/ui/display';
import { PhoneField, Select, TextField } from '@/components/ui/form';
import { Switch } from '@/components/ui/navigation';
import { ConfirmSheet } from '@/components/ui/overlay';
import { useToast } from '@/components/ui/toast';
import { getRepository } from '@/lib/repo';
import { qk, useEvent, useSession } from '@/lib/queries';
import { formatPhone, fromLocalInput, toLocalInput } from '@/lib/format';

interface FormState {
  partnerA: string;
  partnerB: string;
  title: string;
  dateStart: string;
  rsvpDeadline: string;
  venueName: string;
  venueMapUrl: string;
  dressCode: string;
  senderName: string;
  committeePhone: string;
  languageDefault: 'sw' | 'en';
  pledgesEnabled: boolean;
  whatsappFallbackHours: number;
  contributionTargetTzs: number;
}

function toForm(e: WeddingEvent): FormState {
  return {
    partnerA: e.partnerA,
    partnerB: e.partnerB,
    title: e.title,
    dateStart: toLocalInput(e.dateStart),
    rsvpDeadline: e.rsvpDeadline ? toLocalInput(e.rsvpDeadline).slice(0, 10) : '',
    venueName: e.venueName,
    venueMapUrl: e.venueMapUrl,
    dressCode: e.dressCode,
    senderName: e.senderName,
    committeePhone: formatPhone(e.committeePhone).slice(1),
    languageDefault: e.languageDefault,
    pledgesEnabled: e.pledgesEnabled,
    whatsappFallbackHours: e.whatsappFallbackHours,
    contributionTargetTzs: e.contributionTargetTzs,
  };
}

export default function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('settings');
  const tw = useTranslations('wizard');
  const tn = useTranslations('nav');
  const tv = useTranslations('validation');
  const tc = useTranslations('common');
  const ts = useTranslations('states');
  const tl = useTranslations('common.languageName');
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const session = useSession();
  const event = useEvent(id);
  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (event.data && !form) setForm(toForm(event.data));
  }, [event.data, form]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const save = useMutation({
    mutationFn: (patch: Partial<WeddingEvent>) => getRepository().updateEvent(id, patch),
    onSuccess: async (e) => {
      setForm(toForm(e));
      toast({ tone: 'success', title: t('saved') });
      await Promise.all(
        [qk.event(id), qk.events].map((k) => queryClient.invalidateQueries({ queryKey: k })),
      );
    },
    onError: () => toast({ tone: 'error', title: ts('rolledBack') }),
  });
  const archive = useMutation({
    mutationFn: () => getRepository().archiveEvent(id),
    onSuccess: async () => {
      setArchiveOpen(false);
      toast({ tone: 'success', title: t('archived') });
      await queryClient.invalidateQueries({ queryKey: qk.event(id) });
    },
  });
  const del = useMutation({
    mutationFn: () => getRepository().deleteEvent(id),
    onSuccess: async () => {
      toast({ tone: 'success', title: t('deleted') });
      await queryClient.invalidateQueries({ queryKey: qk.events });
      router.replace('/app');
    },
    onError: () => toast({ tone: 'error', title: ts('errorTitle') }),
  });

  if (session.data && session.data.role !== 'owner')
    return <EmptyState icon={<ShieldAlert className="size-7" />} title={tn('ownerOnly')} />;

  const submit = () => {
    if (!form) return;
    const errs: typeof errors = {};
    if (form.partnerA.trim().length < 2) errs.partnerA = tv('name.too_short');
    if (form.partnerB.trim().length < 2) errs.partnerB = tv('name.too_short');
    if (form.venueName.trim().length < 2) errs.venueName = tv('venue.required');
    const phone = normalizeTzPhone(form.committeePhone);
    if (!phone.ok) errs.committeePhone = tv(`phone.${phone.error}`);
    if (form.venueMapUrl && !/^https?:\/\//.test(form.venueMapUrl))
      errs.venueMapUrl = tv('url.invalid');
    setErrors(errs);
    if (Object.keys(errs).length || !phone.ok) return;
    save.mutate({
      partnerA: form.partnerA.trim(),
      partnerB: form.partnerB.trim(),
      title: form.title.trim(),
      dateStart: fromLocalInput(form.dateStart),
      rsvpDeadline: form.rsvpDeadline ? fromLocalInput(`${form.rsvpDeadline}T23:59`) : null,
      venueName: form.venueName.trim(),
      venueMapUrl: form.venueMapUrl.trim(),
      dressCode: form.dressCode.trim(),
      senderName: form.senderName.trim(),
      committeePhone: phone.e164,
      languageDefault: form.languageDefault,
      pledgesEnabled: form.pledgesEnabled,
      whatsappFallbackHours: form.whatsappFallbackHours,
      contributionTargetTzs: form.contributionTargetTzs,
    });
  };

  return (
    <QueryState query={event} skeleton={<Skeleton className="h-96" />}>
      {(e) =>
        !form ? null : (
          <div className="mx-auto max-w-3xl pb-24 md:pb-0">
            <PageHeader
              title={t('title')}
              actions={
                <Button onClick={submit} loading={save.isPending} data-testid="settings-save">
                  {t('save')}
                </Button>
              }
            />
            <form
              className="flex flex-col gap-5"
              noValidate
              onSubmit={(ev) => {
                ev.preventDefault();
                submit();
              }}
            >
              <Card title={t('event')} titleId="ev-h">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextField
                    label={tw('partnerA')}
                    value={form.partnerA}
                    onChange={(ev) => set('partnerA', ev.target.value)}
                    error={errors.partnerA}
                  />
                  <TextField
                    label={tw('partnerB')}
                    value={form.partnerB}
                    onChange={(ev) => set('partnerB', ev.target.value)}
                    error={errors.partnerB}
                  />
                  <TextField
                    label={tw('eventTitle')}
                    value={form.title}
                    onChange={(ev) => set('title', ev.target.value)}
                    wrapperClassName="sm:col-span-2"
                  />
                  <TextField
                    label={tw('date')}
                    type="datetime-local"
                    value={form.dateStart}
                    onChange={(ev) => set('dateStart', ev.target.value)}
                    hint={tw('dateHint')}
                  />
                  <TextField
                    label={tw('target')}
                    prefix="TZS"
                    inputMode="numeric"
                    value={String(form.contributionTargetTzs)}
                    onChange={(ev) =>
                      set('contributionTargetTzs', Number(ev.target.value.replace(/\D/g, '')) || 0)
                    }
                  />
                </div>
              </Card>
              <Card title={t('venue')} titleId="vn-h">
                <div className="grid grid-cols-1 gap-4">
                  <TextField
                    label={tw('venueName')}
                    value={form.venueName}
                    onChange={(ev) => set('venueName', ev.target.value)}
                    error={errors.venueName}
                  />
                  <TextField
                    label={tw('venueMap')}
                    type="url"
                    value={form.venueMapUrl}
                    onChange={(ev) => set('venueMapUrl', ev.target.value)}
                    hint={tw('venueMapHint')}
                    error={errors.venueMapUrl}
                  />
                  <TextField
                    label={tw('dressCode')}
                    value={form.dressCode}
                    onChange={(ev) => set('dressCode', ev.target.value)}
                  />
                </div>
              </Card>
              <Card title={t('rsvp')} titleId="rs-h">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextField
                    label={tw('rsvpDeadline')}
                    type="date"
                    value={form.rsvpDeadline}
                    onChange={(ev) => set('rsvpDeadline', ev.target.value)}
                  />
                  <TextField
                    label={t('fallbackHours')}
                    type="number"
                    min={1}
                    max={48}
                    value={String(form.whatsappFallbackHours)}
                    onChange={(ev) => set('whatsappFallbackHours', Number(ev.target.value) || 6)}
                  />
                </div>
                <div className="mt-3">
                  <Switch
                    checked={form.pledgesEnabled}
                    onCheckedChange={(v) => set('pledgesEnabled', v)}
                    label={t('pledgesEnabled')}
                  />
                </div>
              </Card>
              <Card title={t('trust')} titleId="tr-h">
                <div className="grid grid-cols-1 gap-4">
                  <TextField
                    label={t('senderName')}
                    hint={t('senderHint')}
                    value={form.senderName}
                    onChange={(ev) => set('senderName', ev.target.value)}
                  />
                  <PhoneField
                    label={t('committeePhone')}
                    hint={t('committeeHint')}
                    value={form.committeePhone}
                    onChange={(v) => set('committeePhone', v)}
                    error={errors.committeePhone}
                  />
                </div>
              </Card>
              <Card title={t('language')} titleId="lg-h">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Select
                    label={tw('language')}
                    value={form.languageDefault}
                    onChange={(ev) => set('languageDefault', ev.target.value as 'sw' | 'en')}
                    options={[
                      { value: 'sw', label: tl('sw') },
                      { value: 'en', label: tl('en') },
                    ]}
                  />
                  <TextField label={t('timezone')} value={t('timezoneValue')} readOnly disabled />
                </div>
              </Card>
              <Card title={t('danger')} titleId="dz-h" className="border-danger/40">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{t('archive')}</p>
                      <p className="text-sm text-muted">{t('archiveHelp')}</p>
                    </div>
                    <Button
                      variant="secondary"
                      icon={<Archive className="size-4" aria-hidden="true" />}
                      onClick={() => setArchiveOpen(true)}
                      disabled={e.status === 'archived'}
                    >
                      {t('archive')}
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                    <div>
                      <p className="font-semibold text-danger">{t('delete')}</p>
                      <p className="text-sm text-muted">{t('deleteHelp')}</p>
                    </div>
                    <Button
                      variant="danger"
                      icon={<Trash2 className="size-4" aria-hidden="true" />}
                      onClick={() => setDeleteOpen(true)}
                      data-testid="delete-event"
                    >
                      {t('delete')}
                    </Button>
                  </div>
                </div>
              </Card>
            </form>
            <ConfirmSheet
              open={archiveOpen}
              onOpenChange={setArchiveOpen}
              title={t('archiveTitle', { name: e.coupleNames })}
              consequence={t('archiveHelp')}
              confirmLabel={t('archive')}
              cancelLabel={tc('cancel')}
              closeLabel={tc('close')}
              loading={archive.isPending}
              onConfirm={() => archive.mutate()}
            />
            <ConfirmSheet
              open={deleteOpen}
              onOpenChange={setDeleteOpen}
              title={t('deleteTitle', { name: e.coupleNames })}
              consequence={t('deleteBody', { count: e.stats.invited })}
              confirmLabel={t('delete')}
              cancelLabel={tc('cancel')}
              closeLabel={tc('close')}
              typedConfirmation={{
                expected: t('deleteWord'),
                label: t('deleteType', { word: t('deleteWord') }),
              }}
              loading={del.isPending}
              onConfirm={() => del.mutate()}
            />
          </div>
        )
      }
    </QueryState>
  );
}
