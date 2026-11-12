import sharp from 'sharp';
import { ApiError } from '../errors';

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
/** Bigger than any phone camera (≈ 50 MP); stops a small file that decodes to a huge image. */
export const MAX_PHOTO_PIXELS = 60_000_000;
/** Photos processed at once. A small VPS also runs the API and the gate sync, so this stays low. */
export const PHOTO_CONCURRENCY = 2;
// Prebuilt sharp has no HEIC decoder; phones hand browsers and the app picker JPEG anyway.
const ACCEPTED = new Set(['jpeg', 'png', 'webp']);

// One libvips thread per photo and no operation cache: memory stays flat on a small VPS.
sharp.concurrency(1);
sharp.cache(false);

const invalid = () =>
  new ApiError('validation', 'This file is not a photo we can use', {
    reason: 'invalid_image',
    field: 'photo',
  });

let running = 0;
const waiting: (() => void)[] = [];
/** At most PHOTO_CONCURRENCY photos decode at a time; the rest wait their turn. */
async function slot<T>(work: () => Promise<T>): Promise<T> {
  if (running >= PHOTO_CONCURRENCY) await new Promise<void>((go) => waiting.push(go));
  running++;
  try {
    return await work();
  } finally {
    running--;
    waiting.shift()?.();
  }
}

/**
 * Re-encodes an uploaded photo (ADR 050): turned upright from its EXIF orientation, then written as
 * WebP with **no metadata at all**, so a phone photo never reveals where it was taken.
 * The original is decoded once (JPEG shrink-on-load does most of the work); the three sizes are
 * cut from that 1280 px copy.
 */
export async function processPhoto(bytes: Uint8Array) {
  if (bytes.length > MAX_PHOTO_BYTES)
    throw new ApiError('validation', 'Photos can be at most 8 MB', {
      reason: 'too_large',
      field: 'photo',
    });
  return slot(async () => {
    const input = { limitInputPixels: MAX_PHOTO_PIXELS };
    let format: string | undefined;
    try {
      format = (await sharp(bytes, input).metadata()).format;
    } catch {
      throw invalid();
    }
    if (!format || !ACCEPTED.has(format)) throw invalid();
    try {
      // sharp drops all metadata unless asked to keep it; rotate() applies the EXIF orientation first.
      const base = await sharp(bytes, input)
        .rotate()
        .resize(1280, 1280, { fit: 'inside', withoutEnlargement: true })
        // a transparent PNG gets a white background rather than whatever colour hides under the alpha
        .flatten({ background: '#ffffff' })
        .raw()
        .toBuffer({ resolveWithObject: true });
      const { width, height, channels } = base.info;
      const from = () => sharp(base.data, { raw: { width, height, channels } });
      const full = await from().webp({ quality: 78 }).toBuffer();
      // what the guest page shows inline: sharp on 2× phone screens without the 1280 px weight on 3G
      const medium = await from()
        .resize(640, 640, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 74 })
        .toBuffer();
      const thumb = await from()
        .resize(320, 320, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 70 })
        .toBuffer();
      return {
        full: new Uint8Array(full),
        medium: new Uint8Array(medium),
        thumb: new Uint8Array(thumb),
        width,
        height,
      };
    } catch {
      throw invalid();
    }
  });
}
