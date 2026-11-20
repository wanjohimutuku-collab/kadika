'use client';

import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Move } from 'lucide-react';
import type { CustomCardDesign, CustomElement } from '@harusi/schemas';
import { QrBlock } from '@/components/ui/qr-block';
import {
  CARD_H,
  CARD_W,
  elementBox,
  elementText,
  elementTextStyle,
  imageSizeOf,
  type CardTextContext,
} from '@/lib/card-image/custom-layout';
import { type StudioEventData } from './types';

interface CardCanvasViewProps {
  design: CustomCardDesign;
  event: StudioEventData;
  activeElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, patch: Partial<CustomElement>) => void;
  onDeleteElement?: (id: string) => void;
  locale: 'sw' | 'en';
}

export function CardCanvasView({
  design,
  event,
  activeElementId,
  onSelectElement,
  onUpdateElement,
  onDeleteElement: _onDeleteElement,
  locale,
}: CardCanvasViewProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [_isDragging, setIsDragging] = useState(false);
  const [showCenterGuide, setShowCenterGuide] = useState(false);

  // Background resolution
  const bg = design.background;
  let bgStyle: React.CSSProperties = {
    backgroundColor: bg?.color || '#FAF7F2',
  };
  if (bg?.type === 'gradient' && bg.gradient) {
    bgStyle = { background: bg.gradient };
  } else if (bg?.type === 'color' && bg.color) {
    bgStyle = { backgroundColor: bg.color };
  } else if (bg?.type === 'image' && bg.imageUrl) {
    bgStyle = {
      backgroundImage: `url(${bg.imageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }

  // Frame resolution
  const frame = design.frame;
  const showFrame = frame?.show !== false;
  const frameStyle = frame?.style ?? 'double';
  const frameColor = frame?.color || design.accentColor || '#C5A059';
  const frameWidth = frame?.width ?? 2;
  const frameInset = frame?.inset ?? 16;

  const textColor = design.textColor || '#1C1917';
  const accentColor = design.accentColor || '#C5A059';

  const couple = event.partnerB ? `${event.partnerA} & ${event.partnerB}` : event.partnerA;
  const fullDate = event.dateStart
    ? new Date(event.dateStart).toLocaleDateString(locale === 'sw' ? 'sw-TZ' : 'en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

  // Pointer Drag Handler for Elements
  const handlePointerDown = (
    e: ReactPointerEvent<HTMLDivElement>,
    element: CustomElement,
  ) => {
    e.stopPropagation();
    onSelectElement(element.id);

    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsDragging(true);

    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    const onPointerMove = (moveEv: PointerEvent) => {
      const currentRect = canvas.getBoundingClientRect();
      const rawX = ((moveEv.clientX - currentRect.left) / currentRect.width) * 100;
      const rawY = ((moveEv.clientY - currentRect.top) / currentRect.height) * 100;

      // Center snap within 3%
      let finalX = Math.max(4, Math.min(96, rawX));
      if (Math.abs(finalX - 50) < 3.5) {
        finalX = 50;
        setShowCenterGuide(true);
      } else {
        setShowCenterGuide(false);
      }

      const finalY = Math.max(3, Math.min(97, rawY));

      onUpdateElement(element.id, {
        x: Math.round(finalX * 10) / 10,
        y: Math.round(finalY * 10) / 10,
      });
    };

    const onPointerUp = (upEv: PointerEvent) => {
      setIsDragging(false);
      setShowCenterGuide(false);
      target.releasePointerCapture(upEv.pointerId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Keyboard navigation for precision adjustment
  const handleKeyDown = (e: React.KeyboardEvent, element: CustomElement) => {
    const step = e.shiftKey ? 3 : 0.8;
    let dx = 0;
    let dy = 0;

    if (e.key === 'ArrowLeft') dx = -step;
    else if (e.key === 'ArrowRight') dx = step;
    else if (e.key === 'ArrowUp') dy = -step;
    else if (e.key === 'ArrowDown') dy = step;
    else return;

    e.preventDefault();
    const newX = Math.max(2, Math.min(98, Math.round((element.x + dx) * 10) / 10));
    const newY = Math.max(2, Math.min(98, Math.round((element.y + dy) * 10) / 10));
    onUpdateElement(element.id, { x: newX, y: newY });
  };

  return (
    <div className="relative flex select-none flex-col items-center justify-center p-3">
      {/* Outer Phone/Display Mockup Frame */}
      <div
        ref={canvasRef}
        onClick={() => onSelectElement(null)}
        className="relative aspect-[640/940] w-full max-w-[360px] sm:max-w-[420px] cursor-crosshair overflow-hidden rounded-2xl shadow-2xl transition-all duration-150"
        style={{
          ...bgStyle,
          color: textColor,
        }}
        data-testid="card-studio-canvas"
      >
        {/* Background Image Darkening Overlay if configured */}
        {bg?.type === 'image' && bg.overlayOpacity ? (
          <div
            className="pointer-events-none absolute inset-0 bg-black"
            style={{ opacity: bg.overlayOpacity / 100 }}
          />
        ) : null}

        {/* Center alignment guide line */}
        {showCenterGuide ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-primary/70 shadow-sm"
          />
        ) : null}

        {/* Card Border Frame */}
        {showFrame && frameStyle !== 'none' ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute rounded-lg transition-all"
            style={{
              top: `${(frameInset / 940) * 100}%`,
              left: `${(frameInset / 640) * 100}%`,
              right: `${(frameInset / 640) * 100}%`,
              bottom: `${(frameInset / 940) * 100}%`,
              borderWidth: `${frameWidth}px`,
              borderStyle: frameStyle === 'dashed' ? 'dashed' : 'solid',
              borderColor: frameColor,
            }}
          >
            {frameStyle === 'double' ? (
              <div
                className="absolute inset-1 rounded-sm border opacity-60"
                style={{ borderColor: frameColor }}
              />
            ) : null}
          </div>
        ) : null}

        {/* Draggable Interactive Elements */}
        {(design.elements ?? []).map((el) => {
          if (el.visible === false) return null;
          const isSelected = activeElementId === el.id;
          const ctx: CardTextContext = {
            locale,
            eyebrow:
              event.eventKind?.toUpperCase() || (locale === 'sw' ? 'HARUSI YA' : 'WEDDING OF'),
            couple,
            title:
              locale === 'sw'
                ? 'Wanakualika kushiriki sherehe ya harusi yao'
                : 'Invite you to celebrate their wedding',
            message:
              locale === 'sw'
                ? 'Uwepo wako utafanya siku hii kuwa yenye furaha na baraka kubwa.'
                : 'Your presence will make this day truly special and blessed.',
            footer: locale === 'sw' ? 'Chakula kitafuata' : 'Reception to follow',
            guestName: event.guestName || 'Ndugu Mualikwa',
            dateLine: fullDate || 'Jumamosi, 12 Des 2026 · Saa 8:00 Mchana',
            venue: event.venueName || 'Mlimani City Hall, Dar es Salaam',
            dress: event.dressCode || 'Vitenge / Black Tie',
            sender: event.senderName || 'Kamati ya Harusi',
            phone: event.committeePhone || '',
          };

          let node = null;
          if (el.type === 'divider') {
            node = (
              <div className="flex items-center justify-center opacity-70">
                <svg width="48" height="10" viewBox="0 0 80 14" fill="none">
                  <path d="M0 7 L32 7" stroke={el.color || accentColor} strokeWidth="1.2" />
                  <path d="M40 0 L46 7 L40 14 L34 7 Z" fill={el.color || accentColor} />
                  <path d="M48 7 L80 7" stroke={el.color || accentColor} strokeWidth="1.2" />
                </svg>
              </div>
            );
          } else if (el.type === 'qr') {
            node = (
              <div className="flex flex-col items-center rounded-lg bg-white p-1.5 shadow-sm">
                <QrBlock payload="v1.0192f1a0.preview0.2.1.MOCKSIG" size={54} alt="QR Code" />
                <span className="mt-0.5 font-mono text-[9px] font-bold text-black">
                  {event.shortCode || 'KH-4826'}
                </span>
              </div>
            );
          } else if (el.type === 'image') {
            if (!el.imageUrl) return null;
            const { width, height } = imageSizeOf(el);
            node = (
              <img
                src={el.imageUrl}
                alt={el.imageAlt || 'Decor'}
                className="pointer-events-none object-cover shadow-xs"
                style={{
                  width: `${Math.round(width * 0.56)}px`,
                  height: `${Math.round(height * 0.56)}px`,
                  borderRadius: `${el.borderRadius ?? 8}px`,
                  opacity: el.opacity !== undefined ? el.opacity / 100 : 1,
                }}
              />
            );
          } else {
            const text = elementText(el, ctx);
            if (!text) return null;
            const s = elementTextStyle(el, { text: textColor, accent: accentColor });
            node = (
              <span
                style={{
                  fontFamily: s.fontFamily,
                  fontSize: `${s.fontSize * 0.56}px`,
                  fontWeight: s.fontWeight,
                  fontStyle: s.fontStyle,
                  color: s.color,
                  letterSpacing: `${s.letterSpacing}px`,
                  textTransform: s.textTransform,
                  textAlign: s.textAlign,
                  lineHeight: s.lineHeight,
                  maxWidth: s.maxWidth ? `${Math.round(s.maxWidth * 0.56)}px` : undefined,
                }}
              >
                {text}
              </span>
            );
          }

          if (!node) return null;
          const box = elementBox(el);

          return (
            <div
              key={el.id}
              tabIndex={0}
              role="button"
              aria-label={`Element ${el.type}`}
              onKeyDown={(e) => handleKeyDown(e, el)}
              onPointerDown={(e) => handlePointerDown(e, el)}
              className={`group absolute cursor-grab active:cursor-grabbing transition-[box-shadow] duration-75 touch-none ${
                isSelected
                  ? 'z-40 ring-2 ring-primary ring-offset-2 ring-offset-white/80 rounded-md shadow-md'
                  : 'hover:ring-1 hover:ring-primary/40 rounded-sm'
              }`}
              style={{
                top: `${(box.top / CARD_H) * 100}%`,
                left: `${(box.left / CARD_W) * 100}%`,
                width: `${(box.width / CARD_W) * 100}%`,
                display: 'flex',
                justifyContent: box.justify,
                padding: '2px 6px',
                zIndex: isSelected ? 50 : (el.zIndex ?? 1),
              }}
              data-testid={`card-element-${el.id}`}
            >
              {/* Active element handle & controls */}
              {isSelected ? (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-5 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-white shadow-xs"
                >
                  <Move className="size-2.5" />
                  <span className="uppercase">{el.type}</span>
                </div>
              ) : null}

              {/* Element content */}
              <div className="flex items-center justify-center">{node}</div>
            </div>
          );
        })}

        {/* Domain branding watermark at the bottom right */}
        <div className="pointer-events-none absolute bottom-2 right-4 text-[9px] font-bold tracking-wider opacity-60">
          {event.domain || 'kadisasa.com'}
        </div>
      </div>

      {/* Helpful shortcut hint under canvas */}
      <p className="mt-2 text-center text-xs text-muted">
        {locale === 'sw'
          ? 'Bofya kipengele na ukiburute popote unapotaka kwenye kadi.'
          : 'Click any element to drag and reposition it freely on the card.'}
      </p>
    </div>
  );
}

