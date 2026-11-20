import { describe, it, expect, vi } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));

const { GET, POST } = await import('./route');

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

  it('renders both templates for invitation and contribution cards', async () => {
    for (const template of ['classic', 'modern']) {
      for (const kind of ['', '&kind=contribution']) {
        const req = new Request(
          `http://localhost:3000/api/card-image?preview=1&template=${template}&partnerA=Neema&eventKind=Send-off&code=KH-1234${kind}`,
        );
        const res = await GET(req as unknown as NextRequest);
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('image/png');
        expect((await res.arrayBuffer()).byteLength).toBeGreaterThan(5000);
      }
    }
  }, 30_000);

  it('renders custom template with elements, fonts, and background', async () => {
    const customDesign = JSON.stringify({
      background: {
        type: 'gradient',
        gradient: 'linear-gradient(135deg, #0B2E1A 0%, #165B33 50%, #2E8B57 100%)',
      },
      frame: { show: true, style: 'double', color: '#E8B66B', width: 2, inset: 20 },
      textColor: '#FFFFFF',
      accentColor: '#E8B66B',
      elements: [
        { id: '1', type: 'eyebrow', x: 50, y: 10, visible: true },
        { id: '2', type: 'names', x: 50, y: 22, fontFamily: 'playfair', fontSize: 28, visible: true },
        { id: '3', type: 'divider', x: 50, y: 35, visible: true },
        { id: '4', type: 'freeText', x: 50, y: 48, fontFamily: 'script', content: { sw: 'Sherehe ya Kifahari' }, visible: true },
        { id: '5', type: 'qr', x: 50, y: 75, visible: true },
      ],
    });

    const req = new Request(
      `http://localhost:3000/api/card-image?preview=1&template=custom&partnerA=Neema&partnerB=Bakari&code=KH-1234&custom=${encodeURIComponent(customDesign)}`,
    );
    const res = await GET(req as unknown as NextRequest);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('image/png');
    expect((await res.arrayBuffer()).byteLength).toBeGreaterThan(5000);
  }, 30_000);

  it('renders custom template via POST body for large designs', async () => {
    const customDesign = {
      background: { type: 'color', color: '#FAF7F2' },
      frame: { show: true, style: 'double', color: '#E8B66B', width: 2, inset: 24 },
      textColor: '#1C1917',
      accentColor: '#E8B66B',
      elements: [
        { id: '1', type: 'eyebrow', x: 50, y: 10, visible: true },
        { id: '2', type: 'names', x: 50, y: 22, fontFamily: 'playfair', fontSize: 32, visible: true },
        { id: '3', type: 'freeText', x: 50, y: 45, content: { en: 'Welcome all' }, visible: true },
        { id: '4', type: 'qr', x: 50, y: 75, visible: true },
      ],
    };

    const req = new Request(
      'http://localhost:3000/api/card-image?preview=1&template=custom&partnerA=Asha&partnerB=Juma&code=KH-5678',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ custom: customDesign }),
      },
    );
    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('image/png');
    expect((await res.arrayBuffer()).byteLength).toBeGreaterThan(5000);
  }, 30_000);
});
