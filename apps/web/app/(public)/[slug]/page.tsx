import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import type { Locale } from '@harusi/i18n';
import { ContentPage } from '@/components/public/content-page';
import { STATIC_ROUTE_SLUGS, getPage } from '@/content';
import { pageMetadata } from '@/content/metadata';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const page = getPage(slug);
  if (!page || STATIC_ROUTE_SLUGS.has(slug)) return {};
  return pageMetadata(page, (await getLocale()) as Locale);
}

export default async function Page({ params }: Params) {
  const { slug } = await params;
  const page = getPage(slug);
  if (!page || STATIC_ROUTE_SLUGS.has(slug)) notFound();
  return <ContentPage page={page} locale={(await getLocale()) as Locale} />;
}
