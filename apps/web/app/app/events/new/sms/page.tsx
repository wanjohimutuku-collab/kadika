'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MessageSquareText } from 'lucide-react';
import { isRepositoryError } from '@harusi/api-client';
import type { Locale } from '@harusi/i18n';
import { ConsoleShell } from '@/components/console/shell';
import { PageHeader } from '@/components/console/page-header';
import { ProductChooser } from '@/components/sms/product-chooser';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/display';
import { Select, TextField } from '@/components/ui/form';
import { useToast } from '@/components/ui/toast';
import { getRepository } from '@/lib/repo';
import { qk } from '@/lib/queries';
import { fromLocalInput } from '@/lib/format';

/** ADR 055: an SMS-reminders-only customer starts here: a name, a date and a language. */
export default function NewSmsAccountPage() {
  const t = useTranslations('sms.new');
  const tc = useTranslations('common');
  const ts = useTranslations('states');
  const tl = useTranslations('common.languageName');
  const tv = useTranslations('validation');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [sender, setSender] = useState('');
  const [date, setDate] = useState('');
  const [language, setLanguage] = useState<'sw' | 'en'>(locale === 'en' ? 'en' : 'sw');
  const [touched, setTouched] = useState(false);

  const create = useMutation({
    mutationFn: () =>
      getRepository().createSmsEvent({
        title: title.trim(),
        senderName: sender.trim(),
        dateStart: fromLocalInput(date),
        languageDefault: language,
      }),
    onSuccess: async (e) => {
      await queryClient.invalidateQueries({ queryKey: qk.events });
      router.replace(`/app/e/${e.id}/sms/contacts`);
    },
    onError: (e) =>
      toast({
        tone: 'error',
        title:
          isRepositoryError(e) && e.code === 'offline' ? ts('offlineBanner') : ts('errorTitle'),
      }),
  });

  const nameError = touched && title.trim().length < 2 ? tv('name.too_short') : undefined;
  const dateError = touched && !date ? tv('date.required') : undefined;

  return (
    <ConsoleShell>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        back={
          <Link
            href="/app"
            className="inline-flex min-h-11 items-center gap-1.5 self-start font-semibold text-primary"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
            {tc('back')}
          </Link>
        }
      />
      <div className="max-w-2xl">
        <ProductChooser current="sms" />
        <Card>
          <form
            className="flex flex-col gap-3"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              setTouched(true);
              if (title.trim().length >= 2 && date) create.mutate();
            }}
          >
            <TextField
              label={t('name')}
              hint={t('nameHint')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              error={nameError}
              maxLength={80}
              required
            />
            <TextField
              label={t('sender')}
              hint={t('senderHint')}
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              maxLength={60}
            />
            <TextField
              label={t('date')}
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              error={dateError}
              required
            />
            <Select
              label={t('language')}
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'sw' | 'en')}
              options={[
                { value: 'sw', label: tl('sw') },
                { value: 'en', label: tl('en') },
              ]}
            />
            <Button
              type="submit"
              size="lg"
              loading={create.isPending}
              loadingLabel={t('creating')}
              icon={<MessageSquareText className="size-5" aria-hidden="true" />}
              data-testid="sms-create"
            >
              {t('create')}
            </Button>
          </form>
        </Card>
      </div>
    </ConsoleShell>
  );
}
