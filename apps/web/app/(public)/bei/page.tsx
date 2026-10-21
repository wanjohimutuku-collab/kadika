import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { getLocale, getTranslations } from 'next-intl/server';
import { CheckCircle2, CreditCard, HandCoins, MessageCircle, MessageSquare } from 'lucide-react';
import type { Locale } from '@harusi/i18n';
import { SeoLinks } from '@/components/public/seo-links';
import { buttonClasses } from '@/components/ui/button';
import { OrnamentDiamond } from '@/components/card/ornament';
import { absoluteLocaleUrl } from '@/lib/seo';
import { getBrandingOnServer } from '@/lib/server-branding';
import { getPricingOnServer, PRICING_PATH } from '@/lib/server-pricing';
import { formatMoney, formatNumber } from '@/lib/format';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('pricing');
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
      url: absoluteLocaleUrl(PRICING_PATH, locale),
    },
  };
}

/**
 * Public prices (ADR 042): card bundles priced by the number of cards, and SMS / WhatsApp top-ups. Read
 * from the live catalogue staff edit, so this page never quotes a stale price. Tanzanian shillings; Kenya
 * is not open yet. While charging is off it says the pilot is free and these are the prices to come.
 */
export default async function PricingPage() {
  await connection();
  const t = await getTranslations('pricing');
  const locale = (await getLocale()) as Locale;
  const c = await getPricingOnServer();
  const bundles = [...c.bundles].sort((a, b) => a.cards - b.cards);
  const perCard = (amount: number, cards: number) => formatMoney(Math.round(amount / cards), 'TZS');

  return (
    <main data-testid="pricing">
      <SeoLinks path={PRICING_PATH} locale={locale} />
      <section className="bg-primary text-on-primary">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-12 md:py-16">
          <OrnamentDiamond className="[--hp-pattern:#D9B26A]" />
          <h1 className="font-display text-4xl leading-tight font-semibold [text-wrap:balance] md:text-5xl">
            {t('title')}
          </h1>
          <p className="max-w-2xl text-lg opacity-95">{t('intro')}</p>
          {c.enforced ? null : (
            <p
              className="max-w-2xl rounded-card bg-on-primary/10 p-3 font-medium"
              data-testid="pricing-pilot"
            >
              {t('pilotFree')}
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10" aria-labelledby="bundles-h">
        <h2 id="bundles-h" className="text-2xl font-semibold">
          {t('bundlesTitle')}
        </h2>
        <p className="mt-2 text-muted">{t('bundlesIntro')}</p>
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {bundles.map((b) => (
            <li
              key={b.key}
              className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5"
              data-testid="pricing-bundle"
            >
              <p className="flex items-center gap-2 text-lg font-semibold">
                <CreditCard className="size-5 text-primary" aria-hidden="true" />
                {t('cards', { n: formatNumber(b.cards) })}
              </p>
              <p className="tabular text-3xl font-bold">{formatMoney(b.price.TZS, 'TZS')}</p>
              <p className="text-sm text-muted">
                {t('perCard', { price: perCard(b.price.TZS, b.cards) })}
              </p>
              <ul className="flex flex-col gap-1.5 text-sm">
                <li className="flex items-center gap-2">
                  <MessageSquare className="size-4 text-muted" aria-hidden="true" />
                  {t('includesSms', { n: formatNumber(b.sms) })}
                </li>
                <li className="flex items-center gap-2">
                  <MessageCircle className="size-4 text-muted" aria-hidden="true" />
                  {t('includesWhatsapp', { n: formatNumber(b.whatsapp) })}
                </li>
                {(['qr', 'rsvp', 'gate', 'print'] as const).map((k) => (
                  <li key={k} className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
                    {t(`feature.${k}`)}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted">
          {t('freeNote', {
            cards: formatNumber(c.free.cards),
            sms: formatNumber(c.free.sms),
            whatsapp: formatNumber(c.free.whatsapp),
          })}
        </p>
      </section>

      {c.packs.length ? (
        <section className="mx-auto max-w-5xl px-4 pb-10" aria-labelledby="packs-h">
          <h2 id="packs-h" className="text-2xl font-semibold">
            {t('packsTitle')}
          </h2>
          <p className="mt-2 text-muted">{t('packsIntro')}</p>
          <ul className="mt-4 divide-y divide-border rounded-card border border-border bg-surface">
            {c.packs.map((p) => (
              <li
                key={p.key}
                className="flex items-center gap-3 px-4 py-3"
                data-testid="pricing-pack"
              >
                {p.channel === 'sms' ? (
                  <MessageSquare className="size-5 text-muted" aria-hidden="true" />
                ) : (
                  <MessageCircle className="size-5 text-muted" aria-hidden="true" />
                )}
                <span className="flex-1 font-medium">
                  {t(p.channel === 'sms' ? 'smsPack' : 'whatsappPack', {
                    n: formatNumber(p.messages),
                  })}
                </span>
                <span className="tabular font-semibold">{formatMoney(p.price.TZS, 'TZS')}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mx-auto max-w-5xl px-4 pb-12" aria-labelledby="contrib-h">
        <div className="flex gap-3 rounded-card border border-border bg-surface p-5">
          <HandCoins className="size-6 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <h2 id="contrib-h" className="font-semibold">
              {t('contributionsTitle')}
            </h2>
            <p className="mt-1 text-muted">{t('contributionsBody')}</p>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login" className={buttonClasses('primary', 'lg')} data-testid="pricing-cta">
            {t('cta')}
          </Link>
        </div>
      </section>
    </main>
  );
}
