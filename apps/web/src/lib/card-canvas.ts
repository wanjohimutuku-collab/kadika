import { eventKindLabel, eventKindOf, hostNames } from '@harusi/schemas';
import type { PaletteOverrides } from '@harusi/ui-tokens/palette';
import { resolvePalette } from '@harusi/ui-tokens/palette';
import { formatDateShort, formatTime, swahiliTime } from './format';
import { qrMatrix, QR_QUIET_ZONE } from './qr';

export interface CardImageOptions {
  coupleNames?: string;
  partnerA?: string;
  partnerB?: string | null;
  eventKind?: string | null;
  dateStart: string;
  venueName?: string;
  dressCode?: string;
  primaryColor?: string;
  coverGradient?: string | null;
  themeId?: string;
  palette?: PaletteOverrides;
  guestName?: string;
  shortCode?: string;
  qrPayload?: string;
  locale?: 'sw' | 'en';
  isContribution?: boolean;
  scale?: number;
}

const SAMPLE_PAYLOAD = 'v1.0192f1a0.preview0.2.1.MOCKSIG';

/**
 * Renders the virtual card preview directly onto an HTML5 canvas element.
 * Produces a crisp, high-resolution portrait card image suitable for WhatsApp sharing
 * and fast image downloads.
 */
export function renderCardPreviewToCanvas(options: CardImageOptions): HTMLCanvasElement {
  const scale = options.scale || 2;
  const W = 640;
  const H = 940;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(H * scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context is not available');

  ctx.scale(scale, scale);

  const locale = options.locale ?? 'sw';
  const palette = resolvePalette(options.themeId, options.palette);
  const primary = options.primaryColor || palette.primary || '#0A3F35';
  const onPrimary = palette.onPrimary || '#FFFFFF';

  const couple =
    options.coupleNames ||
    hostNames(options.partnerA || 'Asha', options.partnerB || 'Juma') ||
    'Asha & Juma';

  const kindOf = eventKindOf(options.eventKind, locale).toUpperCase();
  const kindLabel = eventKindLabel(options.eventKind, locale);

  const validDate = !Number.isNaN(Date.parse(options.dateStart));
  const dateStr = validDate ? formatDateShort(options.dateStart, locale) : '';
  const timeStr = validDate
    ? locale === 'sw'
      ? swahiliTime(options.dateStart)
      : formatTime(options.dateStart, locale)
    : '';

  const guest = options.guestName || (locale === 'sw' ? 'Ndugu Mualikwa' : 'Honoured Guest');
  const code = options.shortCode || 'KH-4826';
  const venue = options.venueName || (locale === 'sw' ? 'Ukumbi Rasmi' : 'Official Venue');

  // Background
  ctx.fillStyle = '#F7F5F0';
  ctx.fillRect(0, 0, W, H);

  // Card Outer Margins & Geometry
  const mx = 24;
  const my = 20;
  const cw = W - mx * 2; // 592
  const ch = H - my * 2; // 900
  const cornerR = 20;

  // Clip card with rounded corners
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(mx + cornerR, my);
  ctx.lineTo(mx + cw - cornerR, my);
  ctx.quadraticCurveTo(mx + cw, my, mx + cw, my + cornerR);
  ctx.lineTo(mx + cw, my + ch - cornerR);
  ctx.quadraticCurveTo(mx + cw, my + ch, mx + cw - cornerR, my + ch);
  ctx.lineTo(mx + cornerR, my + ch);
  ctx.quadraticCurveTo(mx, my + ch, mx, my + ch - cornerR);
  ctx.lineTo(mx, my + cornerR);
  ctx.quadraticCurveTo(mx, my, mx + cornerR, my);
  ctx.closePath();
  ctx.clip();

  // White base for card interior
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(mx, my, cw, ch);

  // Top Cover Header
  const headerH = 270;
  ctx.fillStyle = primary;
  ctx.fillRect(mx, my, cw, headerH);

  // Soft dark overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
  ctx.fillRect(mx, my, cw, headerH);

  // Header Badge (Eyebrow)
  const badgeText = options.isContribution
    ? locale === 'sw'
      ? 'KADI MAALUM YA MCHANGO'
      : 'CONTRIBUTION CARD'
    : kindOf;
  ctx.fillStyle = onPrimary;
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '2px';
  ctx.fillText(badgeText, W / 2, my + 38);

  // Couple / Host Names
  ctx.letterSpacing = '0px';
  ctx.font = 'bold 30px Georgia, serif';
  ctx.fillText(couple, W / 2, my + 84);

  // Diamond Ornament Divider
  ctx.strokeStyle = onPrimary;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 50, my + 120);
  ctx.lineTo(W / 2 - 16, my + 120);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W / 2 + 16, my + 120);
  ctx.lineTo(W / 2 + 50, my + 120);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(W / 2, my + 114);
  ctx.lineTo(W / 2 + 6, my + 120);
  ctx.lineTo(W / 2, my + 126);
  ctx.lineTo(W / 2 - 6, my + 120);
  ctx.closePath();
  ctx.stroke();

  // Date and Time
  ctx.font = '600 15px system-ui, -apple-system, sans-serif';
  ctx.fillText(dateStr + (timeStr ? ` · ${timeStr}` : ''), W / 2, my + 154);

  // Venue
  ctx.font = '14px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillText(venue, W / 2, my + 188);

  // Badge: Official Invite
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  const tagW = 160;
  const tagH = 26;
  const tagX = (W - tagW) / 2;
  const tagY = my + 218;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(tagX, tagY, tagW, tagH, 13);
  } else {
    ctx.rect(tagX, tagY, tagW, tagH);
  }
  ctx.fill();

  ctx.fillStyle = onPrimary;
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  ctx.fillText(
    options.isContribution
      ? locale === 'sw'
        ? 'Mchango Rasmi'
        : 'Official Pledge'
      : locale === 'sw'
        ? 'Mwaliko Rasmi'
        : 'Official Invitation',
    W / 2,
    tagY + tagH / 2,
  );

  // Card Body Section
  const bodyY = my + headerH;

  // Guest Personalization Banner
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(mx, bodyY, cw, 80);
  ctx.fillStyle = '#64748B';
  ctx.font = '12px system-ui, -apple-system, sans-serif';
  ctx.fillText(
    locale === 'sw' ? 'Mwaliko Maalum kwa:' : 'Special Invitation for:',
    W / 2,
    bodyY + 26,
  );
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
  ctx.fillText(guest, W / 2, bodyY + 54);

  // Thin separator
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(mx, bodyY + 80);
  ctx.lineTo(mx + cw, bodyY + 80);
  ctx.stroke();

  // QR Code Box (or Contribution summary box)
  if (!options.isContribution) {
    const qBoxW = 270;
    const qBoxH = 340;
    const qBoxX = (W - qBoxW) / 2;
    const qBoxY = bodyY + 110;

    // White box shadow + border
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.06)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    ctx.fillRect(qBoxX, qBoxY, qBoxW, qBoxH);
    ctx.shadowColor = 'transparent';

    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(qBoxX, qBoxY, qBoxW, qBoxH);

    // Render QR Code modules
    const payload =
      options.qrPayload || (options.shortCode ? `v1.preview.${options.shortCode}` : SAMPLE_PAYLOAD);
    const m = qrMatrix(payload);
    const qrDim = 190;
    const totalDim = m.size + QR_QUIET_ZONE * 2;
    const mod = qrDim / totalDim;
    const qx = (W - qrDim) / 2;
    const qy = qBoxY + 24;

    ctx.fillStyle = '#000000';
    for (let r = 0; r < m.size; r++) {
      for (let c = 0; c < m.size; c++) {
        if (m.modules[r * m.size + c]) {
          ctx.fillRect(
            qx + (c + QR_QUIET_ZONE) * mod,
            qy + (r + QR_QUIET_ZONE) * mod,
            mod + 0.3,
            mod + 0.3,
          );
        }
      }
    }

    // Short Code Below QR
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 28px ui-monospace, Menlo, monospace';
    ctx.letterSpacing = '3px';
    ctx.fillText(code, W / 2, qBoxY + 252);
    ctx.letterSpacing = '0px';

    // Gate entry instruction
    ctx.fillStyle = '#64748B';
    ctx.font = '600 11px system-ui, -apple-system, sans-serif';
    ctx.fillText(
      locale === 'sw' ? 'ONYESHA MLANGONI KWA UTHIBITISHO' : 'SHOW AT ENTRANCE FOR ENTRY',
      W / 2,
      qBoxY + 292,
    );
  } else {
    // Contribution card body
    const cBoxW = 440;
    const cBoxH = 260;
    const cBoxX = (W - cBoxW) / 2;
    const cBoxY = bodyY + 130;

    ctx.fillStyle = '#F8FAFC';
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1.5;
    ctx.fillRect(cBoxX, cBoxY, cBoxW, cBoxH);
    ctx.strokeRect(cBoxX, cBoxY, cBoxW, cBoxH);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillText(
      locale === 'sw' ? 'Ahsante kwa Mchango Wako' : 'Thank You for Your Contribution',
      W / 2,
      cBoxY + 60,
    );

    ctx.fillStyle = '#475569';
    ctx.font = '14px system-ui, -apple-system, sans-serif';
    ctx.fillText(
      locale === 'sw'
        ? 'Mchango wako unajenga fanaka ya shughuli hii.'
        : 'Your generous contribution makes this celebration possible.',
      W / 2,
      cBoxY + 105,
    );

    ctx.font = 'bold 22px ui-monospace, Menlo, monospace';
    ctx.fillStyle = primary;
    ctx.fillText(`KODI: ${code}`, W / 2, cBoxY + 165);
  }

  // Card Outer Border
  ctx.restore(); // restore clipping

  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(mx + cornerR, my);
  ctx.lineTo(mx + cw - cornerR, my);
  ctx.quadraticCurveTo(mx + cw, my, mx + cw, my + cornerR);
  ctx.lineTo(mx + cw, my + ch - cornerR);
  ctx.quadraticCurveTo(mx + cw, my + ch, mx + cw - cornerR, my + ch);
  ctx.lineTo(mx + cornerR, my + ch);
  ctx.quadraticCurveTo(mx, my + ch, mx, my + ch - cornerR);
  ctx.lineTo(mx, my + cornerR);
  ctx.quadraticCurveTo(mx, my, mx + cornerR, my);
  ctx.closePath();
  ctx.stroke();

  // Brand Footer
  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 12px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Kadi Sasa · ${kindLabel} · kadisasa.com`, W / 2, my + ch - 22);

  return canvas;
}

/**
 * Converts card options to an image PNG Blob.
 */
export async function cardPreviewToBlob(options: CardImageOptions): Promise<Blob> {
  const canvas = renderCardPreviewToCanvas(options);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/png');
  });
}

/**
 * Downloads the card as an image file directly in the browser.
 */
export async function downloadCardImage(
  options: CardImageOptions,
  filename?: string,
): Promise<void> {
  const blob = await cardPreviewToBlob(options);
  const code = options.shortCode || 'kadi';
  const name = filename || `kadi-${code.toLowerCase()}.png`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Converts the card preview to an image and sends it via WhatsApp.
 * Uses Web Share API (with File support) if available to directly hand the image file to WhatsApp.
 * Otherwise, downloads the image file and opens WhatsApp with the message text.
 */
export async function shareCardImageViaWhatsApp(
  options: CardImageOptions,
  params?: {
    messageText?: string;
    phoneE164?: string;
  },
): Promise<{ shared: boolean; method: 'native-file-share' | 'download-and-whatsapp' }> {
  const code = options.shortCode || 'KH-4826';
  const blob = await cardPreviewToBlob(options);
  const file = new File([blob], `kadi-${code}.png`, { type: 'image/png' });
  const title = options.coupleNames || 'Kadi ya Harusi';
  const text = params?.messageText || `${title} - Kadi ya Mwaliko (${code})\nhttps://kadisasa.com`;

  // Try Web Share API with file attachment
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({
        files: [file],
        title,
        text,
      });
      return { shared: true, method: 'native-file-share' };
    } catch (e: unknown) {
      if ((e as { name?: string })?.name === 'AbortError') {
        return { shared: false, method: 'native-file-share' };
      }
      // Fallback below
    }
  }

  // Fallback: download the image and open WhatsApp URL
  await downloadCardImage(options, `kadi-${code}.png`);

  const phoneParam = params?.phoneE164 ? `phone=${params.phoneE164.replace(/\D/g, '')}&` : '';
  const waUrl = `https://api.whatsapp.com/send?${phoneParam}text=${encodeURIComponent(text)}`;
  if (typeof window !== 'undefined') {
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  }

  return { shared: true, method: 'download-and-whatsapp' };
}
