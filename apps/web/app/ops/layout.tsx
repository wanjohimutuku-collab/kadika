import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import { pickMessages, type Locale } from '@harusi/i18n';
import { ConsoleProviders } from '@/components/console/providers';
import { OpsShell } from '@/components/ops/ops-shell';

export async function generateMetadata(): Promise<Metadata> {
  // The root layout appends the business name: "Staff operations · Kadi Sasa".
  const t = await getTranslations('ops');
  return { robots: { index: false, follow: false }, title: t('title') };
}

/** Staff-only operations panel (/ops). Separate from the customer console (/app). */
export default async function OpsLayout({ children }: { children: ReactNode }) {
  const locale = (await getLocale()) as Locale;
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={pickMessages(locale, [
        'ops',
        'common',
        'nav',
        'states',
        'validation',
        'status',
        'channel',
        'pay',
        'guestDetail',
        'wizard',
      ])}
    >
      <ConsoleProviders>
        <OpsShell>{children}</OpsShell>
      </ConsoleProviders>
    </NextIntlClientProvider>
  );
}
