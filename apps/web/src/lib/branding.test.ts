import { describe, expect, it } from 'vitest';
import { FONT_STACKS } from '@harusi/schemas/branding';
import {
  DEFAULT_PUBLIC_BRANDING,
  brandStyle,
  resolveLogoSrc,
  sanitizePublicBranding,
} from './branding';

describe('sanitizePublicBranding', () => {
  const good = {
    businessName: 'Kadi Sasa',
    tagline: 'Mialiko',
    primary: '#1f3a5f',
    accent: '#A0662A',
    fontBody: 'humanist',
    fontDisplay: 'classical',
    logoUrl: '/v1/branding/logo?v=3',
    logoMime: 'image/svg+xml',
    onPrimary: '#FFFFFF',
    updatedAt: '2026-10-19T10:00:00.000Z',
  };

  it('keeps a valid brand, upper-casing colours', () => {
    expect(sanitizePublicBranding(good)).toEqual({ ...good, primary: '#1F3A5F' });
  });

  it('falls back to the default for anything that is not a known-safe shape', () => {
    expect(sanitizePublicBranding(null)).toEqual(DEFAULT_PUBLIC_BRANDING);
    expect(sanitizePublicBranding('x')).toEqual(DEFAULT_PUBLIC_BRANDING);
    expect(sanitizePublicBranding([])).toEqual(DEFAULT_PUBLIC_BRANDING);
  });

  it('never lets a style-injection string through (colours and fonts)', () => {
    const b = sanitizePublicBranding({
      ...good,
      primary: 'red; background:url(//evil.test/x)',
      accent: '#12345G',
      fontBody: "x'; } body { display:none",
      fontDisplay: 'comic-sans',
    });
    expect(b.primary).toBeNull();
    expect(b.accent).toBeNull();
    expect(b.onPrimary).toBeNull();
    expect(b.fontBody).toBe('system');
    expect(b.fontDisplay).toBe('elegant');
    const css = JSON.stringify(brandStyle(b));
    expect(css).not.toContain('evil');
    expect(css).not.toContain('display:none');
  });

  it('accepts only the logo route or an inline image as a logo URL', () => {
    for (const bad of [
      'https://evil.test/logo.svg',
      '//evil.test/x.svg',
      'javascript:alert(1)',
      '/v1/branding/logo?v=1&x=<script>',
      '/v1/other',
      'data:text/html;base64,PHNjcmlwdD4=',
    ])
      expect(sanitizePublicBranding({ ...good, logoUrl: bad }).logoUrl).toBeNull();
    expect(sanitizePublicBranding({ ...good, logoUrl: '/v1/branding/logo' }).logoUrl).toBe(
      '/v1/branding/logo',
    );
    const inline = 'data:image/svg+xml;charset=utf-8,%3Csvg%3E%3C%2Fsvg%3E';
    expect(sanitizePublicBranding({ ...good, logoUrl: inline }).logoUrl).toBe(inline);
    expect(sanitizePublicBranding({ ...good, logoUrl: null }).logoMime).toBeNull();
  });

  it('bounds the text fields', () => {
    expect(sanitizePublicBranding({ ...good, businessName: 'x'.repeat(81) }).businessName).toBe(
      'Kadi Sasa',
    );
    expect(sanitizePublicBranding({ ...good, businessName: '   ' }).businessName).toBe('Kadi Sasa');
    expect(sanitizePublicBranding({ ...good, tagline: 'x'.repeat(141) }).tagline).toBe('');
  });
});

describe('brandStyle', () => {
  it('sets only what staff chose, and always the font stacks', () => {
    expect(brandStyle(DEFAULT_PUBLIC_BRANDING)).toEqual({
      '--hp-font-body': FONT_STACKS.system,
      '--hp-font-display': FONT_STACKS.elegant,
    });
    expect(
      brandStyle({
        ...DEFAULT_PUBLIC_BRANDING,
        primary: '#1F3A5F',
        onPrimary: '#FFFFFF',
        accent: '#A0662A',
      }),
    ).toMatchObject({
      '--hp-primary': '#1F3A5F',
      '--hp-on-primary': '#FFFFFF',
      '--hp-accent': '#A0662A',
    });
  });
});

describe('resolveLogoSrc', () => {
  it('prefixes the API host for the logo route and leaves inline images alone', () => {
    expect(resolveLogoSrc(null)).toBeNull();
    expect(resolveLogoSrc('/v1/branding/logo?v=2')).toMatch(
      /^https?:\/\/.+\/v1\/branding\/logo\?v=2$/,
    );
    expect(resolveLogoSrc('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
  });
});
