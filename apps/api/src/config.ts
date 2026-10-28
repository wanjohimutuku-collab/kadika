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
  /** Where staff-uploaded app files (the Android APK, ADR 047) are kept: a persistent volume. */
  appFilesDir?: string;
  /** Kenya support (+254, KES, Nairobi) is off unless this is on (ADR 025). */
  kenyaEnabled: boolean;
  /** Rollback levers for Kenya without turning it off (docs/ops/kenya-pilot-runbook.md): no new Kenyan
   * messages, or no new Kenyan payment prompts. Callbacks and reconciliation keep running. */
  kenyaSendingPaused: boolean;
  kenyaPaymentsPaused: boolean;
  /**
   * Guests paying contributions through our gateway (ADR 043). Off: hosts are paid directly and the
   * committee records it. Webhooks and reconciliation still settle payments already in flight.
   */
  guestPaymentsEnabled: boolean;
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
  /**
   * Header that carries the real client IP, set by the edge proxy (e.g. `cf-connecting-ip` behind
   * Cloudflare). Without it the last X-Forwarded-For entry is used: the one the nearest proxy added,
   * which a client cannot forge. Rate limits key on this IP.
   */
  clientIpHeader: string | null;
  /** Login codes one IP may request per hour, across all phone numbers (SMS pumping guard). */
  otpIpHourlyLimit: number;
  /** Login codes the whole API sends per hour; past it requests fail and staff are alerted. */
  otpGlobalHourlyLimit: number;
  /** SMS + WhatsApp messages in 24 hours above which an alert is reported (spend guard; 0 = off). */
  messageDailyAlert: number;
  /**
   * Who sends sign-in codes (ADR 048): `sms` is our own code through the SMS route; `firebase` is
   * Firebase Phone Auth, and our SMS routes then carry only transactional messages.
   */
  authOtpProvider: 'sms' | 'firebase';
  /** Break-glass (ADR 049): codes go by SMS whatever is saved in /ops, e.g. while Firebase is broken. */
  authForceSms: boolean;
  /** Firebase project for phone sign-in. The web values are public; clients read them from the API. */
  firebase: {
    projectId: string;
    apiKey: string | null;
    authDomain: string | null;
    appId: string | null;
  } | null;
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
  const authOtpProvider = env.AUTH_OTP_PROVIDER ?? 'sms';
  if (authOtpProvider !== 'sms' && authOtpProvider !== 'firebase')
    throw new Error('AUTH_OTP_PROVIDER must be sms or firebase');
  if (authOtpProvider === 'firebase' && !env.FIREBASE_PROJECT_ID)
    throw new Error('AUTH_OTP_PROVIDER=firebase needs FIREBASE_PROJECT_ID');
  return {
    databaseUrl: required(env, 'DATABASE_URL'),
    jwtSecret,
    keyEncSecret,
    appBaseUrl: env.APP_BASE_URL ?? 'http://localhost:3000',
    apiPublicUrl: env.API_PUBLIC_URL ? env.API_PUBLIC_URL.replace(/\/$/, '') : null,
    shortBaseUrl: env.SHORT_BASE_URL ?? env.APP_BASE_URL ?? 'http://localhost:3000',
    appFilesDir: env.APP_FILES_DIR ?? 'data/app-files',
    kenyaEnabled: env.KENYA_ENABLED === '1' || env.KENYA_ENABLED === 'true',
    kenyaSendingPaused: env.KENYA_SENDING_PAUSED === '1' || env.KENYA_SENDING_PAUSED === 'true',
    kenyaPaymentsPaused: env.KENYA_PAYMENTS_PAUSED === '1' || env.KENYA_PAYMENTS_PAUSED === 'true',
    guestPaymentsEnabled:
      env.GUEST_PAYMENTS_ENABLED === '1' || env.GUEST_PAYMENTS_ENABLED === 'true',
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
    clientIpHeader: env.CLIENT_IP_HEADER ? env.CLIENT_IP_HEADER.toLowerCase() : null,
    otpIpHourlyLimit: Number(env.OTP_IP_HOURLY_LIMIT ?? 20),
    otpGlobalHourlyLimit: Number(env.OTP_GLOBAL_HOURLY_LIMIT ?? 500),
    messageDailyAlert: Number(env.MESSAGE_DAILY_ALERT ?? 5000),
    authOtpProvider,
    authForceSms: env.AUTH_FORCE_SMS === '1' || env.AUTH_FORCE_SMS === 'true',
    firebase: env.FIREBASE_PROJECT_ID
      ? {
          projectId: env.FIREBASE_PROJECT_ID,
          apiKey: env.FIREBASE_WEB_API_KEY ?? null,
          authDomain: env.FIREBASE_AUTH_DOMAIN ?? `${env.FIREBASE_PROJECT_ID}.firebaseapp.com`,
          appId: env.FIREBASE_WEB_APP_ID ?? null,
        }
      : null,
  };
}
