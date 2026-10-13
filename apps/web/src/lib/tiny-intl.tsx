'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Locale } from '@harusi/i18n';

/**
 * A ~1 KB ICU-subset formatter for the guest card, so the card bundle doesn't ship a full i18n
 * runtime (budget §10, ADR 009). Supports `{name}` and `{n, plural, =0 {…} one {# …} other {# …}}`.
 * Messages come from the same `packages/i18n` JSON, passed from the server.
 */
type Values = Record<string, string | number>;
type Msgs = Record<string, unknown>;

function findClose(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}' && --depth === 0) return i;
  }
  return s.length - 1;
}

export function formatIcu(template: string, values: Values = {}): string {
  let out = '';
  let i = 0;
  while (i < template.length) {
    const ch = template[i]!;
    if (ch !== '{') {
      out += ch;
      i++;
      continue;
    }
    const close = findClose(template, i);
    const body = template.slice(i + 1, close);
    const m = /^\s*(\w+)\s*,\s*plural\s*,(.*)$/s.exec(body);
    if (m) {
      const n = Number(values[m[1]!] ?? 0);
      const branches: Record<string, string> = {};
      const rest = m[2]!;
      let j = 0;
      while (j < rest.length) {
        const sel = /\s*(=\d+|\w+)\s*\{/y;
        sel.lastIndex = j;
        const sm = sel.exec(rest);
        if (!sm) break;
        const open = sel.lastIndex - 1;
        const end = findClose(rest, open);
        branches[sm[1]!] = rest.slice(open + 1, end);
        j = end + 1;
      }
      const chosen =
        branches[`=${n}`] ?? (n === 1 ? branches.one : undefined) ?? branches.other ?? '';
      out += formatIcu(chosen.replace(/#/g, String(n)), values);
    } else {
      const v = values[body.trim()];
      out += v === undefined ? `{${body}}` : String(v);
    }
    i = close + 1;
  }
  return out;
}

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
