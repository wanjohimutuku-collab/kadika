import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { resolvePalette } from '@harusi/ui-tokens/palette';
import { eventKindOf, hostNames } from '@harusi/schemas';
import { formatDateShort, formatTime, swahiliTime } from '@/lib/format';
import { qrMatrix, qrPath, QR_QUIET_ZONE } from '@/lib/qr';
import { previewCardOnServer } from '@/lib/server-card';
import { peekShortCodeOnServer } from '@/lib/server-mock';

export const runtime = 'nodejs';

const SAMPLE_PAYLOAD = 'v1.0192f1a0.preview0.2.1.MOCKSIG';

/**
 * High-performance virtual card image generator.
 * Converts the actual virtual card to a crisp PNG image for fast download and WhatsApp sharing.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const tokenParam = searchParams.get('token');
  const codeParam = searchParams.get('code');
  const isContribution =
    searchParams.get('isContribution') === '1' || searchParams.get('kind') === 'contribution';
  const locale = (searchParams.get('locale') === 'en' ? 'en' : 'sw') as 'sw' | 'en';
  const forceDownload =
    searchParams.get('download') === '1' || searchParams.get('download') === 'true';

  let token = tokenParam;
  if (!token && codeParam) {
    token = peekShortCodeOnServer(codeParam) || null;
  }

  let cardView = null;
  if (token) {
    try {
      cardView = await previewCardOnServer(token);
    } catch {
      // fallback to query params
    }
  }

  const ev = cardView?.state === 'ok' ? cardView.event : null;
  const guest = cardView?.state === 'ok' ? cardView.guest : null;

  const partnerA = searchParams.get('partnerA') || ev?.partnerA || 'Asha';
  const partnerB = searchParams.get('partnerB') || ev?.partnerB || 'Juma';
  const coupleNames =
    searchParams.get('couple') ||
    (ev ? hostNames(ev.partnerA, ev.partnerB) : hostNames(partnerA, partnerB));

  const eventKind = searchParams.get('eventKind') || ev?.eventKind || 'Harusi';
  const dateStart = searchParams.get('date') || ev?.dateStart || '2026-12-12T14:00:00Z';
  const venueName =
    searchParams.get('venue') ||
    ev?.venueName ||
    (locale === 'sw' ? 'Ukumbi Rasmi wa Sherehe' : 'Official Celebration Venue');

  const guestName =
    searchParams.get('guest') ||
    guest?.displayName ||
    (locale === 'sw' ? 'Ndugu Mualikwa' : 'Honoured Guest');

  const shortCode = searchParams.get('code') || guest?.shortCode || 'KH-4826';
  const themeId = searchParams.get('theme') || ev?.themeId || 'emerald-gold';
  const palette = resolvePalette(themeId, ev?.palette);

  const validDate = !Number.isNaN(Date.parse(dateStart));
  const dateStr = validDate ? formatDateShort(dateStart, locale) : '';
  const timeStr = validDate
    ? locale === 'sw'
      ? swahiliTime(dateStart)
      : formatTime(dateStart, locale)
    : '';

  const kindOf = eventKindOf(eventKind, locale).toUpperCase();

  const qrPayload = cardView?.qrPayload || (shortCode ? `v1.preview.${shortCode}` : SAMPLE_PAYLOAD);
  const qr = qrMatrix(qrPayload);
  const qrD = qrPath(qr);
  const qrDim = qr.size + QR_QUIET_ZONE * 2;

  const width = 640;
  const height = 940;

  const headers: Record<string, string> = {
    'Content-Type': 'image/png',
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
  };

  if (forceDownload) {
    headers['Content-Disposition'] = `attachment; filename="kadi-${shortCode.toLowerCase()}.png"`;
  } else {
    headers['Content-Disposition'] = `inline; filename="kadi-${shortCode.toLowerCase()}.png"`;
  }

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '24px',
        background: '#F7F5F0',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Card Box with Border and Rounded Corners */}
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          border: '2px solid #E2E8F0',
          overflow: 'hidden',
        }}
      >
        {/* Header Banner */}
        <div
          style={{
            width: '100%',
            height: '270px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: palette.primary,
            color: palette.onPrimary,
            padding: '20px 24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              opacity: 0.9,
              marginBottom: '6px',
            }}
          >
            {isContribution
              ? locale === 'sw'
                ? 'KADI MAALUM YA MCHANGO'
                : 'CONTRIBUTION CARD'
              : kindOf}
          </div>

          <div
            style={{
              display: 'flex',
              fontSize: '32px',
              fontWeight: 700,
              textAlign: 'center',
              fontFamily: 'Georgia, serif',
              lineHeight: 1.15,
              marginBottom: '8px',
            }}
          >
            {coupleNames}
          </div>

          {/* Diamond ornament */}
          <svg width="40" height="12" viewBox="0 0 40 12" style={{ marginBottom: '10px' }}>
            <path d="M0 6h14M26 6h14" stroke="#FFFFFF" strokeWidth="1.4" opacity="0.8" />
            <path d="m20 1 5 5-5 5-5-5z" fill="none" stroke="#FFFFFF" strokeWidth="1.4" />
            <circle cx="20" cy="6" r="1.5" fill="#FFFFFF" />
          </svg>

          <div
            style={{
              display: 'flex',
              fontSize: '15px',
              fontWeight: 600,
              opacity: 0.95,
              marginBottom: '4px',
            }}
          >
            {dateStr}
            {timeStr ? ` · ${timeStr}` : ''}
          </div>

          <div
            style={{
              display: 'flex',
              fontSize: '13px',
              opacity: 0.85,
              textAlign: 'center',
            }}
          >
            {venueName}
          </div>
        </div>

        {/* Guest Personalization Strip */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            padding: '16px 20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: '12px',
              color: '#64748B',
              fontWeight: 500,
              marginBottom: '2px',
            }}
          >
            {locale === 'sw' ? 'Mwaliko Maalum kwa:' : 'Special Invitation for:'}
          </div>
          <div style={{ display: 'flex', fontSize: '20px', color: '#0F172A', fontWeight: 800 }}>
            {guestName}
          </div>
        </div>

        {/* Body Section with High-Contrast QR Code */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 20px',
          }}
        >
          {!isContribution ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '2px solid #E2E8F0',
                padding: '20px 24px',
              }}
            >
              {/* Vector QR code */}
              <svg
                width={180}
                height={180}
                viewBox={`0 0 ${qrDim} ${qrDim}`}
                shapeRendering="crispEdges"
              >
                <path d={qrD} fill="#000000" />
              </svg>

              <div
                style={{
                  display: 'flex',
                  fontFamily: 'monospace',
                  fontSize: '26px',
                  fontWeight: 800,
                  letterSpacing: '2px',
                  color: '#0F172A',
                  marginTop: '12px',
                }}
              >
                {shortCode}
              </div>

              <div
                style={{
                  display: 'flex',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#64748B',
                  letterSpacing: '1px',
                  marginTop: '6px',
                }}
              >
                {locale === 'sw'
                  ? 'ONYESHA MLANGONI KWA UTHIBITISHO'
                  : 'SHOW AT ENTRANCE FOR ENTRY'}
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: '#F8FAFC',
                borderRadius: '16px',
                border: '1.5px solid #E2E8F0',
                padding: '30px 24px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#0F172A',
                  marginBottom: '8px',
                }}
              >
                {locale === 'sw' ? 'Ahsante kwa Mchango Wako' : 'Thank You for Your Support'}
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: '13px',
                  color: '#64748B',
                  marginBottom: '16px',
                }}
              >
                {locale === 'sw'
                  ? 'Mchango wako unafanikisha shughuli hii.'
                  : 'Your generous pledge makes this event possible.'}
              </div>
              <div
                style={{
                  display: 'flex',
                  fontFamily: 'monospace',
                  fontSize: '20px',
                  fontWeight: 800,
                  color: palette.primary,
                }}
              >
                {shortCode}
              </div>
            </div>
          )}
        </div>

        {/* Footer Branding */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '14px 20px',
            borderTop: '1px solid #F1F5F9',
            backgroundColor: '#FAFAFA',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: '12px',
              color: '#94A3B8',
              fontWeight: 600,
            }}
          >
            Kadi Sasa · Mwaliko Rasmi · kadisasa.com
          </div>
        </div>
      </div>
    </div>,
    {
      width,
      height,
      headers,
    },
  );
}
