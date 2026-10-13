'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, LogOut, Trash2 } from 'lucide-react';
import type { Locale } from '@harusi/i18n';
import { ConsoleShell } from '@/components/console/shell';
import { PageHeader } from '@/components/console/page-header';
import { Button } from '@/components/ui/button';
import { Banner, Card } from '@/components/ui/display';
import { TextField } from '@/components/ui/form';
import { LanguageChip } from '@/components/ui/language-chip';
import { ConfirmSheet } from '@/components/ui/overlay';
import { useToast } from '@/components/ui/toast';
import { getRepository } from '@/lib/repo';
import { qk, useSession } from '@/lib/queries';
import { formatDateShort, formatPhone } from '@/lib/format';

export default function AccountPage() {
  const t = useTranslations('account');
  const tc = useTranslations('common');
  const ts = useTranslations('states');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const session = useSession();
  const [name, setName] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (session.data) setName(session.data.user.name);
  }, [session.data]);

  const save = useMutation({
    mutationFn: () => getRepository().updateProfile({ name }),
    onSuccess: async () => {
      toast({ tone: 'success', title: t('saved') });
      await queryClient.invalidateQueries({ queryKey: qk.session });
    },
    onError: () => toast({ tone: 'error', title: ts('rolledBack') }),
  });
  const exportData = useMutation({
    mutationFn: () => getRepository().requestDataExport(),
    onSuccess: (r) => setNotice(t('exportDone', { date: formatDateShort(r.requestedAt, locale) })),
    onError: () => toast({ tone: 'error', title: ts('errorTitle') }),
  });
  const deletion = useMutation({
    mutationFn: () => getRepository().requestAccountDeletion(),
    onSuccess: (r) => {
      setDeleteOpen(false);
      setNotice(t('deletionDone', { date: formatDateShort(r.requestedAt, locale) }));
    },
    onError: () => toast({ tone: 'error', title: ts('errorTitle') }),
  });

  return (
    <ConsoleShell>
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        <PageHeader title={t('title')} />
        <Card title={t('profile')} titleId="pf-h">
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <TextField
              label={t('name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
            <TextField
              label={t('phone')}
              value={formatPhone(session.data?.user.phoneE164)}
              readOnly
              disabled
              hint={t('phoneHelp')}
            />
            <Button
              type="submit"
              className="self-start"
              loading={save.isPending}
              disabled={name.trim().length < 2}
            >
              {t('save')}
            </Button>
          </form>
        </Card>
        <Card title={t('language')} titleId="lg-h">
          <LanguageChip />
        </Card>
        <Card title={t('privacy')} titleId="pv-h">
          <div className="flex flex-col gap-3">
            {notice ? (
              <Banner tone="success" live="polite">
                {notice}
              </Banner>
            ) : null}
            <Button
              variant="secondary"
              className="self-start"
              icon={<Download className="size-4" aria-hidden="true" />}
              onClick={() => exportData.mutate()}
              loading={exportData.isPending}
            >
              {t('export')}
            </Button>
            <Button
              variant="danger"
              className="self-start"
              icon={<Trash2 className="size-4" aria-hidden="true" />}
              onClick={() => setDeleteOpen(true)}
            >
              {t('deletion')}
            </Button>
            <Link
              href="/privacy"
              className="inline-flex min-h-10 items-center self-start text-primary underline"
            >
              {t('privacyLink')}
            </Link>
          </div>
        </Card>
        <Button
          variant="secondary"
          className="self-start"
          icon={<LogOut className="size-4" aria-hidden="true" />}
          onClick={async () => {
            await getRepository().signOut();
            queryClient.clear();
            router.replace('/login');
          }}
        >
          {t('signOut')}
        </Button>
      </div>
      <ConfirmSheet
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t('deletionTitle')}
        consequence={t('deletionBody')}
        confirmLabel={t('deletion')}
        cancelLabel={tc('cancel')}
        closeLabel={tc('close')}
        loading={deletion.isPending}
        onConfirm={() => deletion.mutate()}
      />
    </ConsoleShell>
  );
}
