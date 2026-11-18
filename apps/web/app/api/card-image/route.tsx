import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { resolvePalette, sanitizeOverrides } from '@harusi/ui-tokens/palette';
import {
  cardTemplateOf,
  defaultSender,
  eventKindLabel,
  eventKindOf,
  hostNames,
} from '@harusi/schemas';
import {
  CARD_TEMPLATES,
  pick,
  renderTemplate,
  type CardContent,
  type CardTemplate,
} from '@harusi/schemas/card-content';
import { pickMessages } from '@harusi/i18n';
import { senderNameFor } from '@harusi/api-client';
import { formatIcu } from '@/lib/icu';
import { formatDateShort, formatPhone, formatTime, formatWeekday, swahiliTime } from '@/lib/format';
import { qrMatrix, qrPath, QR_QUIET_ZONE } from '@/lib/qr';
import { previewCardOnServer } from '@/lib/server-card';
import { peekShortCodeOnServer } from '@/lib/server-mock';
import {
  CARD_IMAGE_HEIGHT,
  CARD_IMAGE_WIDTH,
  CardImage,
  type CardImageModel,
} from '@/lib/card-image/templates';
import { loadCardFonts } from '@/lib/card-image/fonts';

export const runtime = 'nodejs';

const SAMPLE_PAYLOAD = 'v1.0192f1a0.preview0.2.1.MOCKSIG';
const SAFE_GRADIENT = /^[\w\s#%.,()+/-]{1,300}$/;

/**
 * The shareable card image (WhatsApp media, downloads, console previews) in one of the two
 * templates (ADR 058). It is a picture only: no RSVP/pay buttons; those live on `/c/[token]`.
 * With `token` (or `code`) the real card is used; query params fill in for previews.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = url.searchParams;
  const locale = (q.get('locale') === 'en' ? 'en' : 'sw') as 'sw' | 'en';
  const forceDownload = q.get('download') === '1' || q.get('download') === 'true';

  let token = q.get('token');
  if (!token && q.get('code') && q.get('preview') !== '1')
    token = peekShortCodeOnServer(q.get('code')!) || null;

  let cardView = null;
  if (token) {
    try {
      cardView = await previewCardOnServer(token);
    } catch {
      // fall back to query params
    }
  }
  const ev = cardView?.state === 'ok' ? cardView.event : null;
  const guest = cardView?.state === 'ok' ? cardView.guest : null;
  const content = (ev?.cardContent ?? {}) as CardContent;

  const isContribution =
    cardView?.cardKind === 'contribution' ||
    q.get('isContribution') === '1' ||
    q.get('kind') === 'contribution';

  const partnerA = ev?.partnerA || q.get('partnerA') || q.get('couple') || 'Asha';
  const partnerB = ev
    ? ev.partnerB || null
    : q.get('partnerB') || (q.get('partnerA') || q.get('couple') ? null : 'Juma');
  const coupleNames = ev?.coupleNames || q.get('couple') || hostNames(partnerA, partnerB);
  const eventKind = ev?.eventKind ?? q.get('eventKind') ?? 'Harusi';
  const dateStart = ev?.dateStart || q.get('date') || '2026-12-12T14:00:00Z';
  const venue =
    ev?.venueName ||
    q.get('venue') ||
    (locale === 'sw' ? 'Ukumbi Rasmi wa Sherehe' : 'Official Celebration Venue');
  const dress = ev?.dressCode || q.get('dress') || '';
  const sender = ev
    ? senderNameFor(ev, locale)
    : q.get('sender') || defaultSender(eventKind, coupleNames, 'committee', locale);
  const phoneRaw = content.sender?.phone?.trim() || ev?.committeePhone || q.get('phone') || '';
  const guestName =
    guest?.displayName || q.get('guest') || (locale === 'sw' ? 'Ndugu Mualikwa' : 'Honoured Guest');
  const shortCode = guest?.shortCode || q.get('code') || 'KH-4826';

  let overrides = ev?.palette;
  if (!ev && q.get('palette')) {
    try {
      overrides = sanitizeOverrides(JSON.parse(q.get('palette')!));
    } catch {
      overrides = undefined;
    }
  }
  const palette = resolvePalette(ev?.themeId || q.get('theme') || 'emerald-gold', overrides);
  const coverRaw = ev ? ev.coverGradient : q.get('cover');
  const cover = coverRaw && SAFE_GRADIENT.test(coverRaw) ? coverRaw : '';

  const qTemplate = q.get('template') ?? '';
  const template = (CARD_TEMPLATES as readonly string[]).includes(qTemplate)
    ? (qTemplate as CardTemplate)
    : cardTemplateOf(content);
  const design = content.design ?? {};

  // Same eyebrow wording as the digital card (ADR 041), the organiser's own text first.
  const t = (
    pickMessages(locale, ['card'], ev?.country ?? 'TZ') as unknown as {
      card: Record<string, string>;
    }
  ).card;
  const kindName = eventKindLabel(eventKind, locale);
  const kindOfName = eventKindOf(eventKind, locale);
  const own = pick(
    isContribution ? content.contribution?.eyebrow : content.invitation?.eyebrow,
    locale,
  );
  const eyebrow = own
    ? renderTemplate(own, { hosts: coupleNames, kind: kindName.toLowerCase(), guest: guestName })
    : isContribution
      ? formatIcu(t.contribEyebrow!, { kind: kindName.toLowerCase() })
      : formatIcu(t.weddingOf!, { kind: kindName, kindOf: kindOfName });

  const valid = !Number.isNaN(Date.parse(dateStart));
  const showWhen = !isContribution || content.contribution?.show?.eventDetails !== false;
  const dayParts = valid ? formatDateShort(dateStart, locale).split(' ') : [];

  let qrD: string | null = null;
  let qrDim = 0;
  const showQr = q.get('qr') !== '0' && design.showQr !== false;
  if (!isContribution && showQr) {
    const qr = qrMatrix(
      cardView?.qrPayload || (shortCode ? `v1.preview.${shortCode}` : SAMPLE_PAYLOAD),
    );
    qrD = qrPath(qr);
    qrDim = qr.size + QR_QUIET_ZONE * 2;
  }

  // Organiser's own text (script / botanical templates), then a built-in line per card kind.
  const fill = (v: string | undefined) =>
    v
      ? renderTemplate(v, { hosts: coupleNames, guest: guestName, kind: kindName.toLowerCase() })
      : '';
  const own2 = (k: 'title' | 'message' | 'footer') => q.get(k) ?? fill(pick(design[k], locale));
  const sw = locale === 'sw';
  const plural = !!partnerB;
  const title =
    own2('title') ||
    (isContribution
      ? sw
        ? 'Tunakuomba kwa heshima kuchangia kufanikisha sherehe hii'
        : 'kindly ask for your support towards this celebration'
      : sw
        ? `${plural ? 'Wanakualika' : 'Anakualika'} kwa furaha kushiriki sherehe ya ${kindName.toLowerCase()}`
        : `${plural ? 'invite' : 'invites'} you to share in the ${kindName.toLowerCase()} celebration`);
  const message = own2('message');
  const footer =
    own2('footer') ||
    (dress && !isContribution ? (sw ? `Mavazi: ${dress}` : `Dress: ${dress}`) : '');

  const model: CardImageModel = {
    title,
    message,
    footer,
    template,
    locale,
    isContribution,
    eyebrow,
    partnerA,
    partnerB,
    guestName,
    dateLine:
      valid && showWhen
        ? `${formatWeekday(dateStart, locale)}, ${formatDateShort(dateStart, locale)}`
        : '',
    timeLine:
      valid && showWhen
        ? locale === 'sw'
          ? `Saa ${swahiliTime(dateStart)}`
          : formatTime(dateStart, locale)
        : '',
    day: showWhen ? (dayParts[0] ?? '') : '',
    month: showWhen ? (dayParts[1] ?? '') : '',
    venue,
    dress,
    sender,
    phone: phoneRaw ? formatPhone(phoneRaw, ev?.country ?? 'TZ') : '',
    shortCode,
    qrPath: qrD,
    qrDim,
    palette,
    cover,
    domain: q.get('domain') || url.host.replace(/^www\./, '') || 'kadisasa.com',
  };

  const file = `kadi-${shortCode.toLowerCase()}.png`;
  const fonts = await loadCardFonts();
  return new ImageResponse(<CardImage m={model} />, {
    ...(fonts ? { fonts } : {}),
    width: CARD_IMAGE_WIDTH,
    height: CARD_IMAGE_HEIGHT,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'Content-Disposition': `${forceDownload ? 'attachment' : 'inline'}; filename="${file}"`,
    },
  });
}
