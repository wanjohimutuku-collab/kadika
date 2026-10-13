import type { ReactNode } from 'react';
import Link from 'next/link';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import { pickMessages, type Locale } from '@harusi/i18n';
import { LanguageChip } from '@/components/ui/language-chip';
import { OrnamentBand } from '@/components/card/ornament';

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations('common');
  const tl = await getTranslations('landing');
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={pickMessages(locale, ['common', 'auth', 'validation', 'states'])}
    >
      <a
        href="#main"
        className="sr-only z-50 rounded-input bg-primary px-4 py-3 text-on-primary focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {t('skipToContent')}
      </a>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-3 px-4">
          <Link href="/" className="text-xl font-semibold text-primary">
            {t('appName')}
          </Link>
          <LanguageChip />
        </div>
      </header>
      <div id="main">{children}</div>
      <footer className="mt-12 bg-surface">
        <OrnamentBand id="footer-band" />
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 text-sm md:flex-row md:items-center md:justify-between">
          <p className="text-muted">{tl('footerTagline')}</p>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/privacy" className="inline-flex min-h-10 items-center underline">
              {t('privacy')}
            </Link>
            <Link href="/terms" className="inline-flex min-h-10 items-center underline">
              {t('terms')}
            </Link>
            <Link href="/k" className="inline-flex min-h-10 items-center underline">
              {tl('openCard')}
            </Link>
            <LanguageChip />
          </nav>
        </div>
      </footer>
    </NextIntlClientProvider>
  );
}
