import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, isLocale, LOCALE_COOKIE, messages, type Locale } from '@harusi/i18n';

/** Locale from the cookie (set by the language chip), else Swahili — Swahili-first (§10, ADR 008). */
export async function resolveLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(fromCookie) ? fromCookie : defaultLocale;
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  return { locale, messages: messages[locale], timeZone: 'Africa/Dar_es_Salaam' };
});
