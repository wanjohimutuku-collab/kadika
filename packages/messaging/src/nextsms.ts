import type { MessagingProvider, SendResult } from './index';
import type { DeliveryState } from './evolution';

export interface NextSmsOptions {
  username: string;
  password: string;
  /** Alphanumeric sender id registered with TCRA / NextSMS. */
  senderId: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

/** NextSMS wants digits with the country code and no `+` (e.g. 255712345678). */
export function toNextSmsNumber(e164: string): string {
  return e164.replace(/\D/g, '');
}

interface NextSmsMessage {
  messageId?: string | number;
  smsCount?: number;
  status?: { groupName?: string; name?: string };
}

/**
 * SMS through NextSMS (Tanzania, open decision §15.3): `POST /api/sms/v1/text/single` with HTTP
 * Basic auth. `providerMsgId` is NextSMS's `messageId`, used to look up delivery reports.
 */
export class NextSmsProvider implements MessagingProvider {
  readonly name = 'nextsms';
  readonly channel = 'sms' as const;
  constructor(private readonly o: NextSmsOptions) {}

  private get base() {
    return this.o.baseUrl ?? 'https://messaging-service.co.tz';
  }
  private get auth() {
    return `Basic ${Buffer.from(`${this.o.username}:${this.o.password}`).toString('base64')}`;
  }

  async send(to: string, body: string): Promise<SendResult> {
    const f = this.o.fetchImpl ?? fetch;
    const res = await f(`${this.base}/api/sms/v1/text/single`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        authorization: this.auth,
      },
      body: JSON.stringify({ from: this.o.senderId, to: toNextSmsNumber(to), text: body }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`nextsms ${res.status}`);
    const json = (await res.json().catch(() => null)) as { messages?: NextSmsMessage[] } | null;
    const m = json?.messages?.[0];
    if (!m?.messageId) throw new Error('nextsms: no message id in response');
    return { providerMsgId: String(m.messageId) };
  }

  /** Delivery report for one message (polled; no callback format is assumed). */
  async report(messageId: string): Promise<DeliveryState> {
    const f = this.o.fetchImpl ?? fetch;
    const res = await f(
      `${this.base}/api/sms/v1/reports?messageId=${encodeURIComponent(messageId)}`,
      { headers: { accept: 'application/json', authorization: this.auth } },
    );
    if (!res.ok) throw new Error(`nextsms report ${res.status}`);
    const json = (await res.json().catch(() => null)) as {
      results?: { status?: { groupName?: string; name?: string } }[];
    } | null;
    return parseNextSmsStatus(json?.results?.[0]?.status);
  }
}

export function parseNextSmsStatus(s?: { groupName?: string; name?: string }): DeliveryState {
  const g = (s?.groupName ?? s?.name ?? '').toUpperCase();
  if (g.startsWith('DELIVERED')) return 'delivered';
  if (g.startsWith('UNDELIVERABLE') || g.startsWith('REJECTED') || g.startsWith('EXPIRED'))
    return 'failed';
  return 'pending';
}
