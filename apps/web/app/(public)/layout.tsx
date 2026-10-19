import { BrandMark } from '@/components/brand/brand-provider';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import { pickMessages, type Locale } from '@harusi/i18n';
import { LanguageChip } from '@/components/ui/language-chip';
import { OrnamentBand } from '@/components/card/ornament';
import { localeUrl } from '@/lib/seo';
import { SiteNav } from '@/components/public/site-nav';
import { getPage, pagePath, pagesIn, pagesOf, textOf } from '@/content';
import type { PageGroup } from '@/content/types';

const FOOTER_GROUPS: { group: PageGroup; sw: string; en: string }[] = [
  { group: 'product', sw: 'Huduma', en: 'Services' },
  { group: 'guide', sw: 'Miongozo', en: 'Guides' },
  { group: 'company', sw: 'Kampuni', en: 'Company' },
  { group: 'legal', sw: 'Sheria', en: 'Legal' },
];
const NAV_GROUPS: { group: PageGroup; sw: string; en: string }[] = [
  { group: 'product', sw: 'Huduma', en: 'Services' },
  { group: 'guide', sw: 'Miongozo', en: 'Guides' },
];
const NAV_LINKS = [
  { slug: 'maswali', sw: 'Maswali', en: 'FAQ' },
  { slug: 'kuhusu', sw: 'Kuhusu', en: 'About' },
] as const;
const NAV_LABELS = {
  sw: { menu: 'Fungua menyu', close: 'Funga menyu', main: 'Menyu kuu' },
  en: { menu: 'Open menu', close: 'Close menu', main: 'Main navigation' },
} as const;
const KENYA_LABEL = { sw: 'Kenya', en: 'Kenya' } as const;

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations('common');
  const tl = await getTranslations('landing');
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={pickMessages(locale, ['common', 'auth', 'validation', 'states'])}
    >
      <a
        href="#main"
        className="sr-only z-50 rounded-input bg-primary px-4 py-3 text-on-primary focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {t('skipToContent')}
      </a>
      <header>
        <SiteNav
          brand={
            <Link href="/" className="text-xl">
              <BrandMark />
            </Link>
          }
          groups={NAV_GROUPS.map((g) => ({
            id: g.group,
            label: g[locale],
            links: pagesIn(g.group).map((p) => ({
              href: localeUrl(pagePath(p), locale),
              label: textOf(p, locale).nav,
            })),
          }))}
          links={NAV_LINKS.flatMap((l) => {
            const p = getPage(l.slug);
            return p ? [{ href: localeUrl(pagePath(p), locale), label: l[locale] }] : [];
          })}
          cardLink={{ href: '/k', label: tl('openCard') }}
          cta={{ href: '/login', label: tl('cta') }}
          labels={NAV_LABELS[locale]}
        />
      </header>
      <div id="main">{children}</div>
      <footer className="mt-12 bg-surface">
        <OrnamentBand id="footer-band" />
        <nav
          aria-label="Footer"
          className="mx-auto grid max-w-5xl gap-6 px-4 pt-8 text-sm sm:grid-cols-2 md:grid-cols-5"
        >
          {FOOTER_GROUPS.map((g) => (
            <div key={g.group}>
              <p className="mb-2 font-semibold">{g[locale]}</p>
              <ul className="space-y-1">
                {pagesIn(g.group).map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={localeUrl(pagePath(p), locale)}
                      className="inline-flex min-h-8 items-center underline"
                    >
                      {textOf(p, locale).nav}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <p className="mb-2 font-semibold">{KENYA_LABEL[locale]}</p>
            <ul className="space-y-1">
              {pagesOf('ke').map((p) => (
                <li key={p.slug || 'ke'}>
                  <Link
                    href={localeUrl(pagePath(p), locale)}
                    className="inline-flex min-h-8 items-center underline"
                  >
                    {textOf(p, locale).nav}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 text-sm md:flex-row md:items-center md:justify-between">
          <p className="text-muted">{tl('footerTagline')}</p>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/k" className="inline-flex min-h-10 items-center underline">
              {tl('openCard')}
            </Link>
            <LanguageChip />
          </nav>
        </div>
      </footer>
    </NextIntlClientProvider>
  );
}
