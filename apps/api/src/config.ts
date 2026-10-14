export interface Config {
  databaseUrl: string;
  jwtSecret: string;
  /** 32-byte key, base64. Encrypts event signing keys at rest (§9). */
  keyEncSecret: string;
  appBaseUrl: string;
  shortBaseUrl: string;
  smsProvider: string;
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
    corsOrigins: (env.CORS_ORIGINS ?? env.APP_BASE_URL ?? 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    port: Number(env.API_PORT ?? env.PORT ?? 3001),
  };
}
