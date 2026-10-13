'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import type { Locale } from '@harusi/i18n';
import { persistLocale } from '@/lib/locale-client';
import { cn } from '@/lib/cn';

/** "SW | EN" chip (§17.1): both options visible, current one marked; persists in a cookie. */
export function LanguageChip({
  className,
  tone = 'default',
}: {
  className?: string;
  tone?: 'default' | 'inverse';
}) {
  const locale = useLocale() as Locale;
  const t = useTranslations('common');
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
        'inline-flex items-center rounded-full border p-0.5 text-sm font-semibold',
        tone === 'inverse' ? 'border-white/40' : 'border-border bg-surface',
        pending && 'opacity-60',
        className,
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
            l === locale
              ? tone === 'inverse'
                ? 'bg-white text-ink'
                : 'bg-primary text-on-primary'
              : tone === 'inverse'
                ? 'text-white'
                : 'text-muted hover:text-ink',
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
