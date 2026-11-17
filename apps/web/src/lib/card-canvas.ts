import { defaultSender, eventKindLabel, eventKindOf, hostNames } from '@harusi/schemas';
import type { PaletteOverrides } from '@harusi/ui-tokens/palette';
import { resolvePalette } from '@harusi/ui-tokens/palette';
import {
  formatClock,
  formatDate,
  formatPhone,
  formatTime,
  formatWeekday,
  swahiliTime,
} from './format';
import { qrMatrix, QR_QUIET_ZONE } from './qr';

export interface CardImageOptions {
  coupleNames?: string;
  partnerA?: string;
  partnerB?: string | null;
  eventKind?: string | null;
  dateStart: string;
  venueName?: string;
  dressCode?: string;
  senderName?: string;
  committeePhone?: string;
  greeting?: string;
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

function drawShieldCheck(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#16A34A';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.lineTo(8, -6);
  ctx.lineTo(8, 2);
  ctx.quadraticCurveTo(8, 9, 0, 12);
  ctx.quadraticCurveTo(-8, 9, -8, 2);
  ctx.lineTo(-8, -6);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-3.5, 1);
  ctx.lineTo(-1, 3.5);
  ctx.lineTo(4, -2.5);
  ctx.stroke();
  ctx.restore();
}

function drawMapPin(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, -4, 5.5, Math.PI * 0.8, Math.PI * 2.2);
  ctx.lineTo(0, 7);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -4, 2, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawShirt(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-8, -5);
  ctx.lineTo(-4, -7);
  ctx.lineTo(-2, -5);
  ctx.quadraticCurveTo(0, -3, 2, -5);
  ctx.lineTo(4, -7);
  ctx.lineTo(8, -5);
  ctx.lineTo(6, 0);
  ctx.lineTo(4, -1);
  ctx.lineTo(4, 7);
  ctx.lineTo(-4, 7);
  ctx.lineTo(-4, -1);
  ctx.lineTo(-6, 0);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

/**
 * Renders the virtual card preview directly onto an HTML5 canvas element.
 * Produces a crisp, high-resolution portrait card image that exactly mirrors the HTML preview,
 * suitable for WhatsApp sharing and fast image downloads.
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
  const dateWeekday = validDate ? formatWeekday(options.dateStart, locale) : '';
  const dateFormatted = validDate ? formatDate(options.dateStart, locale) : '';
  const dateFullStr = validDate ? `${dateWeekday} ${dateFormatted}` : '';
  const timeStr = validDate
    ? locale === 'sw'
      ? `Saa ${swahiliTime(options.dateStart)} (${formatClock(options.dateStart)})`
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
  const headerH = 240;
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
  if ('letterSpacing' in ctx) {
    (ctx as unknown as { letterSpacing: string }).letterSpacing = '2px';
  }
  ctx.fillText(badgeText, W / 2, my + 34);

  // Couple / Host Names
  if ('letterSpacing' in ctx) {
    (ctx as unknown as { letterSpacing: string }).letterSpacing = '0px';
  }
  ctx.font = 'bold 30px Georgia, serif';
  ctx.fillText(couple, W / 2, my + 72);

  // Diamond Ornament Divider
  ctx.strokeStyle = onPrimary;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 40, my + 104);
  ctx.lineTo(W / 2 - 14, my + 104);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W / 2 + 14, my + 104);
  ctx.lineTo(W / 2 + 40, my + 104);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(W / 2, my + 98);
  ctx.lineTo(W / 2 + 5, my + 104);
  ctx.lineTo(W / 2, my + 110);
  ctx.lineTo(W / 2 - 5, my + 104);
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(W / 2, my + 104, 1.5, 0, Math.PI * 2);
  ctx.fillStyle = onPrimary;
  ctx.fill();

  // Date and Time
  ctx.font = '600 14px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = onPrimary;
  ctx.fillText(dateFullStr, W / 2, my + 132);

  ctx.font = '12px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillText(timeStr, W / 2, my + 154);

  // Scalloped OrnamentBand Divider (alternating triangles & dots matching HTML preview)
  const bandY = my + headerH - 18;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  for (let bx = mx; bx < mx + cw; bx += 28) {
    ctx.beginPath();
    ctx.moveTo(bx + 0, bandY + 17);
    ctx.lineTo(bx + 7, bandY + 4);
    ctx.lineTo(bx + 14, bandY + 17);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(bx + 14, bandY + 1);
    ctx.lineTo(bx + 21, bandY + 14);
    ctx.lineTo(bx + 28, bandY + 1);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(bx + 7, bandY + 12, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(bx + 21, bandY + 6, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Card Body Section
  const bodyY = my + headerH;

  // Greeting / Invites Guest Line
  if (options.greeting) {
    ctx.fillStyle = '#475569';
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(options.greeting, W / 2, bodyY + 18);
  }

  const inviteOffsetY = options.greeting ? 36 : 22;
  ctx.fillStyle = '#64748B';
  ctx.font = '12px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    locale === 'sw' ? 'Inakualika kwa furaha:' : 'Cordially invites you:',
    W / 2,
    bodyY + inviteOffsetY,
  );

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
  ctx.fillText(guest, W / 2, bodyY + inviteOffsetY + 24);

  // Trust Badge: ShieldCheck + Sender Name + Phone
  const trustY = bodyY + (options.greeting ? 78 : 64);
  const trustH = 48;
  const trustW = cw - 48;
  const trustX = mx + 24;

  ctx.fillStyle = '#F0FDF4';
  ctx.strokeStyle = '#BBF7D0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(trustX, trustY, trustW, trustH, 8);
  } else {
    ctx.rect(trustX, trustY, trustW, trustH);
  }
  ctx.fill();
  ctx.stroke();

  drawShieldCheck(ctx, trustX + 22, trustY + 24);

  const sender =
    options.senderName || defaultSender(options.eventKind, couple, 'committee', locale);
  const phone = options.committeePhone ? formatPhone(options.committeePhone) : '';

  ctx.textAlign = 'left';
  ctx.fillStyle = '#166534';
  ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
  ctx.fillText(
    locale === 'sw' ? `Ujumbe kutoka: ${sender}` : `Invitation from: ${sender}`,
    trustX + 42,
    trustY + (phone ? 19 : 27),
  );

  if (phone) {
    ctx.fillStyle = '#15803D';
    ctx.font = '11px system-ui, -apple-system, sans-serif';
    ctx.fillText(
      locale === 'sw' ? `Mawasiliano: ${phone}` : `Contact: ${phone}`,
      trustX + 42,
      trustY + 35,
    );
  }

  // Venue with MapPin Icon
  const venueY = trustY + trustH + 18;
  drawMapPin(ctx, trustX + 8, venueY - 4, primary);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.fillText(venue, trustX + 24, venueY);

  // Dress Code with Shirt Icon (if present)
  let curY = venueY + 20;
  if (options.dressCode) {
    drawShirt(ctx, trustX + 8, curY - 4, primary);
    ctx.fillStyle = '#475569';
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.fillText(
      (locale === 'sw' ? 'Mavazi: ' : 'Dress code: ') + options.dressCode,
      trustX + 24,
      curY,
    );
    curY += 22;
  }

  // RSVP Pills Mockup
  const rsvpY = curY + 6;
  const pillW = (trustW - 14) / 2;
  const pillH = 32;

  // Yes pill (solid primary)
  ctx.fillStyle = primary;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(trustX, rsvpY, pillW, pillH, 8);
  } else {
    ctx.rect(trustX, rsvpY, pillW, pillH);
  }
  ctx.fill();

  ctx.fillStyle = onPrimary;
  ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    locale === 'sw' ? 'Ndio, Nitafika' : 'Yes, Attending',
    trustX + pillW / 2,
    rsvpY + 19,
  );

  // No pill (outline primary)
  ctx.strokeStyle = primary;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(trustX + pillW + 14, rsvpY, pillW, pillH, 8);
  } else {
    ctx.rect(trustX + pillW + 14, rsvpY, pillW, pillH);
  }
  ctx.stroke();

  ctx.fillStyle = primary;
  ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
  ctx.fillText(
    locale === 'sw' ? 'Hapana, Sitafika' : 'No, Regrets',
    trustX + pillW + 14 + pillW / 2,
    rsvpY + 19,
  );

  // QR Code Box (or Contribution summary box)
  if (!options.isContribution) {
    const qBoxW = 260;
    const qBoxH = 260;
    const qBoxX = (W - qBoxW) / 2;
    const qBoxY = rsvpY + pillH + 14;

    // White box shadow + border
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.06)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    ctx.fillRect(qBoxX, qBoxY, qBoxW, qBoxH);
    ctx.shadowColor = 'transparent';

    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(qBoxX, qBoxY, qBoxW, qBoxH);

    // Render QR Code modules
    const payload =
      options.qrPayload || (options.shortCode ? `v1.preview.${options.shortCode}` : SAMPLE_PAYLOAD);
    const m = qrMatrix(payload);
    const qrDim = 150;
    const totalDim = m.size + QR_QUIET_ZONE * 2;
    const mod = qrDim / totalDim;
    const qx = (W - qrDim) / 2;
    const qy = qBoxY + 16;

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
    ctx.font = 'bold 24px ui-monospace, Menlo, monospace';
    if ('letterSpacing' in ctx) {
      (ctx as unknown as { letterSpacing: string }).letterSpacing = '2.5px';
    }
    ctx.fillText(code, W / 2, qBoxY + 198);
    if ('letterSpacing' in ctx) {
      (ctx as unknown as { letterSpacing: string }).letterSpacing = '0px';
    }

    // Gate entry instruction
    ctx.fillStyle = '#64748B';
    ctx.font = '600 10px system-ui, -apple-system, sans-serif';
    ctx.fillText(
      locale === 'sw' ? 'ONYESHA MLANGONI KWA UTHIBITISHO' : 'SHOW AT ENTRANCE FOR ENTRY',
      W / 2,
      qBoxY + 230,
    );
  } else {
    // Contribution card body
    const cBoxW = 440;
    const cBoxH = 220;
    const cBoxX = (W - cBoxW) / 2;
    const cBoxY = rsvpY + pillH + 16;

    ctx.fillStyle = '#F8FAFC';
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1.5;
    ctx.fillRect(cBoxX, cBoxY, cBoxW, cBoxH);
    ctx.strokeRect(cBoxX, cBoxY, cBoxW, cBoxH);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      locale === 'sw' ? 'Ahsante kwa Mchango Wako' : 'Thank You for Your Contribution',
      W / 2,
      cBoxY + 54,
    );

    ctx.fillStyle = '#475569';
    ctx.font = '13px system-ui, -apple-system, sans-serif';
    ctx.fillText(
      locale === 'sw'
        ? 'Mchango wako unajenga fanaka ya shughuli hii.'
        : 'Your generous contribution makes this celebration possible.',
      W / 2,
      cBoxY + 95,
    );

    ctx.font = 'bold 20px ui-monospace, Menlo, monospace';
    ctx.fillStyle = primary;
    ctx.fillText(`KODI: ${code}`, W / 2, cBoxY + 150);
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
  ctx.fillText(`Kadi Sasa · ${kindLabel} · kadisasa.com`, W / 2, my + ch - 18);

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
