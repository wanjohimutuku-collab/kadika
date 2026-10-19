/**
 * Payment gateway settings that staff edit in /ops/settings (ADR 036). Same shape as the messaging
 * settings (ADR 031): the field list lives here so the API and the panel cannot disagree.
 */
import type { ProviderField } from './messaging-settings';

/** One route today: Tanzanian mobile money. Kenya's aggregator stays in the environment (ADR 027). */
export const PAYMENT_ROUTES = ['tz'] as const;
export type PaymentRoute = (typeof PAYMENT_ROUTES)[number];

export const SNIPPE_ENVIRONMENTS = ['production', 'sandbox'] as const;

/**
 * `fake` collects nothing (dev and tests) and keeps using `PAYMENT_PROVIDER` / `PAYMENT_WEBHOOK_SECRET`.
 * `snippe` is the Snippe gateway: M-Pesa, Airtel Money, Mixx by Yas and Halopesa push prompts, TZS only.
 */
export const PAYMENT_PROVIDERS = {
  tz: {
    fake: [],
    snippe: [
      { key: 'apiKey', secret: true, required: true },
      /** Signs every callback; shown once in the Snippe dashboard when the webhook is created. */
      { key: 'webhookSigningKey', secret: true, required: true },
      /** `production` (default) or `sandbox`, for testing with no real money. */
      { key: 'environment' },
      /** Snippe requires a payer email; guests are not asked for one, so this stands in on receipts. */
      { key: 'receiptEmail' },
    ],
  },
} as const satisfies Record<PaymentRoute, Record<string, readonly ProviderField[]>>;

export const paymentProviderFields = (
  route: PaymentRoute,
  provider: string,
): readonly ProviderField[] =>
  (PAYMENT_PROVIDERS[route] as Record<string, readonly ProviderField[]>)[provider] ?? [];

export interface PaymentRouteView {
  route: PaymentRoute;
  provider: string;
  /** `database`: saved in /ops. `environment`: nothing saved yet, the env variables are in use. */
  source: 'database' | 'environment';
  fields: Record<string, string>;
  /** Secret fields that have a value, as `…abcd`. */
  secrets: Record<string, string>;
  /** The provider actually collecting right now (null when payments are off). */
  active: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface PaymentSettingsView {
  routes: PaymentRouteView[];
  /** Full URL to paste into the gateway dashboard as the webhook endpoint. */
  webhooks: { route: PaymentRoute; provider: string; url: string }[];
}

export interface PaymentSettingsInput {
  provider: string;
  /** Leave a secret empty (or out) to keep the saved one. */
  fields: Record<string, string>;
}
