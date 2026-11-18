import type { CardImageModel } from './templates';

/**
 * The two text-led card-image templates (ADR 058): `script` (minimal white card, signature-script
 * names, small capitals left-aligned, QR in the corner) and `botanical` (cream card with drawn
 * leaf-and-flower garlands, centred text, QR in the middle). Both print the organiser's own
 * title / message / footer text. No buttons, like every card image.
 */

const SCRIPT = '"Mrs Saint Delafield", "Playfair Display", serif';
const SERIF = '"Playfair Display", Georgia, serif';
const SANS = '"DM Sans", sans-serif';

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

const lines = (text: string) =>
  text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

/* ------------------------------------------------------------------------------------------------
 * Script — white card, oversized handwritten names, everything else in small spaced capitals.
 * ---------------------------------------------------------------------------------------------- */
export function ScriptCard({ m }: { m: CardImageModel }) {
  const ink = '#1F1F1F';
  const soft = '#5C5C5C';
  const caps = {
    display: 'flex',
    fontSize: 15,
    letterSpacing: 2.4,
    textTransform: 'uppercase' as const,
    color: ink,
    lineHeight: 1.45,
  };
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px 56px 48px',
        backgroundColor: '#FFFFFF',
        fontFamily: SANS,
        position: 'relative',
      }}
    >
      {/* names */}
      <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: 30 }}>
        <div
          style={{ display: 'flex', fontFamily: SCRIPT, fontSize: 132, lineHeight: 1, color: ink }}
        >
          {m.partnerB ? `${m.partnerA} +` : m.partnerA}
        </div>
        {m.partnerB ? (
          <div
            style={{
              display: 'flex',
              fontFamily: SCRIPT,
              fontSize: 132,
              lineHeight: 1,
              color: ink,
              marginTop: -18,
              paddingLeft: 140,
            }}
          >
            {m.partnerB}
          </div>
        ) : null}
      </div>

      {/* words */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ ...caps, fontSize: 12, color: soft }}>{`${m.eyebrow} · ${m.guestName}`}</div>
        <div style={{ ...caps, marginTop: 14, maxWidth: 420 }}>{m.title}</div>
        <div
          style={{
            display: 'flex',
            width: 70,
            height: 1,
            backgroundColor: '#9A9A9A',
            margin: '22px 0',
          }}
        />
        {m.dateLine ? <div style={{ ...caps, fontSize: 13 }}>{m.dateLine}</div> : null}
        {m.timeLine ? <div style={{ ...caps, fontSize: 13 }}>{m.timeLine}</div> : null}
        <div style={{ ...caps, fontSize: 13, marginTop: 18, maxWidth: 400 }}>{m.venue}</div>
        {lines(m.message).map((l, i) => (
          <div
            key={i}
            style={{ ...caps, fontSize: 12, color: soft, marginTop: i ? 2 : 14, maxWidth: 400 }}
          >
            {l}
          </div>
        ))}
      </div>

      {/* foot: script line + QR */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 380 }}>
          {m.footer ? (
            <div
              style={{
                display: 'flex',
                fontFamily: SCRIPT,
                fontSize: 40,
                color: ink,
                lineHeight: 1.1,
              }}
            >
              {m.footer}
            </div>
          ) : null}
          <div style={{ ...caps, fontSize: 10, color: soft, marginTop: 10 }}>
            {`${m.sender}${m.phone ? ` · ${m.phone}` : ''}`}
          </div>
        </div>
        {m.qrPath ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Qr m={m} size={96} />
            <div style={{ ...caps, fontSize: 11, marginTop: 4, letterSpacing: 2 }}>
              {m.shortCode}
            </div>
          </div>
        ) : (
          <div style={{ ...caps, fontSize: 12 }}>{m.shortCode}</div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Botanical — cream card, leaf-and-flower garland top and bottom, soft side curves, centred text.
 * The garland is drawn here (no image assets), so it stays sharp at any size.
 * ---------------------------------------------------------------------------------------------- */
const LEAF = '#4F7A47';
const LEAF_DARK = '#2F5A34';
const PETAL = '#F2C45A';
const PETAL_EDGE = '#E0A33A';
const HEART = '#C9762B';

function Flower({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <ellipse
          key={a}
          cx={cx}
          cy={cy - r * 0.55}
          rx={r * 0.32}
          ry={r * 0.58}
          fill={PETAL}
          stroke={PETAL_EDGE}
          strokeWidth="1"
          transform={`rotate(${a} ${cx} ${cy})`}
        />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.2} fill={HEART} />
    </g>
  );
}

/** Leaves along one side of a sprig; `dir` = 1 grows right, -1 left. */
function Sprig({ x, y, dir }: { x: number; y: number; dir: 1 | -1 }) {
  const leaves = [
    { t: 30, a: -35, s: 1 },
    { t: 62, a: 25, s: 0.95 },
    { t: 96, a: -30, s: 0.9 },
    { t: 128, a: 22, s: 0.8 },
    { t: 158, a: -25, s: 0.7 },
  ];
  return (
    <g>
      <path
        d={`M${x} ${y} C ${x + dir * 60} ${y - 18}, ${x + dir * 120} ${y + 14}, ${x + dir * 190} ${y - 4}`}
        stroke={LEAF_DARK}
        strokeWidth="2"
        fill="none"
      />
      {leaves.map((l, i) => {
        const lx = x + dir * l.t;
        const ly = y - 4 + (i % 2 ? 6 : -8);
        return (
          <ellipse
            key={i}
            cx={lx}
            cy={ly}
            rx={22 * l.s}
            ry={9 * l.s}
            fill={i % 2 ? LEAF : LEAF_DARK}
            transform={`rotate(${dir * l.a} ${lx} ${ly})`}
          />
        );
      })}
      {Flower({ cx: x + dir * 178, cy: y - 18, r: 12 })}
    </g>
  );
}

function Garland({ flip }: { flip?: boolean }) {
  return (
    <svg
      width="520"
      height="96"
      viewBox="0 0 520 96"
      style={flip ? { transform: 'rotate(180deg)' } : {}}
    >
      {Sprig({ x: 238, y: 52, dir: -1 })}
      {Sprig({ x: 282, y: 52, dir: 1 })}
      {Flower({ cx: 260, cy: 46, r: 30 })}
    </svg>
  );
}

export function BotanicalCard({ m }: { m: CardImageModel }) {
  const p = m.palette;
  const ink = '#3A2230';
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        backgroundColor: '#F3EEE6',
        fontFamily: SANS,
      }}
    >
      {/* soft side curves */}
      <svg
        width="640"
        height="940"
        viewBox="0 0 640 940"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <path d="M0 120 C 70 260, 10 420, 60 560 S 30 820, 0 900 Z" fill="#E7DCCF" />
        <path d="M640 80 C 560 240, 630 400, 585 560 S 620 800, 640 880 Z" fill="#E7DCCF" />
        <path d="M0 160 C 40 300, 0 440, 30 580" stroke="#D8C8B6" strokeWidth="2" fill="none" />
        <path
          d="M640 120 C 600 280, 640 420, 610 560"
          stroke="#D8C8B6"
          strokeWidth="2"
          fill="none"
        />
      </svg>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '22px 64px 22px',
          position: 'relative',
        }}
      >
        <Garland />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: p.primary,
            }}
          >
            {m.eyebrow}
          </div>
          <div
            style={{
              display: 'flex',
              fontFamily: SERIF,
              fontWeight: 700,
              fontSize: m.partnerB ? 40 : 46,
              color: ink,
              marginTop: 8,
              textAlign: 'center',
            }}
          >
            {m.partnerB ? `${m.partnerA} & ${m.partnerB}` : m.partnerA}
          </div>
          <div style={{ display: 'flex', fontSize: 15, color: ink, marginTop: 10 }}>
            {m.guestName}
          </div>
          {m.title ? (
            <div
              style={{
                display: 'flex',
                fontSize: 19,
                lineHeight: 1.4,
                color: ink,
                marginTop: 12,
                maxWidth: 470,
                textAlign: 'center',
                justifyContent: 'center',
              }}
            >
              {m.title}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          {m.dateLine ? (
            <div style={{ display: 'flex', fontSize: 18, fontWeight: 700, color: ink }}>
              {`${m.dateLine}${m.timeLine ? ` · ${m.timeLine}` : ''}`}
            </div>
          ) : null}
          <div style={{ display: 'flex', fontSize: 16, color: ink, marginTop: 4 }}>{m.venue}</div>
          {[...lines(m.message), ...(m.phone ? [m.phone] : [])].map((l, i) => (
            <div
              key={i}
              style={{ display: 'flex', fontSize: 16, color: ink, marginTop: i ? 2 : 14 }}
            >
              {l}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {m.qrPath ? (
            <div
              style={{ display: 'flex', padding: 10, backgroundColor: '#FFFFFF', borderRadius: 6 }}
            >
              <Qr m={m} size={140} />
            </div>
          ) : null}
          <div
            style={{
              display: 'flex',
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: 3,
              color: ink,
              marginTop: 8,
            }}
          >
            {m.shortCode}
          </div>
          <div style={{ display: 'flex', fontSize: 12, color: '#6E5A63', marginTop: 4 }}>
            {m.footer || m.domain}
          </div>
        </div>

        <Garland flip />
      </div>
    </div>
  );
}
