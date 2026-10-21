'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { Locale } from '@harusi/i18n';
import { eventKindLabel, eventKindOf, hostNames } from '@harusi/schemas';
import { QrBlock } from '@/components/ui/qr-block';
import { qrMatrix, QR_QUIET_ZONE } from '@/lib/qr';
import { OrnamentBand, OrnamentDiamond } from '@/components/card/ornament';
import {
  formatClock,
  formatDate,
  formatPhone,
  formatTime,
  formatWeekday,
  swahiliTime,
} from '@/lib/format';
import { themeStyle } from '@/lib/theme';
import type { CardPreviewData } from './card-preview';

export const FORMATS = { A6: { w: 105, h: 148 }, A5: { w: 148, h: 210 } } as const;
export type PrintFormat = keyof typeof FORMATS;
const PX_PER_MM = 96 / 25.4;

/**
 * Print card (§17.7) drawn at true millimetre size, then scaled to fit the preview. Top → bottom:
 * ornament, couple names, personalised line, date/time/venue, dress code, contact, then the QR band.
 * The QR is black on white with its quiet zone; the short code sits beside it at ≥ 12 pt.
 */
export function PrintCard({
  data,
  format,
  qrMm,
  payload,
  previewWidthPx,
}: {
  data: CardPreviewData;
  format: PrintFormat;
  qrMm: number;
  payload: string;
  previewWidthPx: number;
}) {
  const t = useTranslations('cards');
  const tc = useTranslations('card');
  const locale = useLocale() as Locale;
  const f = FORMATS[format];
  const scale = previewWidthPx / (f.w * PX_PER_MM);
  const valid = !Number.isNaN(Date.parse(data.dateStart));
  // Quiet zone is part of the rendered SVG: the symbol is qrMm, the SVG adds 4 modules each side.
  const modules = qrMatrix(payload).size;
  const qrPx = (qrMm * PX_PER_MM * (modules + QR_QUIET_ZONE * 2)) / modules;
  return (
    <div
      style={{ width: previewWidthPx, height: f.h * PX_PER_MM * scale }}
      className="overflow-hidden rounded-md shadow-lg ring-1 ring-border"
    >
      <div
        style={{
          ...themeStyle(data.themeId, data.palette),
          width: `${f.w}mm`,
          height: `${f.h}mm`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
        className="relative flex flex-col bg-surface px-[8mm] pt-[6mm] pb-[6mm] text-center text-ink"
        data-testid="print-card"
      >
        {/* Same template as the digital card (ADR 044): a header in the theme's primary with the names
            in its text colour, then the ornament band. The PDF draws exactly this. */}
        <div
          className="-mx-[8mm] -mt-[6mm] flex h-[36mm] flex-col items-center justify-center px-[8mm]"
          style={{ background: 'var(--hp-primary)', color: 'var(--hp-on-primary)' }}
          data-testid="print-card-header"
        >
          <OrnamentDiamond className="mx-auto" />
          <p className="mt-[1mm] text-[9pt] tracking-[0.25em] uppercase opacity-90">
            {tc('weddingOf', {
              kind: eventKindLabel(data.eventKind, locale),
              kindOf: eventKindOf(data.eventKind, locale),
            })}
          </p>
          <p className="font-display text-[26pt] leading-tight font-semibold">
            {hostNames(data.partnerA, data.partnerB)}
          </p>
        </div>
        <OrnamentBand id={`print-band-${format}`} className="-mx-[8mm] block" />
        {data.greeting ? <p className="mt-[2mm] text-[9pt] leading-snug">{data.greeting}</p> : null}
        <p className="mt-[1.5mm] text-[10pt] font-semibold">
          {t('invitesLine', { guest: data.guestName ?? t('sampleGuest') })}
        </p>
        {valid ? (
          <p className="mt-[2mm] text-[10pt]">
            {formatWeekday(data.dateStart, locale)} {formatDate(data.dateStart, locale)} ·{' '}
            {locale === 'sw'
              ? `Saa ${swahiliTime(data.dateStart)} (${formatClock(data.dateStart)})`
              : formatTime(data.dateStart, locale)}
          </p>
        ) : null}
        <p className="text-[10pt]">{data.venueName}</p>
        {data.dressCode ? (
          <p className="mt-[1mm] text-[9pt]">{tc('dressCode', { dressCode: data.dressCode })}</p>
        ) : null}
        {data.committeePhone ? (
          <p className="mt-[1mm] text-[9pt]">
            {t('rsvpLine', { phone: formatPhone(data.committeePhone) })}
          </p>
        ) : null}
        <div className="mt-auto flex justify-center border-t border-border pt-[3mm]">
          {/* QR band: a white panel with black ink whatever the palette, never tinted (§6.4). */}
          <div
            className="flex items-center gap-[4mm] rounded-[2mm] p-[1.5mm]"
            style={{ background: '#fff', color: '#000' }}
          >
            <QrBlock payload={payload} alt={`QR ${data.shortCode ?? ''}`} size={qrPx} />
            <div className="pr-[2mm] text-left">
              <p className="text-[9pt]">{tc('codeLabel')}</p>
              <p className="font-mono text-[16pt] font-bold tracking-[0.12em]">
                {data.shortCode ?? 'KH-4826'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
