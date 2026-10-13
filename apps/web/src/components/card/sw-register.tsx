'use client';

import { useEffect } from 'react';

/** Registers the guest-card service worker after load and hands it the assets already fetched. */
export function SwRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return;
    const register = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        const reg = await navigator.serviceWorker.ready;
        const urls = [
          location.pathname,
          ...performance.getEntriesByType('resource').map((e) => e.name),
        ];
        reg.active?.postMessage({ type: 'cache-urls', urls });
      } catch {
        // Offline support is progressive; the card still works online.
      }
    };
    if (document.readyState === 'complete') void register();
    else window.addEventListener('load', () => void register(), { once: true });
  }, []);
  return null;
}
