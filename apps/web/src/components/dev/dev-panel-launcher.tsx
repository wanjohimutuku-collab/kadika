'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Wrench } from 'lucide-react';
import type { Locale, Messages } from '@harusi/i18n';

const DevPanelRoot = dynamic(() => import('./dev-panel-root').then((m) => m.DevPanelRoot), {
  ssr: false,
});

/** Tiny launcher; the panel and its i18n runtime are a separate chunk loaded on first open. */
export function DevPanelLauncher({
  label,
  locale,
  messages,
}: {
  label: string;
  locale: Locale;
  messages: Pick<Messages, 'dev' | 'common'>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        title={label}
        data-testid="dev-panel-launcher"
        className="no-print fixed bottom-[88px] left-2 z-[70] inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface/95 text-muted shadow-md hover:text-ink md:right-4 md:bottom-4 md:left-auto"
      >
        <Wrench className="size-5" aria-hidden="true" />
      </button>
      {open ? (
        <DevPanelRoot locale={locale} messages={messages} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
