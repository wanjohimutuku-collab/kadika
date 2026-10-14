import { defaultLocale, type Locale } from '@harusi/i18n';
import { absoluteLocaleUrl } from '@/lib/seo';

/**
 * Canonical and hreflang links. Next's `metadata.alternates` drops query strings, and language URLs
 * here are `?lang=en`, so these are rendered directly (React hoists `<link>` into the head).
 */
export function SeoLinks({ path, locale }: { path: string; locale: Locale }) {
  return (
    <>
      <link rel="canonical" href={absoluteLocaleUrl(path, locale)} />
      <link rel="alternate" hrefLang="sw" href={absoluteLocaleUrl(path, 'sw')} />
      <link rel="alternate" hrefLang="en" href={absoluteLocaleUrl(path, 'en')} />
      <link rel="alternate" hrefLang="x-default" href={absoluteLocaleUrl(path, defaultLocale)} />
    </>
  );
}
