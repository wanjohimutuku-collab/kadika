'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, ImagePlus, Trash2, X } from 'lucide-react';
import { isRepositoryError, type AlbumPhoto } from '@harusi/api-client';
import { Button, IconButton } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { MAX_PHOTO_BYTES, shrinkPhoto } from '@/lib/shrink-photo';

/** Square thumbnails (≈30–60 KB each), lazy-loaded so a long album costs little data. */
export function PhotoGrid({
  photos,
  onOpen,
}: {
  photos: AlbumPhoto[];
  onOpen: (index: number) => void;
}) {
  const t = useTranslations('album');
  return (
    <ul
      className="grid grid-cols-3 gap-1 sm:grid-cols-4 md:gap-2 lg:grid-cols-5"
      data-testid="photo-grid"
    >
      {photos.map((p, i) => (
        <li key={p.id}>
          <button
            type="button"
            onClick={() => onOpen(i)}
            className="block aspect-square w-full overflow-hidden rounded-input bg-border/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label={t('open', { n: i + 1, total: photos.length })}
          >
            <img
              src={p.thumbUrl}
              alt={p.caption ?? t('photo', { name: p.uploaderName })}
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
            />
          </button>
        </li>
      ))}
    </ul>
  );
}

/** One photo at full size, with previous/next and a slot for actions (delete). */
export function Lightbox({
  photos,
  index,
  onIndex,
  onClose,
  actions,
}: {
  photos: AlbumPhoto[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  actions?: (photo: AlbumPhoto) => ReactNode;
}) {
  const t = useTranslations('album');
  const tc = useTranslations('common');
  const closeRef = useRef<HTMLButtonElement>(null);
  const photo = photos[index];
  const go = useCallback(
    (d: number) => onIndex((index + d + photos.length) % photos.length),
    [index, onIndex, photos.length],
  );
  useEffect(() => {
    closeRef.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [go, onClose]);
  if (!photo) return null;
  const many = photos.length > 1;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={photo.caption ?? t('photo', { name: photo.uploaderName })}
      className="fixed inset-0 z-50 flex flex-col bg-black text-white"
      data-testid="lightbox"
    >
      <div className="flex items-center justify-between gap-2 p-2">
        <p className="min-w-0 truncate px-2 text-sm">
          {t('by', { name: photo.uploaderName })}
          {photo.caption ? ` · ${photo.caption}` : ''}
        </p>
        <div className="flex items-center gap-1">
          {actions?.(photo)}
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={tc('close')}
            className="inline-flex size-12 items-center justify-center rounded-full hover:bg-white/15"
          >
            <X className="size-6" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        <img
          key={photo.id}
          src={photo.url}
          alt={photo.caption ?? t('photo', { name: photo.uploaderName })}
          className="max-h-full max-w-full object-contain"
          decoding="async"
        />
        {many ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label={t('prev')}
              className="absolute left-2 inline-flex size-12 items-center justify-center rounded-full bg-black/50 hover:bg-black/70"
            >
              <ChevronLeft className="size-6" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label={t('next')}
              className="absolute right-2 inline-flex size-12 items-center justify-center rounded-full bg-black/50 hover:bg-black/70"
            >
              <ChevronRight className="size-6" aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>
      <p className="p-3 text-center text-sm text-white/70" aria-live="polite">
        {index + 1} / {photos.length}
      </p>
    </div>
  );
}

export interface UploadProgress {
  done: number;
  total: number;
}

/**
 * Sends the chosen photos one at a time (a phone on 3G should not open ten uploads at once), each
 * shrunk in the browser first. Reports how many were added and why the others failed.
 */
export function useAlbumUpload(
  upload: (file: Blob) => Promise<unknown>,
  onFinished: (r: { added: number; failed: number; message: string | null }) => void,
) {
  const t = useTranslations('album');
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const run = async (files: File[]) => {
    if (!files.length) return;
    let added = 0;
    let failed = 0;
    let message: string | null = null;
    setProgress({ done: 0, total: files.length });
    for (const [i, file] of files.entries()) {
      try {
        const blob = await shrinkPhoto(file);
        if (blob.size > MAX_PHOTO_BYTES) throw new Error('too_big');
        await upload(blob);
        added++;
      } catch (e) {
        failed++;
        const reason = isRepositoryError(e) ? (e.details?.reason as string | undefined) : undefined;
        message =
          e instanceof Error && e.message === 'too_big'
            ? t('tooBig')
            : reason === 'album.not_image'
              ? t('notImage')
              : reason === 'album.guest_limit'
                ? t('limit')
                : reason === 'album.too_large'
                  ? t('tooBig')
                  : message;
        // Past the limit or closed: the rest would fail the same way.
        if (
          reason === 'album.guest_limit' ||
          reason === 'album.closed' ||
          reason === 'album.full'
        ) {
          failed += files.length - i - 1;
          break;
        }
      }
      setProgress({ done: i + 1, total: files.length });
    }
    setProgress(null);
    onFinished({ added, failed, message });
  };
  return { progress, run };
}

/** "Add photos": a real file input (camera or gallery on phones), styled as the primary button. */
export function AddPhotosButton({
  onFiles,
  progress,
  disabled,
  block,
  className,
}: {
  onFiles: (files: File[]) => void;
  progress: UploadProgress | null;
  disabled?: boolean;
  block?: boolean;
  className?: string;
}) {
  const t = useTranslations('album');
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        data-testid="photo-input"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          onFiles(files);
        }}
      />
      <Button
        className={cn(className)}
        block={block}
        size={block ? 'lg' : 'md'}
        icon={<ImagePlus className="size-5" aria-hidden="true" />}
        loading={!!progress}
        loadingLabel={progress ? t('uploading', { ...progress }) : undefined}
        disabled={disabled}
        onClick={() => input.current?.click()}
      >
        {t('add')}
      </Button>
    </>
  );
}

export function DeletePhotoButton({ onClick }: { onClick: () => void }) {
  const t = useTranslations('album');
  return (
    <IconButton
      label={t('delete')}
      icon={<Trash2 className="size-6" aria-hidden="true" />}
      onClick={onClick}
      className="text-white hover:bg-white/15"
    />
  );
}
