import type { Db } from '@harusi/db';
import type { MessagingProvider } from '@harusi/messaging';
import type { Config } from './config';

/** Everything a service needs. Tests pass fakes (PGlite, fake SMS, fixed clock). */
export interface Deps {
  db: Db;
  sms: MessagingProvider;
  /** WhatsApp Cloud API adapter (primary channel, §7.2). Optional: without it everything goes by SMS. */
  whatsapp?: MessagingProvider;
  /** Waits between delivery retries; tests pass a no-op. */
  sleep?: (ms: number) => Promise<void>;
  config: Config;
  now: () => Date;
  random: (n: number) => Uint8Array;
}

export const systemRandom = (n: number): Uint8Array => crypto.getRandomValues(new Uint8Array(n));
