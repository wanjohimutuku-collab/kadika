import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** Longest side sent to the server; it keeps at most 1280 px, so this leaves room and saves data. */
const MAX_PX = 2048;

export interface PickedPhoto {
  uri: string;
  name: string;
  type: string;
  width: number;
  height: number;
}

/**
 * Shrinks a picked photo on the phone before upload (ADR 050): a 4–6 MB camera photo becomes
 * ≈ 0.5 MB, so several upload quickly on 3G. The server still re-encodes it and strips all
 * metadata; any failure here sends the original.
 */
export async function shrinkPhoto(
  p: PickedPhoto,
): Promise<{ uri: string; name: string; type: string }> {
  const original = { uri: p.uri, name: p.name, type: p.type };
  if (!p.width || !p.height || Math.max(p.width, p.height) <= MAX_PX) return original;
  try {
    const size = p.width >= p.height ? { width: MAX_PX } : { height: MAX_PX };
    const image = await ImageManipulator.manipulate(p.uri).resize(size).renderAsync();
    const out = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
    return { uri: out.uri, name: p.name.replace(/\.[^.]*$/, '') + '.jpg', type: 'image/jpeg' };
  } catch {
    return original;
  }
}
