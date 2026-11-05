import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from '@harusi/i18n';
import { resolveLogoSrc } from '@/lib/branding';
import { getBrandingOnServer } from '@/lib/server-branding';
import type { LightBrand } from './render';

/** The API as browsers reach it: the card's RSVP and the Kumbukumbu photos are fetched from here. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/** The guest's chosen language (cookie), Swahili otherwise. */
export function localeOf(req: Request): Locale {
  const m = new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]+)`).exec(req.headers.get('cookie') ?? '');
  return isLocale(m?.[1]) ? m![1] : defaultLocale;
}

/** A per-request page: never cached by shared caches; the service worker keeps the last copy. */
export function html(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}

/** The business logo for the footer and problem pages (ADR 036); the built-in brand if the API is down. */
export async function brandOf(): Promise<LightBrand> {
  const b = await getBrandingOnServer();
  return { name: b.businessName, logoSrc: resolveLogoSrc(b.logoUrl) };
}
