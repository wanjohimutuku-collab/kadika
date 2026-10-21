import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { pickMessages, type Locale } from '@harusi/i18n';
import { ConsoleProviders } from '@/components/console/providers';
import { AuthGuard } from '@/components/console/auth-guard';
import { displaySerif } from '@/lib/fonts';

const CONSOLE_NAMESPACES = [
  'common',
  'billing',
  'welcome',
  'nav',
  'validation',
  'states',
  'pay',
  'status',
  'timelineStatus',
  'channel',
  'events',
  'wizard',
  'overview',
  'guests',
  'guestForm',
  'import',
  'guestDetail',
  'send',
  'cards',
  'card',
  'pledges',
  'gate',
  'team',
  'reports',
  'settings',
  'account',
  'devStates',
] as const;

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  const locale = (await getLocale()) as Locale;
  return (
    <NextIntlClientProvider locale={locale} messages={pickMessages(locale, CONSOLE_NAMESPACES)}>
      <ConsoleProviders>
        <div className={displaySerif.variable}>
          <AuthGuard>{children}</AuthGuard>
        </div>
      </ConsoleProviders>
    </NextIntlClientProvider>
  );
}
