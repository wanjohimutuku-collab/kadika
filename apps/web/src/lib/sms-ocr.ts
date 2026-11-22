import { extractShortCodeFromOcr } from '@harusi/schemas/short-code';

/**
 * "Scan SMS" at the gate (ADR 059): a guest without a smartphone shows the invitation SMS on their
 * phone, the gate camera photographs the screen, text recognition reads it and the card number
 * (`Namba: KH-4823`) is taken out of the text. The code then goes through the same check as a
 * typed number. Text recognition runs on this device; the image is never uploaded.
 */

export type SmsImage = HTMLCanvasElement | ImageBitmap;

/** Turns an image into text. Throws when it cannot run in this browser. */
export type TextReader = (image: SmsImage) => Promise<string>;

export type SmsScanResult =
  { kind: 'code'; code: string } | { kind: 'no_code' } | { kind: 'unavailable' };

interface DetectedText {
  rawValue?: string;
}
type TextDetectorCtor = new () => { detect(src: SmsImage): Promise<DetectedText[]> };

/** The browser's own text detector (Shape Detection API), where it exists. Works offline. */
export const nativeTextReader: TextReader = async (image) => {
  const Ctor = (globalThis as { TextDetector?: TextDetectorCtor }).TextDetector;
  if (typeof Ctor !== 'function') throw new Error('TextDetector unavailable');
  const hits = await new Ctor().detect(image);
  return hits.map((h) => h.rawValue ?? '').join('\n');
};

type TesseractWorker = {
  recognize(image: SmsImage): Promise<{ data: { text: string } }>;
  terminate(): Promise<unknown>;
};
let tesseract: Promise<TesseractWorker> | null = null;

/**
 * Tesseract (WebAssembly), loaded only when the gate agent first taps "Scan SMS". Its engine and the
 * English model are fetched once and then served from the browser cache, so the first scan of a
 * session needs a connection.
 */
export const tesseractReader: TextReader = async (image) => {
  tesseract ??= import('tesseract.js').then(
    ({ createWorker }) => createWorker('eng') as Promise<TesseractWorker>,
  );
  let worker: TesseractWorker;
  try {
    worker = await tesseract;
  } catch (err) {
    tesseract = null; // let the next tap retry, e.g. once the phone is back online
    throw err;
  }
  const { data } = await worker.recognize(image);
  return data.text;
};

/** Frees the recognition worker (call when the scanner closes). */
export async function releaseSmsReader(): Promise<void> {
  const w = tesseract;
  tesseract = null;
  if (w) await w.then((x) => x.terminate()).catch(() => {});
}

/**
 * Reads the card number out of a photo of an SMS. Readers are tried in order; the first one that
 * finds a code wins. `unavailable` means no reader could run at all (then the agent types the code).
 */
export async function scanSmsImage(
  image: SmsImage,
  readers: TextReader[] = [nativeTextReader, tesseractReader],
): Promise<SmsScanResult> {
  let ran = false;
  for (const read of readers) {
    let text: string;
    try {
      text = await read(image);
    } catch {
      continue;
    }
    ran = true;
    const code = extractShortCodeFromOcr(text);
    if (code) return { kind: 'code', code };
  }
  return ran ? { kind: 'no_code' } : { kind: 'unavailable' };
}

/**
 * Grabs the current camera frame as a greyscale canvas, at most `maxWidth` wide. Greyscale with a
 * contrast stretch helps recognition with the glare and low brightness of a phone screen.
 */
export function frameFromVideo(video: HTMLVideoElement, maxWidth = 1600): HTMLCanvasElement | null {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return null;
  const scale = Math.min(1, maxWidth / w);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  enhanceForText(ctx, canvas.width, canvas.height);
  return canvas;
}

/** Same treatment for a photo picked from the camera roll / file input. */
export async function canvasFromFile(
  file: Blob,
  maxWidth = 1600,
): Promise<HTMLCanvasElement | null> {
  if (typeof createImageBitmap !== 'function') return null;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    bitmap.close();
    return null;
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  enhanceForText(ctx, canvas.width, canvas.height);
  return canvas;
}

function enhanceForText(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const img = ctx.getImageData(0, 0, w, h);
  stretchGreyscale(img.data);
  ctx.putImageData(img, 0, 0);
}

/** RGBA pixels → greyscale, stretched so the darkest pixel is black and the lightest white. */
export function stretchGreyscale(px: Uint8ClampedArray): void {
  let lo = 255;
  let hi = 0;
  for (let i = 0; i < px.length; i += 4) {
    const y = Math.round(0.299 * px[i]! + 0.587 * px[i + 1]! + 0.114 * px[i + 2]!);
    px[i] = y;
    if (y < lo) lo = y;
    if (y > hi) hi = y;
  }
  const range = hi - lo || 1;
  for (let i = 0; i < px.length; i += 4) {
    const v = Math.round(((px[i]! - lo) * 255) / range);
    px[i] = v;
    px[i + 1] = v;
    px[i + 2] = v;
  }
}
