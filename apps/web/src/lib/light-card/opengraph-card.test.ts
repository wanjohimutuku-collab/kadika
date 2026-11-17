import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import OgImage, { size, contentType } from '../../../app/c/[token]/opengraph-image';

describe('WhatsApp OpenGraph card preview with QR', () => {
  it('has the standard 1200x630 dimensions and PNG content-type', () => {
    expect(size).toEqual({ width: 1200, height: 630 });
    expect(contentType).toBe('image/png');
  });

  it('generates an ImageResponse for an online guest card', async () => {
    // In mock mode / with sample tokens, OgImage resolves and returns an ImageResponse
    const res = await OgImage({
      params: Promise.resolve({ token: 'tok_preview_test' }),
    });
    expect(res).toBeDefined();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('image/png');
  });
});
