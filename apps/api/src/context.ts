import type { Db } from '@harusi/db';
import type { DeliveryState } from '@harusi/messaging';
import type { SendInput } from './services/delivery';
import type { MessagingProvider } from '@harusi/messaging';
import type { Config } from './config';

/** Everything a service needs. Tests pass fakes (PGlite, fake SMS, fixed clock). */
export interface Deps {
  db: Db;
  sms: MessagingProvider;
  /** WhatsApp Cloud API adapter (primary channel, §7.2). Optional: without it everything goes by SMS. */
  whatsapp?: MessagingProvider;
  /** NextSMS delivery report lookup (polled; there is no assumed callback format). */
  smsReport?: (providerMsgId: string) => Promise<DeliveryState>;
  /** Queues a send for the BullMQ worker; without it sends run inline. */
  enqueueSend?: (data: { eventId: string; userId: string; input: SendInput }) => Promise<string>;
  /** Waits between delivery retries; tests pass a no-op. */
  sleep?: (ms: number) => Promise<void>;
  config: Config;
  now: () => Date;
  random: (n: number) => Uint8Array;
}

export const systemRandom = (n: number): Uint8Array => crypto.getRandomValues(new Uint8Array(n));
