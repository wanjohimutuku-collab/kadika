'use client';

import { useEffect, useRef, useState } from 'react';
import { cardImageRequest, type CardImageOptions } from './card-canvas';

/**
 * The `<img src>` for a server-drawn card image. Plain designs get the GET URL directly (the
 * browser caches and cancels it); a Card Studio design too large for a URL is POSTed, debounced,
 * and shown from a blob URL. The previous image stays up while the next one renders.
 */
export function useCardImageSrc(
  options: CardImageOptions,
  extra?: Record<string, string>,
): { src: string | null; pending: boolean; failed: boolean } {
  const req = cardImageRequest(options, extra);
  const key = req.body ? `${req.url}\n${req.body}` : req.url;
  const [state, setState] = useState<{ key: string; src: string | null; failed: boolean }>({
    key: '',
    src: null,
    failed: false,
  });
  const current = useRef<string | null>(null);

  useEffect(() => {
    if (!req.body) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(req.url, {
          method: 'POST',
          body: req.body,
          headers: { 'content-type': 'application/json' },
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const url = URL.createObjectURL(await res.blob());
        if (ctrl.signal.aborted) return URL.revokeObjectURL(url);
        const prev = current.current;
        current.current = url;
        setState({ key, src: url, failed: false });
        if (prev) setTimeout(() => URL.revokeObjectURL(prev), 1000);
      } catch {
        if (!ctrl.signal.aborted) setState((s) => ({ ...s, key, failed: true }));
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
    // `key` covers url + body.
  }, [key]);

  useEffect(
    () => () => {
      if (current.current) URL.revokeObjectURL(current.current);
    },
    [],
  );

  if (!req.body) return { src: req.url, pending: false, failed: false };
  return { src: state.src, pending: state.key !== key, failed: state.key === key && state.failed };
}
