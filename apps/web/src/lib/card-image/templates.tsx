import type { CardTemplate } from '@harusi/schemas';
import type { Palette } from '@harusi/ui-tokens/palette';
import { BotanicalCard, ScriptCard } from './templates-text';

/**
 * The two shareable card-image designs (ADR 058), rendered by `next/og` (satori) at 640×940.
 * Both work for every occasion: the copy (eyebrow, names, guest line) changes, the layout doesn't.
 * The image is a picture, not a page: it never draws RSVP / pay / share buttons. Those exist only
 * on the digital card at `/c/[token]`, which the message link opens. Satori needs `display:flex`
 * on every element with more than one child.
 */
export interface CardImageModel {
  template: CardTemplate;
  locale: 'sw' | 'en';
  isContribution: boolean;
  /** "HARUSI YA", "SEND-OFF YA", "KADI YA MCHANGO"… already in the reader's language. */
  eyebrow: string;
  partnerA: string;
  partnerB: string | null;
  guestName: string;
  /** e.g. "Jumamosi, 12 Des 2026". */
  dateLine: string;
  /** e.g. "Saa 8 mchana". */
  timeLine: string;
  /** Big day number + short month for the modern date tile. */
  day: string;
  month: string;
  venue: string;
  dress: string;
  sender: string;
  phone: string;
  shortCode: string;
  /** SVG path of the QR (null on a contribution card). */
  qrPath: string | null;
  qrDim: number;
  palette: Palette;
  /** Optional safe CSS gradient for the cover (modern) / accents. */
  cover: string;
  domain: string;
  /** Organiser's own text (script / botanical); already filled-in, may be empty. */
  title: string;
  message: string;
  footer: string;
}

export const CARD_IMAGE_WIDTH = 640;
export const CARD_IMAGE_HEIGHT = 940;

// Used when the fonts in `assets/card-fonts` are present (fonts.ts); satori falls back otherwise.
const SERIF = '"Playfair Display", Georgia, serif';
const SANS = '"DM Sans", sans-serif';

function copy(m: CardImageModel) {
  const sw = m.locale === 'sw';
  return {
    invitedLabel: sw ? 'Mwaliko maalum kwa' : 'A special invitation for',
    contribLabel: sw ? 'Ombi la mchango kwa' : 'A contribution request for',
    venue: sw ? 'Mahali' : 'Venue',
    when: sw ? 'Lini' : 'When',
    dress: sw ? 'Mavazi' : 'Dress code',
    from: sw ? 'Kutoka' : 'From',
    code: sw ? 'Namba ya mgeni' : 'Guest number',
    gate: sw ? 'Onyesha QR hii au namba getini' : 'Show this QR or number at the gate',
    contribTitle: sw ? 'Mchango wako unathaminiwa' : 'Your support means a lot',
    contribBody: sw
      ? 'Fungua kiungo ulichotumiwa kuona namna ya kuchangia.'
      : 'Open the link you were sent to see how to contribute.',
    linkHint: sw
      ? 'Jibu mwaliko kupitia kiungo ulichotumiwa'
      : 'Reply through the link you were sent',
  };
}

function Qr({ m, size }: { m: CardImageModel; size: number }) {
  if (!m.qrPath) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${m.qrDim} ${m.qrDim}`}
      shapeRendering="crispEdges"
      style={{ backgroundColor: '#FFFFFF' }}
    >
      <path d={m.qrPath} fill="#000000" />
    </svg>
  );
}

function Names({
  m,
  size,
  color,
  amp,
}: {
  m: CardImageModel;
  size: number;
  color: string;
  amp: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'baseline',
        justifyContent: 'center',
        fontFamily: SERIF,
        fontSize: size,
        lineHeight: 1.05,
        color,
        textAlign: 'center',
      }}
    >
      <span>{m.partnerA}</span>
      {m.partnerB ? (
        <span style={{ color: amp, fontSize: size * 0.75, margin: `0 ${size * 0.25}px` }}>
          &amp;
        </span>
      ) : null}
      {m.partnerB ? <span>{m.partnerB}</span> : null}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Template 1 — Classic: an editorial printed-card look. Cream paper, a double hairline frame in the
 * event colour, everything centred, names large in serif, QR set into the foot of the card.
 * ---------------------------------------------------------------------------------------------- */
export function ClassicCard({ m }: { m: CardImageModel }) {
  const t = copy(m);
  const p = m.palette;
  const paper = '#FBF8F2';
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        padding: 20,
        backgroundColor: p.primary,
        ...(m.cover ? { backgroundImage: m.cover } : {}),
        fontFamily: SANS,
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          padding: 10,
          backgroundColor: paper,
          borderRadius: 6,
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: `1.5px solid ${p.primary}`,
            borderRadius: 4,
            padding: '34px 36px 22px',
            position: 'relative',
          }}
        >
          {/* inner hairline */}
          <div
            style={{
              position: 'absolute',
              top: 5,
              left: 5,
              right: 5,
              bottom: 5,
              border: `0.75px solid ${p.accent}`,
              borderRadius: 2,
              display: 'flex',
            }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                display: 'flex',
                fontSize: 13,
                letterSpacing: 4,
                fontWeight: 700,
                color: p.accent,
                textTransform: 'uppercase',
              }}
            >
              {m.eyebrow}
            </div>
            <div style={{ display: 'flex', marginTop: 18, justifyContent: 'center', width: 520 }}>
              <Names m={m} size={m.partnerB ? 50 : 58} color={p.ink} amp={p.accent} />
            </div>
            {/* ornament */}
            <svg width="140" height="14" viewBox="0 0 140 14" style={{ marginTop: 16 }}>
              <path d="M0 7h56M84 7h56" stroke={p.accent} strokeWidth="1" />
              <path d="m70 1 6 6-6 6-6-6z" fill="none" stroke={p.accent} strokeWidth="1.2" />
              <circle cx="70" cy="7" r="1.6" fill={p.accent} />
            </svg>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', fontSize: 13, color: p.muted }}>
              {m.isContribution ? t.contribLabel : t.invitedLabel}
            </div>
            <div
              style={{
                display: 'flex',
                fontFamily: SERIF,
                fontSize: 26,
                fontStyle: 'italic',
                color: p.ink,
                marginTop: 4,
                textAlign: 'center',
              }}
            >
              {m.guestName}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {m.dateLine ? (
              <div style={{ display: 'flex', fontSize: 19, fontWeight: 700, color: p.ink }}>
                {m.dateLine}
              </div>
            ) : null}
            {m.timeLine ? (
              <div style={{ display: 'flex', fontSize: 15, color: p.ink, marginTop: 2 }}>
                {m.timeLine}
              </div>
            ) : null}
            <div
              style={{
                display: 'flex',
                fontSize: 15,
                color: p.muted,
                marginTop: 6,
                textAlign: 'center',
                maxWidth: 480,
              }}
            >
              {m.venue}
            </div>
            {m.dress && !m.isContribution ? (
              <div style={{ display: 'flex', fontSize: 13, color: p.muted, marginTop: 4 }}>
                {`${t.dress}: ${m.dress}`}
              </div>
            ) : null}
          </div>

          {m.qrPath ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div
                style={{
                  display: 'flex',
                  padding: 8,
                  backgroundColor: '#FFFFFF',
                  border: `1px solid ${p.border}`,
                  borderRadius: 10,
                }}
              >
                <Qr m={m} size={150} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', fontSize: 11, letterSpacing: 2, color: p.muted }}>
                  {t.code.toUpperCase()}
                </div>
                <div
                  style={{
                    display: 'flex',
                    fontFamily: SANS,
                    fontSize: 30,
                    fontWeight: 800,
                    letterSpacing: 3,
                    color: p.ink,
                  }}
                >
                  {m.shortCode}
                </div>
                <div
                  style={{
                    display: 'flex',
                    fontSize: 12,
                    color: p.muted,
                    maxWidth: 190,
                    marginTop: 4,
                  }}
                >
                  {t.gate}
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '18px 26px',
                borderRadius: 10,
                border: `1px solid ${p.border}`,
                backgroundColor: '#FFFFFF',
              }}
            >
              <div style={{ display: 'flex', fontFamily: SERIF, fontSize: 22, color: p.primary }}>
                {t.contribTitle}
              </div>
              <div style={{ display: 'flex', fontSize: 13, color: p.muted, marginTop: 6 }}>
                {t.contribBody}
              </div>
              <div
                style={{
                  display: 'flex',
                  fontFamily: SANS,
                  fontSize: 18,
                  fontWeight: 800,
                  letterSpacing: 2,
                  color: p.ink,
                  marginTop: 10,
                }}
              >
                {m.shortCode}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', fontSize: 13, fontWeight: 700, color: p.ink }}>
              {`${t.from}: ${m.sender}${m.phone ? ` · ${m.phone}` : ''}`}
            </div>
            <div style={{ display: 'flex', fontSize: 11, color: p.muted, marginTop: 6 }}>
              {`${m.isContribution ? '' : `${t.linkHint} · `}${m.domain}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Template 2 — Modern: a bold colour block with left-aligned names and a calendar date tile on top,
 * a clean white sheet below with label/value rows and the QR as a ticket stub.
 * ---------------------------------------------------------------------------------------------- */
export function ModernCard({ m }: { m: CardImageModel }) {
  const t = copy(m);
  const p = m.palette;
  const Row = ({ label, value }: { label: string; value: string }) => (
    <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 14 }}>
      <div
        style={{ display: 'flex', fontSize: 11, letterSpacing: 2, fontWeight: 700, color: p.muted }}
      >
        {label.toUpperCase()}
      </div>
      <div style={{ display: 'flex', fontSize: 16, fontWeight: 600, color: p.ink, marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        fontFamily: SANS,
      }}
    >
      {/* colour block */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: 430,
          padding: '40px 44px 36px',
          backgroundColor: p.primary,
          ...(m.cover ? { backgroundImage: m.cover } : {}),
          color: p.onPrimary,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div
            style={{
              display: 'flex',
              fontSize: 13,
              letterSpacing: 4,
              fontWeight: 700,
              textTransform: 'uppercase',
              opacity: 0.9,
              maxWidth: 360,
            }}
          >
            {m.eyebrow}
          </div>
          {m.day ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: 84,
                borderRadius: 14,
                overflow: 'hidden',
                backgroundColor: '#FFFFFF',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  width: '100%',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: 2,
                  padding: '4px 0',
                  backgroundColor: p.accent,
                  color: '#FFFFFF',
                }}
              >
                {m.month.toUpperCase()}
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: 38,
                  fontWeight: 800,
                  color: p.ink,
                  padding: '2px 0 6px',
                }}
              >
                {m.day}
              </div>
            </div>
          ) : null}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontFamily: SERIF,
              lineHeight: 1.02,
            }}
          >
            <div style={{ display: 'flex', fontSize: m.partnerB ? 56 : 64 }}>{m.partnerA}</div>
            {m.partnerB ? (
              <div style={{ display: 'flex', alignItems: 'baseline', fontSize: 56 }}>
                <span style={{ fontSize: 40, opacity: 0.75, marginRight: 14 }}>&amp;</span>
                <span>{m.partnerB}</span>
              </div>
            ) : null}
          </div>
          <div
            style={{
              display: 'flex',
              width: 64,
              height: 4,
              borderRadius: 2,
              backgroundColor: p.accent,
              marginTop: 22,
            }}
          />
        </div>
      </div>

      {/* white sheet */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '30px 44px 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 20 }}>
          <div style={{ display: 'flex', fontSize: 13, color: p.muted }}>
            {m.isContribution ? t.contribLabel : t.invitedLabel}
          </div>
          <div
            style={{ display: 'flex', fontSize: 26, fontWeight: 800, color: p.ink, marginTop: 2 }}
          >
            {m.guestName}
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', width: m.qrPath ? 300 : 552 }}>
            {m.dateLine ? (
              <Row label={t.when} value={`${m.dateLine}${m.timeLine ? ` · ${m.timeLine}` : ''}`} />
            ) : null}
            <Row label={t.venue} value={m.venue} />
            {m.dress && !m.isContribution ? <Row label={t.dress} value={m.dress} /> : null}
            {m.isContribution ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '14px 16px',
                  borderRadius: 12,
                  borderLeft: `4px solid ${p.accent}`,
                  backgroundColor: '#F7F5F0',
                }}
              >
                <div style={{ display: 'flex', fontSize: 18, fontWeight: 700, color: p.primary }}>
                  {t.contribTitle}
                </div>
                <div style={{ display: 'flex', fontSize: 13, color: p.muted, marginTop: 4 }}>
                  {t.contribBody}
                </div>
              </div>
            ) : null}
          </div>

          {m.qrPath ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                alignSelf: 'flex-start',
                padding: '14px 14px 12px',
                borderRadius: 16,
                border: `1.5px dashed ${p.border}`,
              }}
            >
              <Qr m={m} size={160} />
              <div
                style={{
                  display: 'flex',
                  fontFamily: SANS,
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: 2,
                  color: p.ink,
                  marginTop: 8,
                }}
              >
                {m.shortCode}
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: 10,
                  color: p.muted,
                  marginTop: 2,
                  maxWidth: 170,
                  textAlign: 'center',
                }}
              >
                {t.gate}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {!m.isContribution ? (
        <div style={{ display: 'flex', padding: '0 44px 14px', fontSize: 12, color: p.muted }}>
          {t.linkHint}
        </div>
      ) : null}

      {/* footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 44px',
          borderTop: `1px solid ${p.border}`,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 13, fontWeight: 700, color: p.ink }}>
            {`${t.from}: ${m.sender}`}
          </div>
          {m.phone ? (
            <div style={{ display: 'flex', fontSize: 12, color: p.muted }}>{m.phone}</div>
          ) : null}
        </div>
        <div style={{ display: 'flex', fontSize: 12, fontWeight: 700, color: p.primary }}>
          {m.domain}
        </div>
      </div>
    </div>
  );
}

export function CardImage({ m }: { m: CardImageModel }) {
  switch (m.template) {
    case 'modern':
      return <ModernCard m={m} />;
    case 'script':
      return <ScriptCard m={m} />;
    case 'botanical':
      return <BotanicalCard m={m} />;
    default:
      return <ClassicCard m={m} />;
  }
}
