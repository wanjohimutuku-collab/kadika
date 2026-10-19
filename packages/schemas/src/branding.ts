/**
 * Business branding that staff edit in /ops/settings (ADR 036): name, logo, theme colours and fonts.
 * Shared by the API (validation) and the web app (forms, preview, and applying the brand), so both
 * agree on the limits. Colours are checked against the same contrast rules as event themes (ADR 006)
 * in the API, where `@harusi/ui-tokens` is available.
 */

/**
 * Fonts are CSS stacks of fonts already on the guest's device, never downloaded: no webfont cost on 3G
 * (§10), no layout shift, and nothing for a font CDN to leak. `elegant` is the one display serif the
 * site already ships (Cormorant Garamond, §17.2); it falls back to Georgia.
 */
export const FONT_STACKS = {
  system: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans', Ubuntu, sans-serif",
  humanist: "Seravek, 'Gill Sans Nova', Ubuntu, Calibri, 'DejaVu Sans', 'Noto Sans', sans-serif",
  geometric: "Avenir, Montserrat, Corbel, 'URW Gothic', 'Source Sans Pro', 'Noto Sans', sans-serif",
  rounded:
    "ui-rounded, 'Hiragino Maru Gothic ProN', Quicksand, Comfortaa, Manjari, 'Arial Rounded MT', Calibri, sans-serif",
  classical: "'Iowan Old Style', 'Palatino Linotype', Palatino, P052, 'URW Palladio L', serif",
  transitional: "Charter, 'Bitstream Charter', 'Sitka Text', Cambria, 'Noto Serif', serif",
  elegant: "var(--font-display-serif, Georgia), Georgia, Cambria, 'Times New Roman', serif",
} as const;
export type FontKey = keyof typeof FONT_STACKS;

export const BODY_FONT_KEYS = [
  'system',
  'humanist',
  'geometric',
  'rounded',
  'classical',
  'transitional',
] as const satisfies readonly FontKey[];
export const DISPLAY_FONT_KEYS = [
  'elegant',
  'classical',
  'transitional',
  'humanist',
  'system',
] as const satisfies readonly FontKey[];
export type BodyFontKey = (typeof BODY_FONT_KEYS)[number];
export type DisplayFontKey = (typeof DISPLAY_FONT_KEYS)[number];

export const LOGO_MIMES = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'] as const;
export type LogoMime = (typeof LOGO_MIMES)[number];
/** Largest logo accepted (SVG text or raster bytes). The brand is on every page, so keep it small. */
export const MAX_LOGO_BYTES = 200 * 1024;

export const BUSINESS_NAME_MAX = 80;
export const TAGLINE_MAX = 140;

/** What staff save. Colours are `#RRGGBB`; `null` keeps the default theme colour. */
export interface BrandingInput {
  businessName: string;
  tagline: string;
  primary: string | null;
  accent: string | null;
  fontBody: BodyFontKey;
  fontDisplay: DisplayFontKey;
}

export const DEFAULT_BRANDING: BrandingInput = {
  businessName: 'Kadi Sasa',
  tagline: '',
  primary: null,
  accent: null,
  fontBody: 'system',
  fontDisplay: 'elegant',
};

/** Branding as everyone sees it (public: the logo URL carries a version so a new logo busts caches). */
export interface PublicBranding extends BrandingInput {
  /** `/v1/branding/logo?v=3` on the API host, or null when no logo is set. */
  logoUrl: string | null;
  logoMime: LogoMime | null;
  /** Text colour for content on `primary`: white or near-black, whichever reads better. */
  onPrimary: string | null;
  updatedAt: string | null;
}

/** The staff view adds who last changed it. */
export interface BrandingView extends PublicBranding {
  updatedBy: string | null;
  /** `database`: saved in /ops. `default`: nothing saved yet. */
  source: 'database' | 'default';
}

// ---- SVG logos --------------------------------------------------------------------------------

/** A byte-order mark some editors put at the start of a file. */
const BOM = String.fromCharCode(0xfeff);

export type SvgCheck = { ok: true; svg: string } | { ok: false; reason: SvgRejection };
export type SvgRejection =
  | 'too_large'
  | 'not_svg'
  | 'doctype'
  | 'forbidden_element'
  | 'event_handler'
  | 'external_reference'
  | 'script_url'
  | 'no_size';

const FORBIDDEN_ELEMENTS =
  /<\s*(script|foreignObject|iframe|object|embed|audio|video|canvas|link|meta|base|form|input|button|textarea|animate|set|handler|listener)\b/i;
const SAFE_DATA_IMAGE = /^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=\s]+$/i;

/**
 * Accepts only a plain, static SVG. It is rejected, never silently rewritten, so what staff upload is
 * what is served. The file is also only ever shown through `<img>` (where browsers run no script) and
 * is served with a locked-down Content-Security-Policy; this check is the second layer, not the only one.
 *
 * Refused: scripts, `foreignObject`, event-handler attributes, DOCTYPE/ENTITY (XXE and entity bombs),
 * animation elements, links that leave the file (`href` other than `#id` or an embedded raster image),
 * `javascript:` URLs, CSS `@import` and `url()` to anything but `#id`.
 */
export function validateSvg(input: string): SvgCheck {
  const svg = (input.startsWith(BOM) ? input.slice(1) : input).trim();
  if (new TextEncoder().encode(svg).length > MAX_LOGO_BYTES)
    return { ok: false, reason: 'too_large' };
  // First, so an XXE document is named for what it is rather than "not an SVG".
  if (/<!DOCTYPE|<!ENTITY/i.test(svg)) return { ok: false, reason: 'doctype' };
  if (
    !/^(<\?xml[^>]*\?>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(svg) ||
    !/<\/svg\s*>$/i.test(svg)
  )
    return { ok: false, reason: 'not_svg' };
  if (FORBIDDEN_ELEMENTS.test(svg)) return { ok: false, reason: 'forbidden_element' };
  if (/[\s"'/]on[a-z]+\s*=/i.test(svg)) return { ok: false, reason: 'event_handler' };
  if (/(javascript|vbscript|livescript)\s*:|data\s*:\s*text\/html/i.test(svg))
    return { ok: false, reason: 'script_url' };
  for (const m of svg.matchAll(/\b(?:xlink:)?href\s*=\s*("([^"]*)"|'([^']*)')/gi)) {
    const v = (m[2] ?? m[3] ?? '').trim();
    if (!v.startsWith('#') && !SAFE_DATA_IMAGE.test(v))
      return { ok: false, reason: 'external_reference' };
  }
  if (/@import/i.test(svg)) return { ok: false, reason: 'external_reference' };
  for (const m of svg.matchAll(/url\(\s*(['"]?)([^)'"]*)\1\s*\)/gi))
    if (!(m[2] ?? '').trim().startsWith('#')) return { ok: false, reason: 'external_reference' };
  const open = /<svg\b[^>]*>/i.exec(svg)![0];
  if (!/\bviewBox\s*=/i.test(open) && !(/\bwidth\s*=/i.test(open) && /\bheight\s*=/i.test(open)))
    return { ok: false, reason: 'no_size' };
  return { ok: true, svg };
}

/** Plain-language reasons, for the form (English; the web app translates by `reason`). */
export const SVG_REASON_TEXT: Record<SvgRejection, string> = {
  too_large: 'The file is larger than 200 KB',
  not_svg: 'This is not a valid SVG file',
  doctype: 'DOCTYPE and ENTITY declarations are not allowed',
  forbidden_element: 'Scripts, embedded pages and animations are not allowed',
  event_handler: 'Event handlers such as onclick are not allowed',
  external_reference: 'The SVG links to something outside the file',
  script_url: 'Script URLs are not allowed',
  no_size: 'The SVG needs a viewBox (or a width and height)',
};
