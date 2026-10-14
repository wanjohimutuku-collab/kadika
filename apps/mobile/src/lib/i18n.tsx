import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { defaultLocale, formatIcu, isLocale, messages, type Locale } from '@harusi/i18n';
import { store } from './storage';

const KEY = 'harusi.locale';
type Values = Record<string, string | number>;
export type T = (key: string, values?: Values) => string;

interface Ctx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: T;
}
const I18nContext = createContext<Ctx>({
  locale: defaultLocale,
  setLocale: () => undefined,
  t: (k) => k,
});

function lookup(locale: Locale, key: string): string {
  let node: unknown = messages[locale];
  for (const part of key.split('.'))
    node = node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined;
  return typeof node === 'string' ? node : key;
}

/** Swahili first (§17.1); the choice is remembered. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  useEffect(() => {
    void store.get(KEY).then((v) => isLocale(v) && setLocaleState(v));
  }, []);
  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    void store.set(KEY, l);
  }, []);
  const value = useMemo<Ctx>(
    () => ({ locale, setLocale, t: (key, values) => formatIcu(lookup(locale, key), values) }),
    [locale, setLocale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useT = () => useContext(I18nContext).t;
export const useLocale = () => {
  const { locale, setLocale } = useContext(I18nContext);
  return { locale, setLocale };
};
