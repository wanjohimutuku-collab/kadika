import { describe, it, expect, vi } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));

const { GET } = await import('./route');

describe('/api/card-image route', () => {
  it('returns a 200 PNG image response with valid query params', async () => {
    const req = new Request(
      'http://localhost:3000/api/card-image?couple=Fatma%20%26%20Ali&code=KH-9999&guest=Zuberi',
    );
    const res = await GET(req as unknown as NextRequest);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('image/png');
    expect(res.headers.get('content-disposition')).toContain('inline; filename="kadi-kh-9999.png"');
  });

  it('sets attachment header when download=1 is requested', async () => {
    const req = new Request(
      'http://localhost:3000/api/card-image?couple=Fatma%20%26%20Ali&code=KH-9999&download=1',
    );
    const res = await GET(req as unknown as NextRequest);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-disposition')).toContain(
      'attachment; filename="kadi-kh-9999.png"',
    );
  });
});
