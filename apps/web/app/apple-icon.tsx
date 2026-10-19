import { ImageResponse } from 'next/og';
import { MARK_SVG, svgDataUri } from '@/lib/brand-assets';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** iOS home-screen icon: the business's emblem on ivory (ADR 036). iOS adds its own rounded corners. */
export default function AppleIcon() {
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
      <img src={svgDataUri(MARK_SVG)} width={132} height={132} />
    </div>,
    size,
  );
}
