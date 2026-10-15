import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import type { Locale } from '@harusi/i18n';
import { ContentPage } from '@/components/public/content-page';
import { getPage } from '@/content';
import { pageMetadata } from '@/content/metadata';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const page = getPage((await params).slug, 'ke');
  return page ? pageMetadata(page, (await getLocale()) as Locale) : {};
}

export default async function KenyaPage({ params }: Params) {
  const page = getPage((await params).slug, 'ke');
  if (!page) notFound();
  return <ContentPage page={page} locale={(await getLocale()) as Locale} />;
}
