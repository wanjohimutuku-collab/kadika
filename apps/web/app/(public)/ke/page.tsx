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

/** Kenya home (kit content-ke.md § Home), English only, prices in KES only. */
export async function generateMetadata(): Promise<Metadata> {
  const c = homeCopy('ke', await getPricingOnServer(), SITE_URL.replace(/^https?:\/\//, ''));
  const url = absoluteLocaleUrl('/ke', 'en');
  return {
    title: { absolute: c.title },
    description: c.description,
    robots: PUBLIC_ROBOTS,
    alternates: {
      canonical: url,
      languages: hreflangMap('/ke', ['/', '/ug']),
    },
    openGraph: {
      type: 'website',
      siteName: DEFAULT_BRANDING.businessName,
      title: c.title,
      description: c.description,
      locale: 'en_KE',
      url,
      images: ogImages('en', 'ke'),
    },
    twitter: twitterSummaryCard(c.title, c.description, 'en', 'ke'),
  };
}

export default async function KenyaHome() {
  await connection();
  return <HomePage edition="ke" pricing={await getPricingOnServer()} />;
}
