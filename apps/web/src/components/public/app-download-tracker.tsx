'use client';

import { useEffect } from 'react';
import { emit } from '@/lib/analytics-client';

/** Listens for clicks on Android Play Store / APK download links and emits `gate_app_installed`. */
export function AppDownloadTracker() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement | null)?.closest(
        '[data-testid="app-download-play"], [data-testid="app-download-apk"]',
      );
      if (!target) return;
      const channel = target.getAttribute('data-testid') === 'app-download-play' ? 'play' : 'apk';
      emit('gate_app_installed', { channel });
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  return null;
}
