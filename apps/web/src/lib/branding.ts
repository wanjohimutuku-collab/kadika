import type { CSSProperties } from 'react';
import {
  BODY_FONT_KEYS,
  BUSINESS_NAME_MAX,
  DEFAULT_BRANDING,
  DISPLAY_FONT_KEYS,
  FONT_STACKS,
  LOGO_MIMES,
  TAGLINE_MAX,
  type BodyFontKey,
  type DisplayFontKey,
  type LogoMime,
  type PublicBranding,
} from '@harusi/schemas/branding';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/** The API serves the logo; its URL comes back relative (`/v1/branding/logo?v=3`), mock mode uses `data:` URLs. */
export function resolveLogoSrc(logoUrl: string | null | undefined): string | null {
  if (!logoUrl) return null;
  return logoUrl.startsWith('/') ? `${API_URL}${logoUrl}` : logoUrl;
}

/**
 * CSS variables that apply a brand to a subtree (the whole site on `<html>`, or the live preview in
 * settings). Only what staff chose is set, so an unset colour keeps the design tokens' default. An
 * event's own theme on the guest card sets the same variables lower down and wins there.
 */
export function brandStyle(
  b: Pick<PublicBranding, 'primary' | 'accent' | 'onPrimary' | 'fontBody' | 'fontDisplay'>,
): CSSProperties {
  const style: Record<string, string> = {
    '--hp-font-body': FONT_STACKS[b.fontBody],
    '--hp-font-display': FONT_STACKS[b.fontDisplay],
  };
  if (b.primary) {
    style['--hp-primary'] = b.primary;
    style['--hp-on-primary'] = b.onPrimary ?? '#FFFFFF';
  }
  if (b.accent) style['--hp-accent'] = b.accent;
  return style as CSSProperties;
}

/** Reads a file as base64 (no `data:` prefix), for raster logos. */
export async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

export const DEFAULT_PUBLIC_BRANDING: PublicBranding = {
  ...DEFAULT_BRANDING,
  logoUrl: null,
  logoMime: null,
  onPrimary: null,
  updatedAt: null,
};

const HEX = /^#[0-9A-F]{6}$/;

/**
 * Brand values go into a `style` attribute and an `<img src>` on every page, so whatever the API (or a
 * poisoned cache) returns is reduced to known-safe shapes first: `#RRGGBB` colours, fonts from the
 * allow-lists, a logo URL that points at the API's logo route or is an inline image. Anything else falls
 * back to the default for that field.
 */
export function sanitizePublicBranding(raw: unknown): PublicBranding {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const text = (v: unknown, max: number, fallback: string) =>
    typeof v === 'string' && v.trim() && v.length <= max ? v.trim() : fallback;
  const colour = (v: unknown) =>
    typeof v === 'string' && HEX.test(v.toUpperCase()) ? v.toUpperCase() : null;
  const primary = colour(r.primary);
  const logoUrl =
    typeof r.logoUrl === 'string' &&
    (/^\/v1\/branding\/logo(\?v=\d{1,9})?$/.test(r.logoUrl) ||
      /^data:image\/(png|jpe?g|webp|svg\+xml)[;,]/i.test(r.logoUrl))
      ? r.logoUrl
      : null;
  return {
    businessName: text(r.businessName, BUSINESS_NAME_MAX, DEFAULT_BRANDING.businessName),
    tagline: typeof r.tagline === 'string' && r.tagline.length <= TAGLINE_MAX ? r.tagline : '',
    primary,
    accent: colour(r.accent),
    fontBody: (BODY_FONT_KEYS as readonly string[]).includes(r.fontBody as string)
      ? (r.fontBody as BodyFontKey)
      : DEFAULT_BRANDING.fontBody,
    fontDisplay: (DISPLAY_FONT_KEYS as readonly string[]).includes(r.fontDisplay as string)
      ? (r.fontDisplay as DisplayFontKey)
      : DEFAULT_BRANDING.fontDisplay,
    logoUrl,
    logoMime:
      logoUrl && (LOGO_MIMES as readonly string[]).includes(r.logoMime as string)
        ? (r.logoMime as LogoMime)
        : null,
    onPrimary: primary ? (colour(r.onPrimary) ?? '#FFFFFF') : null,
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : null,
  };
}
