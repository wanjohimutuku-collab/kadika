import keEn from './variants/ke.en.json';
import keSw from './variants/ke.sw.json';

/** Countries with their own wording (ADR 028). Tanzania is the base text, so it has no overlay. */
export type MessageCountry = 'TZ' | 'KE';

/** Partial overrides on top of the base messages; every key must already exist in the base. */
export const variants: Record<
  MessageCountry,
  Partial<Record<'sw' | 'en', Record<string, unknown>>>
> = {
  TZ: {},
  KE: { sw: keSw, en: keEn },
};

function deepMerge(base: unknown, over: unknown): unknown {
  if (
    typeof base !== 'object' ||
    base === null ||
    typeof over !== 'object' ||
    over === null ||
    Array.isArray(base)
  )
    return over === undefined ? base : over;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over as Record<string, unknown>))
    out[k] = deepMerge(out[k], v);
  return out;
}

/**
 * `base` with a country's wording on top. Kept apart from the full message files so client code can
 * apply a variant to messages it already has without importing every string again.
 */
export function mergeVariant<T>(base: T, locale: 'sw' | 'en', country: MessageCountry = 'TZ'): T {
  const over = variants[country]?.[locale];
  return over ? (deepMerge(base, over) as T) : base;
}
