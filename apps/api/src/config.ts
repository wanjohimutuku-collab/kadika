import type { Country } from '@harusi/schemas/country';

export interface Config {
  databaseUrl: string;
  jwtSecret: string;
  /** 32-byte key, base64. Encrypts event signing keys at rest (§9). */
  keyEncSecret: string;
  appBaseUrl: string;
  /** Public URL of this API (`API_PUBLIC_URL`), where gateways post callbacks. Null until set. */
  apiPublicUrl: string | null;
  shortBaseUrl: string;
  /** Kenya support (+254, KES, Nairobi) is off unless this is on (ADR 025). */
  kenyaEnabled: boolean;
  /** Rollback levers for Kenya without turning it off (docs/ops/kenya-pilot-runbook.md): no new Kenyan
   * messages, or no new Kenyan payment prompts. Callbacks and reconciliation keep running. */
  kenyaSendingPaused: boolean;
  kenyaPaymentsPaused: boolean;
  /** Link domain per country (`SHORT_BASE_URL_KE`); a country without one uses `shortBaseUrl`. */
  shortBaseUrls: Partial<Record<Country, string>>;
  /** SMS provider for Kenyan numbers: `fake` or `africastalking` (only used when Kenya is enabled). */
  /** Mobile-money provider for Kenya: `fake` or `aggregator` (only used when Kenya is enabled, ADR 027). */
  paymentProviderKe: string;
  paymentKe: {
    baseUrl: string;
    apiKey: string;
    webhookSecret: string;
    callbackUrl: string;
  } | null;
  /** Webhook secret for the Kenyan fake provider (falls back to `paymentWebhookSecret`). */
  paymentWebhookSecretKe: string | null;
  smsProviderKe: string;
  africasTalking: { username: string; apiKey: string; senderId?: string; baseUrl?: string } | null;
  smsProvider: string;
  whatsappProvider: string;
  paymentProvider: string;
  /** Shared secret the aggregator signs webhooks with; payments are off without it. */
  paymentWebhookSecret: string | null;
  /** Shared secret for delivery webhooks (header `x-webhook-secret`); webhooks are off without it. */
  webhookSecret: string | null;
  evolution: { baseUrl: string; instance: string; apiKey: string } | null;
  /** Official WhatsApp Business Cloud API (alternative to Evolution). */
  whatsappCloud: {
    token: string;
    phoneNumberId: string;
    apiVersion: string;
    verifyToken: string | null;
    appSecret: string | null;
    templates: { invite?: string; reminder?: string; pledge?: string; contribution?: string };
    /** Templates approved per country; Kenya's use a one-host-field parameter layout (ADR 026). */
    templatesByCountry: Partial<
      Record<
        Country,
        { invite?: string; reminder?: string; pledge?: string; contribution?: string }
      >
    >;
  } | null;
  nextSms: { username: string; password: string; senderId: string } | null;
  redisUrl: string | null;
  /** Hours a WhatsApp invitation may stay undelivered before the SMS fallback (§7.2). */
  whatsappFallbackHours: number;
  /** Browser origins allowed to call the API (web app, admin). */
  corsOrigins: string[];
  port: number;
  /** One structured log line per request (on unless LOG_REQUESTS=0; tests turn it off). */
  logRequests: boolean;
  /** Card views allowed per IP per minute (default 120; raise only for load tests). */
  cardReadLimit: number;
  /** Sentry project DSN; error reporting is off without it. */
  sentryDsn: string | null;
}

function required(env: Record<string, string | undefined>, key: string): string {
  const v = env[key];
  if (!v) throw new Error(`${key} is required`);
  return v;
}

export function loadConfig(input: Record<string, string | undefined> = process.env): Config {
  // An empty value means unset. Coolify passes blank optional variables as "", which would
  // otherwise slip past `??` (e.g. WHATSAPP_PROVIDER="" stopping startup, a blank fallback = 0 h).
  const env = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== ''));
  const production = env.NODE_ENV === 'production';
  const jwtSecret = required(env, 'JWT_SECRET');
  const keyEncSecret = required(env, 'KEY_ENC_SECRET');
  if (production && (jwtSecret.startsWith('change-me') || keyEncSecret.startsWith('change-me'))) {
    throw new Error('JWT_SECRET and KEY_ENC_SECRET must be set to real secrets in production');
  }
  if (jwtSecret.length < 16) throw new Error('JWT_SECRET must be at least 16 characters');
  return {
    databaseUrl: required(env, 'DATABASE_URL'),
    jwtSecret,
    keyEncSecret,
    appBaseUrl: env.APP_BASE_URL ?? 'http://localhost:3000',
    apiPublicUrl: env.API_PUBLIC_URL ? env.API_PUBLIC_URL.replace(/\/$/, '') : null,
    shortBaseUrl: env.SHORT_BASE_URL ?? env.APP_BASE_URL ?? 'http://localhost:3000',
    kenyaEnabled: env.KENYA_ENABLED === '1' || env.KENYA_ENABLED === 'true',
    kenyaSendingPaused: env.KENYA_SENDING_PAUSED === '1' || env.KENYA_SENDING_PAUSED === 'true',
    kenyaPaymentsPaused: env.KENYA_PAYMENTS_PAUSED === '1' || env.KENYA_PAYMENTS_PAUSED === 'true',
    shortBaseUrls: env.SHORT_BASE_URL_KE ? { KE: env.SHORT_BASE_URL_KE } : {},
    paymentProviderKe: env.PAYMENT_PROVIDER_KE ?? 'fake',
    paymentKe:
      env.PAYMENT_API_URL_KE &&
      env.PAYMENT_API_KEY_KE &&
      env.PAYMENT_WEBHOOK_SECRET_KE &&
      env.PAYMENT_CALLBACK_URL_KE
        ? {
            baseUrl: env.PAYMENT_API_URL_KE.replace(/\/$/, ''),
            apiKey: env.PAYMENT_API_KEY_KE,
            webhookSecret: env.PAYMENT_WEBHOOK_SECRET_KE,
            callbackUrl: env.PAYMENT_CALLBACK_URL_KE,
          }
        : null,
    paymentWebhookSecretKe: env.PAYMENT_WEBHOOK_SECRET_KE ?? null,
    smsProviderKe: env.SMS_PROVIDER_KE ?? 'fake',
    africasTalking:
      env.AT_USERNAME && env.AT_API_KEY
        ? {
            username: env.AT_USERNAME,
            apiKey: env.AT_API_KEY,
            senderId: env.AT_SENDER_ID || undefined,
            baseUrl: env.AT_BASE_URL || undefined,
          }
        : null,
    smsProvider: env.SMS_PROVIDER ?? 'fake',
    whatsappProvider: env.WHATSAPP_PROVIDER ?? 'fake',
    paymentProvider: env.PAYMENT_PROVIDER ?? 'fake',
    paymentWebhookSecret: env.PAYMENT_WEBHOOK_SECRET ?? null,
    webhookSecret: env.WEBHOOK_SECRET ?? null,
    evolution:
      env.EVOLUTION_BASE_URL && env.EVOLUTION_INSTANCE && env.EVOLUTION_API_KEY
        ? {
            baseUrl: env.EVOLUTION_BASE_URL.replace(/\/$/, ''),
            instance: env.EVOLUTION_INSTANCE,
            apiKey: env.EVOLUTION_API_KEY,
          }
        : null,
    whatsappCloud:
      env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_ID
        ? {
            token: env.WHATSAPP_TOKEN,
            phoneNumberId: env.WHATSAPP_PHONE_ID,
            apiVersion: env.WHATSAPP_API_VERSION ?? 'v21.0',
            verifyToken: env.WHATSAPP_VERIFY_TOKEN ?? null,
            appSecret: env.WHATSAPP_APP_SECRET ?? null,
            templates: {
              invite: env.WHATSAPP_TEMPLATE_INVITE,
              reminder: env.WHATSAPP_TEMPLATE_REMINDER,
              pledge: env.WHATSAPP_TEMPLATE_PLEDGE,
              contribution: env.WHATSAPP_TEMPLATE_CONTRIBUTION,
            },
            templatesByCountry:
              env.WHATSAPP_TEMPLATE_INVITE_KE ||
              env.WHATSAPP_TEMPLATE_REMINDER_KE ||
              env.WHATSAPP_TEMPLATE_PLEDGE_KE ||
              env.WHATSAPP_TEMPLATE_CONTRIBUTION_KE
                ? {
                    KE: {
                      invite: env.WHATSAPP_TEMPLATE_INVITE_KE,
                      reminder: env.WHATSAPP_TEMPLATE_REMINDER_KE,
                      pledge: env.WHATSAPP_TEMPLATE_PLEDGE_KE,
                      contribution: env.WHATSAPP_TEMPLATE_CONTRIBUTION_KE,
                    },
                  }
                : {},
          }
        : null,
    nextSms:
      env.NEXTSMS_USERNAME && env.NEXTSMS_PASSWORD && env.SMS_SENDER_ID
        ? {
            username: env.NEXTSMS_USERNAME,
            password: env.NEXTSMS_PASSWORD,
            senderId: env.SMS_SENDER_ID,
          }
        : null,
    redisUrl: env.REDIS_URL ?? null,
    whatsappFallbackHours: Number(env.WHATSAPP_FALLBACK_HOURS ?? 6),
    // CORS_EXTRA_ORIGINS adds hosts to the list, e.g. the console and staff hosts in production (ADR 032).
    corsOrigins: [
      env.CORS_ORIGINS ?? env.APP_BASE_URL ?? 'http://localhost:3000',
      env.CORS_EXTRA_ORIGINS ?? '',
    ]
      .join(',')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    port: Number(env.API_PORT ?? env.PORT ?? 3001),
    logRequests: env.LOG_REQUESTS !== '0',
    cardReadLimit: Number(env.CARD_READ_LIMIT ?? 120),
    sentryDsn: env.SENTRY_DSN || null,
  };
}
