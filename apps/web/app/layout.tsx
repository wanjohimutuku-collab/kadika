import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { getLocale, getTranslations } from 'next-intl/server';
import { pickMessages, type Locale } from '@harusi/i18n';
import { SITE_URL } from '@/lib/seo';
import { SHOW_DEV_TOOLS } from '@/lib/env';
import { DevPanelLauncher } from '@/components/dev/dev-panel-launcher';
import { BrandProvider } from '@/components/brand/brand-provider';
import { brandStyle, resolveLogoSrc } from '@/lib/branding';
import { getBrandingOnServer } from '@/lib/server-branding';
import './globals.css';

/**
 * Search Console and Bing Webmaster ownership tags, from build-time variables (infra/coolify/README.md).
 * Nothing is rendered when a value is unset, for example when the property is verified by DNS.
 */
function siteVerification(): Pick<Metadata, 'verification'> {
  const google = (process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? '').trim();
  const bing = (process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ?? '').trim();
  if (!google && !bing) return {};
  return {
    verification: {
      ...(google ? { google } : {}),
      ...(bing ? { other: { 'msvalidate.01': bing } } : {}),
    },
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common');
  // The business name staff chose in /ops/settings (ADR 036); the default brand is the translated name.
  const brand = await getBrandingOnServer();
  const name = brand.updatedAt ? brand.businessName : t('appName');
  const faviconSrc = resolveLogoSrc(brand.faviconUrl);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: name, template: `%s · ${name}` },
    description: brand.tagline || t('tagline'),
    applicationName: name,
    formatDetection: { telephone: false },
    ...siteVerification(),
    ...(faviconSrc
      ? {
          icons: {
            icon: [{ url: faviconSrc, type: brand.faviconMime ?? undefined }],
            shortcut: [faviconSrc],
          },
        }
      : {}),
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0A2640',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = (await getLocale()) as Locale;
  const tDev = await getTranslations('dev');
  const brand = await getBrandingOnServer();
  return (
    // Browser extensions (Grammarly, etc.) inject attributes into <html>/<body>
    // before hydration; suppress only those two elements' attribute warnings.
    <html lang={locale} style={brandStyle(brand)} suppressHydrationWarning>
      <head>
        <link
          rel="alternate"
          type="text/plain"
          href="/llms.txt"
          title="Kadi Sasa AI index (llms.txt)"
        />
      </head>
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
