import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import { pickMessages, type Locale } from '@harusi/i18n';
import { GuestAlbum } from '@/components/album/guest-album';
import { previewCardOnServer } from '@/lib/server-card';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('album');
  return { title: t('title') };
}

/** The event's temporary photo album, opened from the guest card (ADR 050). */
export default async function AlbumPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const locale = (await getLocale()) as Locale;
  const preview = await previewCardOnServer(token);
  const country = preview?.event?.country ?? 'TZ';
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={pickMessages(locale, ['album', 'common', 'states'], country)}
    >
      <GuestAlbum token={token} />
    </NextIntlClientProvider>
  );
}
