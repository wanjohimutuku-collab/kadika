import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import type { Locale } from '@harusi/i18n';
import { ContentPage } from '@/components/public/content-page';
import { getPage } from '@/content';
import { pageMetadata } from '@/content/metadata';

const page = getPage('', 'ke')!;

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata(page, (await getLocale()) as Locale);
}

export default async function KenyaHome() {
  return <ContentPage page={page} locale={(await getLocale()) as Locale} />;
}
