import { ImageResponse } from 'next/og';
import { MARK_SVG, svgDataUri } from '@/lib/brand-assets';

export const dynamic = 'force-static';
export function generateStaticParams() {
  return [{ file: '192.png' }, { file: '512.png' }];
}

/**
 * App icon for "Add to home screen" and the structured-data logo: the business's round emblem centred on
 * ivory, with the margin Android's maskable crop needs (ADR 036). Generated from the built-in brand
 * assets, so there is no image file to keep in step.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const px = file.startsWith('512') ? 512 : 192;
  const mark = Math.round(px * 0.72);
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#FBF8F3',
      }}
    >
      {/* satori renders this to a PNG, not to the DOM, so it needs no alt text */}
      <img src={svgDataUri(MARK_SVG)} width={mark} height={mark} />
    </div>,
    { width: px, height: px },
  );
}
