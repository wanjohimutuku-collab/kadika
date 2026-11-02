'use client';

import { useEffect, useState } from 'react';
import { getRepository } from '@/lib/repo';

/** A Kumbukumbu thumbnail for the console: the API needs the Bearer token, so it is fetched as a blob. */
export function MemoryPhoto({
  eventId,
  memoryId,
  alt,
  width,
  height,
}: {
  eventId: string;
  memoryId: string;
  alt: string;
  width: number;
  height: number;
}) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let url: string | null = null;
    let live = true;
    getRepository()
      .fetchMemoryPhoto(eventId, memoryId, 'thumb')
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
  }, [eventId, memoryId]);
  return src ? (
    <img src={src} alt={alt} width={width} height={height} className="h-auto w-full rounded-card" />
  ) : (
    <div
      className="w-full animate-pulse rounded-card bg-border"
      style={{ aspectRatio: `${width} / ${height}` }}
      aria-hidden="true"
    />
  );
}
