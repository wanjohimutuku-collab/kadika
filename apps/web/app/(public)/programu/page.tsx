import type { Metadata } from 'next';
import { SiteLink as Link } from '@/components/site/site-link';
import { connection } from 'next/server';
import { getLocale, getTranslations } from 'next-intl/server';
import {
  ArrowUpRight,
  Clock,
  Download,
  HandCoins,
  ScanLine,
  Send,
  ShieldCheck,
  Smartphone,
  Ticket,
} from 'lucide-react';
import type { Locale } from '@harusi/i18n';
import { JsonLd } from '@/components/site/json-ld';
import {
  ORG_ID,
  PUBLIC_ROBOTS,
  SITE_URL,
  absoluteLocaleUrl,
  localeUrl,
  ogImages,
  organizationNode,
  twitterSummaryCard,
} from '@/lib/seo';
import { getBrandingOnServer } from '@/lib/server-branding';
import { APP_APK_PATH, APP_DOWNLOAD_PATH, appLinksFrom, hostOf } from '@/lib/app-download';
import { getAndroidReleaseOnServer } from '@/lib/server-app-release';
import { APP_DOMAIN } from '@/lib/env';
import { AppDownloadTracker } from '@/components/public/app-download-tracker';
import { AppMockup } from '@/components/site/mockups';
import { homeCopy } from '@/content/home';
import { getPricingOnServer } from '@/lib/server-pricing';
import { getPage, pagePath, textOf } from '@/content';

const FEATURES = [
  { key: 'send', icon: Send },
  { key: 'track', icon: HandCoins },
  { key: 'gate', icon: ScanLine },
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('appDownload');
  const locale = (await getLocale()) as Locale;
  const brand = (await getBrandingOnServer()).businessName;
  const title = t('metaTitle', { brand });
  const description = t('metaDescription', { brand });
  const url = absoluteLocaleUrl(APP_DOWNLOAD_PATH, locale);
  return {
    title: { absolute: title },
    description,
    robots: PUBLIC_ROBOTS,
    alternates: {
      canonical: url,
      languages: {
        'en-TZ': absoluteLocaleUrl(APP_DOWNLOAD_PATH, 'en'),
        'sw-TZ': absoluteLocaleUrl(APP_DOWNLOAD_PATH, 'sw'),
        'x-default': absoluteLocaleUrl(APP_DOWNLOAD_PATH, 'en'),
      },
    },
    openGraph: {
      type: 'website',
      siteName: brand,
      title,
      description,
      locale: locale === 'sw' ? 'sw_TZ' : 'en_TZ',
      url,
      images: ogImages(locale),
    },
    twitter: twitterSummaryCard(title, description, locale, 'tz'),
  };
}

/**
 * Where visitors get the Android app (organizers, committee, gate staff). The store and APK links are
 * runtime settings (see `lib/app-download`), so this page renders per request; with neither set it says
 * the app is coming and points to the browser console, never at a dead button.
 */
export default async function AppDownloadPage() {
  await connection();
  const links = appLinksFrom(process.env);
  // An APK staff uploaded in /ops downloads from our own domain (ADR 047); ANDROID_APK_URL is the fallback.
  const release = await getAndroidReleaseOnServer();
  const apk = release
    ? { href: APP_APK_PATH, host: APP_DOMAIN }
    : links.apk
      ? { href: links.apk, host: hostOf(links.apk) }
      : null;
  const available = Boolean(links.play || apk);
  const t = await getTranslations('appDownload');
  const locale = (await getLocale()) as Locale;
  const brand = (await getBrandingOnServer()).businessName;
  const mock = homeCopy(locale, await getPricingOnServer(), APP_DOMAIN).app.mock;
  const pageUrl = absoluteLocaleUrl(APP_DOWNLOAD_PATH, locale);
  const faqPage = getPage('maswali');
  const faqHref = faqPage ? localeUrl(pagePath(faqPage, locale), locale) : localeUrl('/faq', locale);
  const relatedSlugs = ['lango-la-harusi-qr', 'michango-ya-harusi', 'kadi-ya-harusi-mtandaoni'];
  const relatedGuides = relatedSlugs
    .map((s) => getPage(s))
    .filter((p): p is NonNullable<typeof p> => !!p);

  return (
    <main data-testid="app-download" data-state={available ? 'available' : 'soon'}>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            organizationNode(),
            {
              '@type': 'WebPage',
              '@id': `${pageUrl}#page`,
              url: pageUrl,
              name: t('metaTitle', { brand }),
              description: t('metaDescription', { brand }),
              inLanguage: locale === 'sw' ? 'sw-TZ' : 'en-TZ',
              isPartOf: { '@type': 'WebSite', '@id': `${SITE_URL}/#site` },
              speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', '#jibu-fupi'] },
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: locale === 'sw' ? 'Nyumbani' : 'Home',
                  item: absoluteLocaleUrl('/', locale),
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: locale === 'sw' ? 'Programu ya Android' : 'Android app',
                  item: pageUrl,
                },
              ],
            },
            ...(available
              ? [
                  {
                    '@type': 'SoftwareApplication',
                    name: brand,
                    url: pageUrl,
                    description: t('metaDescription', { brand }),
                    operatingSystem: 'Android',
                    applicationCategory: 'LifestyleApplication',
                    publisher: { '@id': ORG_ID },
                    offers: { '@type': 'Offer', price: 0, priceCurrency: 'TZS' },
                  },
                ]
              : []),
          ],
        }}
      />
      <AppDownloadTracker />
      <section className="relative overflow-hidden border-b border-[#e3e8ee] bg-white">
        <div
          aria-hidden="true"
          className="qw-hero-trapezoid pointer-events-none absolute inset-x-0 top-0 h-[320px] opacity-25 md:h-[380px]"
        />
        <div className="relative mx-auto grid max-w-[1120px] gap-10 px-4 pt-10 pb-16 md:grid-cols-[1fr_auto] md:items-center md:px-6 md:pt-14 md:pb-24">
          <div className="flex flex-col gap-5">
            <nav aria-label="Breadcrumb" className="text-sm text-[#494d59]">
              <ol className="flex flex-wrap items-center gap-1.5">
                <li>
                  <Link
                    href={localeUrl('/', locale)}
                    className="inline-flex min-h-10 items-center underline underline-offset-4 hover:text-[#5469d4]"
                  >
                    {locale === 'sw' ? 'Nyumbani' : 'Home'}
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="font-medium text-[#0a2640]">
                  {locale === 'sw' ? 'Programu ya Android' : 'Android app'}
                </li>
              </ol>
            </nav>
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#e3e8ee] bg-white/95 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.16em] text-[#0a2640] uppercase shadow-xs">
                <span aria-hidden="true" className="qw-ripple-dot" />
                <Smartphone className="size-3.5 text-[#5469d4]" aria-hidden="true" />
                {t('eyebrow')}
              </span>
            </div>
            <h1 className="text-[36px] leading-[1.06] font-bold tracking-[-0.03em] text-[#0a2640] [text-wrap:balance] md:text-[52px]">
              {t('title', { brand })}
            </h1>
            <p id="jibu-fupi" className="max-w-xl text-lg leading-relaxed text-[#494d59]">
              {t('intro')}
            </p>

            {available ? (
              <div className="flex flex-col gap-3 sm:max-w-md">
                {links.play ? (
                  <a
                    href={links.play}
                    rel="noopener"
                    className="qw-btn-primary justify-center"
                    data-testid="app-download-play"
                  >
                    <PlayGlyph />
                    <span>{t('play')}</span>
                  </a>
                ) : null}
                {apk ? (
                  <>
                    <a
                      href={apk.href}
                      rel="noopener"
                      className={
                        links.play
                          ? 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#e3e8ee] bg-white px-6 text-[15px] font-semibold text-[#0a2640] shadow-xs transition hover:border-[#5469d4]/50 hover:bg-[#f6f9fc] hover:text-[#5469d4]'
                          : 'qw-btn-primary justify-center'
                      }
                      data-testid="app-download-apk"
                    >
                      <Download className="size-5" aria-hidden="true" />
                      <span>{t('apk')}</span>
                    </a>
                    <p className="text-sm text-[#494d59]">{t('apkHelp', { host: apk.host })}</p>
                    {release ? (
                      <p className="text-sm text-[#494d59]" data-testid="app-download-apk-meta">
                        {t('apkMeta', {
                          version: release.version,
                          size: (release.size / 1_000_000).toFixed(1),
                        })}
                        <br />
                        <span className="font-mono text-xs break-all opacity-80">
                          SHA-256: {release.sha256}
                        </span>
                      </p>
                    ) : null}
                  </>
                ) : null}
                <p className="text-sm text-[#494d59]">{t('requirements')}</p>
              </div>
            ) : (
              <div
                className="qw-card flex max-w-md flex-col gap-3 p-5 text-[#0a2640]"
                role="status"
                data-testid="app-download-soon"
              >
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#e3e8ee] bg-[#f6f9fc] px-3 py-1 text-xs font-semibold text-[#5469d4]">
                  <Clock className="size-3.5" aria-hidden="true" />
                  {t('soonBadge')}
                </span>
                <h2 className="text-xl font-bold text-[#0a2640]">{t('soonTitle')}</h2>
                <p className="text-[#494d59]">{t('soonBody')}</p>
                <Link href="/login" className="qw-btn-primary mt-1 justify-center">
                  {t('soonCta')}
                </Link>
              </div>
            )}
          </div>
          <div aria-hidden="true" className="hidden md:block">
            <AppMockup labels={mock} />
          </div>
        </div>
      </section>

      <section className="bg-[#f6f9fc] py-16 md:py-24" aria-labelledby="app-features">
        <div className="mx-auto max-w-[1120px] px-4 md:px-6">
          <h2
            id="app-features"
            className="max-w-2xl text-[28px] leading-[1.12] font-bold tracking-[-0.025em] text-[#0a2640] md:text-[42px]"
          >
            {t('featuresTitle')}
          </h2>
          <ul className="mt-10 grid gap-5 md:grid-cols-3">
            {FEATURES.map(({ key, icon: Icon }) => (
              <li key={key} className="qw-card ks-reveal flex flex-col gap-4 p-6 md:p-8">
                <span className="flex size-12 items-center justify-center rounded-xl border border-[#e3e8ee] bg-[#f6f9fc] text-[#5469d4]">
                  <Icon className="size-6" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <h3 className="text-xl font-bold text-[#0a2640]">{t(`features.${key}.title`)}</h3>
                <p className="leading-relaxed text-[#494d59]">{t(`features.${key}.body`)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-[1120px] px-4 py-14 md:px-6" aria-labelledby="app-guest">
        <div className="qw-card flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div className="flex gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[#e3e8ee] bg-[#f6f9fc] text-[#5469d4]">
              <Ticket className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="app-guest" className="text-xl font-bold text-[#0a2640]">
                {t('guestTitle')}
              </h2>
              <p className="mt-1 text-[#494d59]">{t('guestBody')}</p>
            </div>
          </div>
          <Link
            href="/k"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-[#e3e8ee] bg-white px-5 text-sm font-semibold text-[#0a2640] shadow-xs transition hover:border-[#5469d4]/50 hover:bg-[#f6f9fc] hover:text-[#5469d4]"
          >
            {t('guestCta')}
          </Link>
        </div>
        <p className="mt-6 flex items-start gap-2 text-sm text-[#494d59]">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#0f7a47]" aria-hidden="true" />
          <span>{t('trust')}</span>
        </p>
        <p className="mt-2 flex flex-wrap items-center gap-4 text-sm text-[#0a2640]">
          <Link
            href={faqHref}
            className="inline-flex min-h-12 items-center underline underline-offset-4 hover:text-[#5469d4]"
          >
            {t('faqLink')}
          </Link>
          {relatedGuides.map((g) => (
            <Link
              key={g.slug}
              href={localeUrl(pagePath(g, locale), locale)}
              className="inline-flex min-h-12 items-center gap-1 underline underline-offset-4 hover:text-[#5469d4]"
            >
              <span>{textOf(g, locale).nav}</span>
              <ArrowUpRight className="size-3.5 text-[#5469d4]" aria-hidden="true" />
            </Link>
          ))}
        </p>
      </section>
    </main>
  );
}

/** A simple play triangle: Lucide has no store logos, and a trademark badge is not needed to be clear. */
function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true" fill="currentColor">
      <path d="M6 3.5v17a1 1 0 0 0 1.5.86l14-8.5a1 1 0 0 0 0-1.72l-14-8.5A1 1 0 0 0 6 3.5Z" />
    </svg>
  );
}
