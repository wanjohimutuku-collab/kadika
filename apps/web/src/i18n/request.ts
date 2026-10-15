import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, isLocale, LOCALE_COOKIE, messages, type Locale } from '@harusi/i18n';

/** `?lang=` (via middleware), else the cookie set by the language chip, else Swahili (§10, ADR 008). */
export async function resolveLocale(): Promise<Locale> {
  const fromUrl = (await headers()).get('x-hp-lang');
  if (isLocale(fromUrl)) return fromUrl;
  const market = (await headers()).get('x-hp-market');
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  return market === 'ke' ? 'en' : defaultLocale;
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  return { locale, messages: messages[locale], timeZone: 'Africa/Dar_es_Salaam' };
});
