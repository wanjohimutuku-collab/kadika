'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, Images, ShieldCheck } from 'lucide-react';
import { errorCode, type AlbumPhoto, type PhotoAlbum } from '@harusi/api-client';
import type { Locale } from '@harusi/i18n';
import { Banner, EmptyState, Skeleton } from '@/components/ui/display';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/format';
import {
  AddPhotosButton,
  DeletePhotoButton,
  Lightbox,
  PhotoGrid,
  useAlbumUpload,
} from './photo-album';

const loadRepo = () => import('@/lib/repo');

/**
 * The guest's view of the temporary album (ADR 050), reached from their card. The card token is
 * the only credential: no login. A guest may add photos (when the hosts allow it) and delete their own.
 */
export function GuestAlbum({ token }: { token: string }) {
  const t = useTranslations('album');
  const tc = useTranslations('common');
  const ts = useTranslations('states');
  const locale = useLocale() as Locale;
  const [album, setAlbum] = useState<PhotoAlbum | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);
  const cardHref = `/c/${encodeURIComponent(token)}`;

  const load = useCallback(async () => {
    setFailed(null);
    try {
      const { getRepository } = await loadRepo();
      setAlbum(await getRepository().getCardAlbum(token));
    } catch (e) {
      setFailed(errorCode(e));
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const upload = useAlbumUpload(
    async (file) => (await loadRepo()).getRepository().uploadCardPhoto(token, file),
    async ({ added, failed: n, message }) => {
      setNotice(
        n
          ? {
              tone: 'error',
              text: [t('someFailed', { count: n }), message].filter(Boolean).join(' '),
            }
          : { tone: 'success', text: t('uploaded', { count: added }) },
      );
      await load();
    },
  );

  const remove = async (p: AlbumPhoto) => {
    setViewing(null);
    try {
      await (await loadRepo()).getRepository().deleteCardPhoto(token, p.id);
      setNotice({ tone: 'success', text: t('deleted') });
    } catch {
      setNotice({ tone: 'error', text: ts('errorTitle') });
    }
    await load();
  };

  return (
    <main className="mx-auto min-h-dvh max-w-3xl bg-bg px-4 pb-24 pt-4" data-testid="guest-album">
      <a href={cardHref} className="mb-3 inline-flex min-h-12 items-center gap-2 text-primary">
        <ArrowLeft className="size-5" aria-hidden="true" />
        {t('back')}
      </a>
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      {album ? (
        <p className="mt-1 flex items-start gap-2 text-sm text-muted">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {t('privacy', { date: formatDate(album.closesAt, locale) })}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-3">
        {notice ? (
          <Banner tone={notice.tone} live="polite">
            {notice.text}
          </Banner>
        ) : null}
        {failed ? (
          <Banner
            tone="error"
            title={failed === 'not_found' ? t('closed') : ts('errorTitle')}
            action={
              failed === 'not_found' ? undefined : (
                <Button size="sm" variant="secondary" onClick={() => void load()}>
                  {tc('retry')}
                </Button>
              )
            }
          />
        ) : null}
        {!album && !failed ? <Skeleton className="h-64 w-full" /> : null}
        {album && !album.open ? <Banner tone="warning">{t('closed')}</Banner> : null}
        {album?.open && !album.guestUploads ? (
          <p className="text-sm text-muted">{t('guestUploadsOff')}</p>
        ) : null}
        {album?.canUpload ? (
          <div>
            <AddPhotosButton block onFiles={(f) => void upload.run(f)} progress={upload.progress} />
            <p className="mt-1 text-sm text-muted">{t('compressNote')}</p>
          </div>
        ) : null}
        {album?.open ? (
          album.photos.length ? (
            <PhotoGrid photos={album.photos} onOpen={setViewing} />
          ) : (
            <EmptyState icon={<Images className="size-7" />} title={t('empty')} />
          )
        ) : null}
      </div>

      {album && viewing !== null ? (
        <Lightbox
          photos={album.photos}
          index={viewing}
          onIndex={setViewing}
          onClose={() => setViewing(null)}
          actions={(p) => (p.mine ? <DeletePhotoButton onClick={() => void remove(p)} /> : null)}
        />
      ) : null}
    </main>
  );
}
