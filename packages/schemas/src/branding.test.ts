import { describe, expect, it } from 'vitest';
import { MAX_LOGO_BYTES, validateSvg } from './branding';

const ok =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="#0f5c4d"/></svg>';
const wrap = (inner: string, attrs = 'viewBox="0 0 10 10"') =>
  `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${inner}</svg>`;

describe('validateSvg', () => {
  it('accepts a plain static SVG and returns it trimmed', () => {
    const r = validateSvg(`${String.fromCharCode(0xfeff)}  ${ok}
`);
    expect(r).toEqual({ ok: true, svg: ok });
  });

  it('accepts an XML prolog, comments, styles, gradients and local references', () => {
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<!-- exported -->
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="120" height="40">
  <defs><linearGradient id="g"><stop offset="0" stop-color="#0f5c4d"/></linearGradient>
  <style>.a{fill:url(#g)}</style></defs>
  <g id="logo"><rect class="a" width="120" height="40"/></g>
  <use xlink:href="#logo"/>
</svg>`;
    expect(validateSvg(svg).ok).toBe(true);
  });

  it('accepts an embedded raster image but not a remote one', () => {
    const data = wrap('<image href="data:image/png;base64,iVBORw0KGgo="/>');
    expect(validateSvg(data).ok).toBe(true);
    expect(validateSvg(wrap('<image href="https://evil.example/x.png"/>'))).toEqual({
      ok: false,
      reason: 'external_reference',
    });
  });

  it.each([
    ['<script>alert(1)</script>', 'forbidden_element'],
    ['<SCRIPT src="x.js"></SCRIPT>', 'forbidden_element'],
    ['<foreignObject><div>hi</div></foreignObject>', 'forbidden_element'],
    ['<iframe src="x"></iframe>', 'forbidden_element'],
    ['<animate attributeName="href" values="javascript:alert(1)"/>', 'forbidden_element'],
    ['<set attributeName="onload" to="x"/>', 'forbidden_element'],
    ['<circle onclick="alert(1)" r="1"/>', 'event_handler'],
    ['<circle r="1" onload = "alert(1)"/>', 'event_handler'],
    ['<a href="javascript:alert(1)"><circle r="1"/></a>', 'script_url'],
    ['<a xlink:href="JaVaScRiPt:alert(1)"><circle r="1"/></a>', 'script_url'],
    ['<a href="https://evil.example"><circle r="1"/></a>', 'external_reference'],
    ['<use href="https://evil.example/s.svg#x"/>', 'external_reference'],
    ['<style>@import url(https://evil.example/x.css);</style>', 'external_reference'],
    ['<rect style="fill:url(https://evil.example/x)" width="1" height="1"/>', 'external_reference'],
  ])('rejects %s', (inner, reason) => {
    expect(validateSvg(wrap(inner))).toEqual({ ok: false, reason });
  });

  it('rejects DOCTYPE and ENTITY declarations (XXE, entity bombs)', () => {
    const xxe = `<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><text>&x;</text></svg>`;
    expect(validateSvg(xxe)).toEqual({ ok: false, reason: 'doctype' });
  });

  it('rejects things that are not an SVG document', () => {
    expect(validateSvg('<html><body>hi</body></html>')).toEqual({ ok: false, reason: 'not_svg' });
    expect(validateSvg('<svg viewBox="0 0 1 1">')).toEqual({ ok: false, reason: 'not_svg' });
    expect(validateSvg('hello')).toEqual({ ok: false, reason: 'not_svg' });
    expect(validateSvg('<div><svg viewBox="0 0 1 1"></svg></div>')).toEqual({
      ok: false,
      reason: 'not_svg',
    });
  });

  it('needs a size so the logo scales', () => {
    expect(validateSvg(wrap('<circle r="1"/>', ''))).toEqual({ ok: false, reason: 'no_size' });
    expect(validateSvg(wrap('<circle r="1"/>', 'width="10" height="10"')).ok).toBe(true);
  });

  it('rejects a file over the size limit', () => {
    const big = wrap(`<!--${'x'.repeat(MAX_LOGO_BYTES)}--><circle r="1"/>`);
    expect(validateSvg(big)).toEqual({ ok: false, reason: 'too_large' });
  });
});
