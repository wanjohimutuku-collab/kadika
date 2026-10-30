'use client';

import { use, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Images, Trash2 } from 'lucide-react';
import type { AlbumPhoto, PhotoAlbum, WeddingEvent } from '@harusi/api-client';
import type { Locale } from '@harusi/i18n';
import { PageHeader } from '@/components/console/page-header';
import { QueryState } from '@/components/console/query-state';
import {
  AddPhotosButton,
  DeletePhotoButton,
  Lightbox,
  PhotoGrid,
  useAlbumUpload,
} from '@/components/album/photo-album';
import { Button } from '@/components/ui/button';
import { Banner, Card, EmptyState, Skeleton } from '@/components/ui/display';
import { Select } from '@/components/ui/form';
import { Switch } from '@/components/ui/navigation';
import { ConfirmSheet } from '@/components/ui/overlay';
import { useToast } from '@/components/ui/toast';
import { getRepository } from '@/lib/repo';
import { qk, useEvent, useSession } from '@/lib/queries';
import { formatDate } from '@/lib/format';

const KEEP_DAYS = [1, 7, 30] as const;

const mb = (bytes: number) => `${(bytes / 1_000_000).toFixed(1)} MB`;

/** Temporary photo album (ADR 050): settings for the owner, photos for owner and committee. */
export default function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('album');
  const tc = useTranslations('common');
  const ts = useTranslations('states');
  const locale = useLocale() as Locale;
  const toast = useToast();
  const queryClient = useQueryClient();
  const session = useSession();
  const event = useEvent(id);
  const album = useQuery({
    queryKey: qk.album(id),
    queryFn: () => getRepository().getEventAlbum(id),
  });
  const [viewing, setViewing] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<AlbumPhoto | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const isOwner = session.data?.role === 'owner';
  const refresh = () => queryClient.invalidateQueries({ queryKey: qk.album(id) });

  const settings = useMutation({
    mutationFn: (patch: Partial<WeddingEvent>) => getRepository().updateEvent(id, patch),
    onSuccess: async () => {
      toast({ tone: 'success', title: tc('saved') });
      await Promise.all([refresh(), queryClient.invalidateQueries({ queryKey: qk.event(id) })]);
    },
    onError: () => toast({ tone: 'error', title: ts('rolledBack') }),
  });
  const remove = useMutation({
    mutationFn: (photoId: string) => getRepository().deleteEventPhoto(id, photoId),
    onSuccess: async () => {
      setToDelete(null);
      toast({ tone: 'success', title: t('deleted') });
      await refresh();
    },
    onError: () => toast({ tone: 'error', title: ts('errorTitle') }),
  });
  const clear = useMutation({
    mutationFn: () => getRepository().clearEventAlbum(id),
    onSuccess: async () => {
      setClearOpen(false);
      toast({ tone: 'success', title: t('cleared') });
      await refresh();
    },
    onError: () => toast({ tone: 'error', title: ts('errorTitle') }),
  });
  const upload = useAlbumUpload(
    (file) => getRepository().uploadEventPhoto(id, file),
    async ({ added, failed, message }) => {
      if (added) toast({ tone: 'success', title: t('uploaded', { count: added }) });
      if (failed)
        toast({
          tone: 'error',
          title: t('someFailed', { count: failed }),
          description: message ?? undefined,
        });
      await refresh();
    },
  );

  const e = event.data;
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={t('title')}
        subtitle={
          e?.albumEnabled && album.data
            ? t('subtitle', { date: formatDate(album.data.closesAt, locale) })
            : undefined
        }
        actions={
          album.data?.canUpload ? (
            <AddPhotosButton onFiles={(f) => void upload.run(f)} progress={upload.progress} />
          ) : undefined
        }
      />

      {isOwner && e ? (
        <Card className="mb-4">
          {!e.albumEnabled ? <p className="mb-2 text-muted">{t('intro')}</p> : null}
          <Switch
            checked={e.albumEnabled}
            onCheckedChange={(v) => settings.mutate({ albumEnabled: v })}
            label={t('enable')}
            description={t('enableHint')}
            disabled={settings.isPending}
          />
          {e.albumEnabled ? (
            <>
              <Switch
                checked={e.albumGuestUploads}
                onCheckedChange={(v) => settings.mutate({ albumGuestUploads: v })}
                label={t('guestUploads')}
                description={t('guestUploadsHint')}
                disabled={settings.isPending}
              />
              <Select
                label={t('keepDays')}
                value={String(e.albumKeepDays)}
                onChange={(ev) => settings.mutate({ albumKeepDays: Number(ev.target.value) })}
                disabled={settings.isPending}
                options={KEEP_DAYS.map((d) => ({ value: String(d), label: t(`keep${d}`) }))}
              />
            </>
          ) : null}
        </Card>
      ) : null}

      <QueryState query={album} skeleton={<Skeleton className="h-64 w-full" />}>
        {(a: PhotoAlbum) =>
          !a.enabled ? (
            isOwner ? null : (
              <EmptyState icon={<Images className="size-7" />} title={t('intro')} />
            )
          ) : (
            <Card
              title={
                a.stats
                  ? t('space', {
                      count: a.stats.count,
                      size: mb(a.stats.bytes),
                      original: mb(a.stats.originalBytes),
                    })
                  : undefined
              }
              action={
                isOwner && a.photos.length ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Trash2 className="size-5" aria-hidden="true" />}
                    onClick={() => setClearOpen(true)}
                  >
                    {t('clear')}
                  </Button>
                ) : undefined
              }
            >
              {!a.open ? (
                <Banner tone="warning" className="mb-3">
                  {t('closed')}
                </Banner>
              ) : (
                <p className="mb-3 text-sm text-muted">{t('compressNote')}</p>
              )}
              {a.photos.length ? (
                <PhotoGrid photos={a.photos} onOpen={setViewing} />
              ) : (
                <EmptyState
                  icon={<Images className="size-7" />}
                  title={t('empty')}
                  action={
                    a.canUpload ? (
                      <AddPhotosButton
                        onFiles={(f) => void upload.run(f)}
                        progress={upload.progress}
                      />
                    ) : undefined
                  }
                />
              )}
              {viewing !== null ? (
                <Lightbox
                  photos={a.photos}
                  index={viewing}
                  onIndex={setViewing}
                  onClose={() => setViewing(null)}
                  actions={(p) => (
                    <DeletePhotoButton
                      onClick={() => {
                        setViewing(null);
                        setToDelete(p);
                      }}
                    />
                  )}
                />
              ) : null}
              <ConfirmSheet
                open={!!toDelete}
                onOpenChange={(o) => !o && setToDelete(null)}
                title={t('deleteTitle')}
                consequence={t('deleteConsequence')}
                confirmLabel={t('delete')}
                cancelLabel={tc('cancel')}
                closeLabel={tc('close')}
                loading={remove.isPending}
                onConfirm={() => {
                  if (toDelete) remove.mutate(toDelete.id);
                }}
              />
              <ConfirmSheet
                open={clearOpen}
                onOpenChange={setClearOpen}
                title={t('clear')}
                consequence={t('clearConsequence', { count: a.photos.length })}
                confirmLabel={t('clear')}
                cancelLabel={tc('cancel')}
                closeLabel={tc('close')}
                loading={clear.isPending}
                onConfirm={() => clear.mutate()}
              />
            </Card>
          )
        }
      </QueryState>
    </div>
  );
}
