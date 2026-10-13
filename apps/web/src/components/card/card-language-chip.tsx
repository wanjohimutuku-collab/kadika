'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Locale } from '@harusi/i18n';
import { persistLocale } from '@/lib/locale-client';
import { useTinyLocale, useTinyT } from '@/lib/tiny-intl';
import { cn } from '@/lib/cn';

/** Guest-card variant of the SW | EN chip, using the tiny translator (no i18n runtime on the card). */
export function CardLanguageChip() {
  const locale = useTinyLocale();
  const t = useTinyT('common');
  const router = useRouter();
  const [pending, start] = useTransition();
  const choose = (l: Locale) => {
    if (l === locale) return;
    persistLocale(l);
    start(() => router.refresh());
  };
  return (
    <div
      role="group"
      aria-label={t('language')}
      className={cn(
        'inline-flex items-center rounded-full border border-border bg-surface p-0.5 text-sm font-semibold',
        pending && 'opacity-60',
      )}
    >
      {(['sw', 'en'] as const).map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={l === locale}
          aria-label={t('switchTo', { lang: t(`languageName.${l}`) })}
          onClick={() => choose(l)}
          className={cn(
            'min-h-10 min-w-11 rounded-full px-2.5 uppercase',
            l === locale ? 'bg-primary text-on-primary' : 'text-muted hover:text-ink',
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
