import type { Locale } from '@harusi/i18n';
import { absoluteLocaleUrl, hreflangMap } from '@/lib/seo';

/**
 * Canonical and hreflang links. Next's `metadata.alternates` drops query strings, and language URLs
 * here are `?lang=`, so these are rendered directly (React hoists `<link>` into the head).
 */
export function SeoLinks({
  path,
  locale,
  counterpartPath,
}: {
  path: string;
  locale: Locale;
  counterpartPath?: string;
}) {
  return (
    <>
      <link rel="canonical" href={absoluteLocaleUrl(path, locale)} />
      {Object.entries(hreflangMap(path, counterpartPath)).map(([hreflang, href]) => (
        <link key={hreflang} rel="alternate" hrefLang={hreflang} href={href} />
      ))}
    </>
  );
}
