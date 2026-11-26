import type { Metadata } from 'next';
import type { Locale } from '@harusi/i18n';
import { DEFAULT_BRANDING } from '@harusi/schemas/branding';
import {
  PUBLIC_ROBOTS,
  absoluteLocaleUrl,
  hreflangMap,
  ogImages,
  twitterSummaryCard,
} from '@/lib/seo';
import { counterpartsOf, marketOf, pagePath, textOf } from './index';
import type { ContentPageDef } from './types';

export function pageMetadata(page: ContentPageDef, locale: Locale): Metadata {
  const t = textOf(page, locale);
  const market = marketOf(page);
  const region = market === 'ke' ? 'KE' : market === 'ug' ? 'UG' : 'TZ';
  const path = pagePath(page, locale);
  const url = absoluteLocaleUrl(path, locale);
  const counterparts = counterpartsOf(page);
  const tzCounterpart = counterparts.find((c) => marketOf(c) === 'tz');
  const languages = hreflangMap(
    market === 'tz' ? pagePath(page, 'en') : path,
    counterparts.map((c) => pagePath(c, 'en')),
    market === 'tz'
      ? pagePath(page, 'sw')
      : tzCounterpart
        ? pagePath(tzCounterpart, 'sw')
        : undefined,
  );
  return {
    title: { absolute: t.title },
    description: t.description,
    robots: PUBLIC_ROBOTS,
    alternates: {
      canonical: url,
      languages,
    },
    openGraph: {
      type: page.schema === 'Article' ? 'article' : 'website',
      siteName: DEFAULT_BRANDING.businessName,
      title: t.title,
      description: t.description,
      locale: `${locale}_${region}`,
      url,
      images: ogImages(locale, market),
    },
    twitter: twitterSummaryCard(t.title, t.description, locale, market),
  };
}
