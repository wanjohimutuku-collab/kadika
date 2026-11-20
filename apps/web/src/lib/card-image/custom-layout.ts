import type { CardFont, CustomElement, CustomElementType } from '@harusi/schemas';

/**
 * Geometry shared by the Card Studio canvas (browser) and the `custom` card image (satori), so what
 * the organiser drags is exactly what guests receive. Everything is in card pixels (640×940); the
 * canvas multiplies by its on-screen scale.
 *
 * Position model: `x` is the element's horizontal anchor (its centre, left edge or right edge
 * depending on `textAlign`), `y` is its top edge, both in percent of the card.
 */
export const CARD_W = 640;
export const CARD_H = 940;
/** Margin kept between text and the card edge. */
export const EDGE = 24;
export const QR_SIZE = 110;

export const SERIF = '"Playfair Display", Georgia, serif';
export const SCRIPT = '"Mrs Saint Delafield", "Playfair Display", serif';
export const SANS = '"DM Sans", sans-serif';
export const MONO = 'ui-monospace, Menlo, Consolas, monospace';

/**
 * The card image ships three font families (assets/card-fonts). Older/extra font ids map onto the
 * closest one, so the editor never shows a font the image cannot draw.
 */
export function fontCss(font?: CardFont): string {
  switch (font) {
    case 'script':
    case 'greatvibes':
      return SCRIPT;
    case 'playfair':
    case 'cinzel':
    case 'cormorant':
      return SERIF;
    case 'mono':
      return MONO;
    default:
      return SANS;
  }
}

/** The font id the studio shows for a stored id (legacy ids collapse onto a real font). */
export function canonicalFont(font?: CardFont): 'playfair' | 'script' | 'dmsans' | 'mono' {
  switch (font) {
    case 'script':
    case 'greatvibes':
      return 'script';
    case 'playfair':
    case 'cinzel':
    case 'cormorant':
      return 'playfair';
    case 'mono':
      return 'mono';
    default:
      return 'dmsans';
  }
}

export function fontWeightOf(weight?: CustomElement['fontWeight']): number {
  switch (weight) {
    case 'medium':
      return 600;
    case 'bold':
      return 700;
    case 'black':
      return 800;
    default:
      return 400;
  }
}

const DEFAULT_SIZE: Partial<Record<CustomElementType, number>> = {
  eyebrow: 13,
  names: 36,
  title: 14,
  guest: 14,
  message: 12,
  date: 15,
  venue: 13,
  dress: 11,
  sender: 11,
  footer: 12,
  freeText: 18,
};

export function fontSizeOf(el: CustomElement): number {
  return el.fontSize ?? DEFAULT_SIZE[el.type] ?? 14;
}

const MAX_TEXT_WIDTH: Partial<Record<CustomElementType, number>> = {
  title: 480,
  message: 500,
  venue: 480,
  footer: 480,
  freeText: 520,
};

export function maxTextWidthOf(el: CustomElement): number | undefined {
  return MAX_TEXT_WIDTH[el.type];
}

export interface ElementBox {
  left: number;
  top: number;
  width: number;
  justify: 'flex-start' | 'center' | 'flex-end';
}

/** Where an element's (full-width) positioning row sits on the card, in card pixels. */
export function elementBox(el: Pick<CustomElement, 'x' | 'y' | 'textAlign'>): ElementBox {
  const ax = (el.x / 100) * CARD_W;
  const top = Math.round((el.y / 100) * CARD_H);
  const align = el.textAlign ?? 'center';
  if (align === 'left') {
    return { left: ax, top, width: Math.max(40, CARD_W - ax - EDGE), justify: 'flex-start' };
  }
  if (align === 'right') {
    return { left: EDGE, top, width: Math.max(40, ax - EDGE), justify: 'flex-end' };
  }
  const width = CARD_W - EDGE * 2;
  return { left: Math.round(ax - width / 2), top, width, justify: 'center' };
}

export function imageSizeOf(el: CustomElement): { width: number; height: number } {
  return {
    width: Math.round(((el.width ?? 25) / 100) * CARD_W),
    height: Math.round(((el.height ?? 25) / 100) * CARD_H),
  };
}

/** The already-worded lines a card offers its elements (same for the editor and the image). */
export interface CardTextContext {
  locale: 'sw' | 'en';
  eyebrow: string;
  couple: string;
  /** The organiser's card-level title / message / footer; an element's own text wins over them. */
  title: string;
  message: string;
  footer: string;
  guestName: string;
  dateLine: string;
  venue: string;
  dress: string;
  sender: string;
  phone: string;
}

const own = (el: CustomElement, locale: 'sw' | 'en'): string => {
  const c = el.content;
  if (!c) return '';
  return (c[locale] || c[locale === 'sw' ? 'en' : 'sw'] || '').trim();
};

/** The text an element prints, or '' when it has nothing to show (it is then skipped). */
export function elementText(el: CustomElement, ctx: CardTextContext): string {
  const sw = ctx.locale === 'sw';
  switch (el.type) {
    case 'eyebrow':
      return ctx.eyebrow;
    case 'names':
      return ctx.couple;
    case 'title':
      return own(el, ctx.locale) || ctx.title;
    case 'message':
      return own(el, ctx.locale) || ctx.message;
    case 'footer':
      return own(el, ctx.locale) || ctx.footer;
    case 'guest':
      return `${sw ? 'Mwaliko kwa:' : 'Invitation for:'} ${ctx.guestName}`;
    case 'date':
      return ctx.dateLine;
    case 'venue':
      return ctx.venue;
    case 'dress':
      return ctx.dress ? `${sw ? 'Mavazi' : 'Dress code'}: ${ctx.dress}` : '';
    case 'sender':
      return ctx.sender
        ? `${sw ? 'Kutoka' : 'From'}: ${ctx.sender}${ctx.phone ? ` · ${ctx.phone}` : ''}`
        : '';
    case 'freeText':
      return own(el, ctx.locale) || (sw ? 'Maandishi Yako' : 'Your Custom Text');
    default:
      return '';
  }
}

/** Element types whose words the organiser can type in the studio. */
export const EDITABLE_TEXT_TYPES: readonly CustomElementType[] = [
  'title',
  'message',
  'footer',
  'freeText',
];

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
  color: string;
  letterSpacing: number;
  textTransform: 'none' | 'uppercase' | 'capitalize' | 'lowercase';
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
  maxWidth?: number;
}

/** Card-pixel text style of an element. */
export function elementTextStyle(
  el: CustomElement,
  colors: { text: string; accent: string },
): TextStyle {
  const accentDefault = el.type === 'eyebrow' || el.type === 'date';
  return {
    fontFamily: fontCss(el.fontFamily),
    fontSize: fontSizeOf(el),
    fontWeight: fontWeightOf(el.fontWeight),
    fontStyle: el.fontStyle ?? (el.type === 'title' ? 'italic' : 'normal'),
    color: el.color || (accentDefault ? colors.accent : colors.text),
    letterSpacing: el.letterSpacing ?? (el.type === 'eyebrow' ? 3 : el.type === 'date' ? 1 : 0),
    textTransform: el.textTransform ?? (el.type === 'eyebrow' ? 'uppercase' : 'none'),
    textAlign: el.textAlign ?? 'center',
    lineHeight: el.type === 'names' ? 1.15 : 1.35,
    maxWidth: maxTextWidthOf(el),
  };
}

/**
 * Only inline images are drawn: uploads and stickers are data URIs. A remote URL would make the
 * server fetch whatever a crafted preview link points at, so it is dropped.
 */
export function safeImageSrc(src: string | undefined): string | null {
  if (!src) return null;
  return /^data:image\/(png|jpe?g|gif|svg\+xml)[;,]/i.test(src) ? src : null;
}
