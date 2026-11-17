import { ImageResponse } from 'next/og';
import { resolvePalette } from '@harusi/ui-tokens/palette';
import { previewCardOnServer } from '@/lib/server-card';
import { eventKindOf, hostNames } from '@harusi/schemas';
import { formatDate, formatDateShort, formatTime } from '@/lib/format';
import { qrMatrix, qrPath, QR_QUIET_ZONE } from '@/lib/qr';
import { LOGO_SVG, svgDataUri } from '@/lib/brand-assets';
import { DEFAULT_BRANDING } from '@harusi/schemas/branding';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = DEFAULT_BRANDING.businessName;

const SAMPLE_PAYLOAD = 'v1.0192f1a0.preview0.2.1.MOCKSIG';

/**
 * WhatsApp/SMS social link preview (§7.2).
 * Renders the exact previewed card design with the high-contrast QR code,
 * host names, guest personalization, date and venue.
 */
export default async function OgImage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const v = await previewCardOnServer(token);
  const ev = v?.state === 'ok' ? v.event : null;
  const guest = v?.state === 'ok' ? v.guest : null;
  const locale = guest?.language ?? 'sw';
  const palette = resolvePalette(ev?.themeId, ev?.palette);

  const qrPayload =
    v?.qrPayload || (guest?.shortCode ? `v1.preview.${guest.shortCode}` : SAMPLE_PAYLOAD);
  const qr = qrMatrix(qrPayload);
  const qrD = qrPath(qr);
  const qrDim = qr.size + QR_QUIET_ZONE * 2;
  const kindOfName = eventKindOf(ev?.eventKind, locale);
  const hosts = ev ? hostNames(ev.partnerA, ev.partnerB) : DEFAULT_BRANDING.businessName;
  const shortCode = guest?.shortCode ?? 'KH-4826';
  const guestName = guest?.displayName ?? (locale === 'sw' ? 'Mgeni Rasmi' : 'Honoured Guest');
  const venue = ev?.venueName ?? (locale === 'sw' ? 'Ukumbi Rasmi' : 'Official Venue');
  const dateStr = ev?.dateStart ? formatDate(ev.dateStart, locale) : '';
  const timeStr = ev?.dateStart ? formatTime(ev.dateStart, locale) : '';

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '36px 48px',
        background: '#F6F3EE',
        color: '#1A202C',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Left side: Event info & invitation badge */}
      <div
        style={{
          width: 580,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '16px 0',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              background: '#FFFFFF',
              padding: '8px 20px',
              borderRadius: 24,
              border: '1px solid #E2E8F0',
              alignSelf: 'flex-start',
            }}
          >
            <img src={svgDataUri(LOGO_SVG)} width={100} height={24} />
            <span style={{ fontSize: 16, fontWeight: 600, color: '#4A5568' }}>
              {locale === 'sw' ? 'mwaliko rasmi' : 'official invite'}
            </span>
          </div>

          <div
            style={{
              fontSize: 18,
              letterSpacing: 4,
              textTransform: 'uppercase',
              color: palette.primary,
              fontWeight: 700,
              marginTop: 28,
            }}
          >
            {kindOfName.toUpperCase()}
          </div>
          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              fontFamily: 'Georgia, serif',
              color: '#1A202C',
              lineHeight: 1.12,
              marginTop: 6,
            }}
          >
            {hosts}
          </div>
          {dateStr ? (
            <div style={{ fontSize: 22, color: '#4A5568', marginTop: 12, fontWeight: 500 }}>
              {`${dateStr} · ${venue}`}
            </div>
          ) : null}

          {/* Guest personalization banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginTop: 22,
              padding: '12px 20px',
              background: '#FFFFFF',
              borderRadius: 16,
              border: `2px solid ${palette.primary}`,
              alignSelf: 'flex-start',
            }}
          >
            <span style={{ fontSize: 20, color: '#4A5568' }}>
              {locale === 'sw' ? 'Mwaliko kwa: ' : 'Invitation for: '}
            </span>
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: palette.primary,
                marginLeft: 8,
              }}
            >
              {guestName}
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 16,
            color: '#718096',
          }}
        >
          <span>
            {locale === 'sw'
              ? 'Onyesha msimbo wa QR mlangoni kwa uthibitisho wa haraka'
              : 'Show the QR code at the gate for fast entry verification'}
          </span>
        </div>
      </div>

      {/* Right side: The exact previewed card with QR code */}
      <div
        style={{
          width: 480,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 380,
            height: 558,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 28,
            border: '3px solid #E2E8F0',
            background: '#FFFFFF',
            boxShadow: '0 24px 48px rgba(0,0,0,0.12)',
            overflow: 'hidden',
          }}
        >
          {/* Cover Header */}
          <div
            style={{
              height: 200,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: ev?.coverGradient || palette.primary,
              color: palette.onPrimary,
              padding: '14px 20px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 11,
                letterSpacing: 3,
                textTransform: 'uppercase',
                opacity: 0.9,
              }}
            >
              {kindOfName}
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                fontFamily: 'Georgia, serif',
                marginTop: 4,
                lineHeight: 1.15,
              }}
            >
              {hosts}
            </div>
            {/* Ornament diamond */}
            <svg width="36" height="10" viewBox="0 0 40 12" style={{ marginTop: 6 }}>
              <path d="M0 6h14M26 6h14" stroke="#FFFFFF" strokeWidth="1.4" opacity="0.8" />
              <path d="m20 1 5 5-5 5-5-5z" fill="none" stroke="#FFFFFF" strokeWidth="1.4" />
              <circle cx="20" cy="6" r="1.5" fill="#FFFFFF" />
            </svg>
            {ev?.dateStart ? (
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6 }}>
                {`${formatDateShort(ev.dateStart, locale)} · ${timeStr}`}
              </div>
            ) : null}
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>{venue}</div>
          </div>

          {/* Card Body */}
          <div
            style={{
              flex: 1,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              background: '#FFFFFF',
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1A202C' }}>
              {locale === 'sw' ? `Anakualika: ${guestName}` : `Invites: ${guestName}`}
            </div>

            {/* QR Code Box */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: '#FFFFFF',
                border: '2px solid #E2E8F0',
                borderRadius: 16,
                padding: '10px 14px',
              }}
            >
              <svg width="150" height="150" viewBox={`0 0 ${qrDim} ${qrDim}`}>
                <rect width={qrDim} height={qrDim} fill="#FFFFFF" />
                <path d={qrD} fill="#000000" />
              </svg>
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: 4,
                  color: '#000000',
                  marginTop: 4,
                }}
              >
                {shortCode}
              </div>
            </div>

            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#718096',
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}
            >
              {locale === 'sw' ? 'Msimbo wa Kuingilia Getini' : 'Gate Entry Code'}
            </div>
          </div>
        </div>
      </div>
    </div>,
    size,
  );
}
