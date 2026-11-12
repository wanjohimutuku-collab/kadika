/**
 * Shrinks a chosen photo in the browser before it is uploaded (ADR 050). A 4–6 MB phone photo
 * becomes ≈ 0.5 MB, so several upload quickly on 3G and the server decodes far fewer pixels.
 * The server still re-encodes every photo and strips its metadata; this step is only a saving,
 * so any failure sends the original unchanged.
 */
export const SHRINK_MAX_PX = 2048;
const QUALITY = 0.85;
/** A photo already this small in bytes and pixels is sent as it is. */
const SMALL_BYTES = 1024 * 1024;

/** The size that fits inside max × max, keeping the shape; never enlarges. */
export function fitWithin(width: number, height: number, max = SHRINK_MAX_PX) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
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
    ctx.fillStyle = '#ffffff'; // JPEG has no transparency; match the server's white background
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, size.width, size.height);
    const blob = await new Promise<Blob | null>((done) =>
      canvas.toBlob(done, 'image/jpeg', QUALITY),
    );
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]*$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg' });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}
