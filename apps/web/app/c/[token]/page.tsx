import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { pickMessages, type Locale } from '@harusi/i18n';
import { GuestCard } from '@/components/card/guest-card';
import { qrSvgData } from '@/components/ui/qr-block';
import { TinyIntlProvider } from '@/lib/tiny-intl';
import { USE_MOCKS } from '@/lib/env';
import { peekCardOnServer } from '@/lib/server-mock';
import { formatDate } from '@/lib/format';

type Params = { params: Promise<{ token: string }> };

function snapshot(token: string) {
  if (!USE_MOCKS) return null;
  const v = peekCardOnServer(token);
  return v.state === 'ok' ? v : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { token } = await params;
  const t = await getTranslations('card');
  const locale = (await getLocale()) as Locale;
  const v = snapshot(token);
  const manifest = `/c/${token}/manifest.webmanifest`;
  if (!v?.event) return { title: t('invalidTitle'), manifest };
  const title = t('metaTitle', { couple: v.event.coupleNames });
  const description = t('metaDescription', {
    date: formatDate(v.event.dateStart, locale),
    venue: v.event.venueName,
  });
  return {
    title,
    description,
    manifest,
    openGraph: { title, description, type: 'website', locale: locale === 'sw' ? 'sw_TZ' : 'en_GB' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

/**
 * Guest card (§7.3, §17.6). Server-renders names/date/venue and the QR path so first paint needs
 * no client JS beyond hydration; strings use the tiny translator to keep the bundle in budget.
 */
export default async function CardPage({ params }: Params) {
  const { token } = await params;
  const locale = (await getLocale()) as Locale;
  const initial = snapshot(token);
  const initialQr = initial?.qrPayload
    ? { payload: initial.qrPayload, ...qrSvgData(initial.qrPayload) }
    : null;
  return (
    <TinyIntlProvider locale={locale} messages={pickMessages(locale, ['card', 'states', 'common'])}>
      <GuestCard token={token} initial={initial} initialQr={initialQr} />
    </TinyIntlProvider>
  );
}
