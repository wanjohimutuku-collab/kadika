import type { Metadata } from 'next';
import { connection } from 'next/server';
import { getLocale } from 'next-intl/server';
import type { Locale } from '@harusi/i18n';
import { DEFAULT_BRANDING } from '@harusi/schemas/branding';
import { HomePage } from '@/components/site/home-page';
import { homeCopy } from '@/content/home';
import {
  PUBLIC_ROBOTS,
  SITE_URL,
  absoluteLocaleUrl,
  hreflangMap,
  ogImages,
  twitterSummaryCard,
} from '@/lib/seo';
import { getPricingOnServer } from '@/lib/server-pricing';

/** `/` is English (the default edition); `/sw` is Swahili (the middleware rewrites `/sw` here). */
export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  const c = homeCopy(locale, await getPricingOnServer(), SITE_URL.replace(/^https?:\/\//, ''));
  const url = absoluteLocaleUrl('/', locale);
  return {
    title: { absolute: c.title },
    description: c.description,
    robots: PUBLIC_ROBOTS,
    alternates: {
      canonical: url,
      languages: hreflangMap('/', ['/ke', '/ug']),
    },
    openGraph: {
      type: 'website',
      siteName: DEFAULT_BRANDING.businessName,
      title: c.title,
      description: c.description,
      locale: locale === 'sw' ? 'sw_TZ' : 'en_TZ',
      url,
      images: ogImages(locale),
    },
    twitter: twitterSummaryCard(c.title, c.description, locale, 'tz'),
  };
}

export default async function Landing() {
  await connection();
  const locale = (await getLocale()) as Locale;
  return <HomePage edition={locale} pricing={await getPricingOnServer()} />;
}
