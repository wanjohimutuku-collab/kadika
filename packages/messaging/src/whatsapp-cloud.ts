import { createHmac, timingSafeEqual } from 'node:crypto';
import type { MessageTemplate, MessagingProvider, SendResult } from './index';
import type { DeliveryState } from './evolution';

export type TemplateNames = {
  invite?: string;
  reminder?: string;
  pledge?: string;
  contribution?: string;
};

export interface WhatsAppCloudOptions {
  /** Permanent system-user access token. Never log it. */
  token: string;
  /** The WhatsApp phone number id (not the phone number). */
  phoneNumberId: string;
  /** Graph API version, e.g. `v21.0`. */
  apiVersion?: string;
  /**
   * Approved template names. A business-initiated message (every invitation) must use a template;
   * without one the provider sends plain text, which WhatsApp only delivers inside a 24-hour
   * customer window, so first contact will fail.
   */
  templates?: TemplateNames;
  /** Templates approved for one country; used instead of `templates` for that country's events. */
  templatesByCountry?: Record<string, TemplateNames>;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

/** WhatsApp wants digits with the country code and no `+`. */
export const toCloudNumber = (e164: string) => e164.replace(/\D/g, '');

/**
 * The official WhatsApp Business Cloud API (open decision §15.2, alternative to Evolution).
 * `POST /{phone-number-id}/messages`, Bearer auth. The message id is `messages[0].id` (`wamid…`),
 * which delivery webhooks refer to.
 */
export class WhatsAppCloudProvider implements MessagingProvider {
  readonly name = 'whatsapp-cloud';
  readonly channel = 'whatsapp' as const;
  constructor(private readonly o: WhatsAppCloudOptions) {}

  /**
   * A country with its own approved templates uses only those. A country without any (say Kenya,
   * before its templates are approved) must not borrow Tanzania's: the parameter layout differs and
   * WhatsApp rejects a wrong count, so it falls back to plain text and then to SMS.
   */
  private templateName(t: MessageTemplate): string | undefined {
    const own = t.country ? this.o.templatesByCountry?.[t.country] : undefined;
    if (own) return own[t.kind];
    return t.country && t.country !== 'TZ' ? undefined : this.o.templates?.[t.kind];
  }

  async send(to: string, body: string, template?: MessageTemplate): Promise<SendResult> {
    const f = this.o.fetchImpl ?? fetch;
    const name = template ? this.templateName(template) : undefined;
    const payload =
      template && name
        ? {
            messaging_product: 'whatsapp',
            to: toCloudNumber(to),
            type: 'template',
            template: {
              name,
              language: { code: template.locale },
              components: [
                {
                  type: 'body',
                  parameters: template.params.map((text) => ({ type: 'text', text })),
                },
              ],
            },
          }
        : {
            messaging_product: 'whatsapp',
            to: toCloudNumber(to),
            type: 'text',
            text: { body, preview_url: true },
          };
    const res = await f(
      `${this.o.baseUrl ?? 'https://graph.facebook.com'}/${this.o.apiVersion ?? 'v21.0'}/${this.o.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${this.o.token}` },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { error?: { code?: number } } | null;
      // The Meta error code is useful for support; the message text can echo the number, so skip it.
      throw new Error(
        `whatsapp-cloud ${res.status}${err?.error?.code ? ` code ${err.error.code}` : ''}`,
      );
    }
    const json = (await res.json().catch(() => null)) as { messages?: { id?: string }[] } | null;
    const id = json?.messages?.[0]?.id;
    if (!id) throw new Error('whatsapp-cloud: no message id in response');
    return { providerMsgId: id };
  }
}

/** `X-Hub-Signature-256: sha256=<hmac of the raw body with the app secret>` (constant-time check). */
export function verifyMetaSignature(
  rawBody: string,
  header: string | undefined,
  appSecret: string,
) {
  if (!header?.startsWith('sha256=')) return false;
  const want = createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const got = header.slice(7);
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Webhook subscription handshake (`GET`): returns the challenge to echo, or null if it is wrong. */
export function metaVerifyChallenge(
  q: { mode?: string | null; token?: string | null; challenge?: string | null },
  verifyToken: string,
): string | null {
  if (q.mode !== 'subscribe' || !q.challenge || !q.token || !verifyToken) return null;
  // Constant time, like every other webhook secret (§9).
  const a = Buffer.from(q.token);
  const b = Buffer.from(verifyToken);
  return a.length === b.length && timingSafeEqual(a, b) ? q.challenge : null;
}

/** Status callbacks (`entry[].changes[].value.statuses[]`) mapped to our delivery states. */
export function parseCloudStatuses(
  payload: unknown,
): { providerMsgId: string; state: DeliveryState }[] {
  const out: { providerMsgId: string; state: DeliveryState }[] = [];
  const entries = (payload as { entry?: unknown[] } | null)?.entry ?? [];
  for (const e of entries) {
    for (const ch of (e as { changes?: unknown[] }).changes ?? []) {
      const statuses =
        (ch as { value?: { statuses?: { id?: string; status?: string }[] } }).value?.statuses ?? [];
      for (const s of statuses) {
        if (!s.id) continue;
        const state: DeliveryState =
          s.status === 'read'
            ? 'read'
            : s.status === 'delivered'
              ? 'delivered'
              : s.status === 'failed'
                ? 'failed'
                : 'pending'; // `sent` = accepted by WhatsApp, not yet on the phone
        out.push({ providerMsgId: s.id, state });
      }
    }
  }
  return out;
}
