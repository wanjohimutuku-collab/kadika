import sharp from 'sharp';
import { ApiError } from '../errors';

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
// Prebuilt sharp has no HEIC decoder; phones hand browsers and the app picker JPEG anyway.
const ACCEPTED = new Set(['jpeg', 'png', 'webp']);

const invalid = () =>
  new ApiError('validation', 'This file is not a photo we can use', {
    reason: 'invalid_image',
    field: 'photo',
  });

/**
 * Re-encodes an uploaded photo (ADR 050): turned upright from its EXIF orientation, then written as
 * WebP with **no metadata at all**, so a phone photo never reveals where it was taken.
 */
export async function processPhoto(bytes: Uint8Array) {
  if (bytes.length > MAX_PHOTO_BYTES)
    throw new ApiError('validation', 'Photos can be at most 8 MB', {
      reason: 'too_large',
      field: 'photo',
    });
  let format: string | undefined;
  try {
    format = (await sharp(bytes).metadata()).format;
  } catch {
    throw invalid();
  }
  if (!format || !ACCEPTED.has(format)) throw invalid();
  try {
    // sharp drops all metadata unless asked to keep it; rotate() applies the EXIF orientation first.
    const full = await sharp(bytes)
      .rotate()
      .resize(1280, 1280, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer({ resolveWithObject: true });
    const thumb = await sharp(bytes)
      .rotate()
      .resize(320, 320, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 70 })
      .toBuffer();
    return {
      full: new Uint8Array(full.data),
      thumb: new Uint8Array(thumb),
      width: full.info.width,
      height: full.info.height,
    };
  } catch {
    throw invalid();
  }
}
