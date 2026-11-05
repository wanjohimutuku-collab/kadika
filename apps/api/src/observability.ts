import * as Sentry from '@sentry/node';

/** Card links, gate codes and payment references must never reach a third party (§9, §12). */
const SECRET_PATHS: [RegExp, string][] = [
  [/\/v1\/c\/[^/?#]+/g, '/v1/c/:token'],
  [/\/s\/[^/?#]+/g, '/s/:token'],
  [/\/gate-join\/[^/?#]+/g, '/gate-join/:code'],
  [/\/v1\/payments\/[^/?#]+\/status/g, '/v1/payments/:ref/status'],
  [/\/guests\/[0-9a-f-]{36}/g, '/guests/:id'],
];
// Any E.164 number, Tanzanian and Kenyan numbers without the plus, and local 06/07/01 numbers.
const PHONE = /\+\d{8,15}\b|\b25[45]\d{9}\b|\b0[167]\d{8}\b/g;
/** Drizzle's `DrizzleQueryError` appends the bound values (`params: …`): names, phones, hashes. */
const QUERY_PARAMS = /\nparams:[\s\S]*$/;
const SENSITIVE_KEYS =
  /authorization|cookie|token|pin|otp|secret|password|apikey|api-key|signature|phone/i;

export function scrubText(s: string): string {
  let out = s.replace(QUERY_PARAMS, '');
  for (const [re, to] of SECRET_PATHS) out = out.replace(re, to);
  return out.replace(PHONE, '[phone]');
}

/**
 * What may be logged about an unexpected error (§12). A failed query becomes its SQL text (placeholders
 * only) and the database's reason; every message is scrubbed of card links and phone numbers.
 */
export function safeErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return scrubText(String(err));
  const q = err as Error & { query?: unknown; params?: unknown };
  if (typeof q.query === 'string' && Array.isArray(q.params)) {
    const why = err.cause instanceof Error ? `: ${err.cause.message}` : '';
    return scrubText(`Failed query: ${q.query}${why}`);
  }
  return scrubText(err.message);
}

/** Deep-clones and redacts anything that looks sensitive by key or by value. */
export function scrubValue(v: unknown, depth = 0): unknown {
  if (depth > 6) return '[deep]';
  if (typeof v === 'string') return scrubText(v);
  if (Array.isArray(v)) return v.map((x) => scrubValue(x, depth + 1));
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>))
      out[k] = SENSITIVE_KEYS.test(k) ? '[redacted]' : scrubValue(val, depth + 1);
    return out;
  }
  return v;
}

/** Sentry `beforeSend`: no request bodies, headers, cookies, query strings, users or free text with secrets. */
export function scrubEvent<T extends Record<string, unknown>>(event: T): T {
  const e = { ...event } as Record<string, unknown>;
  delete e.user;
  delete e.server_name;
  if (e.request && typeof e.request === 'object') {
    const r = e.request as Record<string, unknown>;
    e.request = {
      method: r.method,
      url: typeof r.url === 'string' ? scrubText(r.url.split('?')[0]!) : undefined,
    };
  }
  if (typeof e.message === 'string') e.message = scrubText(e.message);
  if (typeof e.transaction === 'string') e.transaction = scrubText(e.transaction);
  if (e.extra) e.extra = scrubValue(e.extra);
  if (e.contexts) e.contexts = scrubValue(e.contexts);
  if (e.breadcrumbs) delete e.breadcrumbs; // HTTP breadcrumbs carry URLs and bodies
  const ex = e.exception as { values?: { value?: string }[] } | undefined;
  if (ex?.values) for (const v of ex.values) if (v.value) v.value = scrubText(v.value);
  return e as T;
}

/** Starts Sentry only when a DSN is configured; returns the function that reports a 5xx. */
export function initObservability(
  dsn: string | undefined,
  environment: string,
): ((err: Error) => void) | undefined {
  if (!dsn) return undefined;
  Sentry.init({
    dsn,
    environment,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    maxBreadcrumbs: 0,
    beforeSend: (event) =>
      scrubEvent(event as unknown as Record<string, unknown>) as unknown as typeof event,
  });
  return (err) => void Sentry.captureException(err);
}
