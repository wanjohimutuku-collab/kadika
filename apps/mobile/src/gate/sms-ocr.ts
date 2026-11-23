import {
  combineSmsFragments,
  extractShortCodeFromOcr,
  type PartialSmsGuest,
} from '@harusi/schemas/short-code';

/**
 * On-device SMS text scanner for the mobile gate app (ADR 059):
 * Guests with feature or disposable phones ("simu ya tochi") receive their invitation by SMS and
 * often have tiny screens that can only show 2–3 lines of the message at a time.
 *
 * This module reads text from one or more camera snapshots on the device (never uploading images)
 * and resolves the guest's short code from either the full code or a visible partial slice of the
 * SMS (clipped code, short link `/s/...`, greeting + guest name, or multi-frame scrolled text).
 */

export type MobileSmsImage =
  | string
  | {
      uri?: string;
      base64?: string;
      text?: string;
      width?: number;
      height?: number;
    };

export type MobileTextReader = (image: MobileSmsImage) => Promise<string>;

export type MobileSmsScanResult =
  { kind: 'code'; code: string } | { kind: 'no_code'; text: string } | { kind: 'unavailable' };

interface DetectedText {
  rawValue?: string;
  text?: string;
}

type TextDetectorCtor = new () => { detect(src: unknown): Promise<DetectedText[]> };

export interface HarusiSmsOcrNative {
  recognizeText(uri: string | null, base64: string | null): Promise<string>;
}

type GlobalOcrHooks = {
  TextDetector?: TextDetectorCtor;
  __harusiTextReader?: MobileTextReader;
  __harusiNativeSmsOcr?: HarusiSmsOcrNative;
};

function imageSourceOf(image: MobileSmsImage): string | null {
  if (typeof image === 'string') return image;
  if (image.uri) return image.uri;
  if (image.base64) {
    return image.base64.startsWith('data:')
      ? image.base64
      : `data:image/jpeg;base64,${image.base64}`;
  }
  return null;
}

/**
 * Uses the device or browser's built-in on-device text detector:
 * 1. Bundled Android ML Kit NativeModule (`__harusiNativeSmsOcr`), which runs 100% offline.
 * 2. Injected `__harusiTextReader` hook or browser `TextDetector` (Shape Detection API).
 */
export const nativeTextReader: MobileTextReader = async (image) => {
  if (typeof image === 'object' && image && typeof image.text === 'string') {
    return image.text;
  }
  const hooks = globalThis as unknown as GlobalOcrHooks;
  if (typeof hooks.__harusiTextReader === 'function') {
    return hooks.__harusiTextReader(image);
  }
  const nativeMod = hooks.__harusiNativeSmsOcr;
  if (nativeMod && typeof nativeMod.recognizeText === 'function') {
    const uri = typeof image === 'string' ? image : (image.uri ?? null);
    const base64 = typeof image === 'object' && image ? (image.base64 ?? null) : null;
    if (uri || base64) {
      return nativeMod.recognizeText(uri, base64);
    }
  }
  const Ctor = hooks.TextDetector;
  if (typeof Ctor !== 'function') {
    throw new Error('TextDetector unavailable');
  }
  const detector = new Ctor();
  const src = imageSourceOf(image);
  if (
    src &&
    typeof fetch === 'function' &&
    typeof createImageBitmap === 'function' &&
    (src.startsWith('data:') || src.startsWith('blob:') || src.startsWith('http'))
  ) {
    const res = await fetch(src);
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);
    try {
      const hits = await detector.detect(bitmap);
      return hits.map((h) => h.rawValue ?? h.text ?? '').join('\n');
    } finally {
      if (typeof bitmap.close === 'function') bitmap.close();
    }
  }
  const hits = await detector.detect(image);
  return hits.map((h) => h.rawValue ?? h.text ?? '').join('\n');
};

type TesseractWorker = {
  recognize(image: unknown): Promise<{ data: { text: string } }>;
  terminate(): Promise<unknown>;
};

let webWorkerPromise: Promise<TesseractWorker> | null = null;

function loadWebTesseract(): Promise<TesseractWorker> {
  if (typeof window === 'undefined' && typeof Worker === 'undefined') {
    return Promise.reject(new Error('Web Worker unavailable'));
  }
  webWorkerPromise ??= (
    new Function('m', 'return import(m)')('tesseract.js') as Promise<{
      createWorker: (lang: string) => Promise<TesseractWorker>;
    }>
  )
    .then(({ createWorker }) => createWorker('eng'))
    .catch((err: unknown) => {
      webWorkerPromise = null;
      throw err;
    });
  return webWorkerPromise;
}

/**
 * WebAssembly Tesseract fallback when the mobile app runs on web (`expo start --web`).
 * Loaded dynamically via `Function` so Metro on Android/iOS never bundles Node worker threads.
 */
export const webTesseractReader: MobileTextReader = async (image) => {
  const src = imageSourceOf(image);
  if (!src) throw new Error('No image source for OCR');
  const worker = await loadWebTesseract();
  const { data } = await worker.recognize(src);
  return data.text;
};

export async function releaseMobileSmsReader(): Promise<void> {
  const w = webWorkerPromise;
  webWorkerPromise = null;
  if (w) await w.then((x) => x.terminate()).catch(() => {});
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

/**
 * Reads a guest's card code from a single snapshot of an SMS screen.
 * When `roster` is provided, also matches partial SMS views on feature/disposable phones that
 * cannot display the whole message at once (clipped code, `/s/` link, or guest name).
 */
export async function scanSmsImage(
  image: MobileSmsImage,
  readers: MobileTextReader[] = [nativeTextReader, webTesseractReader],
  roster?: readonly PartialSmsGuest[],
): Promise<MobileSmsScanResult> {
  let ran = false;
  const collected: string[] = [];
  for (const read of readers) {
    let text: string;
    try {
      text = await read(image);
    } catch {
      continue;
    }
    ran = true;
    const trimmed = text.trim();
    if (trimmed) collected.push(trimmed);
    const code = extractShortCodeFromOcr(text, roster);
    if (code) return { kind: 'code', code };
  }
  return ran ? { kind: 'no_code', text: combineSmsFragments(collected) } : { kind: 'unavailable' };
}

/**
 * Scans multiple frames captured as a guest scrolls through an SMS on a tiny feature or disposable
 * phone screen. Checks each frame immediately and stitches accumulated fragments across frames so
 * a message split across 2–3 small screens resolves cleanly.
 */
export async function scanSmsFrames(
  frames: readonly MobileSmsImage[],
  readers: MobileTextReader[] = [nativeTextReader, webTesseractReader],
  roster?: readonly PartialSmsGuest[],
): Promise<MobileSmsScanResult> {
  let ran = false;
  const fragments: string[] = [];
  for (const frame of frames) {
    const res = await scanSmsImage(frame, readers, roster);
    if (res.kind === 'code') return res;
    if (res.kind === 'no_code') {
      ran = true;
      if (res.text) {
        fragments.push(res.text);
        if (fragments.length > 1) {
          const stitched = combineSmsFragments(fragments);
          const code = extractShortCodeFromOcr(stitched, roster);
          if (code) return { kind: 'code', code };
        }
      }
    }
  }
  return ran ? { kind: 'no_code', text: combineSmsFragments(fragments) } : { kind: 'unavailable' };
}
