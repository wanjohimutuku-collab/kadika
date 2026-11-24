'use client';

import { useEffect, useState } from 'react';
import type { MemoryPhotoSize } from '@harusi/api-client';
import { getRepository } from '@/lib/repo';

/** A Kumbukumbu photo for the console: the API needs the Bearer token, so it is fetched as a blob. */
export function MemoryPhoto({
  eventId,
  memoryId,
  alt,
  width,
  height,
  size = 'medium',
  className = 'h-auto w-full rounded-card',
}: {
  eventId: string;
  memoryId: string;
  alt: string;
  width: number;
  height: number;
  size?: MemoryPhotoSize;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let url: string | null = null;
    let live = true;
    getRepository()
      .fetchMemoryPhoto(eventId, memoryId, size)
      .then((b) => {
        if (!live) return;
        url = URL.createObjectURL(b);
        setSrc(url);
      })
      .catch(() => {});
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [eventId, memoryId, size]);
  return src ? (
    <img src={src} alt={alt} width={width} height={height} className={className} />
  ) : (
    <div
      className="w-full animate-pulse rounded-card bg-border"
      style={{ aspectRatio: `${width} / ${height}` }}
      aria-hidden="true"
    />
  );
}
