import type { Db } from '@harusi/db';
import type { DeliveryState } from '@harusi/messaging';
import type { PaymentProvider } from '@harusi/payments';
import type { RateStore } from './rate-limit';
import type { SendInput } from './services/delivery';
import type { MessagingProvider } from '@harusi/messaging';
import type { Config } from './config';

/** Everything a service needs. Tests pass fakes (PGlite, fake SMS, fixed clock). */
export interface Deps {
  db: Db;
  sms: MessagingProvider;
  /** Reports an unexpected (5xx) error to an external service such as Sentry; secrets already scrubbed. */
  reportError?: (err: Error) => void;
  /** Shared rate-limit counters (Redis) when there is more than one instance; memory otherwise. */
  rateStore?: RateStore;
  /** Mobile-money aggregator (fake in dev and tests until one is chosen, ADR 023). */
  payments?: PaymentProvider;
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
