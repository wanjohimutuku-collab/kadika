import { describe, expect, it } from 'vitest';
import {
  scanSmsFrames,
  scanSmsImage,
  stretchGreyscale,
  type MobileSmsImage,
  type MobileTextReader,
} from '../sms-ocr';

const image: MobileSmsImage = { uri: 'file:///tmp/sms.jpg' };
const reads =
  (text: string): MobileTextReader =>
  async () =>
    text;
const fails: MobileTextReader = async () => {
  throw new Error('reader unavailable');
};

const roster = [
  {
    shortCode: 'KH-4821',
    displayName: 'Juma Bakari',
    guestShort: '4a6f4821',
    token: 'tok_juma_4821',
  },
  {
    shortCode: 'KH-4826',
    displayName: 'Mwanaidi Salim',
    guestShort: '4a6f4826',
    token: 'aB3dE_fGhIjK',
  },
  {
    shortCode: 'UR-8766',
    displayName: 'Asha Mwinyi',
    guestShort: '4a6f8766',
    token: 'xY9zW_qRsTuV',
  },
];

describe('mobile sms-ocr', () => {
  it('extracts a full short code from an SMS snapshot', async () => {
    const sms =
      'Karibu kwenye harusi ya Asha & Juma, 14 Des 2026.\nKadi yako: https://k.sasa.tz/s/aB3dE\nNamba: KH-4826';
    expect(await scanSmsImage(image, [reads(sms)], roster)).toEqual({
      kind: 'code',
      code: 'KH-4826',
    });
  });

  it('matches partial SMS screens on feature or disposable phones that cannot display the whole message', async () => {
    // 1. Only the opening lines (greeting + guest name) fit on the feature phone screen
    expect(
      await scanSmsImage(
        image,
        [reads('12:45 Vodacom\nHabari Mwanaidi Salim, unaalikwa kwenye harusi ya Asha & Juma...')],
        roster,
      ),
    ).toEqual({ kind: 'code', code: 'KH-4826' });

    // 2. Only the middle lines with the short link fit on the screen
    expect(
      await scanSmsImage(
        image,
        [reads('...tarehe 14 Des. Fungua kadi yako: https://k.sasa.tz/s/aB3dE_fGh...')],
        roster,
      ),
    ).toEqual({ kind: 'code', code: 'KH-4826' });

    // 3. Only the bottom line where the Namba: label scrolled off-screen or the code was clipped
    expect(await scanSmsImage(image, [reads('K5-4B21')], roster)).toEqual({
      kind: 'code',
      code: 'KH-4821',
    });
    expect(await scanSmsImage(image, [reads('...mba: UR-87')], roster)).toEqual({
      kind: 'code',
      code: 'UR-8766',
    });
  });

  it('stitches multi-frame captures when a guest scrolls a small feature phone screen', async () => {
    const f1: MobileSmsImage = { text: 'Karibu kwenye harusi ya Asha & Juma.\nKadi yako: Namba:' };
    const f2: MobileSmsImage = { text: 'KH-4B21' };
    expect(await scanSmsFrames([f1, f2], undefined, roster)).toEqual({
      kind: 'code',
      code: 'KH-4821',
    });
  });

  it('returns no_code with recognized text when no guest matches, and unavailable when no reader runs', async () => {
    expect(await scanSmsImage(image, [reads('12:45 Safaricom 4G 85%')], roster)).toEqual({
      kind: 'no_code',
      text: '12:45 Safaricom 4G 85%',
    });
    expect(await scanSmsImage(image, [fails, fails], roster)).toEqual({
      kind: 'unavailable',
    });
  });

  it('stretches greyscale pixels to full contrast for dim feature-phone LCD screens', () => {
    const px = new Uint8ClampedArray([90, 90, 90, 255, 160, 160, 160, 255]);
    stretchGreyscale(px);
    expect([...px]).toEqual([0, 0, 0, 255, 255, 255, 255, 255]);
  });
});
