import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import type { Locale } from '@harusi/i18n';
import { SeoLinks } from '@/components/public/seo-links';
import { LegalPage } from '@/components/public/legal-page';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: (await getTranslations('legal'))('termsTitle'),
  };
}

export default async function TermsPage() {
  const locale = (await getLocale()) as Locale;
  return (
    <>
      <SeoLinks path="/terms" locale={locale} />
      <LegalPage kind="terms" />
    </>
  );
}
