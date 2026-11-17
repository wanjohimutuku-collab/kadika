'use client';

import { useState } from 'react';
import {
  Check,
  CheckCheck,
  Download,
  Globe,
  Image as ImageIcon,
  Send,
  ShieldCheck,
} from 'lucide-react';
import type { Locale } from '@harusi/i18n';
import { eventKindLabel, eventKindOf } from '@harusi/schemas';
import type { PaletteOverrides } from '@harusi/ui-tokens';
import { resolvePalette } from '@harusi/ui-tokens/palette';
import { QrBlock } from '@/components/ui/qr-block';
import { OrnamentBand, OrnamentDiamond } from '@/components/card/ornament';
import { formatDateShort, formatTime, swahiliTime } from '@/lib/format';
import {
  downloadCardImage,
  shareCardImageViaWhatsApp,
  type CardImageOptions,
} from '@/lib/card-canvas';

const SAMPLE_PAYLOAD = 'v1.0192f1a0.preview0.2.1.MOCKSIG';

export interface WhatsappCardPreviewProps {
  eventKind?: string | null;
  coupleNames: string;
  partnerA: string;
  partnerB?: string | null;
  dateStart: string;
  venueName: string;
  dressCode?: string;
  senderName?: string;
  committeePhone?: string;
  themeId: string;
  coverGradient?: string | null;
  palette?: PaletteOverrides;
  guestName?: string;
  shortCode?: string;
  locale: Locale;
  messageText: string;
  domain?: string;
  isContribution?: boolean;
}

/**
 * Realistic WhatsApp message preview showing the exact card image with QR code
 * and link metadata as unfurled by WhatsApp.
 * Supports 1-click converting the virtual card to an image and sharing/downloading for WhatsApp.
 */
export function WhatsappCardPreview({
  eventKind,
  coupleNames,
  partnerA,
  partnerB,
  dateStart,
  venueName,
  dressCode,
  senderName,
  committeePhone,
  themeId,
  coverGradient,
  palette: overrides,
  guestName = 'Asha Mwinyi',
  shortCode = 'KH-4826',
  locale,
  messageText,
  domain = 'kadisasa.com',
  isContribution = false,
}: WhatsappCardPreviewProps) {
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const palette = resolvePalette(themeId, overrides);
  const valid = !Number.isNaN(Date.parse(dateStart));
  const timeStr = valid
    ? locale === 'sw'
      ? swahiliTime(dateStart)
      : formatTime(dateStart, locale)
    : '';
  const dateStr = valid ? formatDateShort(dateStart, locale) : '';
  const kindOf = eventKindOf(eventKind, locale);
  const kindLabel = eventKindLabel(eventKind, locale);

  const cardImageOptions: CardImageOptions = {
    coupleNames,
    partnerA,
    partnerB,
    eventKind,
    dateStart,
    venueName,
    dressCode,
    senderName,
    committeePhone,
    themeId,
    coverGradient,
    palette: overrides,
    guestName,
    shortCode,
    locale,
    isContribution,
    scale: 2,
  };

  const handleDownloadImage = async () => {
    try {
      setDownloading(true);
      await downloadCardImage(cardImageOptions, `kadi-${shortCode.toLowerCase()}.png`);
      setFeedback(locale === 'sw' ? 'Picha imepakuliwa!' : 'Image downloaded!');
      setTimeout(() => setFeedback(null), 3000);
    } catch {
      // Fallback to server image endpoint
      const url = `/api/card-image?code=${encodeURIComponent(shortCode)}&couple=${encodeURIComponent(coupleNames)}&download=1`;
      window.open(url, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  const handleShareWhatsApp = async () => {
    try {
      setSharing(true);
      const res = await shareCardImageViaWhatsApp(cardImageOptions, {
        messageText,
      });
      if (res.method === 'download-and-whatsapp') {
        setFeedback(
          locale === 'sw'
            ? 'Picha imepakuliwa, tayari kutuma WhatsApp!'
            : 'Image downloaded, ready to send on WhatsApp!',
        );
        setTimeout(() => setFeedback(null), 4000);
      }
    } catch {
      // Fallback to plain whatsapp link
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div
      className="max-w-md overflow-hidden rounded-2xl rounded-tl-sm border border-emerald-200 bg-emerald-50/70 p-2 shadow-sm dark:border-emerald-800/60 dark:bg-emerald-950/30"
      data-testid="whatsapp-card-preview"
    >
      {/* Fast Image Conversion Action Header */}
      <div className="mb-2 flex items-center justify-between rounded-lg bg-emerald-100/80 px-2.5 py-1.5 text-xs font-medium text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">
        <span className="flex items-center gap-1.5 font-semibold">
          <ImageIcon className="size-3.5 text-emerald-700 dark:text-emerald-400" />
          {locale === 'sw'
            ? 'Picha ya kadi inapakuliwa haraka WhatsApp'
            : 'Card image downloads faster on WhatsApp'}
        </span>
        {feedback ? (
          <span className="flex items-center gap-1 font-bold text-emerald-800 dark:text-emerald-300">
            <Check className="size-3" /> {feedback}
          </span>
        ) : null}
      </div>

      {/* Preview of the card image that will be sent to WhatsApp */}
      <div className="overflow-hidden rounded-xl border border-emerald-300/60 bg-surface shadow-sm dark:border-emerald-700/60">
        {/* Cover Header Banner */}
        <div
          className="relative flex flex-col items-center justify-center px-4 pt-5 pb-2 text-center"
          style={{
            background: coverGradient || palette.primary,
            color: palette.onPrimary,
          }}
        >
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative flex flex-col items-center gap-0.5">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-90">
              {kindOf.toUpperCase()}
            </span>
            <p className="font-display text-2xl leading-tight font-bold">{coupleNames || '—'}</p>
            <OrnamentDiamond className="my-1 [--hp-pattern:#fff]" />
            {valid ? (
              <p className="text-xs font-semibold">
                {dateStr}
                {timeStr ? ` · ${timeStr}` : ''}
              </p>
            ) : null}
            <p className="text-[11px] opacity-90">{venueName || '—'}</p>
          </div>
          <OrnamentBand
            className="relative mt-2 block w-full bg-transparent opacity-85"
            id="wa-pv-band"
          />
        </div>

        {/* Card Body with Guest Info & QR Code */}
        <div className="flex flex-col gap-2 border-t border-border bg-white p-3 text-xs dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="size-3.5 shrink-0" />
                <span>
                  {locale === 'sw'
                    ? `Ujumbe kutoka: ${senderName || (coupleNames ? 'Familia ya ' + coupleNames : 'Kamati')}`
                    : `Invitation from: ${senderName || coupleNames || 'Committee'}`}
                </span>
              </div>
              <p className="text-xs text-muted">
                {locale === 'sw' ? 'Mwaliko kwa:' : 'Invitation for:'}
              </p>
              <p className="truncate text-sm font-bold text-ink">{guestName}</p>
              {dressCode ? (
                <p className="text-[11px] text-muted">
                  {locale === 'sw' ? 'Mavazi:' : 'Dress code:'}{' '}
                  <span className="font-medium text-ink">{dressCode}</span>
                </p>
              ) : null}
            </div>

            {!isContribution ? (
              <div className="flex shrink-0 flex-col items-center rounded-lg border border-border bg-white p-1.5 shadow-xs dark:bg-zinc-800">
                <QrBlock payload={SAMPLE_PAYLOAD} alt="QR Code" size={72} />
                <span className="mt-0.5 font-mono text-[11px] font-bold tracking-widest text-black dark:text-white">
                  {shortCode}
                </span>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <span className="flex min-h-7 items-center justify-center rounded-md bg-emerald-600 text-[11px] font-semibold text-white">
              {locale === 'sw' ? 'Ndio, Nitafika' : 'Yes, Attending'}
            </span>
            <span className="flex min-h-7 items-center justify-center rounded-md border border-emerald-600 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              {locale === 'sw' ? 'Hapana, Sitafika' : 'No, Regrets'}
            </span>
          </div>
        </div>

        {/* Rich Link Meta Strip */}
        <div className="flex flex-col gap-0.5 border-t border-emerald-200/50 bg-emerald-100/60 p-2.5 dark:border-emerald-800/40 dark:bg-emerald-900/30">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-emerald-800 uppercase dark:text-emerald-300">
            <Globe className="size-3" /> {domain}
          </span>
          <span className="line-clamp-1 text-sm font-bold text-ink">
            {coupleNames} · {kindLabel}
          </span>
          <span className="line-clamp-1 text-xs text-muted">
            {locale === 'sw'
              ? 'Fungua kadi yako rasmi ya kidijitali yenye msimbo wa QR wa kuingilia'
              : 'Open your official digital card with entry QR code'}
          </span>
        </div>
      </div>

      {/* Message Text Bubble */}
      <div className="px-2 pt-2.5 pb-1">
        <p className="text-sm leading-relaxed text-ink break-words whitespace-pre-wrap">
          {messageText}
        </p>
        <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-emerald-700 dark:text-emerald-400">
          <span>12:30</span>
          <CheckCheck className="size-3.5" aria-hidden="true" />
        </div>
      </div>

      {/* Quick Action Toolbar to Convert to Image & Send to WhatsApp */}
      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-emerald-200/60 pt-2 dark:border-emerald-800/40">
        <button
          type="button"
          onClick={handleShareWhatsApp}
          disabled={sharing}
          className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-bold text-[#0b2e1a] shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Send className="size-3.5" />
          <span>
            {sharing
              ? locale === 'sw'
                ? 'Inatayarisha…'
                : 'Preparing…'
              : locale === 'sw'
                ? 'Tuma Picha WhatsApp'
                : 'Send Image to WhatsApp'}
          </span>
        </button>

        <button
          type="button"
          onClick={handleDownloadImage}
          disabled={downloading}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-600/30 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 shadow-xs hover:bg-emerald-50 dark:border-emerald-600/50 dark:bg-zinc-800 dark:text-emerald-200 dark:hover:bg-zinc-700"
        >
          <Download className="size-3.5" />
          <span>
            {downloading
              ? locale === 'sw'
                ? 'Inapakua…'
                : 'Downloading…'
              : locale === 'sw'
                ? 'Pakua Picha'
                : 'Download Image'}
          </span>
        </button>
      </div>
    </div>
  );
}
