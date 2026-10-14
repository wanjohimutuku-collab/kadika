/** Provider interfaces (§12): every external messaging provider sits behind one of these. */
export type MessageChannel = 'whatsapp' | 'sms';

export interface SendResult {
  providerMsgId: string;
  /** Provider cost in TZS when known. */
  costTzs?: number;
}

export interface MessagingProvider {
  readonly name: string;
  readonly channel: MessageChannel;
  /** Throws on failure; callers record the error in `message_log`. */
  send(to: string, body: string): Promise<SendResult>;
}

export interface SentMessage {
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
  ) {}

  async send(to: string, body: string): Promise<SendResult> {
    if (this.failFor(to)) throw new Error('fake provider failure');
    this.sent.push({ to, body, channel: this.channel, at: new Date() });
    return { providerMsgId: `fake-${++this.counter}`, costTzs: this.channel === 'sms' ? 25 : 0 };
  }

  /** The last body sent to a number — tests read OTP codes from here. */
  lastTo(to: string): string | undefined {
    return [...this.sent].reverse().find((m) => m.to === to)?.body;
  }
}
export * from './evolution';
export * from './nextsms';
