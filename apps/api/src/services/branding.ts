import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { brandSettings, users } from '@harusi/db';
import {
  BODY_FONT_KEYS,
  BUSINESS_NAME_MAX,
  DEFAULT_BRANDING,
  DISPLAY_FONT_KEYS,
  LOGO_MIMES,
  MAX_LOGO_BYTES,
  SVG_REASON_TEXT,
  TAGLINE_MAX,
  validateSvg,
  type BrandingInput,
  type BrandingView,
  type LogoMime,
  type PublicBranding,
} from '@harusi/schemas/branding';
import { contrastRatio, normalizeHex, themeContrastIssues, lightColors } from '@harusi/ui-tokens';
import type { Deps } from '../context';
import { ApiError } from '../errors';
import { recordAudit } from './audit';
import { requireSettingsAdmin, type StaffCaller } from './staff-guard';

const ROW_ID = 'default';
const DARK_TEXT = lightColors.ink;
const LIGHT_TEXT = '#FFFFFF';
/** The theme colour used where staff have not chosen one, so a half-set brand is still checked whole. */
const FALLBACK_PRIMARY = lightColors.primary;
const FALLBACK_ACCENT = lightColors.accent;

/** White or near-black, whichever reads better on `primary`. */
export const onPrimaryFor = (primary: string): string =>
  contrastRatio(LIGHT_TEXT, primary) >= contrastRatio(DARK_TEXT, primary) ? LIGHT_TEXT : DARK_TEXT;

/** Magic bytes: the declared type must match the file, so a renamed file is not served as an image. */
function sniffRaster(bytes: Buffer): LogoMime | null {
  if (
    bytes.length > 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  )
    return 'image/png';
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return 'image/jpeg';
  if (
    bytes.length > 12 &&
    bytes.subarray(0, 4).toString('latin1') === 'RIFF' &&
    bytes.subarray(8, 12).toString('latin1') === 'WEBP'
  )
    return 'image/webp';
  return null;
}

export interface LogoFile {
  mime: LogoMime;
  /** Bytes to serve (SVG as UTF-8). */
  body: Buffer;
  version: number;
  etag: string;
}

export function validateBrandingInput(raw: BrandingInput): BrandingInput {
  const businessName = raw.businessName.trim();
  const tagline = raw.tagline.trim();
  if (businessName.length < 1 || businessName.length > BUSINESS_NAME_MAX)
    throw new ApiError('validation', 'Business name must be 1–80 characters', {
      field: 'businessName',
    });
  if (tagline.length > TAGLINE_MAX)
    throw new ApiError('validation', 'Tagline must be at most 140 characters', {
      field: 'tagline',
    });
  if (!(BODY_FONT_KEYS as readonly string[]).includes(raw.fontBody))
    throw new ApiError('validation', 'Unknown body font', { field: 'fontBody' });
  if (!(DISPLAY_FONT_KEYS as readonly string[]).includes(raw.fontDisplay))
    throw new ApiError('validation', 'Unknown display font', { field: 'fontDisplay' });
  const hex = (v: string | null, field: string) => {
    if (v === null || v === '') return null;
    const n = normalizeHex(v);
    if (!n) throw new ApiError('validation', 'Colours must look like #0F5C4D', { field });
    return n;
  };
  const primary = hex(raw.primary, 'primary');
  const accent = hex(raw.accent, 'accent');
  // The brand colours are used on cards, buttons and the checkout, so they must clear the same bars as
  // an event theme (ADR 006): readable text on them, and a visible accent. Refused, with the numbers.
  const issues = themeContrastIssues({
    primary: primary ?? FALLBACK_PRIMARY,
    onPrimary: onPrimaryFor(primary ?? FALLBACK_PRIMARY),
    accent: accent ?? FALLBACK_ACCENT,
  });
  if (issues.length)
    throw new ApiError('validation', 'These colours are too hard to read', {
      field: issues.some((i) => i.pair.startsWith('accent')) ? 'accent' : 'primary',
      issues: issues.map((i) => ({ pair: i.pair, ratio: Math.round(i.ratio * 100) / 100 })),
    });
  return {
    businessName,
    tagline,
    primary,
    accent,
    fontBody: raw.fontBody,
    fontDisplay: raw.fontDisplay,
  };
}

/** Business branding (ADR 036): public to read, admin staff only to change. */
export class BrandingService {
  private cache: { at: number; value: PublicBranding } | null = null;

  constructor(private deps: Deps) {}

  private async row() {
    const [r] = await this.deps.db
      .select({ s: brandSettings, by: users.name })
      .from(brandSettings)
      .leftJoin(users, eq(users.id, brandSettings.updatedBy))
      .where(eq(brandSettings.id, ROW_ID));
    return r ?? null;
  }

  private toPublic(r: Awaited<ReturnType<BrandingService['row']>>): PublicBranding {
    if (!r)
      return {
        ...DEFAULT_BRANDING,
        logoUrl: null,
        logoMime: null,
        onPrimary: null,
        updatedAt: null,
      };
    const s = r.s;
    return {
      businessName: s.businessName,
      tagline: s.tagline,
      primary: s.primary,
      accent: s.accent,
      fontBody: s.fontBody as BrandingInput['fontBody'],
      fontDisplay: s.fontDisplay as BrandingInput['fontDisplay'],
      logoUrl: s.logoData && s.logoMime ? `/v1/branding/logo?v=${s.logoVersion}` : null,
      logoMime: s.logoData ? (s.logoMime as LogoMime | null) : null,
      onPrimary: s.primary ? onPrimaryFor(s.primary) : null,
      updatedAt: s.updatedAt.toISOString(),
    };
  }

  /** What every visitor gets. Cached for 30 s per instance; a save clears it on that instance. */
  async publicView(): Promise<PublicBranding> {
    const now = this.deps.now().getTime();
    if (this.cache && now - this.cache.at < 30_000) return this.cache.value;
    const value = this.toPublic(await this.row());
    this.cache = { at: now, value };
    return value;
  }

  async view(caller: StaffCaller): Promise<BrandingView> {
    await requireSettingsAdmin(this.deps.db, caller);
    const r = await this.row();
    return { ...this.toPublic(r), updatedBy: r?.by ?? null, source: r ? 'database' : 'default' };
  }

  async save(caller: StaffCaller, input: BrandingInput): Promise<BrandingView> {
    await requireSettingsAdmin(this.deps.db, caller);
    const next = validateBrandingInput(input);
    const prev = await this.row();
    const now = this.deps.now();
    await this.deps.db
      .insert(brandSettings)
      .values({ id: ROW_ID, ...next, updatedBy: caller.userId, updatedAt: now })
      .onConflictDoUpdate({
        target: brandSettings.id,
        set: { ...next, updatedBy: caller.userId, updatedAt: now },
      });
    this.cache = null;
    const before = this.toPublic(prev);
    await recordAudit(this.deps.db, {
      eventId: null,
      actorId: caller.userId,
      action: 'ops.branding.update',
      entity: 'brand_settings',
      entityId: ROW_ID,
      diff: {
        changed: (Object.keys(next) as (keyof BrandingInput)[]).filter(
          (k) => before[k] !== next[k],
        ),
      },
    });
    return this.view(caller);
  }

  /**
   * Stores a new logo. `data` is the SVG source, or base64 for PNG/JPEG/WebP. An SVG must pass
   * `validateSvg`; a raster must match its declared type by magic bytes. Both are capped at 200 KB.
   */
  async setLogo(caller: StaffCaller, input: { mime: string; data: string }): Promise<BrandingView> {
    await requireSettingsAdmin(this.deps.db, caller);
    if (!(LOGO_MIMES as readonly string[]).includes(input.mime))
      throw new ApiError('validation', 'The logo must be SVG, PNG, JPEG or WebP', {
        field: 'mime',
      });
    const mime = input.mime as LogoMime;
    let stored: string;
    if (mime === 'image/svg+xml') {
      const c = validateSvg(input.data);
      if (!c.ok)
        throw new ApiError('validation', SVG_REASON_TEXT[c.reason], {
          field: 'logo',
          reason: c.reason,
        });
      stored = c.svg;
    } else {
      if (!/^[A-Za-z0-9+/=\s]+$/.test(input.data))
        throw new ApiError('validation', 'Raster logos must be base64', { field: 'logo' });
      const bytes = Buffer.from(input.data, 'base64');
      if (bytes.length > MAX_LOGO_BYTES)
        throw new ApiError('validation', 'The file is larger than 200 KB', {
          field: 'logo',
          reason: 'too_large',
        });
      if (sniffRaster(bytes) !== mime)
        throw new ApiError('validation', 'The file is not the image type it claims to be', {
          field: 'logo',
          reason: 'type_mismatch',
        });
      stored = bytes.toString('base64');
    }
    const prev = await this.row();
    const now = this.deps.now();
    const version = (prev?.s.logoVersion ?? 0) + 1;
    await this.deps.db
      .insert(brandSettings)
      .values({
        id: ROW_ID,
        businessName: prev?.s.businessName ?? DEFAULT_BRANDING.businessName,
        logoMime: mime,
        logoData: stored,
        logoVersion: version,
        updatedBy: caller.userId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: brandSettings.id,
        set: {
          logoMime: mime,
          logoData: stored,
          logoVersion: version,
          updatedBy: caller.userId,
          updatedAt: now,
        },
      });
    this.cache = null;
    await recordAudit(this.deps.db, {
      eventId: null,
      actorId: caller.userId,
      action: 'ops.branding.logo',
      entity: 'brand_settings',
      entityId: ROW_ID,
      diff: { mime, bytes: Buffer.byteLength(stored), version },
    });
    return this.view(caller);
  }

  async removeLogo(caller: StaffCaller): Promise<BrandingView> {
    await requireSettingsAdmin(this.deps.db, caller);
    const prev = await this.row();
    if (prev) {
      await this.deps.db
        .update(brandSettings)
        .set({
          logoMime: null,
          logoData: null,
          logoVersion: prev.s.logoVersion + 1,
          updatedBy: caller.userId,
          updatedAt: this.deps.now(),
        })
        .where(eq(brandSettings.id, ROW_ID));
      this.cache = null;
      await recordAudit(this.deps.db, {
        eventId: null,
        actorId: caller.userId,
        action: 'ops.branding.logo_removed',
        entity: 'brand_settings',
        entityId: ROW_ID,
      });
    }
    return this.view(caller);
  }

  /** The logo file for the public route, or null when none is set. */
  async logo(): Promise<LogoFile | null> {
    const r = await this.row();
    const s = r?.s;
    if (!s?.logoData || !s.logoMime) return null;
    const mime = s.logoMime as LogoMime;
    const body =
      mime === 'image/svg+xml'
        ? Buffer.from(s.logoData, 'utf8')
        : Buffer.from(s.logoData, 'base64');
    return {
      mime,
      body,
      version: s.logoVersion,
      etag: `"${createHash('sha256').update(body).digest('hex').slice(0, 24)}"`,
    };
  }
}
