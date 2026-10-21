import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { getLocale, getTranslations } from 'next-intl/server';
import { pickMessages, type Locale } from '@harusi/i18n';
import { SITE_URL } from '@/lib/seo';
import { SHOW_DEV_TOOLS } from '@/lib/env';
import { DevPanelLauncher } from '@/components/dev/dev-panel-launcher';
import { BrandProvider } from '@/components/brand/brand-provider';
import { brandStyle } from '@/lib/branding';
import { getBrandingOnServer } from '@/lib/server-branding';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common');
  // The business name staff chose in /ops/settings (ADR 036); the default brand is the translated name.
  const brand = await getBrandingOnServer();
  const name = brand.updatedAt ? brand.businessName : t('appName');
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: name, template: `%s · ${name}` },
    description: brand.tagline || t('tagline'),
    applicationName: name,
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
  const brand = await getBrandingOnServer();
  return (
    // Browser extensions (Grammarly, etc.) inject attributes into <html>/<body>
    // before hydration; suppress only those two elements' attribute warnings.
    <html lang={locale} style={brandStyle(brand)} suppressHydrationWarning>
      <body className="min-h-dvh antialiased" suppressHydrationWarning>
        <BrandProvider initial={brand}>{children}</BrandProvider>
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
