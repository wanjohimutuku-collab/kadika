import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  CollectionQueryResult,
  PaymentProvider,
  PaymentWebhookEvent,
  StartCollectionInput,
  StartCollectionResult,
} from './index';

export const SNIPPE_PRODUCTION_URL = 'https://api.snippe.sh';
export const SNIPPE_SANDBOX_URL = 'https://sandbox.snippe.sh';
export const SNIPPE_API_VERSION = '2026-01-25';
/** Snippe's idempotency keys may be at most 30 characters; our references (`HP` + 10) fit. */
const MAX_IDEMPOTENCY_KEY = 30;
/** A callback older than this is refused, so a captured one cannot be replayed later (Snippe's default). */
const DEFAULT_TOLERANCE_SECONDS = 300;

export interface SnippeOptions {
  /** `snp_…`. Sent as a Bearer token. Never log it. */
  apiKey: string;
  /** Signs callbacks (HMAC-SHA256 over `<timestamp>.<raw body>`). */
  webhookSigningKey: string;
  /** Public HTTPS URL Snippe posts results to (≤ 500 characters). */
  callbackUrl: string;
  /** Snippe needs a payer email on every payment; guests are not asked for one. */
  receiptEmail?: string;
  environment?: 'production' | 'sandbox';
  /** Overrides the host (tests, or a staging mirror). */
  baseUrl?: string;
  toleranceSeconds?: number;
  fetchImpl?: typeof fetch;
  /** Clock in ms, for tests. */
  nowMs?: () => number;
}

/** Snippe's payment states → ours; `null` for in-flight ones we leave alone. */
export function mapSnippeStatus(status: unknown): 'success' | 'failed' | 'pending' {
  switch (typeof status === 'string' ? status.toLowerCase() : '') {
    case 'completed':
      return 'success';
    case 'failed':
    case 'voided':
    case 'expired':
      return 'failed';
    default:
      return 'pending';
  }
}

const EVENT_STATUS: Record<string, 'success' | 'failed'> = {
  'payment.completed': 'success',
  'payment.failed': 'failed',
  'payment.expired': 'failed',
  'payment.voided': 'failed',
};

/** `+255712345678` / `0712…` already normalised by the caller → Snippe wants `255…` or `+255…`. */
const toSnippePhone = (e164: string) => e164.replace(/^\+/, '');

interface Money {
  value?: number;
  currency?: string;
}

/**
 * Snippe (Tanzania): M-Pesa, Airtel Money, Mixx by Yas and Halopesa through one API. TZS only, whole
 * shillings, 500 minimum. The guest gets a USSD prompt, enters their PIN, and Snippe posts the result to
 * `callbackUrl`, which `verifyWebhook` authenticates.
 *
 * Wire format, as published in Snippe's SDKs (api version 2026-01-25): `POST /v1/payments` with
 * `payment_type: "mobile"`; `GET /v1/payments/{reference}`; responses wrapped as `{ data: … }`;
 * webhooks `{ id, type, data }` signed in `X-Webhook-Signature` with `X-Webhook-Timestamp`. Snippe
 * assigns its own `reference`, so ours travels in `metadata.reference` and comes back in callbacks.
 * The customer object field names (`firstname`, `lastname`, `email`) are the one detail to confirm in
 * the Snippe sandbox before the first live payment.
 */
export class SnippePaymentProvider implements PaymentProvider {
  readonly name = 'snippe';

  constructor(private readonly o: SnippeOptions) {}

  private get base(): string {
    return (
      this.o.baseUrl ??
      (this.o.environment === 'sandbox' ? SNIPPE_SANDBOX_URL : SNIPPE_PRODUCTION_URL)
    ).replace(/\/$/, '');
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      accept: 'application/json',
      authorization: `Bearer ${this.o.apiKey}`,
      'snippe-version': SNIPPE_API_VERSION,
      ...extra,
    };
  }

  async startCollection(input: StartCollectionInput): Promise<StartCollectionResult> {
    // Snippe collects Tanzanian shillings only; a mismatch must never reach the phone.
    if (input.currency !== 'TZS') throw new Error('snippe collects TZS only');
    const f = this.o.fetchImpl ?? fetch;
    const host = (() => {
      try {
        return new URL(this.o.callbackUrl).hostname;
      } catch {
        return 'example.com';
      }
    })();
    const res = await f(`${this.base}/v1/payments`, {
      method: 'POST',
      headers: this.headers({
        'content-type': 'application/json',
        // A retried start never prompts the phone twice (cached for 24 h on Snippe's side).
        'idempotency-key': input.reference.slice(0, MAX_IDEMPOTENCY_KEY),
      }),
      body: JSON.stringify({
        payment_type: 'mobile',
        details: { amount: input.amount, currency: 'TZS' },
        phone_number: toSnippePhone(input.phoneE164),
        customer: {
          firstname: 'Mchangiaji',
          lastname: 'Harusi',
          email: this.o.receiptEmail || `payments@${host}`,
        },
        webhook_url: this.o.callbackUrl,
        metadata: { reference: input.reference, description: input.description.slice(0, 120) },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    // Never echo the body: it can contain the payer's number.
    if (!res.ok) throw new Error(`snippe ${res.status}`);
    const json = (await res.json().catch(() => null)) as { data?: { reference?: string } } | null;
    const providerRef = json?.data?.reference;
    if (!providerRef) throw new Error('snippe: no payment reference in response');
    return { providerRef };
  }

  /**
   * Checks the API key and host without moving money: `GET /v1/payments/balance`. Returns the HTTP
   * status so staff can tell a wrong key (401/403) from a network problem.
   */
  async ping(): Promise<{ ok: boolean; status: number }> {
    const f = this.o.fetchImpl ?? fetch;
    const res = await f(`${this.base}/v1/payments/balance`, {
      headers: this.headers(),
      signal: AbortSignal.timeout(15_000),
    });
    return { ok: res.ok, status: res.status };
  }

  /** Snippe looks payments up by ITS reference (`providerRef`), not ours. */
  async queryCollection(reference: string, providerRef?: string): Promise<CollectionQueryResult> {
    const f = this.o.fetchImpl ?? fetch;
    const id = providerRef ?? reference;
    const res = await f(`${this.base}/v1/payments/${encodeURIComponent(id)}`, {
      headers: this.headers(),
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status === 404) return { status: 'unknown' };
    if (!res.ok) throw new Error(`snippe query ${res.status}`);
    const j = (await res.json().catch(() => null)) as {
      data?: {
        status?: string;
        amount?: Money;
        completed_at?: string;
        failure_reason?: string;
      };
    } | null;
    const d = j?.data;
    return {
      status: mapSnippeStatus(d?.status),
      amount: typeof d?.amount?.value === 'number' ? d.amount.value : undefined,
      currency: d?.amount?.currency,
      paidAt: d?.completed_at ? new Date(d.completed_at) : undefined,
      failureReason: d?.failure_reason,
    };
  }

  /**
   * HMAC-SHA256 over `<timestamp>.<raw body>` with the signing key, hex-encoded, compared in constant
   * time, and refused when the timestamp is older than the tolerance (replay protection). The raw body
   * must be the exact bytes received.
   */
  verifyWebhook(rawBody: string, headers: Record<string, string | undefined>): boolean {
    const ts = headers['x-webhook-timestamp'];
    const sig = headers['x-webhook-signature'];
    if (!ts || !sig || !this.o.webhookSigningKey || !/^\d{1,12}$/.test(ts)) return false;
    const now = (this.o.nowMs ?? Date.now)() / 1000;
    // Both ways: a timestamp far in the future would otherwise stay replayable until it ages out.
    if (Math.abs(now - Number(ts)) > (this.o.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS))
      return false;
    if (!/^[0-9a-f]+$/i.test(sig)) return false;
    const want = createHmac('sha256', this.o.webhookSigningKey).update(`${ts}.${rawBody}`).digest();
    const got = Buffer.from(sig, 'hex');
    return want.length === got.length && timingSafeEqual(want, got);
  }

  parseWebhook(body: unknown): PaymentWebhookEvent | null {
    const b = body as {
      type?: string;
      data?: {
        reference?: string;
        external_reference?: string;
        amount?: Money;
        metadata?: { reference?: string } | null;
        completed_at?: string;
        failure_reason?: string;
      };
    } | null;
    const status = b?.type ? EVENT_STATUS[b.type] : undefined;
    const d = b?.data;
    if (!status || !d) return null;
    // Our own reference rides in metadata; fall back to Snippe's so an unknown payment is still "unknown".
    const reference = d.metadata?.reference ?? d.external_reference ?? d.reference;
    if (!reference) return null;
    return {
      reference,
      providerRef: d.reference,
      status,
      amount: typeof d.amount?.value === 'number' ? d.amount.value : undefined,
      currency: d.amount?.currency,
      paidAt: d.completed_at ? new Date(d.completed_at) : undefined,
      failureReason: d.failure_reason,
    };
  }
}

/** A callback the way Snippe signs it, for tests. */
export function signSnippeWebhook(
  rawBody: string,
  signingKey: string,
  timestampSeconds: number,
): Record<string, string> {
  return {
    'x-webhook-timestamp': String(timestampSeconds),
    'x-webhook-signature': createHmac('sha256', signingKey)
      .update(`${timestampSeconds}.${rawBody}`)
      .digest('hex'),
  };
}
