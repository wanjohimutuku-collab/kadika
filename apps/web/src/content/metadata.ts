import type { Metadata } from 'next';
import type { Locale } from '@harusi/i18n';
import { DEFAULT_BRANDING } from '@harusi/schemas/branding';
import { absoluteLocaleUrl } from '@/lib/seo';
import { marketOf, pagePath, textOf } from './index';
import type { ContentPageDef } from './types';

export function pageMetadata(page: ContentPageDef, locale: Locale): Metadata {
  const t = textOf(page, locale);
  const region = marketOf(page) === 'ke' ? 'KE' : 'TZ';
  return {
    title: { absolute: t.title },
    description: t.description,
    openGraph: {
      type: page.schema === 'Article' ? 'article' : 'website',
      siteName: DEFAULT_BRANDING.businessName,
      title: t.title,
      description: t.description,
      locale: `${locale}_${region}`,
      url: absoluteLocaleUrl(pagePath(page), locale),
    },
  };
}
