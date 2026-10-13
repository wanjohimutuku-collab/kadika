import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import { pickMessages, type Locale } from '@harusi/i18n';
import { CodeEntry } from '@/components/card/code-entry';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('short');
  return { title: t('enterTitle'), robots: { index: false } };
}

export default async function CodePage() {
  const locale = (await getLocale()) as Locale;
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={pickMessages(locale, ['short', 'validation', 'card', 'common'])}
    >
      <CodeEntry />
    </NextIntlClientProvider>
  );
}
