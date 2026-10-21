import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateSvg } from '@harusi/schemas/branding';
import { LOGO_SVG, MARK_SVG, svgDataUri } from './brand-assets';

const file = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');

describe('built-in brand assets', () => {
  it('the logo string is the shipped public/brand/logo.svg, byte for byte', () => {
    expect(LOGO_SVG).toBe(file('../../public/brand/logo.svg'));
  });

  it('the mark string is the shipped favicon app/icon.svg, byte for byte', () => {
    expect(MARK_SVG).toBe(file('../../app/icon.svg'));
  });

  it('both pass the same SVG safety check staff uploads must pass', () => {
    expect(validateSvg(LOGO_SVG)).toMatchObject({ ok: true });
    expect(validateSvg(MARK_SVG)).toMatchObject({ ok: true });
  });

  it('the mark is a real emblem on a tile, not an empty shape', () => {
    expect(MARK_SVG).toContain('<path');
    expect(MARK_SVG).toContain('<circle');
    expect(MARK_SVG).toContain('viewBox=');
  });

  it('turns an SVG into a data URI that decodes back to it', () => {
    const uri = svgDataUri(MARK_SVG);
    expect(uri.startsWith('data:image/svg+xml;base64,')).toBe(true);
    expect(Buffer.from(uri.split(',')[1]!, 'base64').toString('utf8')).toBe(MARK_SVG);
  });
});
