import sw from './sw.json';
import en from './en.json';

export const locales = { sw, en } as const;
export type Locale = keyof typeof locales;
export type MessageKey = keyof typeof sw;
export const defaultLocale: Locale = 'sw';

export function t(key: MessageKey, locale: Locale = defaultLocale): string {
  return locales[locale][key];
}
