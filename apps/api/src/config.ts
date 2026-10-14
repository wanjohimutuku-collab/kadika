export interface Config {
  databaseUrl: string;
  jwtSecret: string;
  /** 32-byte key, base64. Encrypts event signing keys at rest (§9). */
  keyEncSecret: string;
  appBaseUrl: string;
  shortBaseUrl: string;
  smsProvider: string;
  whatsappProvider: string;
  /** Shared secret for delivery webhooks (header `x-webhook-secret`); webhooks are off without it. */
  webhookSecret: string | null;
  evolution: { baseUrl: string; instance: string; apiKey: string } | null;
  nextSms: { username: string; password: string; senderId: string } | null;
  redisUrl: string | null;
  /** Hours a WhatsApp invitation may stay undelivered before the SMS fallback (§7.2). */
  whatsappFallbackHours: number;
  /** Browser origins allowed to call the API (web app, admin). */
  corsOrigins: string[];
  port: number;
}

function required(env: Record<string, string | undefined>, key: string): string {
  const v = env[key];
  if (!v) throw new Error(`${key} is required`);
  return v;
}

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
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
    shortBaseUrl: env.SHORT_BASE_URL ?? env.APP_BASE_URL ?? 'http://localhost:3000',
    smsProvider: env.SMS_PROVIDER ?? 'fake',
    whatsappProvider: env.WHATSAPP_PROVIDER ?? 'fake',
    webhookSecret: env.WEBHOOK_SECRET ?? null,
    evolution:
      env.EVOLUTION_BASE_URL && env.EVOLUTION_INSTANCE && env.EVOLUTION_API_KEY
        ? {
            baseUrl: env.EVOLUTION_BASE_URL.replace(/\/$/, ''),
            instance: env.EVOLUTION_INSTANCE,
            apiKey: env.EVOLUTION_API_KEY,
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
    corsOrigins: (env.CORS_ORIGINS ?? env.APP_BASE_URL ?? 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    port: Number(env.API_PORT ?? env.PORT ?? 3001),
  };
}
