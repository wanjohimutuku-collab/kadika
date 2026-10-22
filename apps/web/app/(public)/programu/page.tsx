import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { getLocale, getTranslations } from 'next-intl/server';
import {
  CheckCircle2,
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
import { SeoLinks } from '@/components/public/seo-links';
import { buttonClasses } from '@/components/ui/button';
import { OrnamentDiamond } from '@/components/card/ornament';
import { absoluteLocaleUrl, localeUrl } from '@/lib/seo';
import { getBrandingOnServer } from '@/lib/server-branding';
import { APP_APK_PATH, APP_DOWNLOAD_PATH, appLinksFrom, hostOf } from '@/lib/app-download';
import { getAndroidReleaseOnServer } from '@/lib/server-app-release';
import { APP_DOMAIN } from '@/lib/env';

const FEATURES = [
  { key: 'send', icon: Send },
  { key: 'track', icon: HandCoins },
  { key: 'gate', icon: ScanLine },
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('appDownload');
  const locale = (await getLocale()) as Locale;
  const brand = (await getBrandingOnServer()).businessName;
  return {
    title: { absolute: t('metaTitle', { brand }) },
    description: t('metaDescription', { brand }),
    openGraph: {
      type: 'website',
      siteName: brand,
      title: t('metaTitle', { brand }),
      description: t('metaDescription', { brand }),
      locale: locale === 'sw' ? 'sw_TZ' : 'en_TZ',
      url: absoluteLocaleUrl(APP_DOWNLOAD_PATH, locale),
    },
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

  return (
    <main data-testid="app-download" data-state={available ? 'available' : 'soon'}>
      <SeoLinks path={APP_DOWNLOAD_PATH} locale={locale} />
      <section className="bg-primary text-on-primary">
        <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 md:grid-cols-[1fr_auto] md:items-center md:py-20">
          <div className="flex flex-col gap-5">
            <OrnamentDiamond className="[--hp-pattern:#D9B26A]" />
            <p className="inline-flex items-center gap-2 text-sm font-semibold tracking-wide uppercase opacity-90">
              <Smartphone className="size-5" aria-hidden="true" />
              {t('eyebrow')}
            </p>
            <h1 className="font-display text-4xl leading-tight font-semibold [text-wrap:balance] md:text-5xl">
              {t('title', { brand })}
            </h1>
            <p className="max-w-xl text-lg opacity-95">{t('intro')}</p>

            {available ? (
              <div className="flex flex-col gap-3 sm:max-w-md">
                {links.play ? (
                  <a
                    href={links.play}
                    rel="noopener"
                    className={buttonClasses('secondary', 'lg', 'border-transparent')}
                    data-testid="app-download-play"
                  >
                    <PlayGlyph />
                    {t('play')}
                  </a>
                ) : null}
                {apk ? (
                  <>
                    <a
                      href={apk.href}
                      rel="noopener"
                      className={buttonClasses(
                        links.play ? 'ghost' : 'secondary',
                        'lg',
                        links.play
                          ? // `cn` does not merge classes, so the ghost variant's text colour needs `!` to lose
                            'border border-white/40 text-on-primary! hover:bg-white/10'
                          : 'border-transparent',
                      )}
                      data-testid="app-download-apk"
                    >
                      <Download className="size-5" aria-hidden="true" />
                      {t('apk')}
                    </a>
                    <p className="text-sm opacity-90">{t('apkHelp', { host: apk.host })}</p>
                    {release ? (
                      <p className="text-sm opacity-90" data-testid="app-download-apk-meta">
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
                <p className="text-sm opacity-90">{t('requirements')}</p>
              </div>
            ) : (
              <div
                className="flex max-w-md flex-col gap-3 rounded-card bg-surface p-5 text-ink"
                role="status"
                data-testid="app-download-soon"
              >
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-sm font-semibold text-ink">
                  <Clock className="size-4" aria-hidden="true" />
                  {t('soonBadge')}
                </span>
                <h2 className="text-xl font-semibold">{t('soonTitle')}</h2>
                <p className="text-muted">{t('soonBody')}</p>
                <Link href="/login" className={buttonClasses('primary', 'md', 'mt-1')}>
                  {t('soonCta')}
                </Link>
              </div>
            )}
          </div>
          <PhonePreview />
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12" aria-labelledby="app-features">
        <h2 id="app-features" className="text-3xl font-semibold">
          {t('featuresTitle')}
        </h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {FEATURES.map(({ key, icon: Icon }) => (
            <li
              key={key}
              className="flex flex-col gap-2 rounded-card border border-border bg-surface p-5"
            >
              <Icon className="size-6 text-primary" aria-hidden="true" />
              <h3 className="text-lg font-semibold">{t(`features.${key}.title`)}</h3>
              <p className="text-muted">{t(`features.${key}.body`)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-12" aria-labelledby="app-guest">
        <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-3">
            <Ticket className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <h2 id="app-guest" className="text-xl font-semibold">
                {t('guestTitle')}
              </h2>
              <p className="mt-1 text-muted">{t('guestBody')}</p>
            </div>
          </div>
          <Link href="/k" className={buttonClasses('secondary', 'md', 'shrink-0')}>
            {t('guestCta')}
          </Link>
        </div>
        <p className="mt-6 flex items-start gap-2 text-sm text-muted">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
          <span>{t('trust')}</span>
        </p>
        <p className="mt-2 text-sm">
          <Link
            href={localeUrl('/maswali', locale)}
            className="inline-flex min-h-12 items-center underline"
          >
            {t('faqLink')}
          </Link>
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

/**
 * A drawn phone showing the gate's admit screen: what the app does, without pretending to be a store
 * screenshot. Decorative, and left out on phones where the page should stay short.
 */
function PhonePreview() {
  return (
    <div aria-hidden="true" className="hidden md:block">
      <div className="w-56 rounded-[2.25rem] border-[6px] border-ink/80 bg-ink/80 shadow-none">
        <div className="flex h-[26rem] flex-col items-center justify-center gap-3 rounded-[1.8rem] bg-gate-admit px-5 text-center text-white">
          <CheckCircle2 className="size-14" />
          <p className="text-lg font-bold tracking-wide uppercase">Karibu ndani</p>
          <p className="font-display text-2xl font-bold">Asha M.</p>
          <p className="text-sm opacity-90">Watu: 2 · Familia</p>
        </div>
      </div>
    </div>
  );
}
