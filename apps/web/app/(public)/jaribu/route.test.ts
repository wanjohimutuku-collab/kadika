import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/server-branding', () => ({
  getBrandingOnServer: async () => ({ businessName: 'Kadisasa', logoUrl: null }),
}));

const { GET } = await import('./route');

async function body(res: Response) {
  return await res.text();
}

describe('/jaribu route', () => {
  it('renders a demo card with the EN demo banner for valid input (default locale)', async () => {
    const res = await GET(
      new Request(
        'https://kadisasa.co.tz/jaribu?names=Asha%20%26%20Juma&date=2026-12-19&event=harusi',
      ),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('x-robots-tag') ?? '').toMatch(/noindex/i);
    expect(res.headers.get('content-type') ?? '').toMatch(/text\/html/);
    const text = await body(res);
    expect(text).toContain('Asha');
    expect(text).toContain('Juma');
    expect(text).toContain('This is a demo card');
  });

  it('renders the SW banner when the NEXT_LOCALE cookie is sw', async () => {
    const res = await GET(
      new Request(
        'https://kadisasa.co.tz/jaribu?names=Asha%20%26%20Juma&date=2026-12-19&event=harusi',
        { headers: { cookie: 'NEXT_LOCALE=sw' } },
      ),
    );
    expect(res.status).toBe(200);
    const text = await body(res);
    expect(text).toContain('Hii ni kadi ya majaribio');
  });

  it('falls back to defaults on invalid input and never 5xx', async () => {
    const res = await GET(
      new Request('https://kadisasa.co.tz/jaribu?names=&date=not-a-date&event=zzz'),
    );
    expect(res.status).toBe(200);
    const text = await body(res);
    expect(text).toContain('Asha');
  });

  it('escapes names so no <script> runs', async () => {
    const res = await GET(
      new Request(
        'https://kadisasa.co.tz/jaribu?names=%3Cscript%3Ealert(1)%3C/script%3E&date=2026-12-19&event=harusi',
      ),
    );
    const text = await body(res);
    expect(text).not.toMatch(/<script>alert\(1\)<\/script>/);
    expect(text).toContain('&lt;script&gt;');
  });

  it('clamps an overlong names input', async () => {
    const long = 'A'.repeat(300);
    const res = await GET(
      new Request(
        `https://kadisasa.co.tz/jaribu?names=${encodeURIComponent(long)}&date=2026-12-19&event=harusi`,
      ),
    );
    const text = await body(res);
    expect(text).not.toContain('A'.repeat(100));
  });
});
