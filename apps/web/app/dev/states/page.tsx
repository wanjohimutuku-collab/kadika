import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { messages, type Locale } from '@harusi/i18n';
import { SHOW_DEV_TOOLS } from '@/lib/env';
import { peekCardOnServer } from '@/lib/server-mock';
import { createSeedState, sampleCardToken } from '@harusi/api-client/mock';
import { StatesGallery } from '@/components/dev/states-gallery';
import { displaySerif } from '@/lib/fonts';

export const metadata = { title: 'States', robots: { index: false } };

/** Dev only: every screen in every §17.10 state. */
export default async function DevStatesPage() {
  if (!SHOW_DEV_TOOLS) notFound();
  const locale = (await getLocale()) as Locale;
  const seed = createSeedState();
  const token = sampleCardToken(seed, 'delivered');
  const card = peekCardOnServer(token);
  return (
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      <div className={displaySerif.variable}>
        <StatesGallery card={card} />
      </div>
    </NextIntlClientProvider>
  );
}
