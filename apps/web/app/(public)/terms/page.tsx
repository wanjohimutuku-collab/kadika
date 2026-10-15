import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import type { Locale } from '@harusi/i18n';
import { ContentPage } from '@/components/public/content-page';
import { getPage, textOf } from '@/content';

const page = getPage('terms')!;

export async function generateMetadata(): Promise<Metadata> {
  const t = textOf(page, (await getLocale()) as Locale);
  return { title: { absolute: t.title }, description: t.description };
}

export default async function TermsPage() {
  return <ContentPage page={page} locale={(await getLocale()) as Locale} />;
}
