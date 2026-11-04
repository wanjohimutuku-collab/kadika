import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, isLocale, LOCALE_COOKIE, messages, type Locale } from '@harusi/i18n';

/** The site path (via middleware: `/` sw, `/en` and `/ke` en), else the language-chip cookie, else English. */
export async function resolveLocale(): Promise<Locale> {
  const fromUrl = (await headers()).get('x-hp-lang');
  if (isLocale(fromUrl)) return fromUrl;
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  return defaultLocale;
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  return { locale, messages: messages[locale], timeZone: 'Africa/Dar_es_Salaam' };
});
