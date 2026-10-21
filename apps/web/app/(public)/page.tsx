import type { Metadata } from 'next';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import type { Locale } from '@harusi/i18n';
import { SeoLinks } from '@/components/public/seo-links';
import { SITE_URL, absoluteLocaleUrl, localeUrl } from '@/lib/seo';
import {
  ChevronDown,
  DoorOpen,
  HandCoins,
  MessageSquareText,
  Printer,
  Send,
  ShieldCheck,
  Smartphone,
  UserPlus,
  Lock,
  Link2Off,
} from 'lucide-react';
import { getPage, pagePath, textOf } from '@/content';
import { buttonClasses } from '@/components/ui/button';
import { OrnamentDiamond } from '@/components/card/ornament';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('landing');
  const locale = (await getLocale()) as Locale;
  return {
    title: { absolute: t('metaTitle') },
    description: t('metaDescription'),
    openGraph: {
      type: 'website',
      siteName: 'Harusi Pass',
      title: t('metaTitle'),
      description: t('metaDescription'),
      locale: locale === 'sw' ? 'sw_TZ' : 'en_TZ',
      url: absoluteLocaleUrl('/', locale),
    },
  };
}

/** Extra occasion and guide pages linked from the homepage (internal links for search). */
const MORE_OCCASIONS = [
  'kadi-za-mwaliko-mtandaoni',
  'kadi-ya-kuzaliwa',
  'kadi-ya-kitchen-party',
  'kadi-ya-mahafali',
  'kadi-za-mwaliko-biashara',
  'kutuma-kadi-za-mwaliko-whatsapp',
] as const;

const STEP_ICONS = [UserPlus, Send, HandCoins, DoorOpen] as const;

/** Swahili-first landing (server-rendered, no client JS beyond the language chip). */
export default async function Landing() {
  const t = await getTranslations('landing');
  const steps = ['1', '2', '3', '4'] as const;
  const faqs = ['1', '2', '3', '4', '5', '6'] as const;
  const tc = await getTranslations('common');
  const events = ['wedding', 'sendoff', 'engagement', 'michango'] as const;
  const eventHref = {
    wedding: '/kadi-ya-harusi-mtandaoni',
    sendoff: '/kadi-ya-send-off',
    engagement: '/kadi-ya-uchumba',
    michango: '/michango-ya-harusi',
  } as const;
  const locale = (await getLocale()) as Locale;
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: tc('appName'),
    url: SITE_URL,
    logo: `${SITE_URL}/icons/512.png`,
    description: tc('tagline'),
    areaServed: 'TZ',
  };
  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: tc('appName'),
    url: SITE_URL,
    inLanguage: ['sw', 'en'],
  };
  const software = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: tc('appName'),
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Web, Android',
    url: SITE_URL,
    description: tc('tagline'),
    areaServed: 'TZ',
  };
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: t(`faq.${f}.q`),
      acceptedAnswer: { '@type': 'Answer', text: t(`faq.${f}.a`) },
    })),
  };
  return (
    <main>
      <SeoLinks path="/" locale={locale} />
      <script
        type="application/ld+json"
        // Static, server-built object; `<` is escaped so the JSON cannot close the tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(software).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, '\\u003c') }}
      />
      <section className="bg-primary text-on-primary">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-14 md:py-20">
          <OrnamentDiamond className="[--hp-pattern:#D9B26A]" />
          <h1 className="max-w-3xl text-4xl leading-tight font-semibold [text-wrap:balance] md:text-5xl">
            {t('heroTitle')}
          </h1>
          <p className="max-w-2xl text-lg opacity-95">{t('heroBody')}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/login" className={buttonClasses('secondary', 'lg', 'border-transparent')}>
              {t('cta')}
            </Link>
            <Link
              href="/k"
              className={buttonClasses('ghost', 'lg', 'text-on-primary hover:bg-white/10')}
            >
              {t('ctaSecondary')}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pt-12" aria-labelledby="what">
        <h2 id="what" className="text-3xl font-semibold">
          {t('definitionTitle')}
        </h2>
        <p className="mt-3 text-lg leading-relaxed">{t('definition')}</p>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12" aria-labelledby="how">
        <h2 id="how" className="text-3xl font-semibold">
          {t('howTitle')}
        </h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-4">
          {steps.map((s, i) => {
            const Icon = STEP_ICONS[i]!;
            return (
              <li
                key={s}
                className="flex flex-col gap-2 rounded-card border border-border bg-surface p-5"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <span className="flex size-8 items-center justify-center rounded-full bg-primary text-on-primary">
                    {i + 1}
                  </span>
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="text-lg font-semibold">{t(`steps.${s}.title`)}</h3>
                <p className="text-muted">{t(`steps.${s}.body`)}</p>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-12" aria-labelledby="events">
        <h2 id="events" className="text-3xl font-semibold">
          {t('eventsTitle')}
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {events.map((e) => (
            <li key={e}>
              <Link
                href={localeUrl(eventHref[e], locale)}
                className="flex h-full flex-col gap-1 rounded-card border border-border bg-surface p-5 hover:border-primary"
              >
                <span className="text-lg font-semibold text-primary">{t(`events.${e}.title`)}</span>
                <span className="text-muted">{t(`events.${e}.body`)}</span>
              </Link>
            </li>
          ))}
        </ul>
        <ul className="mt-4 flex flex-wrap gap-2">
          {MORE_OCCASIONS.map((slug) => {
            const page = getPage(slug);
            return page ? (
              <li key={slug}>
                <Link
                  href={localeUrl(pagePath(page), locale)}
                  className="inline-flex min-h-12 items-center rounded-full border border-border bg-surface px-4 text-sm font-medium hover:border-primary"
                >
                  {textOf(page, locale).nav}
                </Link>
              </li>
            ) : null;
          })}
        </ul>
      </section>

      <section className="bg-surface" aria-labelledby="feature">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 py-12 md:grid-cols-2 md:items-center">
          <div>
            <h2 id="feature" className="text-3xl font-semibold">
              {t('featureTitle')}
            </h2>
            <p className="mt-3 text-lg">{t('featureBody')}</p>
          </div>
          <ul className="flex flex-col gap-3">
            {(
              [
                [MessageSquareText, 'featureSms'],
                [Printer, 'featurePrint'],
                [Smartphone, 'featureGate'],
              ] as const
            ).map(([Icon, key]) => (
              <li
                key={key}
                className="flex items-center gap-3 rounded-card border border-border bg-bg p-4 font-medium"
              >
                <Icon className="size-6 text-primary" aria-hidden="true" />
                {t(key)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12" aria-labelledby="trust">
        <h2 id="trust" className="text-3xl font-semibold">
          {t('trustTitle')}
        </h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {(
            [
              [ShieldCheck, 'sender'],
              [Link2Off, 'links'],
              [Lock, 'data'],
            ] as const
          ).map(([Icon, key]) => (
            <li
              key={key}
              className="flex flex-col gap-2 rounded-card border border-border bg-surface p-5"
            >
              <Icon className="size-7 text-success" aria-hidden="true" />
              <h3 className="text-lg font-semibold">{t(`trust.${key}.title`)}</h3>
              <p className="text-muted">{t(`trust.${key}.body`)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-6" aria-labelledby="faq">
        <h2 id="faq" className="text-3xl font-semibold">
          {t('faqTitle')}
        </h2>
        <div className="mt-4 divide-y divide-border rounded-card border border-border bg-surface">
          {faqs.map((f) => (
            <details key={f} className="group px-4">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 font-semibold">
                {t(`faq.${f}.q`)}
                <ChevronDown
                  className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180 group-open:text-primary"
                  aria-hidden="true"
                />
              </summary>
              <p className="pb-4 text-muted">{t(`faq.${f}.a`)}</p>
            </details>
          ))}
        </div>
        <div className="mt-8 flex justify-center">
          <Link href="/login" className={buttonClasses('primary', 'lg')}>
            {t('cta')}
          </Link>
        </div>
      </section>
    </main>
  );
}
