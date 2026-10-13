import QRCodeCore from 'qrcode/lib/core/qrcode';

/** §6.4: error correction M, quiet zone ≥ 4 modules, black on white only. */
export const QR_QUIET_ZONE = 4;

export interface QrMatrix {
  size: number;
  /** Row-major dark modules (true = black). */
  modules: boolean[];
}

export function qrMatrix(text: string): QrMatrix {
  const qr = QRCodeCore.create(text, { errorCorrectionLevel: 'M' });
  const size = qr.modules.size;
  const data = qr.modules.data;
  return { size, modules: Array.from({ length: size * size }, (_, i) => data[i] === 1) };
}

/** One SVG path for all dark modules — compact and crisp at any size. */
export function qrPath(m: QrMatrix, quiet = QR_QUIET_ZONE): string {
  let d = '';
  for (let y = 0; y < m.size; y++) {
    let x = 0;
    while (x < m.size) {
      if (!m.modules[y * m.size + x]) {
        x++;
        continue;
      }
      let w = 1;
      while (x + w < m.size && m.modules[y * m.size + x + w]) w++;
      d += `M${x + quiet} ${y + quiet}h${w}v1h-${w}z`;
      x += w;
    }
  }
  return d;
}

/** High-contrast PNG (data URL) drawn client-side, with the short code underneath. */
export function qrPngDataUrl(text: string, label: string, scale = 12): string {
  const m = qrMatrix(text);
  const dim = (m.size + QR_QUIET_ZONE * 2) * scale;
  const labelH = Math.round(scale * 5);
  const canvas = document.createElement('canvas');
  canvas.width = dim;
  canvas.height = dim + labelH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000000';
  for (let y = 0; y < m.size; y++) {
    for (let x = 0; x < m.size; x++) {
      if (m.modules[y * m.size + x])
        ctx.fillRect((x + QR_QUIET_ZONE) * scale, (y + QR_QUIET_ZONE) * scale, scale, scale);
    }
  }
  ctx.font = `bold ${Math.round(scale * 2.6)}px ui-monospace, Menlo, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, dim / 2, dim + labelH / 2 - scale);
  return canvas.toDataURL('image/png');
}

export const PRINT_MIN_QR_MM = 25;
export const PRINT_MIN_MODULE_MM = 0.8;

/**
 * Print rule (§6.4): the QR symbol (excluding its quiet zone) is ≥ 25 mm and each module ≥ 0.8 mm.
 * Returns the problems for a layout, empty if OK (ADR 008).
 */
export function printQrIssues(
  symbolSizeMm: number,
  moduleCount: number,
): ('min_size' | 'module_size')[] {
  const issues: ('min_size' | 'module_size')[] = [];
  if (symbolSizeMm < PRINT_MIN_QR_MM) issues.push('min_size');
  if (symbolSizeMm / moduleCount < PRINT_MIN_MODULE_MM) issues.push('module_size');
  return issues;
}

/** Smallest symbol size (mm) that satisfies both rules for a given module count. */
export function minPrintSizeMm(moduleCount: number): number {
  return Math.max(PRINT_MIN_QR_MM, Math.ceil(moduleCount * PRINT_MIN_MODULE_MM * 10) / 10);
}
