import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import type { Locale } from '@harusi/i18n';
import { ContentPage } from '@/components/public/content-page';
import { absoluteLocaleUrl } from '@/lib/seo';
import { STATIC_ROUTE_SLUGS, getPage, textOf } from '@/content';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const page = getPage(slug);
  if (!page || STATIC_ROUTE_SLUGS.has(slug)) return {};
  const locale = (await getLocale()) as Locale;
  const t = textOf(page, locale);
  return {
    title: { absolute: t.title },
    description: t.description,
    openGraph: {
      type: page.schema === 'Article' ? 'article' : 'website',
      siteName: 'Harusi Pass',
      title: t.title,
      description: t.description,
      locale: locale === 'sw' ? 'sw_TZ' : 'en_TZ',
      url: absoluteLocaleUrl(`/${slug}`, locale),
    },
  };
}

export default async function Page({ params }: Params) {
  const { slug } = await params;
  const page = getPage(slug);
  if (!page || STATIC_ROUTE_SLUGS.has(slug)) notFound();
  const locale = (await getLocale()) as Locale;
  return <ContentPage page={page} locale={locale} />;
}
