import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { getLocale, getTranslations } from 'next-intl/server';
import { pickMessages, type Locale } from '@harusi/i18n';
import { SHOW_DEV_TOOLS } from '@/lib/env';
import { DevPanelLauncher } from '@/components/dev/dev-panel-launcher';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common');
  return {
    title: { default: t('appName'), template: `%s · ${t('appName')}` },
    description: t('tagline'),
    applicationName: t('appName'),
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0F5C4D',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = (await getLocale()) as Locale;
  const tDev = await getTranslations('dev');
  return (
    <html lang={locale}>
      <body className="min-h-dvh antialiased">
        {children}
        {SHOW_DEV_TOOLS ? (
          <DevPanelLauncher
            label={tDev('open')}
            locale={locale}
            messages={pickMessages(locale, ['dev', 'common'])}
          />
        ) : null}
      </body>
    </html>
  );
}
