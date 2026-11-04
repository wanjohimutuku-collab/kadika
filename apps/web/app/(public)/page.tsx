import type { Metadata } from 'next';
import { connection } from 'next/server';
import { getLocale } from 'next-intl/server';
import type { Locale } from '@harusi/i18n';
import { DEFAULT_BRANDING } from '@harusi/schemas/branding';
import { HomePage } from '@/components/site/home-page';
import { homeCopy } from '@/content/home';
import { SITE_URL, absoluteLocaleUrl } from '@/lib/seo';
import { getPricingOnServer } from '@/lib/server-pricing';

/** `/` is Swahili, `/en` English (the middleware rewrites `/en` here). */
export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  const c = homeCopy(locale, await getPricingOnServer(), SITE_URL.replace(/^https?:\/\//, ''));
  return {
    title: { absolute: c.title },
    description: c.description,
    openGraph: {
      type: 'website',
      siteName: DEFAULT_BRANDING.businessName,
      title: c.title,
      description: c.description,
      locale: locale === 'sw' ? 'sw_TZ' : 'en_TZ',
      url: absoluteLocaleUrl('/', locale),
    },
  };
}

export default async function Landing() {
  await connection();
  const locale = (await getLocale()) as Locale;
  return <HomePage edition={locale} pricing={await getPricingOnServer()} />;
}
