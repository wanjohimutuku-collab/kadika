import type { Locale } from '@harusi/i18n';
import { absoluteLocaleUrl, hreflangMap } from '@/lib/seo';

/**
 * Canonical and hreflang links, rendered directly (React hoists `<link>` into the head) so every page
 * builds them the same way from its route path.
 */
export function SeoLinks({
  path,
  locale,
  counterpartPath,
  swPath,
  enPath,
}: {
  path: string;
  locale: Locale;
  counterpartPath?: string;
  /** TZ SW slug path (bare, no `/sw` prefix). Pass on TZ content pages where SW and EN slugs differ. */
  swPath?: string;
  /** TZ EN slug path. Pass on TZ content pages where SW and EN slugs differ. */
  enPath?: string;
}) {
  const anchor = enPath ?? path;
  return (
    <>
      <link rel="canonical" href={absoluteLocaleUrl(path, locale)} />
      {Object.entries(hreflangMap(anchor, counterpartPath, swPath)).map(([hreflang, href]) => (
        <link key={hreflang} rel="alternate" hrefLang={hreflang} href={href} />
      ))}
    </>
  );
}
