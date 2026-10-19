import { ImageResponse } from 'next/og';
import { resolvePalette } from '@harusi/ui-tokens/palette';
import { previewCardOnServer } from '@/lib/server-card';
import { eventKindLabel, hostNames } from '@harusi/schemas';
import { formatDate } from '@/lib/format';
import { LOGO_SVG, svgDataUri } from '@/lib/brand-assets';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Harusi Pass';

/** WhatsApp/SMS link preview (§7.2). Shows names, date and venue — never the QR or guest data. */
export default async function OgImage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const v = await previewCardOnServer(token);
  const ev = v?.state === 'ok' ? v.event : null;
  const palette = resolvePalette(ev?.themeId, ev?.palette);
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: ev?.coverGradient || palette.primary,
        color: palette.onPrimary,
        fontFamily: 'Georgia, serif',
      }}
    >
      <div style={{ fontSize: 34, letterSpacing: 8, textTransform: 'uppercase', opacity: 0.9 }}>
        {`${eventKindLabel(ev?.eventKind, 'en')} of`}
      </div>
      <div style={{ fontSize: 110, fontWeight: 700, marginTop: 10 }}>
        {ev ? hostNames(ev.partnerA, ev.partnerB) : 'Harusi Pass'}
      </div>
      {ev ? (
        <div
          style={{ fontSize: 40, marginTop: 18 }}
        >{`${formatDate(ev.dateStart, 'en')} · ${ev.venueName}`}</div>
      ) : null}
      {/* The business logo on a light badge, so the dark logo reads on every theme colour (ADR 036). */}
      <div
        style={{
          position: 'absolute',
          bottom: 30,
          display: 'flex',
          alignItems: 'center',
          gap: 22,
          background: '#FBF8F3',
          color: '#1B1B1F',
          borderRadius: 20,
          padding: '10px 28px',
          fontSize: 26,
          fontFamily: 'sans-serif',
        }}
      >
        <img src={svgDataUri(LOGO_SVG)} width={Math.round((52 * 503.1) / 260)} height={52} />
        <span>mwaliko rasmi</span>
      </div>
    </div>,
    size,
  );
}
