import type { CustomCardDesign } from '@harusi/schemas';
import { defaultCustomElements } from '@harusi/schemas';
import { SeatTag, type CardImageModel } from './templates';
import {
  CARD_H,
  CARD_W,
  QR_SIZE,
  SANS,
  elementBox,
  elementText,
  elementTextStyle,
  imageSizeOf,
  safeImageSrc,
  type CardTextContext,
} from './custom-layout';

function QrBlock({ m, size = QR_SIZE }: { m: CardImageModel; size?: number }) {
  if (!m.qrPath) return null;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${m.qrDim} ${m.qrDim}`}
        shapeRendering="crispEdges"
        style={{ backgroundColor: '#FFFFFF' }}
      >
        <path d={m.qrPath} fill="#000000" />
      </svg>
      {m.shortCode ? (
        <div
          style={{
            display: 'flex',
            fontFamily: SANS,
            fontSize: 16,
            fontWeight: 800,
            letterSpacing: 2,
            color: '#1C1917',
            marginTop: 6,
          }}
        >
          {m.shortCode}
        </div>
      ) : null}
      <SeatTag m={m} color="#1C1917" />
    </div>
  );
}

function DiamondDivider({ color }: { color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={80} height={14} viewBox="0 0 80 14" style={{ display: 'flex' }}>
        <path d="M0 7 L32 7" stroke={color} strokeWidth={1} opacity={0.6} />
        <path d="M40 0 L46 7 L40 14 L34 7 Z" fill={color} />
        <path d="M48 7 L80 7" stroke={color} strokeWidth={1} opacity={0.6} />
      </svg>
    </div>
  );
}

/**
 * The `custom` design: the organiser's drag-and-drop elements, background, frame and fonts from the
 * Card Studio. Geometry and wording come from `custom-layout`, which the studio canvas also uses, so
 * the image matches the editor.
 */
export function CustomCard({ m }: { m: CardImageModel }) {
  const custom: CustomCardDesign = m.custom ?? {};
  const elements =
    custom.elements && custom.elements.length > 0 ? custom.elements : defaultCustomElements();

  const p = m.palette;
  const textColor = custom.textColor || p.ink;
  const accentColor = custom.accentColor || p.accent || '#E8B66B';

  const bg = custom.background;
  const bgImage = bg?.type === 'image' ? safeImageSrc(bg.imageUrl) : null;
  let bgStyle: Record<string, string | number> = { backgroundColor: bg?.color || '#FAF7F2' };
  if (bg?.type === 'gradient' && bg.gradient) bgStyle = { backgroundImage: bg.gradient };
  else if (bgImage) bgStyle = { backgroundColor: '#1C1917' };

  const frame = custom.frame;
  const showFrame = frame?.show !== false;
  const frameStyle = frame?.style ?? 'double';
  const frameColor = frame?.color || accentColor;
  const frameWidth = frame?.width ?? 2;
  const frameInset = frame?.inset ?? 24;

  const ctx: CardTextContext = {
    locale: m.locale,
    eyebrow: m.eyebrow,
    couple: m.partnerB ? `${m.partnerA} & ${m.partnerB}` : m.partnerA,
    title: m.title,
    message: m.message,
    footer: m.footer,
    guestName: m.guestName,
    dateLine: `${m.dateLine}${m.timeLine ? ` · ${m.timeLine}` : ''}`,
    venue: m.venue,
    dress: m.dress,
    sender: m.sender,
    phone: m.phone,
  };

  return (
    <div
      style={{
        width: CARD_W,
        height: CARD_H,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: SANS,
        color: textColor,
        ...bgStyle,
      }}
    >
      {bgImage ? (
        <img
          src={bgImage}
          alt=""
          width={CARD_W}
          height={CARD_H}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: CARD_W,
            height: CARD_H,
            objectFit: 'cover',
          }}
        />
      ) : null}
      {bgImage && bg?.overlayOpacity ? (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: CARD_W,
            height: CARD_H,
            display: 'flex',
            backgroundColor: '#000000',
            opacity: bg.overlayOpacity / 100,
          }}
        />
      ) : null}

      {showFrame && frameStyle !== 'none' ? (
        <div
          style={{
            position: 'absolute',
            top: frameInset,
            left: frameInset,
            width: CARD_W - frameInset * 2,
            height: CARD_H - frameInset * 2,
            display: 'flex',
            border: `${frameWidth}px ${frameStyle === 'dashed' ? 'dashed' : 'solid'} ${frameColor}`,
            borderRadius: 8,
          }}
        >
          {frameStyle === 'double' ? (
            <div
              style={{
                position: 'absolute',
                top: 4,
                left: 4,
                width: CARD_W - frameInset * 2 - frameWidth * 2 - 8,
                height: CARD_H - frameInset * 2 - frameWidth * 2 - 8,
                display: 'flex',
                border: `1px solid ${frameColor}`,
                opacity: 0.6,
                borderRadius: 5,
              }}
            />
          ) : null}
        </div>
      ) : null}

      {elements
        .filter((el) => el.visible !== false)
        .map((el, i) => ({ el, i }))
        // Later in the list (or a higher zIndex) is drawn on top, as in the studio.
        .sort((a, b) => (a.el.zIndex ?? 0) - (b.el.zIndex ?? 0) || a.i - b.i)
        .map(({ el }) => {
          let inner = null;
          if (el.type === 'divider') {
            inner = <DiamondDivider color={el.color || accentColor} />;
          } else if (el.type === 'qr') {
            inner = <QrBlock m={m} />;
          } else if (el.type === 'image') {
            const src = safeImageSrc(el.imageUrl);
            if (!src) return null;
            const { width, height } = imageSizeOf(el);
            inner = (
              <img
                src={src}
                alt={el.imageAlt || ''}
                width={width}
                height={height}
                style={{
                  width,
                  height,
                  objectFit: 'cover',
                  borderRadius: el.borderRadius ?? 8,
                  opacity: el.opacity !== undefined ? el.opacity / 100 : 1,
                }}
              />
            );
          } else {
            const text = elementText(el, ctx);
            if (!text) return null;
            const s = elementTextStyle(el, { text: textColor, accent: accentColor });
            inner = (
              <div
                style={{
                  display: 'flex',
                  fontFamily: s.fontFamily,
                  fontSize: s.fontSize,
                  fontWeight: s.fontWeight,
                  fontStyle: s.fontStyle,
                  color: s.color,
                  letterSpacing: s.letterSpacing,
                  textTransform: s.textTransform,
                  textAlign: s.textAlign,
                  lineHeight: s.lineHeight,
                  ...(s.maxWidth ? { maxWidth: s.maxWidth } : {}),
                }}
              >
                {text}
              </div>
            );
          }
          if (!inner) return null;

          const box = elementBox(el);
          return (
            <div
              key={el.id}
              style={{
                position: 'absolute',
                top: box.top,
                left: box.left,
                width: box.width,
                display: 'flex',
                justifyContent: box.justify,
              }}
            >
              {inner}
            </div>
          );
        })}

      <div
        style={{
          position: 'absolute',
          bottom: 12,
          right: 32,
          display: 'flex',
          fontSize: 11,
          fontWeight: 700,
          color: accentColor,
          opacity: 0.8,
        }}
      >
        {m.domain}
      </div>
    </div>
  );
}
