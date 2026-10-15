import {
  SIGNATURE_HEADER,
  verifyHmac,
  type CollectionQueryResult,
  type PaymentProvider,
  type PaymentWebhookEvent,
  type StartCollectionInput,
  type StartCollectionResult,
} from './index';

export interface AggregatorOptions {
  /** Unique provider name stored on payment rows, for example `aggregator-ke`. */
  name: string;
  baseUrl: string;
  /** API key sent as a Bearer token. Never log it. */
  apiKey: string;
  /** Shared secret the aggregator signs callbacks with (HMAC-SHA256 of the raw body). */
  webhookSecret: string;
  /** Public HTTPS URL the aggregator posts results to. */
  callbackUrl: string;
  fetchImpl?: typeof fetch;
}

const SUCCESS = new Set(['success', 'successful', 'paid', 'completed']);
const FAILURE = new Set(['failed', 'cancelled', 'canceled', 'expired', 'rejected', 'timeout']);

/** Maps an aggregator's status word to ours; `null` for in-flight states we ignore. */
export function mapAggregatorStatus(status: unknown): 'success' | 'failed' | null {
  const s = typeof status === 'string' ? status.toLowerCase() : '';
  if (SUCCESS.has(s)) return 'success';
  if (FAILURE.has(s)) return 'failed';
  return null;
}

/**
 * A mobile-money aggregator with STK push (ADR 027). The wire format is a plain REST/JSON shape and an
 * assumption until a real aggregator is chosen: `POST /v1/collections` to start, `GET
 * /v1/collections/{reference}` to query, and a signed JSON callback. Our reference doubles as the
 * provider's idempotency key, so a retried start never prompts the phone twice.
 */
export class AggregatorPaymentProvider implements PaymentProvider {
  constructor(private readonly o: AggregatorOptions) {}

  get name(): string {
    return this.o.name;
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      accept: 'application/json',
      authorization: `Bearer ${this.o.apiKey}`,
      ...extra,
    };
  }

  async startCollection(input: StartCollectionInput): Promise<StartCollectionResult> {
    const f = this.o.fetchImpl ?? fetch;
    const res = await f(`${this.o.baseUrl}/v1/collections`, {
      method: 'POST',
      headers: this.headers({
        'content-type': 'application/json',
        'idempotency-key': input.reference,
      }),
      body: JSON.stringify({
        reference: input.reference,
        amount: input.amount,
        currency: input.currency,
        phone: input.phoneE164,
        method: input.method,
        description: input.description,
        callbackUrl: this.o.callbackUrl,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    // Never echo the body: it can contain the payer's number.
    if (!res.ok) throw new Error(`aggregator ${res.status}`);
    const json = (await res.json().catch(() => null)) as { id?: string } | null;
    if (!json?.id) throw new Error('aggregator: no collection id in response');
    return { providerRef: json.id };
  }

  async queryCollection(reference: string): Promise<CollectionQueryResult> {
    const f = this.o.fetchImpl ?? fetch;
    const res = await f(`${this.o.baseUrl}/v1/collections/${encodeURIComponent(reference)}`, {
      headers: this.headers(),
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status === 404) return { status: 'unknown' };
    if (!res.ok) throw new Error(`aggregator query ${res.status}`);
    const j = (await res.json().catch(() => null)) as {
      status?: string;
      amount?: number;
      currency?: string;
      paidAt?: string;
      reason?: string;
    } | null;
    const mapped = mapAggregatorStatus(j?.status);
    return {
      status: mapped ?? 'pending',
      amount: typeof j?.amount === 'number' ? j.amount : undefined,
      currency: j?.currency,
      paidAt: j?.paidAt ? new Date(j.paidAt) : undefined,
      failureReason: j?.reason,
    };
  }

  verifyWebhook(rawBody: string, headers: Record<string, string | undefined>): boolean {
    return verifyHmac(rawBody, headers[SIGNATURE_HEADER], this.o.webhookSecret);
  }

  parseWebhook(body: unknown): PaymentWebhookEvent | null {
    const b = body as {
      reference?: string;
      id?: string;
      status?: string;
      amount?: number;
      currency?: string;
      paidAt?: string;
      reason?: string;
    } | null;
    const status = mapAggregatorStatus(b?.status);
    if (!b?.reference || !status) return null;
    return {
      reference: b.reference,
      providerRef: b.id,
      status,
      amount: typeof b.amount === 'number' ? b.amount : undefined,
      currency: b.currency,
      paidAt: b.paidAt ? new Date(b.paidAt) : undefined,
      failureReason: b.reason,
    };
  }
}
