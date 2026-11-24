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
    const medium = await sharp(out.medium).metadata();
    expect({ w: medium.width, h: medium.height, f: medium.format }).toEqual({
      w: 640,
      h: 427,
      f: 'webp',
    });
  });

  it('refuses a file that is not an image as invalid_image', async () => {
    await expect(
      processPhoto(new TextEncoder().encode('not a photo at all')),
    ).rejects.toMatchObject({ code: 'validation', details: { reason: 'invalid_image' } });
  });

  it('refuses a small file that decodes to more pixels than any camera makes', async () => {
    const bomb = new Uint8Array(
      await sharp({ create: { width: 8000, height: 8000, channels: 3, background: '#fff' } })
        .png()
        .toBuffer(),
    );
    expect(bomb.length).toBeLessThan(8 * 1024 * 1024);
    await expect(processPhoto(bomb)).rejects.toMatchObject({
      details: { reason: 'invalid_image' },
    });
  });

  it('finishes every photo when many arrive at once', async () => {
    const input = await jpegWithExif();
    const outs = await Promise.all(Array.from({ length: 6 }, () => processPhoto(input)));
    expect(outs.map((o) => o.width)).toEqual([200, 200, 200, 200, 200, 200]);
  });

  it('refuses more than 8 MB before decoding', async () => {
    await expect(processPhoto(new Uint8Array(8 * 1024 * 1024 + 1))).rejects.toMatchObject({
      details: { reason: 'too_large' },
    });
  });

  it('produces compact WebP tiers for detailed photos', async () => {
    const w = 1600;
    const h = 1200;
    const raw = Buffer.alloc(w * h * 3);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 3;
        raw[idx] = Math.round(128 + 90 * Math.sin(x / 95) * Math.cos(y / 70));
        raw[idx + 1] = Math.round(115 + 85 * Math.cos((x + y) / 110));
        raw[idx + 2] = Math.round(135 + 80 * Math.sin(y / 85));
      }
    }
    const png = new Uint8Array(
      await sharp(raw, { raw: { width: w, height: h, channels: 3 } })
        .png()
        .toBuffer(),
    );
    const out = await processPhoto(png);
    const fullMeta = await sharp(out.full).metadata();
    expect(fullMeta.format).toBe('webp');
    expect(fullMeta.exif).toBeUndefined();
    expect(out.thumb.length).toBeLessThan(out.medium.length);
    expect(out.medium.length).toBeLessThan(out.full.length);
    expect(out.full.length).toBeLessThan(png.length);
    expect(out.full.length).toBeLessThan(150 * 1024);
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
