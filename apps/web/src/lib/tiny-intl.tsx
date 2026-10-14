'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Locale } from '@harusi/i18n';

import { formatIcu, type Msgs, type Values } from './icu';

export { formatIcu };

const Ctx = createContext<{ messages: Msgs; locale: Locale } | null>(null);

export function TinyIntlProvider({
  messages,
  locale,
  children,
}: {
  messages: Msgs;
  locale: Locale;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ messages, locale }), [messages, locale]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTinyLocale(): Locale {
  return useContext(Ctx)?.locale ?? 'sw';
}

/** `const t = useTinyT('card'); t('rsvpYes')`. Missing keys render the key (and are caught by tests). */
export function useTinyT(namespace: string) {
  const ctx = useContext(Ctx);
  return useMemo(() => {
    const ns = (ctx?.messages[namespace] ?? {}) as Msgs;
    return (key: string, values?: Values): string => {
      let node: unknown = ns;
      for (const part of key.split('.'))
        node = node && typeof node === 'object' ? (node as Msgs)[part] : undefined;
      return typeof node === 'string' ? formatIcu(node, values) : `${namespace}.${key}`;
    };
  }, [ctx, namespace]);
}
