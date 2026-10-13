import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import { pickMessages, type Locale } from '@harusi/i18n';
import { PayFlow } from '@/components/card/pay-flow';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('pay');
  return { title: t('title') };
}

export default async function PayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const locale = (await getLocale()) as Locale;
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={pickMessages(locale, ['pay', 'card', 'common', 'states', 'validation'])}
    >
      <PayFlow token={token} />
    </NextIntlClientProvider>
  );
}
