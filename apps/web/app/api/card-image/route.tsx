import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { resolvePalette } from '@harusi/ui-tokens/palette';
import { defaultSender, eventKindOf, hostNames } from '@harusi/schemas';
import { formatDateShort, formatPhone, formatTime, swahiliTime } from '@/lib/format';
import { qrMatrix, qrPath, QR_QUIET_ZONE } from '@/lib/qr';
import { previewCardOnServer } from '@/lib/server-card';
import { peekShortCodeOnServer } from '@/lib/server-mock';

export const runtime = 'nodejs';

const SAMPLE_PAYLOAD = 'v1.0192f1a0.preview0.2.1.MOCKSIG';

/**
 * High-performance virtual card image generator.
 * Converts the actual virtual card to a crisp PNG image that matches the HTML card preview,
 * for fast download and WhatsApp sharing.
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

  const dressCode = searchParams.get('dress') || ev?.dressCode || '';
  const senderName =
    searchParams.get('sender') ||
    ev?.senderName ||
    defaultSender(eventKind, coupleNames, 'committee', locale);
  const committeePhone = searchParams.get('phone') || ev?.committeePhone || '';

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
            height: '240px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: palette.primary,
            color: palette.onPrimary,
            padding: '16px 20px',
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
              marginBottom: '4px',
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
              fontSize: '30px',
              fontWeight: 700,
              textAlign: 'center',
              fontFamily: 'Georgia, serif',
              lineHeight: 1.15,
              marginBottom: '6px',
            }}
          >
            {coupleNames}
          </div>

          {/* Diamond ornament */}
          <svg width="40" height="12" viewBox="0 0 40 12" style={{ marginBottom: '6px' }}>
            <path d="M0 6h14M26 6h14" stroke="#FFFFFF" strokeWidth="1.4" opacity="0.8" />
            <path d="m20 1 5 5-5 5-5-5z" fill="none" stroke="#FFFFFF" strokeWidth="1.4" />
            <circle cx="20" cy="6" r="1.5" fill="#FFFFFF" />
          </svg>

          <div
            style={{
              display: 'flex',
              fontSize: '14px',
              fontWeight: 600,
              opacity: 0.95,
              marginBottom: '2px',
            }}
          >
            {dateStr}
            {timeStr ? ` · ${timeStr}` : ''}
          </div>

          {/* OrnamentBand divider at bottom of header */}
          <svg
            width="592"
            height="16"
            viewBox="0 0 592 16"
            style={{
              position: 'absolute',
              bottom: '0px',
              left: '0px',
              opacity: 0.85,
            }}
          >
            <path
              d="M0 15 7 3l7 12M14 1l7 12 7-12M28 15l7-12 7 12M42 1l7 12 7-12M56 15l7-12 7 12M70 1l7 12 7-12M84 15l7-12 7 12M98 1l7 12 7-12M112 15l7-12 7 12M126 1l7 12 7-12M140 15l7-12 7 12M154 1l7 12 7-12M168 15l7-12 7 12M182 1l7 12 7-12M196 15l7-12 7 12M210 1l7 12 7-12M224 15l7-12 7 12M238 1l7 12 7-12M252 15l7-12 7 12M266 1l7 12 7-12M280 15l7-12 7 12M294 1l7 12 7-12M308 15l7-12 7 12M322 1l7 12 7-12M336 15l7-12 7 12M350 1l7 12 7-12M364 15l7-12 7 12M378 1l7 12 7-12M392 15l7-12 7 12M406 1l7 12 7-12M420 15l7-12 7 12M434 1l7 12 7-12M448 15l7-12 7 12M462 1l7 12 7-12M476 15l7-12 7 12M490 1l7 12 7-12M504 15l7-12 7 12M518 1l7 12 7-12M532 15l7-12 7 12M546 1l7 12 7-12M560 15l7-12 7 12M574 1l7 12 7-12"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />
          </svg>
        </div>

        {/* Card Body */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '16px 20px',
            backgroundColor: '#FFFFFF',
          }}
        >
          {/* Invites You banner */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginBottom: '10px',
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
              {locale === 'sw' ? 'Inakualika kwa furaha:' : 'Cordially invites you:'}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '20px',
                color: '#0F172A',
                fontWeight: 800,
              }}
            >
              {guestName}
            </div>
          </div>

          {/* Trust Badge */}
          <div
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: '#F0FDF4',
              borderRadius: '8px',
              border: '1px solid #BBF7D0',
              padding: '8px 12px',
              marginBottom: '10px',
            }}
          >
            {/* Shield Check SVG */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                stroke="#16A34A"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="m9 12 2 2 4-4"
                stroke="#16A34A"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#166534',
                }}
              >
                {locale === 'sw' ? `Ujumbe kutoka: ${senderName}` : `From: ${senderName}`}
              </div>
              {committeePhone ? (
                <div style={{ display: 'flex', fontSize: '11px', color: '#15803D' }}>
                  {locale === 'sw'
                    ? `Mawasiliano: ${formatPhone(committeePhone)}`
                    : `Contact: ${formatPhone(committeePhone)}`}
                </div>
              ) : null}
            </div>
          </div>

          {/* Venue & Dress Code */}
          <div
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              marginBottom: '10px',
              paddingLeft: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"
                  stroke={palette.primary}
                  strokeWidth="2"
                />
                <circle cx="12" cy="10" r="3" fill={palette.primary} />
              </svg>
              <div style={{ display: 'flex', fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                {venueName}
              </div>
            </div>

            {dressCode ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"
                    stroke={palette.primary}
                    strokeWidth="1.8"
                  />
                </svg>
                <div style={{ display: 'flex', fontSize: '12px', color: '#475569' }}>
                  {locale === 'sw' ? `Mavazi: ${dressCode}` : `Dress code: ${dressCode}`}
                </div>
              </div>
            ) : null}
          </div>

          {/* RSVP Pills Mockup */}
          <div
            style={{
              width: '100%',
              display: 'flex',
              gap: '10px',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: palette.primary,
                color: palette.onPrimary,
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              {locale === 'sw' ? 'Ndio, Nitafika' : 'Yes, Attending'}
            </div>
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '32px',
                borderRadius: '8px',
                border: `1.5px solid ${palette.primary}`,
                color: palette.primary,
                fontSize: '12px',
                fontWeight: 700,
                backgroundColor: '#FFFFFF',
              }}
            >
              {locale === 'sw' ? 'Hapana, Sitafika' : 'No, Regrets'}
            </div>
          </div>

          {/* QR Code Box (or Contribution box) */}
          {!isContribution ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
                borderRadius: '14px',
                border: '1.5px solid #CBD5E1',
                padding: '14px 20px',
              }}
            >
              {/* Vector QR code */}
              <svg
                width={140}
                height={140}
                viewBox={`0 0 ${qrDim} ${qrDim}`}
                shapeRendering="crispEdges"
              >
                <path d={qrD} fill="#000000" />
              </svg>

              <div
                style={{
                  display: 'flex',
                  fontFamily: 'monospace',
                  fontSize: '22px',
                  fontWeight: 800,
                  letterSpacing: '2px',
                  color: '#0F172A',
                  marginTop: '8px',
                }}
              >
                {shortCode}
              </div>

              <div
                style={{
                  display: 'flex',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#64748B',
                  letterSpacing: '0.8px',
                  marginTop: '4px',
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
                borderRadius: '14px',
                border: '1.5px solid #E2E8F0',
                padding: '24px 20px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#0F172A',
                  marginBottom: '6px',
                }}
              >
                {locale === 'sw' ? 'Ahsante kwa Mchango Wako' : 'Thank You for Your Support'}
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: '12px',
                  color: '#64748B',
                  marginBottom: '12px',
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
                  fontSize: '18px',
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
            padding: '12px 20px',
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
