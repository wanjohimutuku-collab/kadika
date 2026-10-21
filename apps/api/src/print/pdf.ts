import {
  PDFDocument,
  StandardFonts,
  cmyk,
  degrees,
  type CMYK,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib';
import { resolvePalette, type Palette } from '@harusi/ui-tokens/palette';
import QRCodeCore from 'qrcode/lib/core/qrcode.js';
import {
  BLEED_MM,
  MIN_CODE_PT,
  PAGE_MM,
  PT_PER_MM,
  SAFE_MM,
  moduleSizeFor,
  planQr,
  type PrintFormat,
  type QrPlan,
} from './spec';

export interface CardData {
  coupleNames: string;
  guestName: string;
  shortCode: string;
  qrToken: string;
  dateText: string;
  venue: string;
  dressCode: string;
  committeePhone: string;
  language: 'sw' | 'en';
}

const mm = (v: number) => v * PT_PER_MM;
// CMYK-safe: a rich black for text, pure K for the QR. The card's own colours come from its theme.
const INK = cmyk(0, 0, 0, 0.9);
const QR_BLACK = cmyk(0, 0, 0, 1);
const WHITE = cmyk(0, 0, 0, 0);

/** `#RRGGBB` → CMYK for the press (plain conversion; the printer's profile does the rest). */
export function hexToCmyk(hex: string): CMYK {
  const n = parseInt(hex.replace('#', ''), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255) as [
    number,
    number,
    number,
  ];
  const k = 1 - Math.max(r, g, b);
  if (k >= 1) return cmyk(0, 0, 0, 1);
  const c = (1 - r - k) / (1 - k);
  const m = (1 - g - k) / (1 - k);
  const y = (1 - b - k) / (1 - k);
  const round = (v: number) => Math.round(v * 1000) / 1000;
  return cmyk(round(c), round(m), round(y), round(k));
}

/** The colours a printed card is drawn in: the same theme and palette as the guest's digital card. */
export interface PrintTheme {
  primary: CMYK;
  accent: CMYK;
  pattern: CMYK;
  ink: CMYK;
  surface: CMYK;
  border: CMYK;
}

/** From an event's `brand_theme` (`{ themeId, palette }`), as the digital card resolves it (ADR 042). */
export function printThemeFrom(brandTheme: Record<string, unknown> | null | undefined): PrintTheme {
  const t = brandTheme ?? {};
  const p: Palette = resolvePalette(
    typeof t.themeId === 'string' ? t.themeId : null,
    (t.palette as Record<string, string> | undefined) ?? null,
  );
  return {
    primary: hexToCmyk(p.primary),
    accent: hexToCmyk(p.accent),
    pattern: hexToCmyk(p.pattern),
    ink: hexToCmyk(p.ink),
    surface: hexToCmyk(p.surface),
    border: hexToCmyk(p.border),
  };
}

const DEFAULT_THEME = printThemeFrom(null);

/** Standard PDF fonts only cover WinAnsi; anything else becomes `?` instead of failing the batch. */
function safe(text: string): string {
  return text.replace(/[^\x20-\x7e\u00a0-ÿ]/g, '?');
}

function matrix(text: string): { size: number; dark: (x: number, y: number) => boolean } {
  const qr = QRCodeCore.create(text, { errorCorrectionLevel: 'M' });
  return { size: qr.modules.size, dark: (x, y) => qr.modules.data[y * qr.modules.size + x] === 1 };
}

function drawQr(page: PDFPage, text: string, xMm: number, yMm: number, plan: QrPlan) {
  const m = matrix(text);
  // White block first, so nothing printed behind the code can reduce its contrast (§6.4).
  page.drawRectangle({
    x: mm(xMm),
    y: mm(yMm),
    width: mm(plan.blockMm),
    height: mm(plan.blockMm),
    color: WHITE,
  });
  for (let y = 0; y < m.size; y++)
    for (let x = 0; x < m.size; x++)
      if (m.dark(x, y))
        page.drawRectangle({
          x: mm(xMm + plan.quietMm + x * plan.moduleMm),
          y: mm(yMm + plan.quietMm + (m.size - 1 - y) * plan.moduleMm),
          width: mm(plan.moduleMm) + 0.05, // a hair of overlap avoids hairline gaps in some RIPs
          height: mm(plan.moduleMm) + 0.05,
          color: QR_BLACK,
        });
  return m.size;
}

function centered(
  page: PDFPage,
  font: PDFFont,
  text: string,
  size: number,
  cx: number,
  y: number,
  color = INK,
) {
  const t = safe(text);
  let s = size;
  const max = page.getWidth() - mm(2 * SAFE_MM);
  while (font.widthOfTextAtSize(t, s) > max && s > 8) s -= 0.5; // long names shrink, never overflow
  page.drawText(t, { x: cx - font.widthOfTextAtSize(t, s) / 2, y, size: s, font, color });
}

/** The QR plan used on cards for this payload: throws if the §6.4 limits cannot be met. */
export function cardQrPlan(qrToken: string): QrPlan & { modules: number } {
  const modules = matrix(qrToken).size;
  return { ...planQr(modules, moduleSizeFor(modules)), modules };
}

interface Fonts {
  serif: PDFFont;
  serifBold: PDFFont;
  sans: PDFFont;
  sansBold: PDFFont;
}

/** One card inside a box whose lower-left corner is (ox, oy) mm and whose trim size is w × h mm. */
function drawCard(
  page: PDFPage,
  f: Fonts,
  c: CardData,
  ox: number,
  oy: number,
  w: number,
  h: number,
  theme: PrintTheme = DEFAULT_THEME,
) {
  const cx = mm(ox + w / 2);
  const sw = c.language === 'sw';
  // The card's paper colour, ornament and names follow its theme, like the digital card. The QR
  // block below is always pure black on white, whatever the theme (§6.4).
  page.drawRectangle({ x: mm(ox), y: mm(oy), width: mm(w), height: mm(h), color: theme.surface });
  // top ornament: a band in the accent with a row of small diamonds in the pattern tint
  const bandY = oy + h - SAFE_MM - 1;
  page.drawRectangle({
    x: mm(ox + SAFE_MM),
    y: mm(bandY),
    width: mm(w - 2 * SAFE_MM),
    height: mm(0.6),
    color: theme.accent,
  });
  for (let x = ox + SAFE_MM + 3; x < ox + w - SAFE_MM - 2; x += 6)
    page.drawSquare({
      x: mm(x),
      y: mm(bandY - 2.2),
      size: mm(1.2),
      rotate: degrees(45),
      color: theme.pattern,
    });
  // centre diamond under the band
  page.drawSquare({
    x: cx - mm(1.1),
    y: mm(oy + h - 19),
    size: mm(2.2),
    rotate: degrees(45),
    color: theme.accent,
  });
  centered(page, f.serifBold, c.coupleNames, 26, cx, mm(oy + h - 28), theme.primary);
  centered(
    page,
    f.sans,
    sw ? 'Wanawaalika' : 'You are invited,',
    11,
    cx,
    mm(oy + h - 40),
    theme.ink,
  );
  centered(page, f.serifBold, c.guestName, 18, cx, mm(oy + h - 48), theme.ink);
  centered(page, f.sansBold, c.dateText, 13, cx, mm(oy + h - 60), theme.ink);
  if (c.venue) centered(page, f.sans, c.venue, 12, cx, mm(oy + h - 67), theme.ink);
  if (c.dressCode)
    centered(
      page,
      f.sans,
      `${sw ? 'Mavazi' : 'Dress'}: ${c.dressCode}`,
      11,
      cx,
      mm(oy + h - 74),
      theme.ink,
    );
  if (c.committeePhone)
    centered(
      page,
      f.sans,
      `${sw ? 'Simu ya kamati' : 'Committee'}: ${c.committeePhone}`,
      10,
      cx,
      mm(oy + h - 81),
      theme.ink,
    );
  // a thin rule above the QR band, in the theme's border colour
  page.drawRectangle({
    x: mm(ox + SAFE_MM),
    y: mm(oy + SAFE_MM + cardQrPlan(c.qrToken).blockMm + 3),
    width: mm(w - 2 * SAFE_MM),
    height: mm(0.25),
    color: theme.border,
  });
  // bottom band: QR (left) and short code (right)
  const plan = cardQrPlan(c.qrToken);
  const qx = ox + SAFE_MM;
  const qy = oy + SAFE_MM;
  drawQr(page, c.qrToken, qx, qy, plan);
  const textX = mm(qx + plan.blockMm + 4);
  const room = mm(ox + w - SAFE_MM) - textX;
  page.drawText(sw ? 'Namba ya kadi' : 'Card number', {
    x: textX,
    y: mm(qy + plan.blockMm / 2 + 10),
    size: 9,
    font: f.sans,
    color: theme.ink,
  });
  let size = 22; // ≥ MIN_CODE_PT even for the longest code
  while (f.sansBold.widthOfTextAtSize(c.shortCode, size) > room && size > MIN_CODE_PT) size -= 1;
  page.drawText(c.shortCode, {
    x: textX,
    y: mm(qy + plan.blockMm / 2),
    size,
    font: f.sansBold,
    color: QR_BLACK,
  });
}

async function newDoc() {
  const doc = await PDFDocument.create();
  const f: Fonts = {
    serif: await doc.embedFont(StandardFonts.TimesRoman),
    serifBold: await doc.embedFont(StandardFonts.TimesRomanBold),
    sans: await doc.embedFont(StandardFonts.Helvetica),
    sansBold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
  return { doc, f };
}

function cropMarks(page: PDFPage, w: number, h: number, offset: number) {
  const len = 4;
  const lines: [number, number, number, number][] = [
    [offset - len, offset, offset - 1, offset],
    [offset, offset - len, offset, offset - 1],
    [offset + w + 1, offset, offset + w + len, offset],
    [offset + w, offset - len, offset + w, offset - 1],
    [offset - len, offset + h, offset - 1, offset + h],
    [offset, offset + h + 1, offset, offset + h + len],
    [offset + w + 1, offset + h, offset + w + len, offset + h],
    [offset + w, offset + h + 1, offset + w, offset + h + len],
  ];
  for (const [x1, y1, x2, y2] of lines)
    page.drawLine({
      start: { x: mm(x1), y: mm(y1) },
      end: { x: mm(x2), y: mm(y2) },
      thickness: 0.25,
      color: QR_BLACK,
    });
}

/** Builds the PDF for a batch of cards in the requested format (§17.7). */
export async function buildCardsPdf(
  format: Exclude<PrintFormat, 'test'>,
  cards: CardData[],
  theme: PrintTheme = DEFAULT_THEME,
): Promise<Uint8Array> {
  if (cards.length === 0) throw new Error('No cards to print');
  const { doc, f } = await newDoc();
  if (format === 'a4x4') {
    // 2 × 2 A6 per A4, cut-and-collate: page n holds guests 4n..4n+3 (cut, then stack).
    const { w, h } = PAGE_MM.a6;
    for (let i = 0; i < cards.length; i += 4) {
      const page = doc.addPage([mm(PAGE_MM.a4.w), mm(PAGE_MM.a4.h)]);
      for (let k = 0; k < 4 && i + k < cards.length; k++) {
        const ox = (k % 2) * w;
        const oy = PAGE_MM.a4.h - h - Math.floor(k / 2) * h;
        drawCard(page, f, cards[i + k]!, ox, oy, w, h, theme);
        page.drawRectangle({
          x: mm(ox),
          y: mm(oy),
          width: mm(w),
          height: mm(h),
          borderColor: QR_BLACK,
          borderWidth: 0.2,
        });
      }
    }
  } else {
    const { w, h } = PAGE_MM[format];
    for (const c of cards) {
      const page = doc.addPage([mm(w + 2 * BLEED_MM), mm(h + 2 * BLEED_MM)]);
      drawCard(page, f, c, BLEED_MM, BLEED_MM, w, h, theme);
      cropMarks(page, w, h, BLEED_MM);
    }
  }
  return doc.save();
}

/** §6.4 test sheet: the same code at 20 / 25 / 30 mm so the printer and phones can be checked. */
export async function buildTestSheetPdf(qrToken: string): Promise<Uint8Array> {
  const { doc, f } = await newDoc();
  const page = doc.addPage([mm(PAGE_MM.a4.w), mm(PAGE_MM.a4.h)]);
  page.drawText('Print test sheet / Karatasi ya majaribio', {
    x: mm(15),
    y: mm(280),
    size: 16,
    font: f.sansBold,
    color: INK,
  });
  page.drawText('Scan each code with at least three phones. Cards use the last (largest) size.', {
    x: mm(15),
    y: mm(272),
    size: 10,
    font: f.sans,
    color: INK,
  });
  const modules = matrix(qrToken).size;
  const cardPlan = cardQrPlan(qrToken);
  // Our signed payload is dense, so 25 mm gives modules well under 0.8 mm; cards therefore print the
  // larger size in the last row. The first three rows are the §6.4 comparison sizes.
  const rows: { label: string; plan: QrPlan }[] = [20, 25, 30].map((target) => ({
    label: `${target} mm${target < 25 ? ' (below the minimum, comparison only)' : ''}`,
    plan: planQr(modules, target / modules, { allowSmall: true }),
  }));
  rows.push({ label: 'Card size (used on printed cards)', plan: cardPlan });
  let y = 215;
  for (const { label, plan } of rows) {
    drawQr(page, qrToken, 15, y, plan);
    page.drawText(
      `${label} - symbol ${plan.symbolMm.toFixed(1)} mm, module ${plan.moduleMm.toFixed(2)} mm`,
      {
        x: mm(15 + plan.blockMm + 6),
        y: mm(y + plan.blockMm / 2),
        size: 11,
        font: f.sans,
        color: INK,
      },
    );
    y -= plan.blockMm + 10;
  }
  return doc.save();
}
