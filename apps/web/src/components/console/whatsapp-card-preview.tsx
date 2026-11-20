'use client';

import { useState } from 'react';
import { Check, CheckCheck, Download, Globe, Image as ImageIcon, Send } from 'lucide-react';
import type { Locale } from '@harusi/i18n';
import { eventKindLabel, type CardTemplate, type CustomCardDesign } from '@harusi/schemas';
import type { PaletteOverrides } from '@harusi/ui-tokens';
import { cardImageUrl, downloadCardImage, type CardImageOptions } from '@/lib/card-canvas';
import { useCardImageSrc } from '@/lib/use-card-image';

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
  /** Card-image design (ADR 058); default `classic`. */
  template?: CardTemplate;
  /** Custom text / QR toggle for the image (script, botanical). */
  design?: {
    title?: string;
    message?: string;
    footer?: string;
    showQr?: boolean;
    /** Free drag-and-drop customization: custom background, frame, elements & fonts. */
    custom?: CustomCardDesign;
    /** WhatsApp message template the card message falls back to, without its link. */
    whatsappMessage?: string;
  };
  /**
   * Sends this card image to the guests' own WhatsApp numbers through the API (the page confirms
   * first). Never a browser share: the organiser's phone is not the sender.
   */
  onSendWhatsapp: () => void;
  /** How many guests the send would reach; shown on the button. */
  sendCount?: number;
  sendDisabled?: boolean;
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
  template = 'classic',
  design,
  onSendWhatsapp,
  sendCount,
  sendDisabled = false,
}: WhatsappCardPreviewProps) {
  const [downloading, setDownloading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

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
    template,
    // The sample guest holds a Double card, so the preview shows the DOUBLE tag guests see.
    seats: 2,
    ...design,
    scale: 2,
  };
  const { src: imgSrc } = useCardImageSrc(cardImageOptions);

  const handleDownloadImage = async () => {
    try {
      setDownloading(true);
      await downloadCardImage(cardImageOptions, `kadi-${shortCode.toLowerCase()}.png`);
      setFeedback(locale === 'sw' ? 'Picha imepakuliwa!' : 'Image downloaded!');
      setTimeout(() => setFeedback(null), 3000);
    } catch {
      // Fallback to server image endpoint
      const url = cardImageUrl(cardImageOptions, { download: '1' });
      window.open(url, '_blank');
    } finally {
      setDownloading(false);
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
        {/* The exact PNG guests receive (ADR 058): no buttons, those live on the digital card. */}
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={
              locale === 'sw' ? `Picha ya kadi ya ${coupleNames}` : `Card image for ${coupleNames}`
            }
            width={640}
            height={940}
            loading="lazy"
            className="block h-auto w-full bg-surface"
            data-testid="whatsapp-card-image"
          />
        ) : (
          <div className="skeleton aspect-[640/940] w-full" />
        )}

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
          onClick={onSendWhatsapp}
          disabled={sendDisabled}
          data-testid="send-image-whatsapp"
          className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-bold text-[#0b2e1a] shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Send className="size-3.5" />
          <span>
            {locale === 'sw'
              ? 'Tuma picha kwa WhatsApp ya wageni'
              : "Send image to guests' WhatsApp"}
            {sendCount ? ` (${sendCount})` : ''}
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
