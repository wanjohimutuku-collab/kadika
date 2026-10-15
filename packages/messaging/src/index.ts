/** Provider interfaces (§12): every external messaging provider sits behind one of these. */
export type MessageChannel = 'whatsapp' | 'sms';

export interface SendResult {
  providerMsgId: string;
  /** Provider cost in the event's currency (TZS today) when known. */
  cost?: number;
}

/**
 * Structured form of a message, for providers that need an approved template (WhatsApp Cloud API
 * business-initiated messages). Providers that send free text ignore it.
 */
export interface MessageTemplate {
  kind: 'invite' | 'reminder' | 'pledge';
  locale: 'sw' | 'en';
  /** Event country (`TZ`, `KE`): picks the approved template and its parameter layout (ADR 026). */
  country?: string;
  /**
   * Positional values for {{1}}…{{n}}. Tanzania: invite = A, B, date, link, code; reminder = A, B, days,
   * link, code; pledge = name, A & B, pledged, balance, link. Kenya (one host field, so a single host
   * works): invite = hosts, date, link, code; reminder = hosts, days, link, code; pledge = name, hosts,
   * pledged, balance, link.
   */
  params: string[];
}

export interface MessagingProvider {
  readonly name: string;
  readonly channel: MessageChannel;
  /** Throws on failure; callers record the error in `message_log`. */
  send(to: string, body: string, template?: MessageTemplate): Promise<SendResult>;
}

export interface SentMessage {
  template?: MessageTemplate;
  to: string;
  body: string;
  channel: MessageChannel;
  at: Date;
}

/**
 * In-memory provider for tests and local dev (§12). Optionally fails for chosen numbers so retry and
 * fallback logic can be exercised without a gateway.
 */
export class FakeMessagingProvider implements MessagingProvider {
  readonly name = 'fake';
  readonly sent: SentMessage[] = [];
  private counter = 0;

  constructor(
    readonly channel: MessageChannel = 'sms',
    private readonly failFor: (to: string) => boolean = () => false,
    /** Message ids look like `<idPrefix>-1`; separate fakes use separate prefixes so ids never collide. */
    private readonly idPrefix = 'fake',
  ) {}

  async send(to: string, body: string, template?: MessageTemplate): Promise<SendResult> {
    if (this.failFor(to)) throw new Error('fake provider failure');
    this.sent.push({ to, body, template, channel: this.channel, at: new Date() });
    return {
      providerMsgId: `${this.idPrefix}-${++this.counter}`,
      cost: this.channel === 'sms' ? 25 : 0,
    };
  }

  /** The last body sent to a number — tests read OTP codes from here. */
  lastTo(to: string): string | undefined {
    return [...this.sent].reverse().find((m) => m.to === to)?.body;
  }
}
export * from './evolution';
export * from './nextsms';
export * from './africastalking';
export * from './whatsapp-cloud';
