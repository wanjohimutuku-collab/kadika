import type { MessagingProvider, SendResult } from './index';
import type { DeliveryState } from './evolution';

export interface AfricasTalkingOptions {
  /** Africa's Talking username (`sandbox` for the sandbox). */
  username: string;
  /** API key. Never log it. */
  apiKey: string;
  /** Approved alphanumeric sender ID; omit to send from the shared route. */
  senderId?: string;
  /** Defaults to production; use `https://api.sandbox.africastalking.com` for the sandbox. */
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

interface AtRecipient {
  statusCode?: number;
  status?: string;
  number?: string;
  cost?: string;
  messageId?: string;
}

/** Status codes that mean the gateway accepted the message (100 processed, 101 sent, 102 queued). */
const ACCEPTED = new Set([100, 101, 102]);

/** `"KES 0.8000"` → 1. Message cost is stored in whole currency units, so it is rounded up. */
export function parseAfricasTalkingCost(cost: string | undefined): number | undefined {
  const n = Number(/([\d.]+)/.exec(cost ?? '')?.[1]);
  return Number.isFinite(n) && n > 0 ? Math.ceil(n) : undefined;
}

/**
 * SMS through Africa's Talking (Kenya): `POST /version1/messaging`, form-encoded, `apiKey` header.
 * `providerMsgId` is the recipient's `messageId`, which delivery reports refer to. Numbers are sent in
 * E.164 with the `+`. Shaped after the public API; replace the base URL to use the sandbox.
 */
export class AfricasTalkingProvider implements MessagingProvider {
  readonly name = 'africastalking';
  readonly channel = 'sms' as const;
  constructor(private readonly o: AfricasTalkingOptions) {}

  async send(to: string, body: string): Promise<SendResult> {
    const f = this.o.fetchImpl ?? fetch;
    const form = new URLSearchParams({ username: this.o.username, to, message: body });
    if (this.o.senderId) form.set('from', this.o.senderId);
    const res = await f(
      `${this.o.baseUrl ?? 'https://api.africastalking.com'}/version1/messaging`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          accept: 'application/json',
          apiKey: this.o.apiKey,
        },
        body: form.toString(),
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!res.ok) throw new Error(`africastalking ${res.status}`);
    const json = (await res.json().catch(() => null)) as {
      SMSMessageData?: { Recipients?: AtRecipient[] };
    } | null;
    const r = json?.SMSMessageData?.Recipients?.[0];
    // The gateway answers 201 even when it rejects the number; the per-recipient code says which.
    if (!r || !ACCEPTED.has(Number(r.statusCode)))
      throw new Error(`africastalking ${r?.status ?? 'no recipient in response'}`);
    if (!r.messageId) throw new Error('africastalking: no message id in response');
    return { providerMsgId: r.messageId, cost: parseAfricasTalkingCost(r.cost) };
  }
}

/** Delivery report `status` (`Success`, `Failed`, `Sent`, `Buffered`, `Rejected`, ...) to our state. */
export function parseAfricasTalkingStatus(status: string | undefined): DeliveryState {
  const s = (status ?? '').toLowerCase();
  if (s === 'success' || s === 'delivered') return 'delivered';
  if (s === 'failed' || s === 'rejected' || s === 'expired') return 'failed';
  return 'pending';
}
