'use client';

import { useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Trash2, Upload } from 'lucide-react';
import { RepositoryError, type AndroidRelease } from '@harusi/api-client';
import type { Locale } from '@harusi/i18n';
import { QueryState } from '@/components/console/query-state';
import { Button, buttonClasses } from '@/components/ui/button';
import { Banner, Card, Skeleton } from '@/components/ui/display';
import { TextField } from '@/components/ui/form';
import { ConfirmSheet } from '@/components/ui/overlay';
import { useToast } from '@/components/ui/toast';
import { APP_APK_PATH } from '@/lib/app-download';
import { APP_DOMAIN } from '@/lib/env';
import { formatRelative } from '@/lib/format';
import { getRepository } from '@/lib/repo';
import { qk } from '@/lib/queries';

/**
 * The Android app on /programu (ADR 047): admin staff upload the signed APK here and it downloads from
 * our own domain. No Coolify variable and no redeploy: the button appears within a minute.
 */
export default function AppReleasePage() {
  const t = useTranslations('ops.appRelease');
  const tc = useTranslations('common');
  const locale = useLocale() as Locale;
  const toast = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const q = useQuery({
    queryKey: qk.ops('app-release'),
    queryFn: () => getRepository().opsAndroidRelease(),
  });
  const store = (r: AndroidRelease | null) => queryClient.setQueryData(qk.ops('app-release'), r);
  const explain = (e: unknown) => (e instanceof RepositoryError ? e.message : String(e));

  const upload = useMutation({
    mutationFn: () => getRepository().opsUploadAndroidApp(file!, version),
    onSuccess: (r) => {
      store(r);
      setFile(null);
      setVersion('');
      setError(null);
      toast({ tone: 'success', title: t('uploaded') });
    },
    onError: (e) => setError(explain(e)),
  });
  const remove = useMutation({
    mutationFn: () => getRepository().opsRemoveAndroidApp(),
    onSuccess: () => {
      setConfirmRemove(false);
      store(null);
      toast({ tone: 'success', title: t('removed') });
    },
    onError: (e) => setError(explain(e)),
  });

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <p className="text-muted">{t('intro', { domain: APP_DOMAIN })}</p>

      <QueryState query={q} skeleton={<Skeleton className="h-32" />}>
        {(release) =>
          release ? (
            <Card className="flex flex-col gap-2" data-testid="app-release-current">
              <h2 className="text-lg font-semibold">
                {t('current')}: {release.version}
              </h2>
              <p className="text-sm text-muted">
                {t('size', { size: (release.size / 1_000_000).toFixed(1) })} ·{' '}
                {t('uploadedAt', { when: formatRelative(release.uploadedAt, locale) })}
              </p>
              <p className="font-mono text-xs break-all text-muted">
                {t('checksum')}: {release.sha256}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <a
                  href={APP_APK_PATH}
                  className={buttonClasses('secondary', 'md')}
                  target="_blank"
                  rel="noopener"
                >
                  <ExternalLink className="size-4" aria-hidden="true" />
                  {t('open')}
                </a>
                <Button
                  variant="ghost"
                  icon={<Trash2 className="size-4" aria-hidden="true" />}
                  onClick={() => setConfirmRemove(true)}
                >
                  {t('remove')}
                </Button>
              </div>
            </Card>
          ) : (
            <Banner tone="info">{t('none')}</Banner>
          )
        }
      </QueryState>

      <Card className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">{t('upload')}</h2>
        <div className="flex flex-col gap-2">
          <span className="font-medium">{t('file')}</span>
          <input
            ref={fileRef}
            type="file"
            accept=".apk,application/vnd.android.package-archive"
            className="sr-only"
            aria-label={t('choose')}
            data-testid="app-release-file"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setError(null);
            }}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              {t('choose')}
            </Button>
            {file ? (
              <span className="text-sm text-muted">
                {file.name} · {(file.size / 1_000_000).toFixed(1)} MB
              </span>
            ) : null}
          </div>
        </div>
        <TextField
          label={t('version')}
          hint={t('versionHelp')}
          inputMode="decimal"
          placeholder="0.6.0"
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          data-testid="app-release-version"
        />
        {error ? <Banner tone="error">{error}</Banner> : null}
        <Button
          icon={<Upload className="size-4" aria-hidden="true" />}
          disabled={!file || !version.trim()}
          loading={upload.isPending}
          onClick={() => upload.mutate()}
          data-testid="app-release-upload"
        >
          {t('upload')}
        </Button>
      </Card>

      <ConfirmSheet
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        tone="danger"
        title={t('confirmTitle')}
        consequence={<p>{t('confirmBody')}</p>}
        confirmLabel={t('remove')}
        cancelLabel={tc('cancel')}
        closeLabel={tc('close')}
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </div>
  );
}
