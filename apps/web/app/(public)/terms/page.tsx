import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { LegalPage } from '@/components/public/legal-page';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('legal'))('termsTitle') };
}

export default function TermsPage() {
  return <LegalPage kind="terms" />;
}
