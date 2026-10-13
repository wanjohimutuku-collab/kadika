/** Mock mode until `HttpRepository` is real (ADR 007). Set NEXT_PUBLIC_USE_MOCKS=0 to use the API. */
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== '0';
export const SHOW_DEV_TOOLS = USE_MOCKS;
export const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'harusipass.co.tz';
