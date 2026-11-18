import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

type Font = { name: string; data: ArrayBuffer; weight: 400 | 700; style: 'normal' };

/**
 * Editorial fonts for the card image (ADR 058), read once from `apps/web/assets/card-fonts`
 * (Latin-subset WOFF from Fontsource, SIL OFL; licences alongside).
 * When the files are absent the image still renders with satori's built-in sans.
 */
const FILES = [
  { name: 'Playfair Display', file: 'PlayfairDisplay-Regular.woff', weight: 400 },
  { name: 'Playfair Display', file: 'PlayfairDisplay-Bold.woff', weight: 700 },
  { name: 'DM Sans', file: 'DMSans-Regular.woff', weight: 400 },
  { name: 'DM Sans', file: 'DMSans-Bold.woff', weight: 700 },
  { name: 'Mrs Saint Delafield', file: 'MrsSaintDelafield-Regular.woff', weight: 400 },
] as const;

const DIR = path.join(process.cwd(), 'assets', 'card-fonts');

let cached: Promise<Font[] | null> | null = null;

export function loadCardFonts(): Promise<Font[] | null> {
  cached ??= Promise.all(
    FILES.map(async (f) => {
      // `next dev` and the standalone server run in apps/web; a repo-root cwd is covered too.
      const buf = await readFile(path.join(DIR, f.file)).catch(() =>
        readFile(path.join(process.cwd(), 'apps', 'web', 'assets', 'card-fonts', f.file)),
      );
      const data = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
      return { name: f.name, data, weight: f.weight, style: 'normal' as const };
    }),
  ).catch(() => null);
  return cached;
}
