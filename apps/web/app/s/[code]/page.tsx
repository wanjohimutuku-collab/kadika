import { redirect } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { pickMessages, type Locale } from '@harusi/i18n';
import { normalizeShortCode } from '@harusi/schemas/short-code';
import { USE_MOCKS } from '@/lib/env';
import { peekShortCodeOnServer } from '@/lib/server-mock';
import { ShortResolver } from '@/components/card/short-resolver';

/** SMS short link (§7.2): `/s/KH-4826` → the guest's card. Works on any phone browser. */
export default async function ShortLink({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = normalizeShortCode(decodeURIComponent(raw)) ?? raw;
  const token = USE_MOCKS ? peekShortCodeOnServer(code) : null;
  if (token) redirect(`/c/${token}`);
  const locale = (await getLocale()) as Locale;
  return (
    <NextIntlClientProvider locale={locale} messages={pickMessages(locale, ['short'])}>
      <ShortResolver code={code} />
    </NextIntlClientProvider>
  );
}
