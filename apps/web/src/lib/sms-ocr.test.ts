import { describe, expect, it } from 'vitest';
import tesseractPkg from 'tesseract.js/package.json';
import {
  OCR_ASSET_BASE,
  scanSmsFrames,
  scanSmsImage,
  stretchGreyscale,
  tesseractPaths,
  type SmsImage,
  type TextReader,
} from './sms-ocr';

const image = {} as SmsImage;
const reads =
  (text: string): TextReader =>
  async () =>
    text;
const fails: TextReader = async () => {
  throw new Error('not here');
};

describe('scanSmsImage', () => {
  it('takes the card number out of the recognised SMS text', async () => {
    const sms =
      'Karibu kwenye harusi ya Juma na Amina, 12 Des 2026.\nKadi yako: https://k.sasa.tz/s/aB3dE\nNamba: KH-4823';
    expect(await scanSmsImage(image, [reads(sms)])).toEqual({ kind: 'code', code: 'KH-4823' });
  });

  it('falls through to the next reader when one cannot run or finds nothing', async () => {
    expect(await scanSmsImage(image, [fails, reads('Code: UR-8766')])).toEqual({
      kind: 'code',
      code: 'UR-8766',
    });
    expect(await scanSmsImage(image, [reads('blurry'), reads('Namba: K5-4B23')])).toEqual({
      kind: 'code',
      code: 'KS-4823',
    });
  });

  it('says no_code when text was read but held no card number', async () => {
    expect(await scanSmsImage(image, [reads('12:45 Safaricom 4G 85%')])).toEqual({
      kind: 'no_code',
    });
  });

  it('says unavailable when no reader could run in this browser', async () => {
    expect(await scanSmsImage(image, [fails, fails])).toEqual({ kind: 'unavailable' });
  });

  it('matches partial SMS text on feature or disposable phones that cannot show the whole message', async () => {
    const roster = [
      { shortCode: 'KH-4821', displayName: 'Juma Bakari', token: 'tok_juma_123' },
      { shortCode: 'KH-4826', displayName: 'Mwanaidi Salim', token: 'aB3dE_fGhIjK' },
    ];
    // Top of SMS only (guest name visible, code at bottom cut off)
    expect(
      await scanSmsImage(
        image,
        [reads('Habari Mwanaidi Salim, unaalikwa kwenye harusi ya Asha & Juma...')],
        roster,
      ),
    ).toEqual({ kind: 'code', code: 'KH-4826' });

    // Multi-frame scroll across two small screens
    const f1 = { id: 1 } as unknown as SmsImage;
    const f2 = { id: 2 } as unknown as SmsImage;
    const frameReader: TextReader = async (img) =>
      (img as unknown as { id: number }).id === 1
        ? 'Karibu kwenye harusi ya Asha & Juma.\nNamba:'
        : 'KH-4B21';
    expect(await scanSmsFrames([f1, f2], [frameReader], roster)).toEqual({
      kind: 'code',
      code: 'KH-4821',
    });
  });
});

describe('stretchGreyscale', () => {
  it('maps the darkest pixel to black and the lightest to white', () => {
    const px = new Uint8ClampedArray([100, 100, 100, 255, 150, 150, 150, 255]);
    stretchGreyscale(px);
    expect([...px]).toEqual([0, 0, 0, 255, 255, 255, 255, 255]);
  });
});

describe('tesseractPaths', () => {
  it('loads the engine and model from our own origin, in the folder copy-ocr-assets writes', () => {
    expect(OCR_ASSET_BASE).toBe(`/ocr/tesseract-${tesseractPkg.version}`);
    for (const p of [tesseractPaths.workerPath, tesseractPaths.corePath, tesseractPaths.langPath]) {
      expect(p.startsWith(`${OCR_ASSET_BASE}/`)).toBe(true);
    }
    // A blob: worker would need blob: in the console CSP's worker-src.
    expect(tesseractPaths.workerBlobURL).toBe(false);
  });
});
