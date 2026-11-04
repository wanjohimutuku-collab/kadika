import { ImageResponse } from 'next/og';
import { LOGO_SVG, svgDataUri } from '@/lib/brand-assets';
import { OG_EDITIONS, OG_SIZE, type OgEdition } from '@/lib/seo';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return OG_EDITIONS.map((e) => ({ file: `${e}.png` }));
}

const COPY: Record<OgEdition, { headline: string; line: string; host: string; meta: string }> = {
  sw: {
    headline: 'Kadi moja kwa kila mgeni',
    line: 'WhatsApp, SMS au karatasi. Michango wazi, na lango la QR linalofanya kazi hata bila mtandao.',
    host: 'Asha & Juma',
    meta: 'Jumamosi · Kibaha',
  },
  en: {
    headline: 'One card for every guest',
    line: 'WhatsApp, SMS or paper. Michango in the open, and a QR gate that works without network.',
    host: 'Asha & Juma',
    meta: 'Saturday · Kibaha',
  },
  ke: {
    headline: 'Invites, harambee and the gate',
    line: 'Every guest gets their own card on WhatsApp or SMS. Pledges tracked, gate works offline.',
    host: 'Wanjiru & Otieno',
    meta: 'Saturday · Nairobi',
  },
};

/** 21×21 modules that look like a QR code (three finder squares, scattered data) but encode nothing. */
const QR_N = 21;
function moduleOn(r: number, c: number): boolean {
  const finder = (r0: number, c0: number) => {
    const y = r - r0;
    const x = c - c0;
    if (y < 0 || y > 6 || x < 0 || x > 6) return null;
    const ring = Math.max(Math.abs(y - 3), Math.abs(x - 3));
    return ring !== 2;
  };
  const f = finder(0, 0) ?? finder(0, QR_N - 7) ?? finder(QR_N - 7, 0);
  if (f !== null) return f;
  if (r === 7 || c === 7 || (r < 8 && c === QR_N - 8) || (c < 8 && r === QR_N - 8)) return false;
  return (r * 7 + c * 13 + ((r * c) % 5)) % 3 === 0;
}

/**
 * Link preview for the public site (WhatsApp, social, search): one per edition, built at build time from
 * the brand assets. The card mock carries the same sample names as the home page, never real guest data.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const edition = (await params).file.replace(/\.png$/, '') as OgEdition;
  const c = COPY[edition] ?? COPY.sw;
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '64px 72px',
        background: '#0A3F35',
        color: '#FBFAF7',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', width: 640 }}>
        <div
          style={{
            display: 'flex',
            alignSelf: 'flex-start',
            background: '#FBFAF7',
            borderRadius: 18,
            padding: '12px 24px',
          }}
        >
          {/* satori renders this to a PNG, not to the DOM, so it needs no alt text */}
          <img src={svgDataUri(LOGO_SVG)} width={Math.round((56 * 503.1) / 260)} height={56} />
        </div>
        <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.08, marginTop: 44 }}>
          {c.headline}
        </div>
        <div style={{ fontSize: 30, lineHeight: 1.4, marginTop: 24, color: '#E3F0EC' }}>
          {c.line}
        </div>
        <div style={{ fontSize: 26, marginTop: 36, color: '#D9A441' }}>kadisasa.com</div>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: 330,
          padding: '36px 28px',
          borderRadius: 24,
          background: '#FBFAF7',
          color: '#1A1F1D',
          border: '6px solid #D9A441',
        }}
      >
        <div
          style={{
            fontSize: 32,
            fontWeight: 700,
            textAlign: 'center',
            fontFamily: 'Georgia, serif',
          }}
        >
          {c.host}
        </div>
        <div style={{ fontSize: 22, marginTop: 8, color: '#5B6662' }}>{c.meta}</div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: 26,
            padding: 10,
            background: '#FFFFFF',
            border: '2px solid #E4E1DA',
          }}
        >
          {/* A QR-like pattern only: a preview image must never carry a scannable guest code. */}
          {Array.from({ length: QR_N }, (_, r) => (
            <div key={r} style={{ display: 'flex' }}>
              {Array.from({ length: QR_N }, (_, col) => (
                <div
                  key={col}
                  style={{
                    width: 8,
                    height: 8,
                    background: moduleOn(r, col) ? '#1A1F1D' : '#FFFFFF',
                  }}
                />
              ))}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, marginTop: 18, letterSpacing: 2 }}>
          KH-4826
        </div>
      </div>
    </div>,
    OG_SIZE,
  );
}
