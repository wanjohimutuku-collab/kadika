import { SeatTag, type CardImageModel } from './templates';

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

const invitedPrefix = (m: CardImageModel) =>
  m.locale === 'sw' ? 'KWA HESHIMA YA' : 'IN HONOR OF';

/* ------------------------------------------------------------------------------------------------
 * 1. Floral Corner — Warm ivory paper, lush autumn/terracotta watercolor floral bouquets at
 *    top-left and bottom-right, centered serif + flowing script typography.
 * ---------------------------------------------------------------------------------------------- */
function FloralCornerBouquet({ flip }: { flip?: boolean }) {
  return (
    <svg
      width="370"
      height="390"
      viewBox="0 0 370 390"
      style={{
        position: 'absolute',
        ...(flip ? { bottom: -8, right: -8, transform: 'rotate(180deg)' } : { top: -8, left: -8 }),
      }}
    >
      {/* Background sage & mauve foliage sprigs */}
      <g>
        <path d="M 190 12 Q 245 35 285 8" stroke="#7A6D5D" strokeWidth="1.6" fill="none" />
        <ellipse cx="220" cy="20" rx="14" ry="5.5" fill="#B5834B" transform="rotate(-22 220 20)" />
        <ellipse cx="250" cy="18" rx="12" ry="5" fill="#C9995E" transform="rotate(15 250 18)" />
        <ellipse cx="272" cy="10" rx="10" ry="4" fill="#9A7248" transform="rotate(-10 272 10)" />

        {/* Mauve/plum pointed leaves */}
        <path d="M 165 40 Q 210 68 232 108 Q 190 88 165 40 Z" fill="#8C747E" opacity="0.88" />
        <path d="M 188 28 Q 240 48 265 82 Q 218 70 188 28 Z" fill="#A08992" opacity="0.82" />
        <path d="M 145 58 Q 185 95 198 135 Q 160 105 145 58 Z" fill="#77616B" opacity="0.85" />

        {/* Left-edge hanging sage leaves */}
        <path d="M 28 240 Q 12 290 22 340" stroke="#7D7565" strokeWidth="1.4" fill="none" />
        <ellipse cx="18" cy="272" rx="14" ry="5" fill="#8F947E" transform="rotate(-65 18 272)" />
        <ellipse cx="32" cy="296" rx="13" ry="4.5" fill="#A4A894" transform="rotate(55 32 296)" />
        <ellipse cx="20" cy="322" rx="11" ry="4" fill="#858A74" transform="rotate(-70 20 322)" />

        {/* Crimson / burgundy leaves */}
        <path d="M 55 185 Q 85 215 88 258 Q 52 232 55 185 Z" fill="#A43242" />
        <path d="M 35 198 Q 58 242 46 286 Q 20 250 35 198 Z" fill="#C2515E" opacity="0.9" />
        <path d="M 200 30 Q 240 36 258 58 Q 222 58 200 30 Z" fill="#9E2B3B" />

        {/* Olive/green leaves */}
        <path d="M 92 145 Q 130 155 152 178 Q 112 174 92 145 Z" fill="#7B7D5E" />
        <path d="M 122 105 Q 162 108 188 128 Q 145 128 122 105 Z" fill="#63694C" />
      </g>

      {/* Baby's breath tiny dots */}
      <g fill="#DFE4D5" stroke="#9AA48E" strokeWidth="0.6">
        <circle cx="115" cy="148" r="3.2" />
        <circle cx="126" cy="142" r="2.8" />
        <circle cx="122" cy="156" r="2.5" />
        <circle cx="136" cy="150" r="3" />
        <circle cx="96" cy="182" r="3" />
        <circle cx="106" cy="176" r="2.6" />
        <circle cx="102" cy="192" r="2.8" />
      </g>

      {/* Top-right peach dahlia */}
      <g transform="translate(175, 22)">
        {[0, 28, 56, 84, 112, 140, 168, 196, 224, 252, 280, 308, 336].map((a) => (
          <ellipse
            key={`pd1-${a}`}
            cx="0"
            cy="-26"
            rx="9"
            ry="22"
            fill="#F3CBB4"
            stroke="#DFAA8E"
            strokeWidth="0.7"
            transform={`rotate(${a})`}
          />
        ))}
        {[14, 42, 70, 98, 126, 154, 182, 210, 238, 266, 294, 322].map((a) => (
          <ellipse
            key={`pd2-${a}`}
            cx="0"
            cy="-16"
            rx="7"
            ry="15"
            fill="#EBB69B"
            transform={`rotate(${a})`}
          />
        ))}
        <circle cx="0" cy="0" r="9" fill="#D48D72" />
      </g>

      {/* Top-left large golden-yellow dahlia */}
      <g transform="translate(52, 34)">
        {[0, 24, 48, 72, 96, 120, 144, 168, 192, 216, 240, 264, 288, 312, 336].map((a) => (
          <ellipse
            key={`gd1-${a}`}
            cx="0"
            cy="-34"
            rx="10"
            ry="28"
            fill="#E8BC5E"
            stroke="#C89535"
            strokeWidth="0.8"
            transform={`rotate(${a})`}
          />
        ))}
        {[12, 36, 60, 84, 108, 132, 156, 180, 204, 228, 252, 276, 300, 324, 348].map((a) => (
          <ellipse
            key={`gd2-${a}`}
            cx="0"
            cy="-21"
            rx="7.5"
            ry="18"
            fill="#F4D27E"
            transform={`rotate(${a})`}
          />
        ))}
        <circle cx="0" cy="0" r="11" fill="#BD8228" />
      </g>

      {/* White/cream garden rose */}
      <g transform="translate(116, 70)">
        <circle cx="0" cy="0" r="32" fill="#F8F1EA" stroke="#E4D2C4" strokeWidth="1" />
        <ellipse cx="-10" cy="-6" rx="18" ry="14" fill="#EFE3D9" />
        <ellipse cx="10" cy="6" rx="17" ry="14" fill="#FBF7F2" />
        <circle cx="0" cy="0" r="14" fill="#E8CFC0" />
        <circle cx="-2" cy="-2" r="7" fill="#D7B29E" />
      </g>

      {/* Terracotta / dusty rose */}
      <g transform="translate(50, 100)">
        <circle cx="0" cy="0" r="30" fill="#CE8E74" stroke="#B06D54" strokeWidth="1" />
        <ellipse cx="-8" cy="-8" rx="16" ry="12" fill="#DFAA92" />
        <ellipse cx="8" cy="8" rx="15" ry="12" fill="#BA725A" />
        <circle cx="0" cy="0" r="13" fill="#A65A44" />
        <circle cx="0" cy="0" r="6" fill="#7D3828" />
      </g>

      {/* Deep crimson accent rose */}
      <g transform="translate(94, 118)">
        <circle cx="0" cy="0" r="20" fill="#A6382E" />
        <circle cx="-3" cy="-3" r="12" fill="#C45345" />
        <circle cx="0" cy="0" r="6" fill="#7A221C" />
      </g>

      {/* Left blush peach rose */}
      <g transform="translate(32, 162)">
        <circle cx="0" cy="0" r="32" fill="#F6D8C6" stroke="#E2B69E" strokeWidth="1" />
        <ellipse cx="8" cy="-8" rx="18" ry="14" fill="#FCE7DA" />
        <ellipse cx="-8" cy="8" rx="17" ry="13" fill="#EDC1AA" />
        <circle cx="0" cy="0" r="13" fill="#DFAA90" />
        <circle cx="2" cy="-1" r="6" fill="#C78A70" />
      </g>
    </svg>
  );
}

export function FloralCornerCard({ m }: { m: CardImageModel }) {
  const ink = '#3D3734';
  const muted = '#6B625D';
  const msgLines = lines(m.message);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        backgroundColor: '#FAF7F0',
        fontFamily: SANS,
        overflow: 'hidden',
      }}
    >
      <FloralCornerBouquet />
      <FloralCornerBouquet flip />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '130px 68px 110px',
          position: 'relative',
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 13,
            letterSpacing: 3.5,
            textTransform: 'uppercase',
            color: ink,
          }}
        >
          {m.eyebrow}
        </div>

        <div
          style={{
            display: 'flex',
            fontFamily: SERIF,
            fontSize: 28,
            letterSpacing: 3,
            color: ink,
            marginTop: 18,
            lineHeight: 1.25,
            maxWidth: 420,
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          {m.title}
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 12,
            letterSpacing: 3,
            fontStyle: 'italic',
            textTransform: 'uppercase',
            color: muted,
            marginTop: 22,
          }}
        >
          {`${invitedPrefix(m)} · ${m.guestName}`}
        </div>

        <div
          style={{
            display: 'flex',
            fontFamily: SCRIPT,
            fontSize: m.partnerB ? 66 : 78,
            lineHeight: 1.05,
            color: '#2B2624',
            marginTop: 18,
            textAlign: 'center',
            justifyContent: 'center',
          }}
        >
          {m.partnerB ? `${m.partnerA} & ${m.partnerB}` : m.partnerA}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: 22,
            gap: 4,
          }}
        >
          {m.dateLine ? (
            <div
              style={{
                display: 'flex',
                fontSize: 13,
                letterSpacing: 2.4,
                textTransform: 'uppercase',
                color: ink,
              }}
            >
              {`${m.dateLine}${m.timeLine ? ` - ${m.timeLine}` : ''}`}
            </div>
          ) : null}
          {m.venue ? (
            <div
              style={{
                display: 'flex',
                fontSize: 13,
                letterSpacing: 2.2,
                textTransform: 'uppercase',
                color: ink,
                marginTop: 6,
                maxWidth: 400,
                textAlign: 'center',
                justifyContent: 'center',
              }}
            >
              {m.venue}
            </div>
          ) : null}
        </div>

        {msgLines.length > 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginTop: 18,
              gap: 3,
            }}
          >
            {msgLines.slice(0, 3).map((l, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  fontSize: 12,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: muted,
                  maxWidth: 390,
                  textAlign: 'center',
                  justifyContent: 'center',
                }}
              >
                {l}
              </div>
            ))}
          </div>
        ) : null}

        {m.footer ? (
          <div
            style={{
              display: 'flex',
              fontSize: 12,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: ink,
              marginTop: 14,
            }}
          >
            {m.footer}
          </div>
        ) : null}

        {m.qrPath ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginTop: 22,
              padding: '8px 14px',
              backgroundColor: 'rgba(255,255,255,0.85)',
              border: '1px solid #DFD5C5',
              borderRadius: 8,
            }}
          >
            <Qr m={m} size={76} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', fontSize: 13, fontWeight: 700, letterSpacing: 2, color: ink }}>
                {m.shortCode}
              </div>
              <SeatTag m={m} color={ink} start />
              <div style={{ display: 'flex', fontSize: 10, color: muted, marginTop: 4 }}>
                {m.domain}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 18 }}>
            <div style={{ display: 'flex', fontSize: 12, fontWeight: 700, letterSpacing: 2, color: ink }}>
              {m.shortCode}
            </div>
            <SeatTag m={m} color={ink} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------
 * 2. Wildflower Arch — Gold geometric lattice arch frame with climbing blue, pink, yellow
 *    wildflowers and greenery vines on soft cream paper.
 * ---------------------------------------------------------------------------------------------- */
function WildflowerLatticeArt() {
  const gold = '#B29456';
  // Generate lattice ticks around the arch curve (cx=320, cy=318, rInner=200, rOuter=228)
  const archSegments = 18;
  const cx = 320;
  const cy = 318;
  const rIn = 200;
  const rOut = 228;
  const archCrosses: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 0; i < archSegments; i++) {
    const a1 = Math.PI + (i / archSegments) * Math.PI;
    const a2 = Math.PI + ((i + 1) / archSegments) * Math.PI;
    archCrosses.push({
      x1: cx + rIn * Math.cos(a1),
      y1: cy + rIn * Math.sin(a1),
      x2: cx + rOut * Math.cos(a2),
      y2: cy + rOut * Math.sin(a2),
    });
    archCrosses.push({
      x1: cx + rOut * Math.cos(a1),
      y1: cy + rOut * Math.sin(a1),
      x2: cx + rIn * Math.cos(a2),
      y2: cy + rIn * Math.sin(a2),
    });
  }
  // Vertical side lattice segments from y=318 to y=790
  const sideSteps = 14;
  const sideH = (790 - 318) / sideSteps;
  const bottomSteps = 12;
  const bottomW = (520 - 120) / bottomSteps;

  return (
    <svg
      width="640"
      height="940"
      viewBox="0 0 640 940"
      style={{ position: 'absolute', top: 0, left: 0 }}
    >
      {/* Outer & Inner Gold Arch Frame */}
      <g stroke={gold} strokeWidth="1.8" fill="none">
        <path d="M 92 795 L 92 318 A 228 228 0 0 1 548 318 L 548 795 Z" />
        <path d="M 120 767 L 120 318 A 200 200 0 0 1 520 318 L 520 767 Z" />
      </g>

      {/* Lattice crisscrosses */}
      <g stroke={gold} strokeWidth="1.1" opacity="0.85">
        {archCrosses.map((l, idx) => (
          <line key={`ac-${idx}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
        ))}
        {Array.from({ length: sideSteps }).map((_, i) => {
          const y1 = 318 + i * sideH;
          const y2 = y1 + sideH;
          return (
            <g key={`sc-${i}`}>
              <line x1={92} y1={y1} x2={120} y2={y2} />
              <line x1={120} y1={y1} x2={92} y2={y2} />
              <line x1={520} y1={y1} x2={548} y2={y2} />
              <line x1={548} y1={y1} x2={520} y2={y2} />
            </g>
          );
        })}
        {Array.from({ length: bottomSteps }).map((_, i) => {
          const x1 = 120 + i * bottomW;
          const x2 = x1 + bottomW;
          return (
            <g key={`bc-${i}`}>
              <line x1={x1} y1={767} x2={x2} y2={795} />
              <line x1={x2} y1={767} x2={x1} y2={795} />
            </g>
          );
        })}
      </g>

      {/* Climbing greenery vines */}
      <g stroke="#4E6F44" strokeWidth="1.8" fill="none">
        <path d="M 90 780 Q 65 650 86 500 Q 105 360 88 230 Q 130 130 220 96" />
        <path d="M 552 770 Q 575 630 554 480 Q 535 340 546 210 Q 510 120 430 98" />
        <path d="M 105 785 Q 190 806 270 792" />
      </g>

      {/* Leaf clusters along left & right */}
      <g fill="#5E8250">
        <ellipse cx="76" cy="242" rx="18" ry="6" transform="rotate(-40 76 242)" />
        <ellipse cx="102" cy="220" rx="16" ry="5.5" transform="rotate(30 102 220)" />
        <ellipse cx="64" cy="495" rx="20" ry="6.5" transform="rotate(-25 64 495)" />
        <ellipse cx="86" cy="525" rx="16" ry="5.5" transform="rotate(35 86 525)" />
        <ellipse cx="72" cy="645" rx="18" ry="6" transform="rotate(-35 72 645)" />
        <ellipse cx="566" cy="295" rx="18" ry="6" transform="rotate(35 566 295)" />
        <ellipse cx="540" cy="450" rx="16" ry="5.5" transform="rotate(-30 540 450)" />
        <ellipse cx="572" cy="680" rx="20" ry="6.5" transform="rotate(-45 572 680)" />
        <ellipse cx="545" cy="725" rx="18" ry="6" transform="rotate(25 545 725)" />
        <ellipse cx="515" cy="785" rx="18" ry="6" transform="rotate(-15 515 785)" />
      </g>

      {/* Blue wildflowers (left mid, right mid, right lower) */}
      {[
        { x: 78, y: 340, r: 24 },
        { x: 562, y: 405, r: 26 },
        { x: 536, y: 605, r: 24 },
      ].map((f, idx) => (
        <g key={`bf-${idx}`} transform={`translate(${f.x}, ${f.y})`}>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <ellipse
              key={a}
              cx="0"
              cy={-f.r * 0.55}
              rx={f.r * 0.28}
              ry={f.r * 0.52}
              fill="#9CB7DC"
              stroke="#7A99C4"
              strokeWidth="0.8"
              transform={`rotate(${a})`}
            />
          ))}
          <circle cx="0" cy="0" r={f.r * 0.24} fill="#5C769E" />
        </g>
      ))}

      {/* White daisy top-right */}
      <g transform="translate(500, 168)">
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((a) => (
          <ellipse
            key={a}
            cx="0"
            cy="-20"
            rx="7"
            ry="18"
            fill="#F3EFE6"
            stroke="#D6CFC2"
            strokeWidth="0.7"
            transform={`rotate(${a})`}
          />
        ))}
        <circle cx="0" cy="0" r="9" fill="#B8974E" />
      </g>

      {/* Pink cosmos & rosebuds */}
      {[
        { x: 242, y: 84, r: 12 },
        { x: 300, y: 80, r: 11 },
        { x: 565, y: 318, r: 13 },
        { x: 536, y: 492, r: 14 },
        { x: 64, y: 740, r: 18 },
      ].map((f, idx) => (
        <g key={`pf-${idx}`} transform={`translate(${f.x}, ${f.y})`}>
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <ellipse
              key={a}
              cx="0"
              cy={-f.r * 0.55}
              rx={f.r * 0.34}
              ry={f.r * 0.55}
              fill="#E8A9B2"
              stroke="#CF8692"
              strokeWidth="0.6"
              transform={`rotate(${a})`}
            />
          ))}
          <circle cx="0" cy="0" r={f.r * 0.24} fill="#C97380" />
        </g>
      ))}

      {/* Golden yellow buttercups */}
      {[
        { x: 152, y: 188, r: 11 },
        { x: 486, y: 536, r: 13 },
        { x: 432, y: 766, r: 12 },
        { x: 408, y: 790, r: 10 },
      ].map((f, idx) => (
        <g key={`yf-${idx}`} transform={`translate(${f.x}, ${f.y})`}>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse
              key={a}
              cx="0"
              cy={-f.r * 0.52}
              rx={f.r * 0.38}
              ry={f.r * 0.52}
              fill="#E8AC3C"
              transform={`rotate(${a})`}
            />
          ))}
          <circle cx="0" cy="0" r={f.r * 0.25} fill="#A66D1A" />
        </g>
      ))}
    </svg>
  );
}

export function WildflowerArchCard({ m }: { m: CardImageModel }) {
  const goldInk = '#7E6D41';
  const ink = '#33312E';
  const muted = '#5E5A52';
  const msgLines = lines(m.message);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        backgroundColor: '#F9F7F2',
        fontFamily: SANS,
        overflow: 'hidden',
      }}
    >
      <WildflowerLatticeArt />

      {/* Content inside the arch */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '175px 145px 0',
          position: 'relative',
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 11,
            letterSpacing: 2.5,
            textTransform: 'uppercase',
            color: ink,
          }}
        >
          {m.eyebrow}
        </div>

        <div
          style={{
            display: 'flex',
            fontFamily: SERIF,
            fontStyle: 'italic',
            fontSize: 18,
            color: muted,
            marginTop: 14,
          }}
        >
          {m.guestName}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            fontFamily: SERIF,
            fontSize: m.partnerB ? 36 : 42,
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: goldInk,
            lineHeight: 1.15,
            marginTop: 18,
            textAlign: 'center',
          }}
        >
          <span>{m.partnerA}</span>
          {m.partnerB ? <span>{`AND ${m.partnerB}`}</span> : null}
        </div>

        {m.title ? (
          <div
            style={{
              display: 'flex',
              fontSize: 11,
              letterSpacing: 2.2,
              textTransform: 'uppercase',
              color: ink,
              marginTop: 18,
              maxWidth: 320,
              textAlign: 'center',
              justifyContent: 'center',
            }}
          >
            {m.title}
          </div>
        ) : null}

        {m.dateLine ? (
          <div
            style={{
              display: 'flex',
              fontFamily: SERIF,
              fontSize: 22,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: ink,
              marginTop: 20,
            }}
          >
            {m.dateLine}
          </div>
        ) : null}

        {m.timeLine ? (
          <div
            style={{
              display: 'flex',
              fontSize: 11,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: muted,
              marginTop: 10,
            }}
          >
            {m.timeLine}
          </div>
        ) : null}

        {m.venue ? (
          <div
            style={{
              display: 'flex',
              fontSize: 11,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: ink,
              marginTop: 10,
              maxWidth: 320,
              textAlign: 'center',
              justifyContent: 'center',
            }}
          >
            {m.venue}
          </div>
        ) : null}

        {msgLines.slice(0, 2).map((l, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              fontSize: 10,
              letterSpacing: 1.8,
              textTransform: 'uppercase',
              color: muted,
              marginTop: i === 0 ? 12 : 3,
              maxWidth: 320,
              textAlign: 'center',
              justifyContent: 'center',
            }}
          >
            {l}
          </div>
        ))}

        {m.qrPath ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginTop: 20,
              padding: 8,
              backgroundColor: '#FFFFFF',
              border: '1px solid #D9CEB8',
              borderRadius: 6,
            }}
          >
            <Qr m={m} size={76} />
            <div style={{ display: 'flex', fontSize: 11, fontWeight: 700, letterSpacing: 2, color: ink, marginTop: 4 }}>
              {m.shortCode}
            </div>
            <SeatTag m={m} color={ink} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 18 }}>
            <div style={{ display: 'flex', fontSize: 12, fontWeight: 700, letterSpacing: 2, color: ink }}>
              {m.shortCode}
            </div>
            <SeatTag m={m} color={ink} />
          </div>
        )}
      </div>

      {/* Footer below the arch */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingBottom: 54,
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontFamily: SERIF,
            fontStyle: 'italic',
            fontSize: 18,
            color: ink,
          }}
        >
          {m.footer || m.domain}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------
 * 3. Mandala Arch — Gold mandala & hanging feathers canopy above a crisp white Mughal/ogee
 *    arch with double gold border, staggered italic names, pipe-separated date, bottom QR.
 * ---------------------------------------------------------------------------------------------- */
function MandalaFeatherArt() {
  const gold = '#B89B5E';
  const featherDark = '#8E6F34';
  const featherLight = '#BD9C56';
  const spokes = Array.from({ length: 18 }).map((_, i) => (i * 180) / 18);

  return (
    <svg
      width="640"
      height="940"
      viewBox="0 0 640 940"
      style={{ position: 'absolute', top: 0, left: 0 }}
    >
      {/* Top Mandala Canopy */}
      <g stroke={gold} fill="none" opacity="0.65">
        <circle cx="320" cy="40" r="185" strokeWidth="1.2" />
        <circle cx="320" cy="40" r="158" strokeWidth="1" strokeDasharray="4 4" />
        <circle cx="320" cy="40" r="130" strokeWidth="1.4" />
        <circle cx="320" cy="40" r="95" strokeWidth="1" />
        {spokes.map((deg) => (
          <line
            key={`sp-${deg}`}
            x1="320"
            y1="40"
            x2={320 + 185 * Math.cos((deg * Math.PI) / 180)}
            y2={40 + 185 * Math.sin((deg * Math.PI) / 180)}
            strokeWidth="0.8"
          />
        ))}
        {/* Side half-mandalas */}
        <circle cx="60" cy="20" r="120" strokeWidth="1" />
        <circle cx="60" cy="20" r="90" strokeWidth="0.8" strokeDasharray="3 4" />
        <circle cx="580" cy="20" r="120" strokeWidth="1" />
        <circle cx="580" cy="20" r="90" strokeWidth="0.8" strokeDasharray="3 4" />
      </g>

      {/* Hanging Feathers (left and right) */}
      {[
        { x: 24, y: 110, h: 120 },
        { x: 82, y: 62, h: 95 },
        { x: 140, y: 40, h: 72 },
        { x: 500, y: 40, h: 72 },
        { x: 558, y: 62, h: 95 },
        { x: 616, y: 110, h: 120 },
      ].map((ft, idx) => (
        <g key={`ft-${idx}`} transform={`translate(${ft.x}, ${ft.y})`}>
          <line x1="0" y1="-45" x2="0" y2={ft.h} stroke={gold} strokeWidth="1" />
          <circle cx="0" cy="-10" r="4" fill={gold} />
          <path
            d={`M 0 0 Q -16 ${ft.h * 0.4} 0 ${ft.h} Q 16 ${ft.h * 0.4} 0 0 Z`}
            fill={idx % 2 === 0 ? featherDark : featherLight}
          />
          <line x1="0" y1="0" x2="0" y2={ft.h} stroke="#FBF6E8" strokeWidth="1" opacity="0.6" />
        </g>
      ))}

      {/* Scalloped Mughal Arch Card */}
      <path
        d="M 56 940 L 56 268 Q 56 218 112 214 L 166 210 Q 190 156 246 142 Q 290 130 320 92 Q 350 130 394 142 Q 450 156 474 210 L 528 214 Q 584 218 584 268 L 584 940 Z"
        fill="#FFFFFF"
        stroke="#A48642"
        strokeWidth="3"
      />
      <path
        d="M 76 940 L 76 276 Q 76 236 126 232 L 178 228 Q 200 176 252 162 Q 294 150 320 116 Q 346 150 388 162 Q 440 176 462 228 L 514 232 Q 564 236 564 276 L 564 940"
        fill="none"
        stroke="#C7AD6A"
        strokeWidth="1.5"
      />

      {/* Bottom Corner Flourishes */}
      <g stroke="#B89B5E" strokeWidth="1.4" fill="none" opacity="0.55">
        <path d="M 105 900 Q 105 810 175 810 Q 210 810 210 845 Q 210 872 180 872 Q 162 872 162 854" />
        <path d="M 105 900 Q 160 905 220 885" />
        <path d="M 535 900 Q 535 810 465 810 Q 430 810 430 845 Q 430 872 460 872 Q 478 872 478 854" />
        <path d="M 535 900 Q 480 905 420 885" />
      </g>
    </svg>
  );
}

export function MandalaArchCard({ m }: { m: CardImageModel }) {
  const bronze = '#5E4923';
  const ink = '#3D3832';
  const muted = '#6E665A';
  const msgLines = lines(m.message);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        backgroundColor: '#FCF9EE',
        fontFamily: SERIF,
        overflow: 'hidden',
      }}
    >
      <MandalaFeatherArt />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '175px 104px 36px',
          position: 'relative',
          width: '100%',
          height: '100%',
          justifyContent: 'space-between',
        }}
      >
        {/* Top Title */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              fontSize: 12,
              fontFamily: SANS,
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: '#9C8042',
            }}
          >
            {m.eyebrow}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 28,
              fontWeight: 700,
              color: bronze,
              marginTop: 8,
              maxWidth: 360,
              lineHeight: 1.15,
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            {m.title}
          </div>
        </div>

        {/* Staggered Couple Names with subtle watermark & */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontStyle: 'italic',
              fontSize: 34,
              color: ink,
              alignSelf: m.partnerB ? 'flex-start' : 'center',
              paddingLeft: m.partnerB ? 24 : 0,
            }}
          >
            {m.partnerA}
          </div>
          {m.partnerB ? (
            <div
              style={{
                display: 'flex',
                fontSize: 56,
                fontStyle: 'italic',
                color: '#E8E4DC',
                margin: '-18px 0',
              }}
            >
              &amp;
            </div>
          ) : null}
          {m.partnerB ? (
            <div
              style={{
                display: 'flex',
                fontStyle: 'italic',
                fontSize: 34,
                color: ink,
                alignSelf: 'flex-end',
                paddingRight: 24,
              }}
            >
              {m.partnerB}
            </div>
          ) : null}
        </div>

        {/* Date, Day, Venue, Guest */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {m.dateLine ? (
            <div
              style={{
                display: 'flex',
                fontSize: 20,
                letterSpacing: 3,
                color: ink,
              }}
            >
              {m.dateLine}
            </div>
          ) : null}
          {m.timeLine ? (
            <div
              style={{
                display: 'flex',
                fontSize: 12,
                fontFamily: SANS,
                letterSpacing: 2.5,
                textTransform: 'uppercase',
                color: muted,
                marginTop: 8,
              }}
            >
              {m.timeLine}
            </div>
          ) : null}
          <div
            style={{
              display: 'flex',
              fontSize: 13,
              fontFamily: SANS,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: bronze,
              marginTop: 12,
            }}
          >
            {m.guestName}
          </div>
          {m.venue ? (
            <div
              style={{
                display: 'flex',
                fontSize: 12,
                fontFamily: SANS,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                color: ink,
                marginTop: 12,
                maxWidth: 380,
                justifyContent: 'center',
                textAlign: 'center',
              }}
            >
              {m.venue}
            </div>
          ) : null}
          {msgLines.slice(0, 2).map((l, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                fontSize: 11,
                fontFamily: SANS,
                letterSpacing: 1.2,
                color: muted,
                marginTop: i === 0 ? 10 : 2,
                maxWidth: 380,
                justifyContent: 'center',
                textAlign: 'center',
              }}
            >
              {l}
            </div>
          ))}
        </div>

        {/* Bottom QR + Footer */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {m.qrPath ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Qr m={m} size={92} />
              <div
                style={{
                  display: 'flex',
                  fontSize: 11,
                  fontFamily: SANS,
                  fontWeight: 700,
                  letterSpacing: 2,
                  color: ink,
                  marginTop: 6,
                }}
              >
                {m.shortCode}
              </div>
              <SeatTag m={m} color={ink} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ display: 'flex', fontSize: 12, fontWeight: 700, letterSpacing: 2, color: ink }}>
                {m.shortCode}
              </div>
              <SeatTag m={m} color={ink} />
            </div>
          )}
          <div
            style={{
              display: 'flex',
              fontSize: 11,
              fontFamily: SANS,
              letterSpacing: 1.8,
              textTransform: 'uppercase',
              color: muted,
              marginTop: 8,
            }}
          >
            {m.footer || m.domain}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------
 * 4. Marigold Garland — Banana leaf & marigold/jasmine hanging garlands, cusped gold arch
 *    with Ganesha emblem, maroon script names, and sacred fire wedding couple illustration.
 * ---------------------------------------------------------------------------------------------- */
function MarigoldGarlandArt() {
  const gold = '#9E7B30';
  const marigoldY = Array.from({ length: 17 }).map((_, i) => 78 + i * 33);

  return (
    <svg
      width="640"
      height="940"
      viewBox="0 0 640 940"
      style={{ position: 'absolute', top: 0, left: 0 }}
    >
      {/* Top-Left & Top-Right Banana Leaves */}
      <g>
        <path d="M 0 0 L 270 0 Q 210 55 150 40 Q 95 130 35 160 L 0 210 Z" fill="#3B7A28" />
        <path d="M 0 0 L 210 0 Q 160 40 110 30 Q 65 95 25 125 L 0 165 Z" fill="#529438" />
        <path d="M 640 0 L 370 0 Q 430 55 490 40 Q 545 130 605 160 L 640 210 Z" fill="#3B7A28" />
        <path d="M 640 0 L 430 0 Q 480 40 530 30 Q 575 95 615 125 L 640 165 Z" fill="#529438" />
        {/* Side banana leaves */}
        <path d="M 35 320 Q 82 370 62 490 Q 32 450 28 380 Z" fill="#468530" />
        <path d="M 605 320 Q 558 370 578 490 Q 608 450 612 380 Z" fill="#468530" />
      </g>

      {/* Hanging Marigold & Jasmine Garlands (Left & Right) */}
      {marigoldY.map((y, idx) => (
        <g key={`mg-${idx}`}>
          {/* Left outer jasmine + inner marigold */}
          <circle cx="18" cy={y} r="9" fill="#FFFFFF" stroke="#E0DCD0" strokeWidth="1" />
          <circle cx="52" cy={y - 10} r="12" fill={idx % 2 === 0 ? '#EB6D14' : '#F6931E'} />
          <circle cx="52" cy={y - 10} r="5" fill="#FECA4C" />
          {idx < 7 ? (
            <circle cx="84" cy={y - 4} r="8" fill="#FFFFFF" stroke="#E0DCD0" strokeWidth="1" />
          ) : null}

          {/* Right outer jasmine + inner marigold */}
          <circle cx="622" cy={y} r="9" fill="#FFFFFF" stroke="#E0DCD0" strokeWidth="1" />
          <circle cx="588" cy={y - 10} r="12" fill={idx % 2 === 0 ? '#EB6D14' : '#F6931E'} />
          <circle cx="588" cy={y - 10} r="5" fill="#FECA4C" />
          {idx < 7 ? (
            <circle cx="556" cy={y - 4} r="8" fill="#FFFFFF" stroke="#E0DCD0" strokeWidth="1" />
          ) : null}
        </g>
      ))}

      {/* Top corner marigold & white jasmine clusters */}
      {[
        { x: 42, y: 24, c: '#EB6D14' },
        { x: 76, y: 18, c: '#F6931E' },
        { x: 112, y: 38, c: '#EB6D14' },
        { x: 175, y: 16, c: '#EB6D14' },
        { x: 598, y: 24, c: '#EB6D14' },
        { x: 564, y: 18, c: '#F6931E' },
        { x: 528, y: 38, c: '#EB6D14' },
        { x: 465, y: 16, c: '#EB6D14' },
      ].map((fl, i) => (
        <g key={`tc-${i}`}>
          <circle cx={fl.x} cy={fl.y} r="16" fill={fl.c} />
          <circle cx={fl.x} cy={fl.y} r="7" fill="#FFC845" />
        </g>
      ))}

      {/* Bottom Corner Banana Leaves & Marigolds */}
      <g>
        <path d="M 0 940 L 0 650 Q 50 720 65 820 L 140 940 Z" fill="#3B7A28" />
        <path d="M 640 940 L 640 650 Q 590 720 575 820 L 500 940 Z" fill="#3B7A28" />
        <circle cx="32" cy="835" r="16" fill="#EB6D14" />
        <circle cx="60" cy="882" r="14" fill="#F6931E" />
        <circle cx="28" cy="785" r="11" fill="#FFFFFF" stroke="#DDD" strokeWidth="1" />
        <circle cx="608" cy="835" r="16" fill="#EB6D14" />
        <circle cx="580" cy="882" r="14" fill="#F6931E" />
        <circle cx="612" cy="785" r="11" fill="#FFFFFF" stroke="#DDD" strokeWidth="1" />
      </g>

      {/* Cusped Gold Arch Frame */}
      <path
        d="M 100 735 L 100 260 Q 100 222 140 212 Q 146 168 198 156 Q 216 116 266 106 Q 294 64 320 42 Q 346 64 374 106 Q 424 116 442 156 Q 494 168 500 212 Q 540 222 540 260 L 540 735"
        fill="none"
        stroke={gold}
        strokeWidth="2.5"
      />
      <path
        d="M 108 735 L 108 264 Q 108 230 146 220 Q 152 178 204 166 Q 222 126 270 116 Q 296 76 320 56 Q 344 76 370 116 Q 418 126 436 166 Q 488 178 494 220 Q 532 230 532 264 L 532 735"
        fill="none"
        stroke={gold}
        strokeWidth="1.2"
      />

      {/* Side gold flourishes outside arch */}
      <g stroke={gold} strokeWidth="1.5" fill="none">
        <path d="M 80 480 Q 68 525 82 570" />
        <path d="M 560 480 Q 572 525 558 570" />
      </g>

      {/* Ganesha Emblem at top apex */}
      <g transform="translate(320, 108)" stroke="#8B6622" strokeWidth="2.2" fill="none">
        <path d="M -12 -14 Q 0 -24 12 -14" />
        <path d="M -18 -2 Q -24 10 -12 14" />
        <path d="M 18 -2 Q 24 10 12 14" />
        <path d="M -6 2 Q 0 18 10 18 Q 16 18 14 10" />
        <circle cx="0" cy="-6" r="8" fill="#8B6622" opacity="0.2" />
      </g>

      {/* Sacred Fire (Havan Kund), Diyas, and Wedding Couple at Bottom */}
      <g transform="translate(320, 810)">
        {/* Groom (left) */}
        <g transform="translate(-52, -25)">
          {/* Dhoti / Kurta */}
          <path d="M -32 70 Q -36 10 -8 0 L 18 5 Q 28 35 18 70 Z" fill="#FBF8F2" stroke="#D8CEBE" strokeWidth="1.2" />
          {/* Head & Hair */}
          <circle cx="4" cy="-16" r="14" fill="#E6B89C" />
          <path d="M -10 -18 Q -8 -34 10 -32 Q 20 -26 16 -14 Q 8 -24 -10 -18 Z" fill="#231D1A" />
          {/* Garland */}
          <path d="M -6 2 Q 4 38 14 4" stroke="#C93B2B" strokeWidth="4" fill="none" />
          <path d="M -4 4 Q 4 34 12 6" stroke="#F4A424" strokeWidth="2" fill="none" />
        </g>

        {/* Bride (right) */}
        <g transform="translate(34, -10)">
          {/* Red & Gold Saree */}
          <path d="M -28 55 Q -22 -4 4 -8 L 28 2 Q 48 34 44 55 Z" fill="#C41E22" stroke="#8C1014" strokeWidth="1" />
          <path d="M -10 -4 Q 10 24 38 44" stroke="#E8B84B" strokeWidth="2.5" fill="none" />
          {/* Head & Hair */}
          <circle cx="0" cy="-22" r="13" fill="#EBBFA6" />
          <path d="M -12 -24 Q -6 -38 10 -34 Q 18 -24 14 -10 Q 8 -22 -12 -24 Z" fill="#231D1A" />
          <circle cx="14" cy="-20" r="5" fill="#F5F5F0" />
          {/* Garland */}
          <path d="M -8 -6 Q 0 22 10 -4" stroke="#F4A424" strokeWidth="3.5" fill="none" />
        </g>

        {/* Havan Kund (Sacred Fire Altar) */}
        <g transform="translate(0, 62)">
          <polygon points="-46,16 46,16 56,36 -56,36" fill="#B84220" stroke="#E0A642" strokeWidth="2" />
          <rect x="-64" y="36" width="128" height="12" rx="2" fill="#9E3316" stroke="#E0A642" strokeWidth="1.5" />
          {/* Flames */}
          <path d="M -18 16 Q -12 -14 0 -24 Q 12 -14 18 16 Z" fill="#F5821F" />
          <path d="M -10 16 Q 0 -6 10 16 Z" fill="#FFD23F" />
        </g>

        {/* Brass Oil Lamps (Diyas) */}
        {[-128, 128].map((dx, i) => (
          <g key={`diya-${i}`} transform={`translate(${dx}, 68)`}>
            <rect x="-14" y="20" width="28" height="6" rx="2" fill="#B58932" />
            <line x1="0" y1="-10" x2="0" y2="20" stroke="#C79B3E" strokeWidth="4" />
            <polygon points="-14,-10 14,-10 8,-2 -8,-2" fill="#D4AA4A" />
            <path d="M -3 -12 Q 0 -24 3 -12 Z" fill="#FFA826" />
          </g>
        ))}
      </g>
    </svg>
  );
}

export function MarigoldGarlandCard({ m }: { m: CardImageModel }) {
  const maroon = '#5E1A22';
  const goldInk = '#8A6724';
  const ink = '#2B2118';
  const muted = '#5C4D3C';
  const msgLines = lines(m.message);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        backgroundColor: '#FBF8F0',
        fontFamily: SERIF,
        overflow: 'hidden',
      }}
    >
      <MarigoldGarlandArt />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '148px 124px 0',
          position: 'relative',
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 13,
            lineHeight: 1.4,
            color: ink,
            maxWidth: 340,
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          {m.eyebrow}
        </div>

        {/* Couple Names */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: 14,
          }}
        >
          <div
            style={{
              display: 'flex',
              fontFamily: SCRIPT,
              fontSize: 58,
              lineHeight: 1,
              color: maroon,
            }}
          >
            {m.partnerA}
          </div>
          {m.partnerB ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontFamily: SERIF,
                fontStyle: 'italic',
                fontSize: 22,
                color: goldInk,
                margin: '2px 0',
              }}
            >
              <span>—</span>
              <span>{m.locale === 'sw' ? 'Na' : 'Weds'}</span>
              <span>—</span>
            </div>
          ) : null}
          {m.partnerB ? (
            <div
              style={{
                display: 'flex',
                fontFamily: SCRIPT,
                fontSize: 58,
                lineHeight: 1,
                color: maroon,
              }}
            >
              {m.partnerB}
            </div>
          ) : null}
        </div>

        {/* Venue & Date */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 18 }}>
          <div style={{ display: 'flex', fontSize: 20, fontWeight: 700, color: maroon }}>
            {m.locale === 'sw' ? 'Ukumbi' : 'Venue'}
          </div>
          {m.dateLine ? (
            <div style={{ display: 'flex', fontSize: 14, color: ink, marginTop: 4 }}>{m.dateLine}</div>
          ) : null}
          {m.venue ? (
            <div
              style={{
                display: 'flex',
                fontSize: 14,
                color: ink,
                marginTop: 2,
                maxWidth: 350,
                justifyContent: 'center',
                textAlign: 'center',
              }}
            >
              {m.venue}
            </div>
          ) : null}
        </div>

        {/* Time / Title */}
        {(m.timeLine || m.title) ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 14 }}>
            <div style={{ display: 'flex', fontSize: 18, fontWeight: 700, color: maroon }}>
              {m.title || (m.locale === 'sw' ? 'Chakula cha Jioni' : 'Dinner')}
            </div>
            {m.timeLine ? (
              <div style={{ display: 'flex', fontSize: 14, color: ink, marginTop: 2 }}>{m.timeLine}</div>
            ) : null}
          </div>
        ) : null}

        {/* Ornamental divider */}
        <div
          style={{
            display: 'flex',
            width: 120,
            height: 1.5,
            backgroundColor: goldInk,
            opacity: 0.55,
            margin: '14px 0 10px',
          }}
        />

        <div
          style={{
            display: 'flex',
            fontSize: 12,
            color: muted,
            maxWidth: 350,
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          {msgLines[0] || `${m.guestName}`}
        </div>
        {m.footer ? (
          <div
            style={{
              display: 'flex',
              fontSize: 11,
              color: muted,
              marginTop: 4,
              maxWidth: 350,
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            {m.footer}
          </div>
        ) : null}
      </div>

      {/* Optional QR badge cleanly placed at bottom-right above corner leaves */}
      {m.qrPath ? (
        <div
          style={{
            position: 'absolute',
            bottom: 24,
            right: 24,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: 6,
            backgroundColor: 'rgba(255,255,255,0.94)',
            border: '1.5px solid #9E7B30',
            borderRadius: 8,
          }}
        >
          <Qr m={m} size={64} />
          <div style={{ display: 'flex', fontSize: 10, fontFamily: SANS, fontWeight: 700, color: ink, marginTop: 3 }}>
            {m.shortCode}
          </div>
          <SeatTag m={m} color={ink} />
        </div>
      ) : null}
    </div>
  );
}
