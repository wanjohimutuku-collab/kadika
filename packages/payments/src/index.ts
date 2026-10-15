import { createHmac, timingSafeEqual } from 'node:crypto';

export type MobileMoneyMethod = 'mpesa' | 'mixx' | 'airtel' | 'halopesa';

export interface StartCollectionInput {
  /** Our own reference (`HP…`), unique per attempt; the provider echoes it back in webhooks. */
  reference: string;
  amount: number;
  phoneE164: string;
  method: MobileMoneyMethod;
  description: string;
}

export interface StartCollectionResult {
  /** The provider's id for the request (stored as `payments.provider_ref`'s companion in `raw`). */
  providerRef: string;
}

export interface PaymentWebhookEvent {
  /** Our reference when the provider echoes it, otherwise the provider's own id. */
  reference: string;
  providerRef?: string;
  status: 'success' | 'failed';
  amount?: number;
  paidAt?: Date;
  failureReason?: string;
}

/**
 * Every aggregator (Selcom, AzamPay, ClickPesa, …) sits behind this interface (§3, §12), with an
 * in-memory fake for tests. `verifyWebhook` must be constant-time and must be called on the raw
 * request body before anything is parsed (§9).
 */
export interface PaymentProvider {
  readonly name: string;
  /** Asks the guest's phone for approval (a push prompt). Throws if the provider rejects it. */
  startCollection(input: StartCollectionInput): Promise<StartCollectionResult>;
  verifyWebhook(rawBody: string, headers: Record<string, string | undefined>): boolean;
  parseWebhook(body: unknown): PaymentWebhookEvent | null;
}

export const SIGNATURE_HEADER = 'x-signature';

/** Hex HMAC-SHA256 of the raw body, the scheme the fake (and most aggregators) use. */
export function signWebhook(rawBody: string, secret: string): string {
  return createHmac('sha256', secret).update(rawBody).digest('hex');
}

export function verifyHmac(rawBody: string, given: string | undefined, secret: string): boolean {
  if (!given || !secret) return false;
  const want = Buffer.from(signWebhook(rawBody, secret));
  const got = Buffer.from(given);
  return want.length === got.length && timingSafeEqual(want, got);
}

export interface FakeStarted extends StartCollectionInput {
  providerRef: string;
}

/**
 * In-memory provider for tests and local dev. `outcome` picks what the "phone" does for a number;
 * tests then post a signed webhook (see `webhookBody`) to resolve it, just like a real aggregator.
 */
export class FakePaymentProvider implements PaymentProvider {
  readonly name = 'fake';
  readonly started: FakeStarted[] = [];
  private n = 0;

  constructor(
    private readonly secret: string,
    private readonly rejectStart: (phone: string) => boolean = () => false,
  ) {}

  async startCollection(input: StartCollectionInput): Promise<StartCollectionResult> {
    if (this.rejectStart(input.phoneE164)) throw new Error('fake provider rejected the request');
    const providerRef = `fake-pay-${++this.n}`;
    this.started.push({ ...input, providerRef });
    return { providerRef };
  }

  verifyWebhook(rawBody: string, headers: Record<string, string | undefined>): boolean {
    return verifyHmac(rawBody, headers[SIGNATURE_HEADER], this.secret);
  }

  parseWebhook(body: unknown): PaymentWebhookEvent | null {
    const b = body as {
      reference?: string;
      providerRef?: string;
      status?: string;
      amount?: number;
      paidAt?: string;
      failureReason?: string;
    } | null;
    if (!b?.reference || (b.status !== 'success' && b.status !== 'failed')) return null;
    return {
      reference: b.reference,
      providerRef: b.providerRef,
      status: b.status,
      amount: typeof b.amount === 'number' ? b.amount : undefined,
      paidAt: b.paidAt ? new Date(b.paidAt) : undefined,
      failureReason: b.failureReason,
    };
  }

  /** A signed webhook the way the fake aggregator would send it. */
  webhookBody(event: {
    reference: string;
    status: 'success' | 'failed';
    amount?: number;
    failureReason?: string;
  }): { raw: string; headers: Record<string, string> } {
    const raw = JSON.stringify(event);
    return { raw, headers: { [SIGNATURE_HEADER]: signWebhook(raw, this.secret) } };
  }
}
