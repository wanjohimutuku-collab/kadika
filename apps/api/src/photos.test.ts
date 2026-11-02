import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { processPhoto } from './photos/process';
import { MemoryPhotoStore } from './photos/store';

/** A real JPEG with EXIF (camera and GPS fields) and orientation 6 (rotate 90°), 400×200 as stored. */
async function jpegWithExif() {
  return new Uint8Array(
    await sharp({ create: { width: 400, height: 200, channels: 3, background: '#0F5C4D' } })
      // sharp takes the orientation from withMetadata, not from an EXIF tag set by hand
      .withMetadata({ orientation: 6 })
      .withExif({
        IFD0: { Make: 'TestCam' },
        IFD3: { GPSLatitudeRef: 'S', GPSLatitude: '6/1 48/1 0/1' },
      })
      .jpeg()
      .toBuffer(),
  );
}

describe('processPhoto', () => {
  it('writes WebP with no metadata, upright, within 1280 and 320 px', async () => {
    const input = await jpegWithExif();
    const before = await sharp(input).metadata(); // the fixture really carries EXIF and orientation
    expect(before.exif).toBeDefined();
    expect(before.orientation).toBe(6);
    const out = await processPhoto(input);
    const full = await sharp(out.full).metadata();
    const thumb = await sharp(out.thumb).metadata();
    expect(full.format).toBe('webp');
    expect(full.exif).toBeUndefined();
    expect(full.icc).toBeUndefined();
    expect(full.xmp).toBeUndefined();
    // orientation 6: the 400×200 pixels are shown as 200×400
    expect({ w: out.width, h: out.height }).toEqual({ w: 200, h: 400 });
    expect(Math.max(thumb.width!, thumb.height!)).toBeLessThanOrEqual(320);
  });

  it('shrinks big photos to 1280 px on the longest side', async () => {
    const big = new Uint8Array(
      await sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#fff' } })
        .png()
        .toBuffer(),
    );
    const out = await processPhoto(big);
    expect({ w: out.width, h: out.height }).toEqual({ w: 1280, h: 853 });
  });

  it('refuses a file that is not an image as invalid_image', async () => {
    await expect(processPhoto(new TextEncoder().encode('not a photo at all'))).rejects.toMatchObject(
      { code: 'validation', details: { reason: 'invalid_image' } },
    );
  });

  it('refuses more than 8 MB before decoding', async () => {
    await expect(processPhoto(new Uint8Array(8 * 1024 * 1024 + 1))).rejects.toMatchObject({
      details: { reason: 'too_large' },
    });
  });
});

describe('MemoryPhotoStore', () => {
  it('puts, gets and deletes', async () => {
    const s = new MemoryPhotoStore();
    await s.put('events/e/m.webp', new Uint8Array([1, 2]));
    expect(await s.get('events/e/m.webp')).toEqual(new Uint8Array([1, 2]));
    await s.delete('events/e/m.webp');
    expect(await s.get('events/e/m.webp')).toBeNull();
  });
});
