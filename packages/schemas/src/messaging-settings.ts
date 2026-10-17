/**
 * SMS and WhatsApp provider settings that staff edit in /ops (ADR 031). Shared by the API (validation,
 * building providers) and the web panel (rendering the forms), so both list the same fields.
 */
export const MESSAGING_ROUTES = ['sms_tz', 'sms_ke', 'whatsapp'] as const;
export type MessagingRoute = (typeof MESSAGING_ROUTES)[number];

export interface ProviderField {
  key: string;
  /** Never sent back to the browser; only its last four characters are shown. */
  secret?: boolean;
  required?: boolean;
}

const TEMPLATE_FIELDS: ProviderField[] = [
  'templateInvite',
  'templateReminder',
  'templatePledge',
  'templateContribution',
  'templateInviteKe',
  'templateReminderKe',
  'templatePledgeKe',
  'templateContributionKe',
].map((key) => ({ key }));

/** Providers per route and the fields each one needs. `fake` sends nothing (dev and tests). */
export const MESSAGING_PROVIDERS = {
  sms_tz: {
    fake: [],
    nextsms: [
      { key: 'username', required: true },
      { key: 'password', secret: true, required: true },
      { key: 'senderId', required: true },
    ],
  },
  sms_ke: {
    fake: [],
    africastalking: [
      { key: 'username', required: true },
      { key: 'apiKey', secret: true, required: true },
      { key: 'senderId' },
      { key: 'baseUrl' },
    ],
  },
  whatsapp: {
    fake: [],
    evolution: [
      { key: 'baseUrl', required: true },
      { key: 'instance', required: true },
      { key: 'apiKey', secret: true, required: true },
    ],
    cloud: [
      { key: 'token', secret: true, required: true },
      { key: 'phoneNumberId', required: true },
      { key: 'apiVersion' },
      { key: 'verifyToken', secret: true },
      { key: 'appSecret', secret: true },
      ...TEMPLATE_FIELDS,
    ],
  },
} as const satisfies Record<MessagingRoute, Record<string, readonly ProviderField[]>>;

export type MessagingProviderName<R extends MessagingRoute = MessagingRoute> = Extract<
  keyof (typeof MESSAGING_PROVIDERS)[R],
  string
>;

export const providerFields = (route: MessagingRoute, provider: string): readonly ProviderField[] =>
  (MESSAGING_PROVIDERS[route] as Record<string, readonly ProviderField[]>)[provider] ?? [];

/** One route as the panel sees it: plain fields in full, secrets only as a hint. */
export interface MessagingRouteView {
  route: MessagingRoute;
  provider: string;
  /** `database`: saved in /ops. `environment`: nothing saved yet, the env variables are in use. */
  source: 'database' | 'environment';
  fields: Record<string, string>;
  /** Secret fields that have a value, as `…abcd`. */
  secrets: Record<string, string>;
  /** The provider actually sending right now (it can differ from `provider` if a save failed to apply). */
  active: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface MessagingSettingsView {
  kenyaEnabled: boolean;
  routes: MessagingRouteView[];
  /** API paths (on the API host) where Meta and the gateways post delivery updates. */
  webhooks: { route: MessagingRoute; provider: string; path: string }[];
}

export interface MessagingSettingsInput {
  provider: string;
  /** Leave a secret empty (or out) to keep the saved one. */
  fields: Record<string, string>;
}
