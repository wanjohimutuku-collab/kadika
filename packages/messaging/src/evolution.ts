import type { MessagingProvider, SendResult } from './index';

export interface EvolutionOptions {
  /** e.g. https://evolution.example.com (no trailing slash). */
  baseUrl: string;
  /** The instance name created in Evolution API. */
  instance: string;
  /** The instance token (header `apikey`). Never log it. */
  apiKey: string;
  fetchImpl?: typeof fetch;
}

/** Evolution API v2 uses plain international digits, not a `+` and not a JID. */
export function toEvolutionNumber(e164: string): string {
  return e164.replace(/\D/g, '');
}

/**
 * WhatsApp through a self-hosted Evolution API (open decision §15.2). Text only: no attachments
 * ever go to guests (P1/P7). `providerMsgId` is Evolution's `key.id`, which the delivery webhook
 * (`messages.update`) refers to.
 */
export class EvolutionWhatsAppProvider implements MessagingProvider {
  readonly name = 'evolution';
  readonly channel = 'whatsapp' as const;
  readonly baseUrl: string;
  readonly instance: string;
  private readonly apiKey: string;

  constructor(private readonly o: EvolutionOptions) {
    this.baseUrl = o.baseUrl
      .trim()
      .replace(/\/+$/, '')
      .replace(/\/message$/, '');
    this.instance = o.instance.trim();
    this.apiKey = o.apiKey.trim();
  }

  async send(to: string, body: string): Promise<SendResult> {
    const f = this.o.fetchImpl ?? fetch;
    const url = `${this.baseUrl}/message/sendText/${encodeURIComponent(this.instance)}`;
    const res = await f(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: this.apiKey,
      },
      body: JSON.stringify({ number: toEvolutionNumber(to), text: body }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as {
        message?: string | string[];
        error?: string;
        response?: { message?: string | string[] };
      } | null;

      const detail =
        (Array.isArray(err?.response?.message)
          ? err?.response?.message.join(', ')
          : err?.response?.message) ||
        (Array.isArray(err?.message) ? err?.message.join(', ') : err?.message) ||
        err?.error ||
        '';

      if (res.status === 404) {
        const hint = detail
          ? detail
          : `instance "${this.instance}" not found (make sure the instance is created in Evolution API and baseUrl has no /message suffix)`;
        throw new Error(`evolution 404: ${hint}`);
      }

      throw new Error(`evolution ${res.status}${detail ? `: ${detail}` : ''}`);
    }

    const json = (await res.json().catch(() => null)) as { key?: { id?: string } } | null;
    const id = json?.key?.id;
    if (!id) throw new Error('evolution: no message id in response');
    return { providerMsgId: id, cost: 0 };
  }
}

export type DeliveryState = 'delivered' | 'read' | 'failed' | 'pending';

/**
 * Normalises an Evolution `messages.update` webhook body. Shapes differ between versions, so this
 * accepts `data.keyId`, `data.key.id` and arrays, and maps WhatsApp ack names to our states.
 */
export function parseEvolutionUpdate(
  payload: unknown,
): { providerMsgId: string; state: DeliveryState }[] {
  const p = payload as { event?: string; data?: unknown } | null;
  if (!p || typeof p !== 'object') return [];
  const items = Array.isArray(p.data) ? p.data : p.data ? [p.data] : [];
  const out: { providerMsgId: string; state: DeliveryState }[] = [];
  for (const raw of items) {
    const d = raw as {
      keyId?: string;
      key?: { id?: string };
      messageId?: string;
      status?: string | number;
    };
    const id = d.keyId ?? d.key?.id ?? d.messageId;
    if (!id) continue;
    const s = String(d.status ?? '').toUpperCase();
    const state: DeliveryState =
      s === 'READ' || s === 'PLAYED' || s === '4' || s === '5'
        ? 'read'
        : s === 'DELIVERY_ACK' || s === 'DELIVERED' || s === '3'
          ? 'delivered'
          : s === 'ERROR' || s === 'FAILED' || s === '0'
            ? 'failed'
            : 'pending'; // PENDING / SERVER_ACK: accepted by WhatsApp, not yet on the phone
    out.push({ providerMsgId: id, state });
  }
  return out;
}
