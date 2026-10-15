/** §6.4 / §17.7 print rules, in millimetres. Pure so they can be asserted in tests. */
export const MIN_QR_MM = 25;
export const MIN_MODULE_MM = 0.8;
export const QUIET_MODULES = 4;
export const MIN_CODE_PT = 12;
export const BLEED_MM = 3;
export const SAFE_MM = 8;
export const PT_PER_MM = 72 / 25.4;

export const PAGE_MM = { a6: { w: 105, h: 148 }, a5: { w: 148, h: 210 }, a4: { w: 210, h: 297 } };

export interface QrPlan {
  /** Edge of the dark-module area (without quiet zone). */
  symbolMm: number;
  moduleMm: number;
  quietMm: number;
  /** Edge of the whole white block, quiet zone included. */
  blockMm: number;
}

/**
 * Plans a QR of `modules` × `modules`. Throws if the result would break the print spec — the PDF
 * is never produced with a smaller or denser code (P5). `moduleMm` is the wanted module size.
 */
export function planQr(
  modules: number,
  moduleMm = 0.9,
  opts: { allowSmall?: boolean } = {},
): QrPlan {
  if (!opts.allowSmall) {
    if (moduleMm < MIN_MODULE_MM)
      throw new Error(
        `QR module ${moduleMm.toFixed(2)} mm is below the ${MIN_MODULE_MM} mm minimum`,
      );
  }
  const symbolMm = modules * moduleMm;
  if (!opts.allowSmall && symbolMm < MIN_QR_MM)
    throw new Error(`QR ${symbolMm.toFixed(1)} mm is below the ${MIN_QR_MM} mm minimum`);
  const quietMm = QUIET_MODULES * moduleMm;
  return { symbolMm, moduleMm, quietMm, blockMm: symbolMm + 2 * quietMm };
}

/** The smallest module size that satisfies both limits for a code of this density. */
export function moduleSizeFor(modules: number, preferredMm = 0.9): number {
  return Math.max(preferredMm, MIN_MODULE_MM, MIN_QR_MM / modules);
}

export type PrintFormat = 'a6' | 'a5' | 'a4x4' | 'test';
