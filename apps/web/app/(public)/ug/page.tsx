import type { Metadata } from 'next';
import { connection } from 'next/server';
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

/** Uganda home, English only, honest availability note while Tanzania pilot is live. */
export async function generateMetadata(): Promise<Metadata> {
  const c = homeCopy('ug', await getPricingOnServer(), SITE_URL.replace(/^https?:\/\//, ''));
  const url = absoluteLocaleUrl('/ug', 'en');
  return {
    title: { absolute: c.title },
    description: c.description,
    robots: PUBLIC_ROBOTS,
    alternates: {
      canonical: url,
      languages: hreflangMap('/ug', ['/', '/ke']),
    },
    openGraph: {
      type: 'website',
      siteName: DEFAULT_BRANDING.businessName,
      title: c.title,
      description: c.description,
      locale: 'en_UG',
      url,
      images: ogImages('en', 'ug'),
    },
    twitter: twitterSummaryCard(c.title, c.description, 'en', 'ug'),
  };
}

export default async function UgandaHome() {
  await connection();
  return <HomePage edition="ug" pricing={await getPricingOnServer()} />;
}
