'use client';

import { useLocale } from 'next-intl';
import type { Locale } from '@harusi/i18n';
import { hostNames } from '@harusi/schemas';
import type { CardImageOptions } from '@/lib/card-canvas';
import { useCardImageSrc } from '@/lib/use-card-image';
import type { CardPreviewData } from './card-preview';

export const FORMATS = { A6: { w: 105, h: 148 }, A5: { w: 148, h: 210 } } as const;
export type PrintFormat = keyof typeof FORMATS;
const PX_PER_MM = 96 / 25.4;

/**
 * Print card (§17.7) drawn at true millimetre size, then scaled to fit the preview.
 * Uses the exact same card template design as the phone preview and guest link (`/api/card-image`),
 * so what the organiser sees on the phone, in print, and on the preview link are identical.
 */
export function PrintCard({
  data,
  format,
  previewWidthPx,
}: {
  data: CardPreviewData;
  format: PrintFormat;
  qrMm?: number;
  payload?: string;
  previewWidthPx: number;
}) {
  const locale = useLocale() as Locale;
  const f = FORMATS[format];
  const scale = previewWidthPx / (f.w * PX_PER_MM);
  const coupleNames = hostNames(data.partnerA || '—', data.partnerB);

  const options: CardImageOptions = {
    coupleNames,
    partnerA: data.partnerA || '—',
    partnerB: data.partnerB,
    eventKind: data.eventKind,
    dateStart: data.dateStart,
    venueName: data.venueName,
    dressCode: data.dressCode,
    themeId: data.themeId,
    coverGradient: data.coverGradient,
    palette: data.palette,
    guestName: data.guestName,
    shortCode: data.shortCode,
    senderName: data.senderName,
    committeePhone: data.committeePhone,
    greeting: data.greeting,
    isContribution: data.isContribution,
    template: data.template ?? 'classic',
    title: data.title,
    message: data.message,
    whatsappMessage: data.whatsappMessage,
    footer: data.footer,
    showQr: data.showQr,
    custom: data.custom,
    seats: data.seats ?? 2,
    locale,
  };

  const { src: imgSrc } = useCardImageSrc(options);

  return (
    <div
      style={{ width: previewWidthPx, height: f.h * PX_PER_MM * scale }}
      className="overflow-hidden rounded-md shadow-lg ring-1 ring-border bg-surface"
    >
      <div
        style={{
          width: `${f.w}mm`,
          height: `${f.h}mm`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
        className="relative flex flex-col overflow-hidden bg-surface"
        data-testid="print-card"
      >
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={locale === 'sw' ? `Kadi ya kuchapisha (${format})` : `Printable card (${format})`}
            className="h-full w-full object-cover"
            data-testid="print-card-image"
          />
        ) : (
          <div className="skeleton h-full w-full" />
        )}
      </div>
    </div>
  );
}
