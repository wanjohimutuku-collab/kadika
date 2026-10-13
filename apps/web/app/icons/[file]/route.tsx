import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';
export function generateStaticParams() {
  return [{ file: '192.png' }, { file: '512.png' }];
}

/** App icon: emerald tile with an ivory monogram and a gold rule (generated, no image assets). */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const px = file.startsWith('512') ? 512 : 192;
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0F5C4D',
        color: '#FBF8F3',
        fontFamily: 'Georgia, serif',
      }}
    >
      <div style={{ fontSize: px * 0.42, fontWeight: 700, lineHeight: 1 }}>H</div>
      <div
        style={{ width: px * 0.36, height: px * 0.03, background: '#B8893B', marginTop: px * 0.04 }}
      />
    </div>,
    { width: px, height: px },
  );
}
