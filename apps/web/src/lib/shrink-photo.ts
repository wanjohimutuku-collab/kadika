/**
 * Shrinks a chosen photo in the browser before it is uploaded (ADR 050). A 4–6 MB phone photo
 * becomes ≈ 0.25–0.45 MB as WebP (or compact JPEG on older browsers), staying crisp and readable on
 * mobile screens while uploading fast on 3G. The server still re-encodes every photo cleanly with
 * Lanczos3 + light sharpening and strips its metadata; this step is only a saving, so any failure
 * sends the original unchanged.
 */
export const SHRINK_MAX_PX = 2048;
const QUALITY_WEBP = 0.84;
const QUALITY_JPEG = 0.86;
/** A photo already this small in bytes and pixels is sent as it is. */
const SMALL_BYTES = 512 * 1024;

/** The size that fits inside max × max, keeping the shape; never enlarges. */
export function fitWithin(width: number, height: number, max = SHRINK_MAX_PX) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function encodeCanvas(
  canvas: HTMLCanvasElement,
  mime: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((done) => canvas.toBlob(done, mime, quality));
}

export async function shrinkPhoto(file: File): Promise<File> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;
  let bitmap: ImageBitmap | undefined;
  try {
    // from-image turns the photo upright, as the EXIF orientation says
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const size = fitWithin(bitmap.width, bitmap.height);
    if (size.width === bitmap.width && file.size <= SMALL_BYTES) return file;
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.fillStyle = '#ffffff'; // match the server's white background when flattening alpha
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, size.width, size.height);
    const webp = await encodeCanvas(canvas, 'image/webp', QUALITY_WEBP);
    const blob =
      webp && webp.type === 'image/webp'
        ? webp
        : await encodeCanvas(canvas, 'image/jpeg', QUALITY_JPEG);
    if (!blob || blob.size >= file.size) return file;
    const ext = blob.type === 'image/webp' ? '.webp' : '.jpg';
    const name = file.name.replace(/\.[^.]*$/, '') + ext;
    return new File([blob], name, { type: blob.type });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}
