import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import type { Locale } from '@harusi/i18n';
import { ContentPage } from '@/components/public/content-page';
import { STATIC_ROUTE_SLUGS, pageBySlug } from '@/content';
import { pageMetadata } from '@/content/metadata';

type Params = { params: Promise<{ slug: string }> };

/** Returns the page only when the typed slug matches the current locale's slug. The middleware
 * 301s the wrong-locale case via `routeSlugRedirect`, so here we treat a cross-locale hit as 404. */
function resolve(slug: string, locale: Locale) {
  if (STATIC_ROUTE_SLUGS.has(slug)) return null;
  const match = pageBySlug(slug, 'tz');
  if (!match) return null;
  return match.matchedLocale === locale ? match.page : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const locale = (await getLocale()) as Locale;
  const page = resolve(slug, locale);
  if (!page) return {};
  return pageMetadata(page, locale);
}

export default async function Page({ params }: Params) {
  const { slug } = await params;
  const locale = (await getLocale()) as Locale;
  const page = resolve(slug, locale);
  if (!page) notFound();
  return <ContentPage page={page} locale={locale} />;
}
