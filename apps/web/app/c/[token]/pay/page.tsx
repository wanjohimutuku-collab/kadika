import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import { pickMessages, type Locale } from '@harusi/i18n';
import { PayFlow } from '@/components/card/pay-flow';
import { previewCardOnServer } from '@/lib/server-card';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('pay');
  return { title: t('title') };
}

export default async function PayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const locale = (await getLocale()) as Locale;
  // The event's country picks the wording (currency, local vocabulary; ADR 028).
  const preview = await previewCardOnServer(token);
  // Guests pay the hosts directly (ADR 043): the card itself lists where to send a contribution.
  if (preview?.event && !preview.event.onlinePay) redirect(`/c/${encodeURIComponent(token)}`);
  const country = preview?.event?.country ?? 'TZ';
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={pickMessages(locale, ['pay', 'card', 'common', 'states', 'validation'], country)}
    >
      <PayFlow token={token} />
    </NextIntlClientProvider>
  );
}
