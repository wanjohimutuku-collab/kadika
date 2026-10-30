/** Longest edge sent to the API; it keeps 2048 px, so this leaves room for its own resampling. */
const MAX_EDGE = 2560;
const QUALITY = 0.9;
/** Below this a photo is sent as it is: shrinking would cost quality for little saving. */
const SMALL_BYTES = 1_500_000;
export const MAX_PHOTO_BYTES = 15_000_000;

/**
 * Shrinks a phone photo in the browser before upload (ADR 050), so a 6 MB camera picture costs a
 * guest on 3G well under 1 MB of data. The API does the real compression; this step only needs to be
 * high quality and upright. Anything the browser cannot decode (or a canvas that fails) is sent as is
 * and the API decides.
 */
export async function shrinkPhoto(file: File): Promise<Blob> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file;
  }
  try {
    const long = Math.max(bitmap.width, bitmap.height);
    if (long <= MAX_EDGE && file.size <= SMALL_BYTES) return file;
    const scale = Math.min(1, MAX_EDGE / long);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((done) =>
      canvas.toBlob(done, 'image/jpeg', QUALITY),
    );
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  } finally {
    bitmap.close();
  }
}
