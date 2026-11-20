'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Download, Send } from 'lucide-react';
import type { Locale } from '@harusi/i18n';
import { hostNames, type CardTemplate, type CustomCardDesign } from '@harusi/schemas';
import type { PaletteOverrides } from '@harusi/ui-tokens/palette';
import { downloadCardImage, type CardImageOptions } from '@/lib/card-canvas';
import { useCardImageSrc } from '@/lib/use-card-image';

export interface CardPreviewData {
  eventKind?: string;
  partnerA: string;
  partnerB: string;
  dateStart: string;
  venueName: string;
  dressCode: string;
  themeId: string;
  coverGradient: string;
  palette?: PaletteOverrides;
  greeting?: string;
  extraNote?: string;
  senderName?: string;
  committeePhone?: string;
  guestName?: string;
  shortCode?: string;
  /** The selected card-image design (ADR 058); default `classic`. */
  template?: CardTemplate;
  /** Custom text / QR toggle for the script and botanical designs. */
  title?: string;
  message?: string;
  /** WhatsApp message template the message line falls back to, without its link. */
  whatsappMessage?: string;
  footer?: string;
  showQr?: boolean;
  /** Custom drag-and-drop elements, background, frame, and fonts. */
  custom?: CustomCardDesign;
  isContribution?: boolean;
  /** Seats on the sample card; default 2, so the preview shows where DOUBLE / SINGLE is printed. */
  seats?: number;
}

/**
 * Live preview of the card image in a phone frame (wizard, Karibu, Cards page). It is the exact
 * PNG of the selected template from `/api/card-image`, so every preview matches what guests get.
 * Sending goes through the Send page (the API, to each guest's own number), never a browser share.
 */
export function CardPreview({
  data,
  compact,
  sendHref,
}: {
  data: CardPreviewData;
  compact?: boolean;
  /** Link to this event's Send page; without it the send button is hidden (no event yet). */
  sendHref?: string;
}) {
  const locale = useLocale() as Locale;
  const [downloading, setDownloading] = useState(false);
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

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await downloadCardImage(options, `kadi-${(data.shortCode || 'harusi').toLowerCase()}.png`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`mx-auto w-full ${compact ? 'max-w-[260px]' : 'max-w-[300px]'} rounded-[2rem] border-8 border-ink bg-ink shadow-xl`}
      >
        <div className="overflow-hidden rounded-[1.5rem] bg-surface">
          {/* Regenerates as the organiser edits; the browser cancels the stale request. */}
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={
                locale === 'sw'
                  ? `Picha ya kadi ya ${coupleNames}`
                  : `Card image for ${coupleNames}`
              }
              width={640}
              height={940}
              className="block h-auto w-full"
              data-testid="card-preview-image"
            />
          ) : (
            <div className="skeleton aspect-[640/940] w-full" />
          )}
        </div>
      </div>
      <div className="flex w-full max-w-[300px] gap-2">
        {sendHref ? (
          <Link
            href={sendHref}
            className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-3 py-1.5 text-xs font-bold text-[#0b2e1a] shadow-xs transition-opacity hover:opacity-90"
          >
            <Send className="size-3.5" />
            <span>
              {locale === 'sw' ? 'Tuma kwa wageni WhatsApp' : 'Send to guests on WhatsApp'}
            </span>
          </Link>
        ) : null}
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-xs hover:bg-ink/5 disabled:opacity-50"
        >
          <Download className="size-3.5" />
          <span>{locale === 'sw' ? 'Pakua Picha' : 'Download Image'}</span>
        </button>
      </div>
    </div>
  );
}
