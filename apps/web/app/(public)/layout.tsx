import { BrandMark } from '@/components/brand/brand-provider';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { headers } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { pickMessages, type Locale } from '@harusi/i18n';
import { cn } from '@/lib/cn';
import { figtree, fraunces } from '@/lib/fonts';
import { localeUrl } from '@/lib/seo';
import { editionTargets, type SiteEdition } from '@/lib/site-nav';
import { SiteNav } from '@/components/public/site-nav';
import { LocaleSwitch } from '@/components/site/locale-switch';
import { FOOTER_LINE, SiteFooter, type FooterColumn } from '@/components/site/site-footer';
import { getPage, pagePath, pagesIn, pagesOf, textOf } from '@/content';
import type { ContentPageDef } from '@/content/types';
import { SITE_UI } from '@/content/site-ui';
import { APP_DOWNLOAD_PATH } from '@/lib/app-download';
import { PRICING_PATH } from '@/lib/server-pricing';

const link = (p: ContentPageDef, locale: Locale) => ({
  href: localeUrl(pagePath(p), locale),
  label: textOf(p, locale).nav,
});

/**
 * Public site shell (kit brand.md + sitemap.md): `.ks` brand scope, Figtree, header with at most five
 * items plus the call to action, the locale switch, and the market's own footer.
 */
export default async function PublicLayout({ children }: { children: ReactNode }) {
  const locale = (await getLocale()) as Locale;
  const h = await headers();
  const market = h.get('x-hp-market') === 'ke' ? 'ke' : 'tz';
  const path = h.get('x-hp-path') ?? (market === 'ke' ? '/ke' : '/');
  const edition: SiteEdition = market === 'ke' ? 'ke' : locale;
  const ui = SITE_UI[edition];
  const targets = editionTargets(path);
  const tzPage = (slug: string) => getPage(slug);
  const about = tzPage('kuhusu');
  const contact = tzPage('mawasiliano');
  const faq = tzPage('maswali');

  const groups =
    market === 'ke'
      ? [
          {
            id: 'guides',
            label: ui.guides,
            links: pagesOf('ke')
              .filter((p) => p.slug && p.group !== 'legal')
              .map((p) => link(p, 'en')),
          },
        ]
      : [
          {
            id: 'services',
            label: ui.services,
            links: pagesIn('product').map((p) => link(p, locale)),
          },
          { id: 'guides', label: ui.guides, links: pagesIn('guide').map((p) => link(p, locale)) },
        ];
  const links = [
    ...(market === 'tz' ? [{ href: localeUrl(PRICING_PATH, locale), label: ui.pricing }] : []),
    ...(about
      ? [{ href: localeUrl(pagePath(about), market === 'ke' ? 'en' : locale), label: ui.about }]
      : []),
  ];
  const cta =
    market === 'ke'
      ? { href: contact ? localeUrl(pagePath(contact), 'en') : '/en', label: ui.cta }
      : { href: '/login', label: ui.cta };

  const footerLocale: Locale = market === 'ke' ? 'en' : locale;
  const columns: FooterColumn[] =
    market === 'ke'
      ? [
          {
            title: ui.guides,
            links: pagesOf('ke')
              .filter((p) => p.group !== 'legal')
              .map((p) => link(p, 'en')),
          },
          { title: ui.company, links: pagesIn('company').map((p) => link(p, 'en')) },
          {
            title: ui.legal,
            links: pagesOf('ke')
              .filter((p) => p.group === 'legal')
              .map((p) => link(p, 'en')),
          },
        ]
      : [
          { title: ui.services, links: pagesIn('product').map((p) => link(p, locale)) },
          { title: ui.guides, links: pagesIn('guide').map((p) => link(p, locale)) },
          {
            title: ui.company,
            links: [
              ...pagesIn('company').map((p) => link(p, locale)),
              { href: localeUrl(PRICING_PATH, locale), label: ui.pricing },
              { href: localeUrl(APP_DOWNLOAD_PATH, locale), label: ui.app },
            ],
          },
          { title: ui.legal, links: pagesIn('legal').map((p) => link(p, locale)) },
        ];
  const bottomLinks = [
    { href: '/k', label: ui.card },
    ...(faq ? [{ href: localeUrl(pagePath(faq), footerLocale), label: ui.faq }] : []),
    ...(market === 'tz' ? [{ href: '/ke', label: ui.kenya }] : []),
  ];

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={pickMessages(locale, ['common', 'auth', 'validation', 'states'])}
    >
      <div
        className={cn('ks min-h-dvh', figtree.variable, fraunces.variable)}
        lang={edition === 'sw' ? 'sw' : 'en'}
      >
        <a
          href="#main"
          className="sr-only z-50 rounded-ks bg-ks-green-700 px-4 py-3 text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          {ui.skip}
        </a>
        <SiteNav
          brand={
            <Link
              href={market === 'ke' ? '/ke' : localeUrl('/', locale)}
              className="inline-flex min-h-11 items-center text-xl"
            >
              <BrandMark />
            </Link>
          }
          groups={groups}
          links={links}
          cardLink={{ href: '/k', label: ui.card }}
          cta={cta}
          labels={ui.menu}
          localeSwitch={<LocaleSwitch current={edition} targets={targets} label={ui.switchLabel} />}
        />
        <div id="main">{children}</div>
        <SiteFooter
          market={market}
          line={FOOTER_LINE[edition]}
          columns={columns}
          brand={<BrandMark />}
          bottomLinks={bottomLinks}
          localeSwitch={
            <LocaleSwitch
              current={edition}
              targets={targets}
              label={ui.switchLabel}
              up
              align="left"
            />
          }
        />
      </div>
    </NextIntlClientProvider>
  );
}
