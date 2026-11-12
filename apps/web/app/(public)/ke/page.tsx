import type { Metadata } from 'next';
import { connection } from 'next/server';
import { DEFAULT_BRANDING } from '@harusi/schemas/branding';
import { HomePage } from '@/components/site/home-page';
import { homeCopy } from '@/content/home';
import { SITE_URL, absoluteLocaleUrl, ogImages } from '@/lib/seo';
import { getPricingOnServer } from '@/lib/server-pricing';

/** Kenya home (kit content-ke.md § Home), English only, prices in KES only. */
export async function generateMetadata(): Promise<Metadata> {
  const c = homeCopy('ke', await getPricingOnServer(), SITE_URL.replace(/^https?:\/\//, ''));
  return {
    title: { absolute: c.title },
    description: c.description,
    openGraph: {
      type: 'website',
      siteName: DEFAULT_BRANDING.businessName,
      title: c.title,
      description: c.description,
      locale: 'en_KE',
      url: absoluteLocaleUrl('/ke', 'en'),
      images: ogImages('en', 'ke'),
    },
  };
}

export default async function KenyaHome() {
  await connection();
  return <HomePage edition="ke" pricing={await getPricingOnServer()} />;
}
